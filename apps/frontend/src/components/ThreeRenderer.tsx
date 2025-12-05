import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { ThreeSceneManager } from '../three-core/ThreeSceneManager';
import { ThreeSceneAdapter } from '../adapters/ThreeSceneAdapter';
import type { Scene, SceneFrontend, SceneAsset, Transform, PointLightParams, RectLightParams, DirectionalLightParams } from '../graphics-core/service/Scene';

/** 로딩 진행 상태 */
export interface ThreeLoadingProgress {
  step: number;
  totalSteps: number;
  message: string;
  loadedCount?: number;
  totalCount?: number;
  currentAssetName?: string;
}

/** 에러 정보 */
export interface ThreeError {
  code: 'INIT_FAILED' | 'SCENE_LOAD_FAILED' | 'ROOM_LOAD_FAILED' | 'UNKNOWN';
  message: string;
  details?: string;
}

interface ThreeRendererProps {
  className?: string;
  scene?: Scene | SceneFrontend | null;
  onSelectionChange?: (assetId: string | number | null) => void;
  onTransformChange?: (assetId: string | number, transform: Transform) => void;
  onLightParamsChange?: (assetId: string | number, lightParams: PointLightParams | RectLightParams | DirectionalLightParams) => void;
  onSaveCamera?: (camera: { position: [number, number, number]; target: [number, number, number]; fov: number }) => void;
  /** 로딩 상태 콜백 */
  onLoadingChange?: (isLoading: boolean, progress?: ThreeLoadingProgress) => void;
  /** 에러 상태 콜백 */
  onError?: (error: ThreeError | null) => void;
}

/**
 * ThreeRenderer 명령형 API (ref로 접근)
 */
export interface ThreeRendererHandle {
  /** Asset 제거 (Object 또는 Light) */
  removeAsset: (assetId: string | number) => void;
  /** Asset Transform 업데이트 */
  updateAssetTransform: (assetId: string | number, transform: Transform) => void;
  /** Light 파라미터 업데이트 */
  updateLightParams: (assetId: string | number, lightParams: PointLightParams | RectLightParams) => void;
  /** Asset 추가 (Object 또는 Light) */
  addAsset: (asset: SceneAsset) => Promise<void>;
  /** Gizmo 모드 설정 */
  setGizmoMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  /** 오브젝트 선택 */
  selectObject: (assetId: string | number | null) => void;
}

/**
 * ThreeRenderer - Three.js 렌더링을 위한 React 래퍼 컴포넌트
 * EditPage에서 사용되는 실시간 프리뷰 렌더러
 */
