/**
 * SimulatorContext - WebGPU Engine 공유 Context
 *
 * 목적:
 * - /simulator 하위 라우트에서 WebGPUEngine 인스턴스 공유
 * - Scene 전환 시 엔진 재초기화 없이 재사용
 * - 정적 렌더링 패턴 지원 (Scene 변경 시만 렌더링)
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { WebGPUEngine } from '../graphics-core/service';
import type { InitProgress } from '../graphics-core/service';
import { WebGPUError, isWebGPUError } from '../graphics-core/service/types/WebGPUError';
import { SceneAdapter } from '../adapters/SceneAdapter';
import type { SceneFrontend, SunSettings } from '../graphics-core/service/Scene';

// ─────────────────────────────────────────────
// Context 타입 정의
// ─────────────────────────────────────────────

interface RenderStats {
  fps: number;
  frameTime: number;
}

interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

interface SimulatorContextValue {
  // Engine 상태
  engine: WebGPUEngine | null;
  isEngineReady: boolean;
  isSceneLoading: boolean;
  initProgress: InitProgress | null;
  error: WebGPUError | null;

  // 렌더링 상태
  renderStats: RenderStats;
  cameraPosition: CameraPosition | null;
  currentSceneId: string | number | null;

  // Actions
  loadScene: (scene: SceneFrontend) => Promise<void>;
  updateSunSettings: (settings: SunSettings) => void;
  retry: () => void;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider Props
// ─────────────────────────────────────────────

interface SimulatorProviderProps {
  children: ReactNode;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// ─────────────────────────────────────────────
// Provider 구현
// ─────────────────────────────────────────────

export function SimulatorProvider({ children, canvasRef }: SimulatorProviderProps) {
  const engineRef = useRef<WebGPUEngine | null>(null);

  // 상태
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  const [error, setError] = useState<WebGPUError | null>(null);
  const [renderStats, setRenderStats] = useState<RenderStats>({ fps: 0, frameTime: 0 });
  const [cameraPosition, setCameraPosition] = useState<CameraPosition | null>(null);
  const [currentSceneId, setCurrentSceneId] = useState<string | number | null>(null);

  // ─────────────────────────────────────────────
  // Engine 초기화
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || engineRef.current || error) return;

    let isMounted = true;

    async function initEngine() {
      if (!canvasRef.current) return;

      try {
        const engine = new WebGPUEngine(canvasRef.current);

        // 콜백 설정
        engine.onFrameTimeUpdate = (frameTime: number) => {
          if (isMounted) {
            const fps = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
            setRenderStats({ fps, frameTime });
          }
        };

        engine.onCameraUpdate = (pos) => {
          if (isMounted) {
            setCameraPosition(pos);
          }
        };

        engine.onError = (err) => {
          if (isMounted) {
            setError(err);
          }
        };

        // 캔버스 크기 가져오기
        const rect = canvasRef.current.getBoundingClientRect();
        const width = Math.max(rect.width, 512);
        const height = Math.max(rect.height, 384);

        // 엔진 초기화
        await engine.initialize(width, height, {
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
        setIsEngineReady(true);
        console.log('[SimulatorContext] Engine initialized');
      } catch (err) {
        if (isMounted) {
          if (isWebGPUError(err)) {
            setError(err);
          } else if (err instanceof Error) {
            setError(new WebGPUError('UNKNOWN', err.message, err));
          } else {
            setError(new WebGPUError('UNKNOWN', 'Unknown error occurred'));
          }
        }
      }
    }

    initEngine();

    return () => {
      isMounted = false;
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [canvasRef, error]);

  // ─────────────────────────────────────────────
  // Scene 로드
  // ─────────────────────────────────────────────
  const loadScene = useCallback(async (scene: SceneFrontend) => {
    const engine = engineRef.current;
    if (!engine) {
      console.warn('[SimulatorContext] Engine not ready');
      return;
    }

    // 같은 Scene이면 스킵
    if (currentSceneId === scene.id) {
      console.log('[SimulatorContext] Same scene, skipping reload');
      return;
    }

    setIsSceneLoading(true);
    setCurrentSceneId(scene.id);

    try {
      // 1. World 초기화
      engine.clearWorld();
      const world = engine.getWorld();

      // 2. Mesh 로드
      const meshNames = SceneAdapter.extractMeshNames(scene);
      const meshesToLoad = meshNames.filter((name) => world.MeshPool.GetID(name) === -1);

      for (let i = 0; i < meshesToLoad.length; i++) {
        const meshName = meshesToLoad[i];
        setInitProgress({
          phase: 'loadAssets',
          step: 5,
          totalSteps: 7,
          message: `메시 로딩 중: ${meshName}`,
          loadedCount: i,
          totalCount: meshesToLoad.length,
          currentAssetName: meshName,
          currentAssetPath: `/assets/${meshName}.glb`,
        });

        try {
          const rawMesh = await world.LoadRawMesh(meshName);
          world.CreateMesh(meshName, rawMesh);
        } catch (err) {
          console.warn(`Failed to load mesh: ${meshName}`, err);
        }
      }

      // 3. Scene을 World에 로드
      SceneAdapter.loadSceneToWorld(scene, world);

      // 4. Sun/Environment 적용
      engine.applySunSettings(scene.sunSettings);

      // 5. Renderer 재초기화
      const renderer = engine.getRenderer();
      if (renderer) {
        await renderer.Initialize(world, (progress) => {
          setInitProgress(progress);
        });
        engine.applyPendingLighting();
      }

      // 6. InputController 설정
      engine.setupInputController();

      // 7. 카메라 설정
      const cameraSettings = SceneAdapter.getCameraSettings(scene);
      engine.setCamera(cameraSettings.position, cameraSettings.target, cameraSettings.fov);

      // 8. 렌더 루프 시작
      engine.start();

      console.log(`[SimulatorContext] Scene loaded: ${scene.name}`);
    } catch (err) {
      console.error('[SimulatorContext] Failed to load scene:', err);
      if (isWebGPUError(err)) {
        setError(err);
      } else if (err instanceof Error) {
        setError(new WebGPUError('UNKNOWN', err.message, err));
      }
    } finally {
      setIsSceneLoading(false);
      setInitProgress(null);
    }
  }, [currentSceneId]);

  // ─────────────────────────────────────────────
  // Sun Settings 업데이트
  // ─────────────────────────────────────────────
  const updateSunSettings = useCallback((settings: SunSettings) => {
    if (engineRef.current) {
      engineRef.current.updateSunLight(settings);
    }
  }, []);

  // ─────────────────────────────────────────────
  // 재시도
  // ─────────────────────────────────────────────
  const retry = useCallback(() => {
    setError(null);
    setIsEngineReady(false);
    setIsSceneLoading(false);
    setInitProgress(null);
    setCurrentSceneId(null);

    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────
  const value: SimulatorContextValue = {
    engine: engineRef.current,
    isEngineReady,
    isSceneLoading,
    initProgress,
    error,
    renderStats,
    cameraPosition,
    currentSceneId,
    loadScene,
    updateSunSettings,
    retry,
  };

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useSimulator() {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within SimulatorProvider');
  }
  return context;
}
