import { useEffect, useRef, useState } from 'react';
import { WebGPUEngine, PHASE_METADATA } from '../graphics-core/service';
import type { InitProgress } from '../graphics-core/service';
import { SceneAdapter } from '../adapters/SceneAdapter';
import type { Scene, SceneFrontend } from '../graphics-core/service/Scene';

interface WebGPURendererProps {
  className?: string;
  width?: number;
  height?: number;
  scene: Scene | SceneFrontend;
  onCameraUpdate?: (position: { x: number; y: number; z: number }) => void;
  onEngineReady?: (engine: WebGPUEngine) => void;
}

/**
 * WebGPURenderer - WebGPU 렌더링을 위한 얇은 React 래퍼 컴포넌트
 */
export default function WebGPURenderer({
  className = '',
  width = 800,
  height = 600,
  scene,
  onCameraUpdate,
  onEngineReady,
}: WebGPURendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WebGPUEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [isTooSmall, setIsTooSmall] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSceneLoaded, setIsSceneLoaded] = useState<boolean>(false);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);

  // 최소 렌더링 크기
  const MIN_WIDTH = 512;
  const MIN_HEIGHT = 384;

  // 반응형 크기 처리 (ResizeObserver)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect;

        // WebGPU 내부 해상도 제한 (성능 최적화)
        // CSS로는 크게 표시되지만, 실제 렌더링은 낮은 해상도로
        const MAX_WIDTH = 1024;   // 최대 내부 렌더 너비
        const MAX_HEIGHT = 768;  // 최대 내부 렌더 높이 (4:3 비율 유지) 

        // 4:3 비율 유지하면서 크기 계산
        let newWidth = Math.min(containerWidth, MAX_WIDTH);
        let newHeight = newWidth * 3 / 4;

        // 높이가 MAX_HEIGHT를 초과하면 높이 기준으로 재계산
        if (newHeight > MAX_HEIGHT) {
          newHeight = MAX_HEIGHT;
          newWidth = newHeight * 4 / 3;
        }

        setCanvasSize({ width: newWidth, height: newHeight });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 초기 렌더러 설정 (mount 시 1회만 실행)
  useEffect(() => {
    let isMounted = true;

    async function initEngine() {
      if (!canvasRef.current) return;

      try {
        const engine = new WebGPUEngine(canvasRef.current);

        // Setup callbacks
        engine.onCameraUpdate = (pos) => {
          if (isMounted && onCameraUpdate) {
            onCameraUpdate(pos);
          }
        };

        // ✅ Initialize engine with progress callback
        await engine.initialize(canvasSize.width, canvasSize.height, {
          onProgress: (progress) => {
            if (isMounted) {
              setInitProgress(progress);
            }
          },
        });

        if (!isMounted) {
          engine.dispose();
          return;
        }

        engineRef.current = engine;
        // Note: engine.start()는 Scene 로드 후에 호출됨

        // 초기화 완료
        if (isMounted) {
          setIsInitialized(true);
          // Engine을 부모 컴포넌트에 전달
          if (onEngineReady) {
            onEngineReady(engine);
          }
        }
      } catch (err) {
        console.error('Error initializing WebGPU engine:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
      }
    }

    initEngine();

    // Cleanup
    return () => {
      isMounted = false;
      setIsInitialized(false);
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ mount 시 1회만 실행, canvasSize 변경은 resize useEffect가 처리

  // Canvas 크기 변경 시 리사이즈
  useEffect(() => {
    if (!engineRef.current) return;

    // 최소 크기 체크
    if (canvasSize.width < MIN_WIDTH || canvasSize.height < MIN_HEIGHT) {
      setIsTooSmall(true);
      return; // 너무 작으면 resize 호출하지 않음
    }

    setIsTooSmall(false);

    async function resizeEngine() {
      try {
        await engineRef.current!.resize(canvasSize.width, canvasSize.height);
      } catch (err) {
        console.error('Error resizing engine:', err);
      }
    }

    resizeEngine();
  }, [canvasSize, MIN_WIDTH, MIN_HEIGHT]);

  // ✅ Scene 변경 시 로드 (SceneAdapter 사용)
  useEffect(() => {
    if (!scene || !engineRef.current || !isInitialized) return;

    async function loadScene() {
      try {
        const engine = engineRef.current!;
        const world = engine.getWorld();

        // Scene이 SceneFrontend인지 확인
        const sceneFrontend = scene as SceneFrontend;
        if (!sceneFrontend.room || !sceneFrontend.sunSettings) {
          console.warn('Scene is not SceneFrontend, skipping load');
          return;
        }

        console.log(`Loading scene: ${scene.name}`);

        // 1. Mesh 이름 추출
        const meshNames = SceneAdapter.extractMeshNames(sceneFrontend);

        // 2. Mesh 로드 및 MeshPool에 등록
        for (const meshName of meshNames) {
          // 이미 등록된 Mesh는 스킵
          if (world.MeshPool.GetID(meshName) !== -1) {
            console.log(`Mesh already loaded: ${meshName}`);
            continue;
          }

          try {
            const rawMesh = await world.LoadRawMesh(meshName);
            world.CreateMesh(meshName, rawMesh);
            console.log(`Mesh loaded and registered: ${meshName}`);
          } catch (err) {
            console.warn(`Failed to load mesh: ${meshName}`, err);
          }
        }

        // 3. SceneAdapter를 통해 World에 Scene 로드
        SceneAdapter.loadSceneToWorld(sceneFrontend, world);

        // 4. Renderer 재초기화 (with progress callback)
        const renderer = engine.getRenderer();
        if (renderer) {
          await renderer.Initialize(world, (progress) => {
            setInitProgress(progress);
          });
        }

        // 5. InputController에 카메라 설정
        engine.setupInputController();

        // 6. Scene의 카메라 설정 적용
        const cameraSettings = SceneAdapter.getCameraSettings(sceneFrontend);
        engine.setCamera(
          cameraSettings.position,
          cameraSettings.target,
          cameraSettings.fov
        );

        // 7. 렌더 루프 시작 (이미 실행 중이면 무시됨)
        engine.start();

        // 8. Scene 로드 완료
        setIsSceneLoaded(true);

        console.log(`Scene loaded successfully: ${scene.name}`);
      } catch (err) {
        console.error('Error loading scene:', err);
        setError(err instanceof Error ? err.message : 'Failed to load scene');
      }
    }

    loadScene();
  }, [scene, isInitialized]);


  // 에러 화면
  if (error) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: '#ff4444',
          fontFamily: 'monospace',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div>
          <h3>WebGPU Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          filter: isTooSmall ? 'blur(3px)' : 'none',
        }}
      />

      {/* 크기 부족 경고 (중앙) */}
      {isTooSmall && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#ffaa00',
            padding: '20px 30px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            textAlign: 'center',
            border: '2px solid #ffaa00',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>화면이 너무 작습니다</div>
          <div style={{ fontSize: '12px', color: '#ccc' }}>
            최소 크기: {MIN_WIDTH} × {MIN_HEIGHT}
          </div>
          <div style={{ fontSize: '12px', color: '#ccc', marginTop: '4px' }}>
            현재 크기: {canvasSize.width} × {canvasSize.height}
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#ffaa00' }}>
            창을 키워주세요
          </div>
        </div>
      )}

      {/* 로딩 오버레이 (초기화 또는 Scene 로드 중) */}
      {(!isInitialized || !isSceneLoaded) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8f9fa',
            zIndex: 200,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '280px' }}>
            {/* 스피너 */}
            <div
              style={{
                width: '56px',
                height: '56px',
                position: 'relative',
                margin: '0 auto 20px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '3px solid #e9ecef',
                  borderTopColor: '#1a1a1a',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                }}
              >
                🏠
              </div>
            </div>

            {/* 단계 표시 */}
            {initProgress && (
              <div style={{
                fontSize: '12px',
                color: '#495057',
                marginBottom: '8px',
                fontFamily: 'monospace',
              }}>
                {initProgress.step}/{initProgress.totalSteps}
              </div>
            )}

            {/* 프로그레스 바 */}
            {initProgress && (
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e9ecef',
                borderRadius: '2px',
                marginBottom: '16px',
                overflow: 'hidden',
              }}>
                <div
                  style={{
                    width: `${(initProgress.step / initProgress.totalSteps) * 100}%`,
                    height: '100%',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease-out',
                  }}
                />
              </div>
            )}

            {/* 메인 텍스트 */}
            <div style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#1a1a1a',
              marginBottom: '6px',
            }}>
              {initProgress
                ? PHASE_METADATA[initProgress.phase]?.labelKo || initProgress.message
                : (!isInitialized ? '렌더러 준비 중' : '공간 불러오는 중')
              }
            </div>

            {/* 서브 텍스트 */}
            <div style={{
              fontSize: '13px',
              color: '#868e96',
            }}>
              {initProgress
                ? `${PHASE_METADATA[initProgress.phase]?.label || ''}`
                : '잠시만 기다려주세요'
              }
            </div>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
