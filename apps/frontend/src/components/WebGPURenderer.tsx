import { useEffect, useRef, useState } from 'react';
import { WebGPUEngine } from '../graphics-core/service';

interface WebGPURendererProps {
  className?: string;
  width?: number;
  height?: number;
  sceneId?: string;
  onCameraUpdate?: (position: { x: number; y: number; z: number }) => void;
}

/**
 * WebGPURenderer - WebGPU 렌더링을 위한 얇은 React 래퍼 컴포넌트
 */
export default function WebGPURenderer({
  className = '',
  width = 800,
  height = 600,
  sceneId,
  onCameraUpdate,
}: WebGPURendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WebGPUEngine | null>(null);
  const [frameTime, setFrameTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(true);

  // 반응형 크기 처리 (ResizeObserver)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } = entry.contentRect;

        // WebGPU 내부 해상도 제한 (성능 최적화)
        // CSS로는 크게 표시되지만, 실제 렌더링은 낮은 해상도로
        const MAX_WIDTH = 512;   // 최대 내부 렌더 너비 512 384 1024 768
        const MAX_HEIGHT = 384;  // 최대 내부 렌더 높이 (4:3 비율 유지) 

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

  // 초기 렌더러 설정
  useEffect(() => {
    let isMounted = true;

    async function initEngine() {
      if (!canvasRef.current) return;

      try {
        const engine = new WebGPUEngine(canvasRef.current);

        // Setup callbacks
        engine.onFrameTimeUpdate = (ft) => {
          if (isMounted) setFrameTime(ft);
        };

        engine.onCameraUpdate = (pos) => {
          if (isMounted) {
            setCameraPosition(pos);
            if (onCameraUpdate) {
              onCameraUpdate(pos);
            }
          }
        };

        // Initialize and start
        await engine.initialize(canvasSize.width, canvasSize.height, sceneId);

        if (!isMounted) {
          engine.dispose();
          return;
        }

        engineRef.current = engine;
        engine.start();
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
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [canvasSize.width, canvasSize.height]);

  // Canvas 크기 변경 시 리사이즈
  useEffect(() => {
    if (!engineRef.current) return;

    async function resizeEngine() {
      try {
        await engineRef.current!.resize(canvasSize.width, canvasSize.height);
      } catch (err) {
        console.error('Error resizing engine:', err);
      }
    }

    resizeEngine();
  }, [canvasSize]);

  // sceneId 변경 시 Scene 전환
  useEffect(() => {
    if (!sceneId || !engineRef.current) return;

    async function switchScene() {
      try {
        await engineRef.current!.switchScene(sceneId!);
      } catch (err) {
        console.error('Error switching scene:', err);
        setError(err instanceof Error ? err.message : 'Failed to switch scene');
      }
    }

    switchScene();
  }, [sceneId]);

  // 키보드 단축키로 디버그 정보 토글 (백틱 키 또는 Ctrl+Shift+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 백틱(`) 키 또는 Ctrl+Shift+H로 디버그 정보 토글
      if (e.key === '`' || (e.ctrlKey && e.shiftKey && e.key === 'H')) {
        e.preventDefault();
        setShowDebugInfo(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'pointer' }}
      />

      {/* Debug Info - FPS & Camera (우측 상단) */}
      {showDebugInfo && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#0f0',
            padding: '6px 10px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            pointerEvents: 'none',
            userSelect: 'none',
            lineHeight: '1.4',
          }}
        >
          FPS: {frameTime > 0 ? (1000 / frameTime).toFixed(0) : '0'} ({frameTime.toFixed(2)}ms)
          <br />
          Resolution: {canvasSize.width}x{canvasSize.height}
          {cameraPosition && (
            <>
              <br />
              X: {cameraPosition.x.toFixed(2)} Y: {cameraPosition.y.toFixed(2)} Z: {cameraPosition.z.toFixed(2)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