const ThreeRenderer = forwardRef<ThreeRendererHandle, ThreeRendererProps>(function ThreeRenderer({
  className = '',
  scene = null,
  onSelectionChange,
  onTransformChange,
  onLightParamsChange,
  onSaveCamera,
  onLoadingChange,
  onError,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<ThreeSceneManager | null>(null);
  const loadedSceneIdRef = useRef<string | number | null>(null); // 이미 로드된 Scene ID 추적

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [internalError, setInternalError] = useState<ThreeError | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isSceneLoading, setIsSceneLoading] = useState<boolean>(false);

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

      // 로딩 시작 알림
      onLoadingChange?.(true, {
        step: 1,
        totalSteps: 2,
        message: '렌더러 초기화 중...',
      });

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
          // Scene이 없으면 로딩 완료
          if (!scene) {
            onLoadingChange?.(false);
          }
        }
      } catch (err) {
        console.error('Error initializing Three.js manager:', err);
        if (isMounted) {
          const error: ThreeError = {
            code: 'INIT_FAILED',
            message: 'Three.js 렌더러 초기화에 실패했습니다.',
            details: err instanceof Error ? err.message : 'Unknown error',
          };
          setInternalError(error);
          onError?.(error);
          onLoadingChange?.(false);
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

  // 명령형 API 노출 (ref를 통해 접근)
  useImperativeHandle(ref, () => ({
    removeAsset: (assetId: string | number) => {
      if (managerRef.current) {
        managerRef.current.removeAsset(assetId);
      }
    },
    updateAssetTransform: (assetId: string | number, transform: Transform) => {
      if (managerRef.current) {
        managerRef.current.updateAssetTransform(assetId, transform);
      }
    },
    updateLightParams: (assetId: string | number, lightParams: PointLightParams | RectLightParams) => {
      if (managerRef.current) {
        managerRef.current.updateLightParams(assetId, lightParams);
      }
    },
    addAsset: async (asset: SceneAsset) => {
      if (managerRef.current) {
        if (asset.type === 'object') {
          await managerRef.current.loadAsset(asset);
        } else if (asset.type === 'point-light' || asset.type === 'rect-light') {
          managerRef.current.loadLightAsset(asset);
        }
      }
    },
    setGizmoMode: (mode: 'translate' | 'rotate' | 'scale') => {
      if (managerRef.current) {
        managerRef.current.setGizmoMode(mode);
      }
    },
    selectObject: (assetId: string | number | null) => {
      if (managerRef.current) {
        managerRef.current.selectObjectByAssetId(assetId);
      }
    },
  }), []);

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
  // IMPORTANT: scene.id가 변경된 경우에만 전체 재로드
  // 속성(transform 등)만 변경된 경우 updateAssetTransform 등의 API 사용
  useEffect(() => {
    if (!managerRef.current || !scene || !isInitialized) return;

    // 이미 같은 Scene ID가 로드되어 있으면 스킵
    // (속성 변경은 updateAssetTransform 등 명령형 API로 처리됨)
    if (loadedSceneIdRef.current === scene.id) {
      console.log('[ThreeRenderer] Scene ID unchanged, skipping reload');
      return;
    }

    async function loadSceneData() {
      setIsSceneLoading(true);

      // 로딩 시작 알림
      onLoadingChange?.(true, {
        step: 2,
        totalSteps: 2,
        message: '공간 불러오는 중...',
      });

      try {
        // ✅ Use ThreeSceneAdapter to convert SceneFrontend → Three.js commands
        const sceneFrontend = scene as SceneFrontend;
        if (!sceneFrontend.room || !sceneFrontend.sunSettings) {
          console.warn('[ThreeRenderer] Scene is not SceneFrontend, skipping load');
          setIsSceneLoading(false);
          onLoadingChange?.(false);
          return;
        }

        const loadResult = await ThreeSceneAdapter.loadSceneToManager(sceneFrontend, managerRef.current!);

        // Scene ID 저장
        loadedSceneIdRef.current = scene.id;

        // Room 로드 실패 시 에러 표시 (심각한 오류)
        if (!loadResult.roomLoaded) {
          console.error('[ThreeRenderer] Room failed to load');
          const error: ThreeError = {
            code: 'ROOM_LOAD_FAILED',
            message: '방(Room) 모델 로드에 실패했습니다.',
            details: '방 모델 파일이 없거나 손상되었을 수 있습니다.',
          };
          setInternalError(error);
          onError?.(error);
          setIsSceneLoading(false);
          onLoadingChange?.(false);
          return;
        }

        // 개별 asset 로드 실패 경고 (부분 성공)
        if (loadResult.failedAssets.length > 0) {
          console.warn(`[ThreeRenderer] ${loadResult.failedAssets.length} asset(s) failed to load`);
          loadResult.failedAssets.forEach((failed) => {
            console.warn(`  - ${failed.assetId}: ${failed.error}`);
          });
        }

        // 로딩 완료
        setIsSceneLoading(false);
        onLoadingChange?.(false);
      } catch (err) {
        console.error('[ThreeRenderer] Failed to load scene:', err);
        const error: ThreeError = {
          code: 'SCENE_LOAD_FAILED',
          message: 'Scene 로드 중 오류가 발생했습니다.',
          details: err instanceof Error ? err.message : 'Unknown error',
        };
        setInternalError(error);
        onError?.(error);
        setIsSceneLoading(false);
        onLoadingChange?.(false);
      }
    }

    loadSceneData();
  }, [scene?.id, isInitialized, onLoadingChange, onError]); // scene.id만 dependency로 사용

  // 에러가 있으면 에러 정보만 내부에 표시하지 않음 (부모가 처리)
  // internalError는 onError 콜백으로 전달됨

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
    </div>
  );
});

export default ThreeRenderer;
