import { useEffect, useRef, useState } from 'react';
import { ThreeSceneManager } from '../three-core/ThreeSceneManager';
import { ThreeSceneAdapter } from '../adapters/ThreeSceneAdapter';
import type { Scene, SceneFrontend, Transform, PointLightParams, RectLightParams, DirectionalLightParams } from '../graphics-core/service/Scene';

interface ThreeRendererProps {
  className?: string;
  scene?: Scene | SceneFrontend | null;
  onSelectionChange?: (assetId: string | number | null) => void;
  onTransformChange?: (assetId: string | number, transform: Transform) => void;
  onLightParamsChange?: (assetId: string | number, lightParams: PointLightParams | RectLightParams | DirectionalLightParams) => void;
  onSaveCamera?: (camera: { position: [number, number, number]; target: [number, number, number]; fov: number }) => void;
}

/**
 * ThreeRenderer - Three.js 렌더링을 위한 React 래퍼 컴포넌트
 * EditPage에서 사용되는 실시간 프리뷰 렌더러
 */
export default function ThreeRenderer({
  className = '',
  scene = null,
  onSelectionChange,
  onTransformChange,
  onLightParamsChange,
  onSaveCamera,
}: ThreeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<ThreeSceneManager | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // 반응형 크기 처리 (ResizeObserver)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect;

        // Three.js는 WebGPU보다 가볍기 때문에 해상도 제한 없이 사용 가능
        setCanvasSize({
          width: containerWidth,
          height: containerHeight
        });
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

    async function initManager() {
      if (!canvasRef.current) return;

      try {
        const manager = new ThreeSceneManager(
          canvasRef.current,
          canvasSize.width,
          canvasSize.height
        );

        if (!isMounted) {
          manager.dispose();
          return;
        }

        managerRef.current = manager;
        manager.start();

        // 초기화 완료
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Error initializing Three.js manager:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
      }
    }

    initManager();

    // Cleanup
    return () => {
      isMounted = false;
      setIsInitialized(false);
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount 시 1회만 실행

  // Canvas 크기 변경 시 리사이즈
  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.resize(canvasSize.width, canvasSize.height);
  }, [canvasSize]);

  // 콜백 설정 (초기화 후)
  useEffect(() => {
    if (!managerRef.current) return;

    if (onSelectionChange) {
      managerRef.current.setSelectionChangeCallback(onSelectionChange);
    }

    if (onTransformChange) {
      managerRef.current.setTransformChangeCallback(onTransformChange);
    }

    if (onLightParamsChange) {
      managerRef.current.setLightParamsChangeCallback(onLightParamsChange);
    }
  }, [onSelectionChange, onTransformChange, onLightParamsChange]);

  // C키로 카메라 좌표 콘솔 출력, V키로 카메라 저장
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input/Textarea에서는 무시
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (!managerRef.current) return;

      if (e.key === 'c' || e.key === 'C') {
        const camera = managerRef.current.camera;
        const position = camera.position;
        const target3D = managerRef.current.controls?.target;

        console.log('=== Camera Info ===');
        console.log(`Position: [${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}]`);
        if (target3D) {
          console.log(`Target: [${target3D.x.toFixed(2)}, ${target3D.y.toFixed(2)}, ${target3D.z.toFixed(2)}]`);
        }
        console.log(`FOV: ${camera.fov}`);
        console.log('==================');
      }

      // V키: 현재 카메라 시점 저장
      if (e.key === 'v' || e.key === 'V') {
        if (onSaveCamera) {
          const cameraSettings = managerRef.current.getCameraSettings();
          onSaveCamera(cameraSettings);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSaveCamera]);

  // Scene 데이터 변경 시 모델 로드
  useEffect(() => {
    if (!managerRef.current || !scene) return;

    async function loadSceneData() {
      try {
        // ✅ Use ThreeSceneAdapter to convert SceneFrontend → Three.js commands
        const sceneFrontend = scene as SceneFrontend;
        if (!sceneFrontend.room || !sceneFrontend.sunSettings) {
          console.warn('[ThreeRenderer] Scene is not SceneFrontend, skipping load');
          return;
        }

        await ThreeSceneAdapter.loadSceneToManager(sceneFrontend, managerRef.current!);
      } catch (error) {
        console.error('[ThreeRenderer] Failed to load scene:', error);
        setError('Failed to load scene models');
      }
    }

    loadSceneData();
  }, [scene]);

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
          <h3>Three.js Error</h3>
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
        }}
      />

      {/* 로딩 오버레이 (초기화 중) */}
      {!isInitialized && (
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
            backgroundColor: 'rgba(42, 42, 42, 0.95)',
            color: '#00aaff',
            fontFamily: 'monospace',
            zIndex: 200,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                border: '4px solid rgba(0, 170, 255, 0.2)',
                borderTop: '4px solid #00aaff',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Three.js 초기화 중...</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
              잠시만 기다려주세요
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
