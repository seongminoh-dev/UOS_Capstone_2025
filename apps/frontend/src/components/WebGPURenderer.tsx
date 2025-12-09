import { useEffect, useRef, useState, useCallback } from 'react';
import { WebGPUEngine, PHASE_METADATA, isAssetLoadingProgress } from '../graphics-core/service';
import type { InitProgress } from '../graphics-core/service';
import { SceneAdapter } from '../adapters/SceneAdapter';
import type { Scene, SceneFrontend } from '../graphics-core/service/Scene';
import { WebGPUError, isWebGPUError } from '../graphics-core/service/types/WebGPUError';
import { WEBGPU_ERROR_SOLUTIONS } from './ErrorBoundary';
import type { ErrorSolution } from './ErrorBoundary';
import { Button } from './common';

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
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [isTooSmall, setIsTooSmall] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSceneLoaded, setIsSceneLoaded] = useState<boolean>(false);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);

  // ─────────────────────────────────────────────
  // WebGPU 에러 상태
  // WebGPUError를 직접 저장하여 code 기반으로 UI를 렌더링
  // ─────────────────────────────────────────────
  const [webgpuError, setWebgpuError] = useState<WebGPUError | null>(null);

  // 최소 렌더링 크기
  const MIN_WIDTH = 512;
  const MIN_HEIGHT = 384;

  // ─────────────────────────────────────────────
  // 에러 핸들링 헬퍼 함수
  // ─────────────────────────────────────────────
  const handleError = useCallback((err: unknown) => {
    console.error('[WebGPURenderer] Error:', err);

    if (isWebGPUError(err)) {
      setWebgpuError(err);
    } else if (err instanceof Error) {
      // 일반 Error를 WebGPUError로 래핑 (UNKNOWN 코드 사용)
      setWebgpuError(new WebGPUError('UNKNOWN', err.message, err));
    } else {
      setWebgpuError(new WebGPUError('UNKNOWN', 'Unknown error occurred'));
    }
  }, []);

  // 페이지 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // 재시도 핸들러 (엔진 재초기화)
  const handleRetry = useCallback(() => {
    setWebgpuError(null);
    setIsInitialized(false);
    setIsSceneLoaded(false);
    setInitProgress(null);

    // 기존 엔진 정리
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    // NOTE: useEffect가 다시 실행되면서 엔진 재초기화
    // isInitialized가 false로 설정되면 initEngine이 재실행됨
  }, []);

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

  // 초기 렌더러 설정 (mount 시 또는 재시도 시 실행)
  useEffect(() => {
    // 이미 초기화되었거나 에러 상태면 스킵
    if (isInitialized || webgpuError) return;

    let isMounted = true;

    async function initEngine() {
      if (!canvasRef.current) return;

      try {
        const engine = new WebGPUEngine(canvasRef.current);

        // ─────────────────────────────────────────────
        // 카메라 업데이트 콜백 설정
        // ─────────────────────────────────────────────
        engine.onCameraUpdate = (pos) => {
          if (isMounted && onCameraUpdate) {
            onCameraUpdate(pos);
          }
        };

        // ─────────────────────────────────────────────
        // 런타임 에러 콜백 설정 (device.lost, uncapturederror 등)
        // ─────────────────────────────────────────────
        engine.onError = (error) => {
          if (isMounted) {
            handleError(error);
          }
        };

        // ─────────────────────────────────────────────
        // 엔진 초기화 (WebGPUError를 throw할 수 있음)
        // ─────────────────────────────────────────────
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
        // ─────────────────────────────────────────────
        // 초기화 실패 시 에러 핸들링
        // WebGPUError 또는 일반 Error를 처리
        // ─────────────────────────────────────────────
        if (isMounted) {
          handleError(err);
        }
      }
    }

    initEngine();

    // Cleanup
    return () => {
      isMounted = false;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgpuError]); // webgpuError가 null로 리셋되면 재초기화 시도

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

        // 로딩이 필요한 mesh만 필터링
        const meshesToLoad = meshNames.filter(
          (name) => world.MeshPool.GetID(name) === -1
        );
        const totalMeshCount = meshesToLoad.length;

        // 2. Mesh 로드 및 MeshPool에 등록 (Progress 포함)
        for (let i = 0; i < meshesToLoad.length; i++) {
          const meshName = meshesToLoad[i];

          // 로딩 시작 전 Progress 보고
          setInitProgress({
            phase: 'loadAssets',
            step: 5,
            totalSteps: 7,
            message: `메시 로딩 중: ${meshName}`,
            loadedCount: i,
            totalCount: totalMeshCount,
            currentAssetName: meshName,
            currentAssetPath: `/assets/${meshName}.glb`,
          });

          try {
            const rawMesh = await world.LoadRawMesh(meshName);
            world.CreateMesh(meshName, rawMesh);
            console.log(`Mesh loaded and registered: ${meshName}`);
          } catch (err) {
            console.warn(`Failed to load mesh: ${meshName}`, err);
          }
        }

        // 모든 mesh 로딩 완료 보고
        if (totalMeshCount > 0) {
          setInitProgress({
            phase: 'loadAssets',
            step: 5,
            totalSteps: 7,
            message: '모든 메시 로딩 완료',
            loadedCount: totalMeshCount,
            totalCount: totalMeshCount,
          });
        }

        // 3. SceneAdapter를 통해 World에 Scene 로드 (Room, Assets만)
        SceneAdapter.loadSceneToWorld(sceneFrontend, world);

        // 4. Sun/Environment 적용 (graphics-core에서 처리)
        engine.applySunSettings(sceneFrontend.sunSettings);

        // 5. Renderer 재초기화 (with progress callback)
        const renderer = engine.getRenderer();
        if (renderer) {
          // 렌더 루프 중지 (Initialize 중 GPU 리소스 경쟁 방지)
          engine.stop();

          await renderer.Initialize(world, (progress) => {
            setInitProgress(progress);
          });

          // 6. Renderer 초기화 완료 후 Environment 파라미터 적용
          engine.applyPendingLighting();
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
        handleError(err);
      }
    }

    loadScene();
  }, [scene, isInitialized, handleError]);


  // ─────────────────────────────────────────────
  // WebGPU 에러 화면
  // WEBGPU_ERROR_SOLUTIONS를 사용하여 사용자 친화적인 UI 제공
  // ─────────────────────────────────────────────
  if (webgpuError) {
    const solution: ErrorSolution = WEBGPU_ERROR_SOLUTIONS[webgpuError.code];

    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          padding: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e9ecef',
          }}
        >
          {/* 에러 아이콘 */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                backgroundColor: '#fff5f5',
                borderRadius: '50%',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fa5252"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          {/* 에러 제목 */}
          <h2
            style={{
              color: '#212529',
              fontSize: '18px',
              fontWeight: 600,
              textAlign: 'center',
              margin: '0 0 8px 0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1.4,
            }}
          >
            {solution.title}
          </h2>

          {/* 에러 설명 */}
          <p
            style={{
              color: '#868e96',
              fontSize: '14px',
              textAlign: 'center',
              margin: '0 0 24px 0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1.5,
            }}
          >
            {solution.description}
          </p>

          {/* 해결책 목록 */}
          <div
            style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                color: '#495057',
                fontSize: '13px',
                fontWeight: 600,
                margin: '0 0 12px 0',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              해결 방법
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              {solution.solutions.map((sol, index) => (
                <li
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    color: '#495057',
                    fontSize: '13px',
                    marginBottom: index < solution.solutions.length - 1 ? '10px' : 0,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '50%',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#495057',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span>{sol}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 액션 버튼들 */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            {solution.canRetry && (
              <Button variant="primary" size="md" onClick={handleRetry}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={handleRefresh}>
              페이지 새로고침
            </Button>
          </div>

          {/* 기술적 상세 정보 (접기/펼치기) */}
          <details
            style={{
              marginTop: '20px',
              borderTop: '1px solid #e9ecef',
              paddingTop: '16px',
            }}
          >
            <summary
              style={{
                color: '#adb5bd',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                userSelect: 'none',
              }}
            >
              기술적 상세 정보
            </summary>
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#868e96',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
              }}
            >
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Error Code:</strong> {webgpuError.code}
              </p>
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Error Name:</strong> {webgpuError.name}
              </p>
              <p style={{ margin: '0' }}>
                <strong>Message:</strong> {webgpuError.message}
              </p>
              {webgpuError.originalError && (
                <p style={{ margin: '8px 0 0 0' }}>
                  <strong>Original:</strong> {webgpuError.originalError.message}
                </p>
              )}
            </div>
          </details>
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
          <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%', padding: '0 20px' }}>
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
                color: '#868e96',
                marginBottom: '6px',
                fontFamily: 'monospace',
              }}>
                Step {initProgress.step} / {initProgress.totalSteps}
              </div>
            )}

            {/* 메인 프로그레스 바 */}
            {initProgress && (
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e9ecef',
                borderRadius: '2px',
                marginBottom: '12px',
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
              marginBottom: '8px',
            }}>
              {initProgress
                ? PHASE_METADATA[initProgress.phase]?.labelKo || initProgress.message
                : (!isInitialized ? '렌더러 준비 중' : '공간 불러오는 중')
              }
            </div>

            {/* Asset 로딩 세부 정보 (loadAssets 단계일 때만) */}
            {initProgress && isAssetLoadingProgress(initProgress) && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: '#f1f3f4',
                borderRadius: '8px',
                textAlign: 'left',
              }}>
                {/* Asset 프로그레스 헤더 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontSize: '13px', color: '#495057' }}>
                    메시 로딩
                  </span>
                  <span style={{
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#1a1a1a',
                    fontWeight: 500,
                  }}>
                    {initProgress.loadedCount} / {initProgress.totalCount}
                    <span style={{ color: '#868e96', marginLeft: '6px' }}>
                      ({Math.round((initProgress.loadedCount / initProgress.totalCount) * 100)}%)
                    </span>
                  </span>
                </div>

                {/* Asset 전용 프로그레스 바 */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#dee2e6',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '10px',
                }}>
                  <div
                    style={{
                      width: `${(initProgress.loadedCount / initProgress.totalCount) * 100}%`,
                      height: '100%',
                      backgroundColor: '#228be6',
                      borderRadius: '3px',
                      transition: 'width 0.2s ease-out',
                    }}
                  />
                </div>

                {/* 현재 로딩 중인 Asset */}
                {initProgress.currentAssetName && (
                  <div style={{
                    fontSize: '12px',
                    color: '#868e96',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      backgroundColor: '#228be6',
                      borderRadius: '50%',
                      animation: 'pulse 1s ease-in-out infinite',
                    }} />
                    <span>
                      현재: <strong style={{ color: '#495057' }}>{initProgress.currentAssetName}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 기본 서브 텍스트 (Asset 로딩이 아닐 때) */}
            {initProgress && !isAssetLoadingProgress(initProgress) && (
              <div style={{
                fontSize: '13px',
                color: '#868e96',
              }}>
                {PHASE_METADATA[initProgress.phase]?.label || ''}
              </div>
            )}

            {/* 기본 상태 (progress 없을 때) */}
            {!initProgress && (
              <div style={{
                fontSize: '13px',
                color: '#868e96',
              }}>
                잠시만 기다려주세요
              </div>
            )}
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
