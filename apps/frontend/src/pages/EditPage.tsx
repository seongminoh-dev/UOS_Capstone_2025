/**
 * EditPage - 3D 오브젝트 편집 화면
 *
 * 3분할 레이아웃:
 * ┌──────────────────────────────────────────────────────────┐
 * │ EditPageHeader (84px)                                    │
 * ├────────────┬──────────────────────────────┬──────────────┤
 * │ LeftPanel  │  CanvasRenderer              │ RightPanel   │
 * │ (280px)    │  (WebGPU/Three.js)           │ (320px)      │
 * │            │  + Overlays                  │              │
 * └────────────┴──────────────────────────────┴──────────────┘
 *
 * - LeftPanel: 오브젝트 추가 팔레트 + 오브젝트 트리
 * - Canvas: 3D 렌더러 + Gizmo 모드 선택 + 카메라 도움말
 * - RightPanel: Inspector (선택된 오브젝트 속성 편집)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ThreeRenderer from '../components/ThreeRenderer';
import type { ThreeRendererHandle, ThreeLoadingProgress, ThreeError } from '../components/ThreeRenderer';
import ErrorBoundary from '../components/ErrorBoundary';
import { useToast, Modal, Button, GlobalLoadingOverlay, GlobalErrorOverlay } from '../components/common';
import type { SceneMode, LoadingProgress } from '../components/common';
import {
  EditPageHeader,
  AddObjectPalette,
  ObjectTree,
  InspectorPanel,
  CameraHelpOverlay,
  ViewportInfo,
  GizmoModeSelector,
} from '../components/edit';
import type { GizmoMode } from '../components/edit';
import type {
  SceneFrontend,
  Transform,
  PointLightParams,
  RectLightParams,
  DirectionalLightParams,
} from '../graphics-core/service/Scene';
import { useSceneRepository } from '../stores/sceneRepository';
import { getDefaultTemplate } from '../data/templates';
import { getAssetsByCategory, getAssetMetadata, getRoomConfig } from '../assets/AssetRegistry';
import type { SceneId } from '../stores/sceneRepository';
import './EditPage.css';

export default function EditPage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // URL 경로 분석
  const isNewMode = location.pathname === '/editor/new' || location.pathname === '/edit';
  const isSceneMode = location.pathname.startsWith('/editor/scene/') && !!sceneId;

  // ========== UI 상태 ==========
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [hiddenAssetIds, setHiddenAssetIds] = useState<Set<string | number>>(new Set());
  const [selectedAssetId, setSelectedAssetId] = useState<string | number | null>(null);
  const [rendererKey, setRendererKey] = useState(0);

  // ThreeRenderer 명령형 핸들 (ref)
  const threeRendererRef = useRef<ThreeRendererHandle>(null);

  // ========== 로딩/에러 상태 ==========
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  const [rendererError, setRendererError] = useState<ThreeError | null>(null);

  // ========== 모달 상태 ==========
  const [showSceneSelectModal, setShowSceneSelectModal] = useState(false);
  const [showCreateSceneModal, setShowCreateSceneModal] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [selectedRoomMesh, setSelectedRoomMesh] = useState('');

  // ========== Scene 상태 (기존 비즈니스 로직 유지) ==========
  const { scenes, loadScenes, cloneForEdit, saveScene, getSceneById } = useSceneRepository();
  const [currentSceneId, setCurrentSceneId] = useState<SceneId | null>(null);
  const [editingScene, setEditingScene] = useState<SceneFrontend | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 사용 가능한 Room 목록
  const availableRooms = getAssetsByCategory('room');

  // ErrorBoundary 리셋 시 렌더러 재마운트
  const handleErrorReset = useCallback(() => {
    setRendererKey((prev) => prev + 1);
  }, []);

  // ========== 초기화 ==========
  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  useEffect(() => {
    if (initialized) return;

    // URL 기반 라우팅 우선
    if (isSceneMode && sceneId) {
      // /editor/scene/:sceneId → 기존 Scene 편집
      const parsedId = /^\d+$/.test(sceneId) ? parseInt(sceneId, 10) : sceneId;
      const foundScene = getSceneById(parsedId);

      if (foundScene) {
        setCurrentSceneId(foundScene.id);
        setEditingScene(JSON.parse(JSON.stringify(foundScene)));
        setShowSceneSelectModal(false);
        setShowCreateSceneModal(false);
        setIsDirty(false);
        setInitialized(true);
      } else if (scenes.length > 0) {
        // scenes 로드 후에도 못 찾으면 모달 표시
        toast.warning('해당 Scene을 찾을 수 없습니다.');
        setShowSceneSelectModal(true);
        setInitialized(true);
      }
      // scenes가 아직 로드 안됐으면 대기 (initialized = false 유지)
      return;
    }

    if (isNewMode) {
      // /editor/new 또는 /edit → 새 Scene 생성
      // location.state?.createNew가 있으면 바로 생성 모달
      if (location.state?.createNew) {
        setNewSceneName(`새 Scene ${scenes.length + 1}`);
        setNewSceneDescription('');
        setSelectedRoomMesh(availableRooms[0]?.meshName || 'TestScene');
        setShowSceneSelectModal(false);
        setShowCreateSceneModal(true);
        setInitialized(true);
      } else if (location.state?.scene) {
        // location.state로 Scene이 전달된 경우 (하위호환)
        const passedScene = location.state.scene as SceneFrontend;
        setCurrentSceneId(passedScene.id);
        setEditingScene(JSON.parse(JSON.stringify(passedScene)));
        setShowSceneSelectModal(false);
        setShowCreateSceneModal(false);
        setIsDirty(false);
        setInitialized(true);
      } else {
        // 아무것도 없으면 선택 모달
        setShowSceneSelectModal(true);
        setInitialized(true);
      }
      return;
    }

    // 기본: 선택 모달
    setShowSceneSelectModal(true);
    setInitialized(true);
  }, [location.state, location.pathname, scenes.length, availableRooms, initialized, isNewMode, isSceneMode, sceneId, getSceneById, toast]);

  // 브라우저 닫기 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '저장하지 않은 변경사항이 있습니다.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ========== 단축키 처리 ==========
  // Gizmo 모드 변경 핸들러 (React + Three.js 동기화)
  const handleGizmoModeChange = useCallback((mode: GizmoMode) => {
    setGizmoMode(mode);
    threeRendererRef.current?.setGizmoMode(mode);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Input/Textarea/Select/ContentEditable에서 키보드 입력 중일 때는 단축키 무시
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'g':
          handleGizmoModeChange('translate');
          break;
        case 'r':
          handleGizmoModeChange('rotate');
          break;
        // S키는 WASDQE 카메라 이동에서 사용됨 (뒤로 이동)
        // 크기 조절은 +/- 키로 ThreeSceneManager에서 처리
        case 'escape':
          // React 상태와 Three.js 선택 모두 해제
          setSelectedAssetId(null);
          threeRendererRef.current?.selectObject(null);
          break;
        case 'delete':
        case 'backspace':
          event.preventDefault();
          handleDeleteSelectedObject();
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleDuplicateSelectedObject();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAssetId, editingScene, handleGizmoModeChange]);

  // ========== 모달 핸들러 ==========
  const handleOpenCreateSceneModal = () => {
    setNewSceneName(`새 Scene ${scenes.length + 1}`);
    setNewSceneDescription('');
    setSelectedRoomMesh(availableRooms[0]?.meshName || 'TestScene');
    setShowSceneSelectModal(false);
    setShowCreateSceneModal(true);
  };

  const handleCreateNewScene = () => {
    if (!newSceneName.trim()) {
      toast.warning('Scene 이름을 입력해주세요.');
      return;
    }
    if (!selectedRoomMesh) {
      toast.warning('방을 선택해주세요.');
      return;
    }

    const template = getDefaultTemplate();

    const roomConfig = getRoomConfig(selectedRoomMesh);

    const newScene: SceneFrontend = {
      ...JSON.parse(JSON.stringify(template)),
      id: `new_${Date.now()}`,
      name: newSceneName,
      description: newSceneDescription,
      room: {
        meshName: selectedRoomMesh,
        locked: true,
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: roomConfig.scale,
        },
      },
      camera: {
        position: roomConfig.camera.position,
        target: roomConfig.camera.target,
        fov: roomConfig.camera.fov,
      },
      assets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentSceneId(null);
    setEditingScene(newScene);
    setShowCreateSceneModal(false);
    setIsDirty(true);
  };

  const handleSelectFromList = (selectedScene: SceneFrontend) => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?')) {
      return;
    }
    setCurrentSceneId(selectedScene.id);
    setEditingScene(cloneForEdit(selectedScene.id));
    setShowSceneSelectModal(false);
    setIsDirty(false);
  };

  // ========== 저장/취소 핸들러 ==========
  const handleCancel = () => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 나가시겠습니까?')) {
      return;
    }
    navigate('/simulator/list');
  };

  // 모드 변경 전 확인 (저장하지 않은 변경사항 경고)
  const handleBeforeModeChange = useCallback(
    (_newMode: SceneMode): boolean => {
      if (isDirty) {
        return confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?');
      }
      return true;
    },
    [isDirty]
  );

  const handleSave = async () => {
    if (!editingScene) return;
    try {
      const saved = await saveScene(editingScene);
      setCurrentSceneId(saved.id);
      setEditingScene(cloneForEdit(saved.id));
      setIsDirty(false);
      toast.success('저장되었습니다.');

      // URL 업데이트 (새 Scene이면 ID가 바뀔 수 있음)
      if (isNewMode && saved.id !== editingScene.id) {
        navigate(`/editor/scene/${saved.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save scene:', error);
      toast.error('Scene 저장에 실패했습니다.');
    }
  };

  const handleSaveAndExit = async () => {
    if (!editingScene) return;
    try {
      const saved = await saveScene(editingScene);
      // 저장 후 해당 Scene의 시뮬레이터로 이동
      navigate(`/simulator/scene/${saved.id}`);
    } catch (error) {
      console.error('Failed to save scene:', error);
      toast.error('Scene 저장에 실패했습니다.');
    }
  };

  // ========== Selection 핸들러 ==========
  // Three.js 캔버스에서 선택 변경 시 (React 상태만 업데이트)
  const handleSelectionChange = (assetId: string | number | null) => {
    setSelectedAssetId(assetId);
  };

  // ObjectTree에서 선택 시 (React + Three.js 동기화)
  const handleSelectAssetFromTree = useCallback((assetId: string | number | null) => {
    setSelectedAssetId(assetId);
    threeRendererRef.current?.selectObject(assetId);
  }, []);

  // ========== Transform 핸들러 ==========
  const handleTransformChange = (assetId: string | number, transform: Transform) => {
    if (!editingScene) return;
    const updatedAssets = editingScene.assets.map((asset) =>
      asset.id === assetId ? { ...asset, transform } : asset
    );
    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);
  };

  const handlePropertyChange = useCallback(
    (assetId: string | number, property: 'position' | 'rotation' | 'scale', axis: number, value: number) => {
      if (!editingScene) return;
      const updatedAssets = editingScene.assets.map((asset) => {
        if (asset.id === assetId && asset.transform) {
          const newTransform = { ...asset.transform };
          newTransform[property] = [...newTransform[property]] as [number, number, number];
          newTransform[property][axis] = value;

          // Three.js 동기화
          threeRendererRef.current?.updateAssetTransform(assetId, newTransform);

          return { ...asset, transform: newTransform };
        }
        return asset;
      });
      setEditingScene({ ...editingScene, assets: updatedAssets });
      setIsDirty(true);
    },
    [editingScene]
  );

  const handleUniformScaleChange = useCallback(
    (assetId: string | number, value: number) => {
      if (!editingScene) return;
      const updatedAssets = editingScene.assets.map((asset) => {
        if (asset.id === assetId && asset.transform) {
          const newTransform = { ...asset.transform };
          newTransform.scale = [value, value, value];

          // Three.js 동기화
          threeRendererRef.current?.updateAssetTransform(assetId, newTransform);

          return { ...asset, transform: newTransform };
        }
        return asset;
      });
      setEditingScene({ ...editingScene, assets: updatedAssets });
      setIsDirty(true);
    },
    [editingScene]
  );

  // ========== Light 핸들러 ==========
  const handleLightParamsChange = (
    assetId: string | number,
    lightParams: PointLightParams | RectLightParams | DirectionalLightParams
  ) => {
    if (!editingScene) return;
    const updatedAssets = editingScene.assets.map((asset) =>
      asset.id === assetId ? { ...asset, lightParams } : asset
    );
    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);
  };

  const handleLightParamChange = useCallback(
    (assetId: string | number, paramPath: string, value: number | [number, number, number]) => {
      if (!editingScene) return;
      const updatedAssets = editingScene.assets.map((asset) => {
        if (asset.id === assetId && asset.lightParams) {
          const newLightParams = { ...asset.lightParams };
          if (paramPath.includes('.')) {
            const [prop, index] = paramPath.split('.');
            const propKey = prop as keyof typeof newLightParams;
            if (Array.isArray(newLightParams[propKey])) {
              const arr = [...(newLightParams[propKey] as number[])];
              arr[parseInt(index)] = value as number;
              (newLightParams as Record<string, unknown>)[propKey] = arr;
            }
          } else {
            (newLightParams as Record<string, unknown>)[paramPath] = value;
          }

          // Three.js 동기화 (PointLight, RectLight만)
          if (asset.type === 'point-light' || asset.type === 'rect-light') {
            threeRendererRef.current?.updateLightParams(
              assetId,
              newLightParams as PointLightParams | RectLightParams
            );
          }

          return { ...asset, lightParams: newLightParams };
        }
        return asset;
      });
      setEditingScene({ ...editingScene, assets: updatedAssets });
      setIsDirty(true);
    },
    [editingScene]
  );

  // ========== Object CRUD 핸들러 ==========
  const handleAddObject = async (meshName: string) => {
    if (!editingScene) return;
    const newId = `${meshName.toLowerCase()}_${Date.now()}`;
    const newAsset = {
      id: newId,
      type: 'object' as const,
      meshName,
      transform: {
        position: [0, 0, -2] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
      },
    };

    // Three.js에 실시간 추가
    await threeRendererRef.current?.addAsset(newAsset);

    setEditingScene({
      ...editingScene,
      assets: [...editingScene.assets, newAsset],
    });
    setSelectedAssetId(newId);
    setIsDirty(true);
  };

  const handleAddLight = (lightType: 'point-light' | 'rect-light') => {
    if (!editingScene) return;
    const newId = `${lightType}_${Date.now()}`;

    const newLight =
      lightType === 'point-light'
        ? {
            id: newId,
            type: 'point-light' as const,
            lightParams: {
              position: [0, 3, 0] as [number, number, number],
              color: [1, 1, 1] as [number, number, number],
              intensity: 10.0,
            },
          }
        : {
            id: newId,
            type: 'rect-light' as const,
            lightParams: {
              position: [0, 3, 0] as [number, number, number],
              u: [0.5, 0, 0] as [number, number, number],
              v: [0, 0, 0.5] as [number, number, number],
              color: [1, 1, 1] as [number, number, number],
              intensity: 20.0,
            },
          };

    // Three.js에 실시간 추가
    threeRendererRef.current?.addAsset(newLight);

    setEditingScene({
      ...editingScene,
      assets: [...editingScene.assets, newLight],
    });
    setSelectedAssetId(newId);
    setIsDirty(true);
  };

  const handleDeleteSelectedObject = useCallback(() => {
    if (!editingScene || !selectedAssetId) return;

    const assetToDelete = editingScene.assets.find((a) => a.id === selectedAssetId);
    if (assetToDelete?.type === 'object' && assetToDelete.meshName === editingScene.room.meshName) {
      toast.warning('기본 방은 삭제할 수 없습니다.');
      return;
    }

    // Three.js에서 제거
    threeRendererRef.current?.removeAsset(selectedAssetId);

    const updatedAssets = editingScene.assets.filter((asset) => asset.id !== selectedAssetId);
    setEditingScene({ ...editingScene, assets: updatedAssets });
    setSelectedAssetId(null);
    setIsDirty(true);
  }, [editingScene, selectedAssetId, toast]);

  const handleDeleteAssetById = useCallback(
    (assetId: string | number) => {
      if (!editingScene) return;

      const assetToDelete = editingScene.assets.find((a) => a.id === assetId);
      if (assetToDelete?.type === 'object' && assetToDelete.meshName === editingScene.room.meshName) {
        toast.warning('기본 방은 삭제할 수 없습니다.');
        return;
      }

      // Three.js에서 제거
      threeRendererRef.current?.removeAsset(assetId);

      const updatedAssets = editingScene.assets.filter((asset) => asset.id !== assetId);
      setEditingScene({ ...editingScene, assets: updatedAssets });
      if (selectedAssetId === assetId) {
        setSelectedAssetId(null);
      }
      setIsDirty(true);
    },
    [editingScene, selectedAssetId, toast]
  );

  const handleDuplicateSelectedObject = useCallback(async () => {
    if (!editingScene || !selectedAssetId) return;

    const asset = editingScene.assets.find((a) => a.id === selectedAssetId);
    if (!asset) return;

    const newId = `${asset.type}_${Date.now()}`;
    const duplicated = {
      ...JSON.parse(JSON.stringify(asset)),
      id: newId,
    };

    if (duplicated.transform) {
      duplicated.transform.position[0] += 0.5;
    }
    if (duplicated.lightParams && 'position' in duplicated.lightParams) {
      duplicated.lightParams.position[0] += 0.5;
    }

    // Three.js에 실시간 추가
    await threeRendererRef.current?.addAsset(duplicated);

    setEditingScene({
      ...editingScene,
      assets: [...editingScene.assets, duplicated],
    });
    setSelectedAssetId(newId);
    setIsDirty(true);
  }, [editingScene, selectedAssetId]);

  // ========== Visibility 핸들러 ==========
  const handleToggleVisibility = (assetId: string | number) => {
    setHiddenAssetIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  // ========== 선택된 오브젝트 정보 ==========
  const selectedAsset = editingScene?.assets.find((a) => a.id === selectedAssetId) || null;
  const selectedAssetName = selectedAsset
    ? selectedAsset.type === 'object'
      ? getAssetMetadata(selectedAsset.meshName || '')?.name || selectedAsset.meshName || '오브젝트'
      : selectedAsset.type === 'point-light'
      ? '포인트 조명'
      : '면광원'
    : undefined;

  // ========== 카메라 저장 핸들러 ==========
  const handleSaveCamera = useCallback(
    (camera: { position: [number, number, number]; target: [number, number, number]; fov: number }) => {
      if (!editingScene) return;

      setEditingScene({
        ...editingScene,
        camera: {
          position: camera.position,
          target: camera.target,
          fov: camera.fov,
        },
      });
      setIsDirty(true);
      toast.success('카메라 시점이 저장되었습니다.');
    },
    [editingScene, toast]
  );

  // ========== 로딩/에러 핸들러 ==========
  const handleLoadingChange = useCallback((loading: boolean, progress?: ThreeLoadingProgress) => {
    setIsLoading(loading);
    if (progress) {
      setLoadingProgress({
        step: progress.step,
        totalSteps: progress.totalSteps,
        message: progress.message,
        loadedCount: progress.loadedCount,
        totalCount: progress.totalCount,
        currentAssetName: progress.currentAssetName,
      });
    } else {
      setLoadingProgress(null);
    }
  }, []);

  const handleRendererError = useCallback((error: ThreeError | null) => {
    setRendererError(error);
    if (error) {
      setIsLoading(false);
    }
  }, []);

  const handleRetryRenderer = useCallback(() => {
    setRendererError(null);
    setIsLoading(true);
    setRendererKey((prev) => prev + 1);
  }, []);

  // ========== 렌더링 ==========
  return (
    <>
      {/* 공간 선택 모달 */}
      <Modal isOpen={showSceneSelectModal} onClose={() => navigate('/simulator/list')} title="공간 선택" size="md">
        <div className="scene-select-modal">
          <p className="scene-select-modal__description">편집할 공간을 선택하거나 새로 만드세요.</p>
          <Button variant="primary" fullWidth onClick={handleOpenCreateSceneModal}>
            새 공간 만들기
          </Button>
          {scenes.length > 0 && (
            <>
              <div className="scene-select-modal__divider">또는</div>
              <div className="scene-select-modal__list">
                <h3 className="scene-select-modal__subtitle">기존 공간 불러오기</h3>
                {scenes.map((s) => (
                  <button key={s.id} className="scene-select-modal__item" onClick={() => handleSelectFromList(s)}>
                    <div className="scene-select-modal__item-info">
                      <span className="scene-select-modal__item-icon">🏠</span>
                      <span className="scene-select-modal__item-name">{s.name}</span>
                    </div>
                    <span className="scene-select-modal__item-action">선택</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* 새 공간 생성 모달 */}
      <Modal
        isOpen={showCreateSceneModal}
        onClose={() => navigate('/simulator/list')}
        title="새 공간 만들기"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => navigate('/simulator/list')}>
              취소
            </Button>
            <Button variant="primary" onClick={handleCreateNewScene}>
              생성
            </Button>
          </>
        }
      >
        <div className="create-scene-modal">
          <div className="form-group">
            <label className="form-label">공간 이름 *</label>
            <input
              type="text"
              className="form-input"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="공간 이름을 입력하세요"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">방 선택 *</label>
            <p className="form-hint">방은 공간 생성 후 변경할 수 없습니다.</p>
            <div className="room-select-grid">
              {availableRooms.map((room) => (
                <button
                  key={room.meshName}
                  type="button"
                  className={`room-select-card ${selectedRoomMesh === room.meshName ? 'room-select-card--selected' : ''}`}
                  onClick={() => setSelectedRoomMesh(room.meshName)}
                >
                  <div className="room-select-card__icon">{room.icon}</div>
                  <div className="room-select-card__name">{room.name}</div>
                  {room.description && <div className="room-select-card__description">{room.description}</div>}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">설명</label>
            <textarea
              className="form-textarea"
              value={newSceneDescription}
              onChange={(e) => setNewSceneDescription(e.target.value)}
              placeholder="공간에 대한 설명을 입력하세요 (선택사항)"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* 메인 레이아웃 */}
      <div className="edit-page">
        {/* Header */}
        <EditPageHeader
          title={editingScene?.name || '공간'}
          sceneId={currentSceneId}
          status={isDirty ? 'modified' : 'synced'}
          onBack={handleCancel}
          onCancel={handleCancel}
          onSave={handleSaveAndExit}
          canSave={isDirty}
          onBeforeModeChange={handleBeforeModeChange}
        />

        <div className="edit-page__layout">
          {/* ========== LeftPanel ========== */}
          <div className="edit-page__left-panel">
            <AddObjectPalette onAddObject={handleAddObject} onAddLight={handleAddLight} />
            <ObjectTree
              assets={editingScene?.assets || []}
              roomMeshName={editingScene?.room.meshName || ''}
              selectedAssetId={selectedAssetId}
              hiddenAssetIds={hiddenAssetIds}
              onSelectAsset={handleSelectAssetFromTree}
              onToggleVisibility={handleToggleVisibility}
              onDeleteAsset={handleDeleteAssetById}
            />
          </div>

          {/* ========== Canvas ========== */}
          <div className="edit-page__canvas">
            <ErrorBoundary key={rendererKey} fallbackTitle="Three.js 렌더링 오류" onReset={handleErrorReset}>
              <ThreeRenderer
                ref={threeRendererRef}
                className="three-canvas"
                scene={editingScene}
                onSelectionChange={handleSelectionChange}
                onTransformChange={handleTransformChange}
                onLightParamsChange={handleLightParamsChange}
                onSaveCamera={handleSaveCamera}
                onLoadingChange={handleLoadingChange}
                onError={handleRendererError}
              />
            </ErrorBoundary>

            {/* Canvas Overlays (로딩/에러 중에는 숨김) */}
            {!isLoading && !rendererError && (
              <>
                <GizmoModeSelector mode={gizmoMode} onModeChange={handleGizmoModeChange} hasSelection={selectedAssetId !== null} />
                <CameraHelpOverlay onSaveCamera={() => {
                  // CameraHelpOverlay 버튼 클릭 시 V키 이벤트를 시뮬레이트
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
                }} />
                <ViewportInfo gizmoMode={gizmoMode} selectedObjectName={selectedAssetName} />
              </>
            )}
          </div>

          {/* ========== RightPanel ========== */}
          <div className="edit-page__right-panel">
            <InspectorPanel
              asset={selectedAsset}
              onPropertyChange={handlePropertyChange}
              onUniformScaleChange={handleUniformScaleChange}
              onLightParamChange={handleLightParamChange}
              onDelete={handleDeleteSelectedObject}
            />
          </div>
        </div>
      </div>

      {/* ========== 전역 로딩 오버레이 ========== */}
      <GlobalLoadingOverlay
        isLoading={isLoading && !rendererError}
        progress={loadingProgress}
        defaultMessage="편집기 준비 중..."
        defaultSubMessage="잠시만 기다려주세요"
      />

      {/* ========== 전역 에러 오버레이 ========== */}
      {rendererError && (
        <GlobalErrorOverlay
          errorCode={rendererError.code}
          errorMessage={rendererError.message}
          errorDetails={rendererError.details}
          onRetry={handleRetryRenderer}
          onBack={() => navigate('/simulator/list')}
        />
      )}
    </>
  );
}
