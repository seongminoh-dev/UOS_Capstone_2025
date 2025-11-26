import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ThreeRenderer from '../components/ThreeRenderer';
import type { SceneFrontend, Transform, PointLightParams, RectLightParams, DirectionalLightParams, RoomSettings } from '../graphics-core/service/Scene';
import { useSceneRepository } from '../stores/sceneRepository';
import { DUMMY_SCENES } from '../graphics-core/data/DummyScenes';
import { isDummyScene } from '../utils/sceneId';
import { getFurnitureBySubCategory, getAssetsByCategory, getAssetMetadata, isRequiredAsset } from '../assets/AssetRegistry';
import type { FurnitureSubCategory } from '../assets/AssetTypes';
import type { SceneId } from '../stores/sceneRepository';
import './EditPage.css';

export default function EditPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'objects' | 'lights'>('info');
  const [furnitureSubTab, setFurnitureSubTab] = useState<FurnitureSubCategory>('seating');
  const [showSceneSelectModal, setShowSceneSelectModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | number | null>(null);

  // 새 Scene 생성 모달 상태
  const [showCreateSceneModal, setShowCreateSceneModal] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [selectedRoomMesh, setSelectedRoomMesh] = useState('');

  // 사용 가능한 Room 목록
  const availableRooms = getAssetsByCategory('room');

  // SceneRepository (단일 진실 공급원)
  const { scenes, loadScenes, cloneForEdit, saveScene } = useSceneRepository();

  // 편집 세션 상태
  const [currentSceneId, setCurrentSceneId] = useState<SceneId | null>(null);
  const [editingScene, setEditingScene] = useState<SceneFrontend | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Scene 목록 로드
    loadScenes();
  }, [loadScenes]);

  useEffect(() => {
    // 전달받은 Scene 데이터 확인
    if (location.state?.scene) {
      const passedScene = location.state.scene as SceneFrontend;
      setCurrentSceneId(passedScene.id);
      // 깊은 복사본으로 편집 시작
      setEditingScene(JSON.parse(JSON.stringify(passedScene)));
      setShowSceneSelectModal(false);
      setIsDirty(false);
    } else {
      // Scene이 없으면 선택 모달 표시
      setShowSceneSelectModal(true);
    }
  }, [location.state]);

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

  // 새 Scene 생성 모달 열기
  const handleOpenCreateSceneModal = () => {
    setNewSceneName(`새 Scene ${scenes.length + 1}`);
    setNewSceneDescription('');
    setSelectedRoomMesh(availableRooms[0]?.meshName || 'TestScene');
    setShowSceneSelectModal(false);
    setShowCreateSceneModal(true);
  };

  // 새 Scene 생성 (방 선택 포함)
  const handleCreateNewScene = () => {
    if (!newSceneName.trim()) {
      alert('Scene 이름을 입력해주세요.');
      return;
    }

    if (!selectedRoomMesh) {
      alert('방을 선택해주세요.');
      return;
    }

    // 첫 번째 DummyScene을 템플릿으로 사용
    const template = DUMMY_SCENES[0];
    if (!template) return;

    // 선택한 Room으로 RoomSettings 생성
    const roomSettings: RoomSettings = {
      meshName: selectedRoomMesh,
      locked: true,
      transform: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    };

    const newScene: SceneFrontend = {
      ...JSON.parse(JSON.stringify(template)),
      id: `new_${Date.now()}`, // 임시 ID (저장 시 변경됨)
      name: newSceneName,
      description: newSceneDescription,
      room: roomSettings, // 선택한 Room 적용
      assets: [], // 새 Scene은 빈 assets로 시작
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentSceneId(null); // 새 Scene은 아직 ID 없음
    setEditingScene(newScene);
    setShowCreateSceneModal(false);
    setIsDirty(true); // 새로 만들었으므로 저장 필요
  };

  // Scene 목록에서 선택
  const handleSelectFromList = (selectedScene: SceneFrontend) => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?')) {
      return;
    }
    setCurrentSceneId(selectedScene.id);
    setEditingScene(cloneForEdit(selectedScene.id));
    setShowSceneSelectModal(false);
    setIsDirty(false);
  };

  const objectAssets = editingScene?.assets.filter((a) => a.type === 'object') || [];
  const lightAssets = editingScene?.assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  ) || [];

  // Scene 정보 업데이트 핸들러
  const handleSceneNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingScene) return;
    setEditingScene({ ...editingScene, name: e.target.value });
    setIsDirty(true);
  };

  const handleSceneDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!editingScene) return;
    setEditingScene({ ...editingScene, description: e.target.value });
    setIsDirty(true);
  };

  // 태양광 설정 업데이트 핸들러
  const handleSunTimeChange = (value: number) => {
    if (!editingScene) return;
    setEditingScene({
      ...editingScene,
      sunSettings: { ...editingScene.sunSettings, timeOfDay: value },
    });
    setIsDirty(true);
  };

  const handleDaytimeToggle = (isDaytime: boolean) => {
    if (!editingScene) return;
    setEditingScene({
      ...editingScene,
      sunSettings: { ...editingScene.sunSettings, isDaytime },
    });
    setIsDirty(true);
  };

  const handleSeasonChange = (season: 'spring' | 'summer' | 'autumn' | 'winter') => {
    if (!editingScene) return;
    setEditingScene({
      ...editingScene,
      sunSettings: { ...editingScene.sunSettings, season },
    });
    setIsDirty(true);
  };

  const handleRoomOrientationChange = (orientation: 'north' | 'south' | 'east' | 'west') => {
    if (!editingScene) return;
    setEditingScene({
      ...editingScene,
      sunSettings: { ...editingScene.sunSettings, roomOrientation: orientation },
    });
    setIsDirty(true);
  };

  const handleCancel = () => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 나가시겠습니까?')) {
      return;
    }
    navigate('/');
  };

  const handleSave = async () => {
    if (!editingScene) return;

    try {
      // SceneRepository로 저장 (DummyScene이면 새 Scene 생성됨)
      const saved = await saveScene(editingScene);
      setCurrentSceneId(saved.id);
      setEditingScene(cloneForEdit(saved.id));
      setIsDirty(false);
      alert('저장되었습니다.');
    } catch (error) {
      console.error('Failed to save scene:', error);
      alert('Scene 저장에 실패했습니다.');
    }
  };

  const handleSaveAndExit = async () => {
    if (!editingScene) return;

    try {
      await saveScene(editingScene);
      navigate('/');
    } catch (error) {
      console.error('Failed to save scene:', error);
      alert('Scene 저장에 실패했습니다.');
    }
  };

  // Selection 변경 핸들러
  const handleSelectionChange = (assetId: string | number | null) => {
    console.log('[EditPage] Selection changed:', assetId);
    setSelectedAssetId(assetId);
  };

  // Transform 변경 핸들러
  const handleTransformChange = (assetId: string | number, transform: Transform) => {
    console.log('[EditPage] Transform changed:', assetId, transform);

    if (!editingScene) return;

    // Scene의 asset Transform 업데이트
    const updatedAssets = editingScene.assets.map((asset) => {
      if (asset.id === assetId) {
        return { ...asset, transform };
      }
      return asset;
    });

    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);
  };

  // Light Params 변경 핸들러 (Gizmo로 Light 이동/회전 시)
  const handleLightParamsChange = (assetId: string | number, lightParams: PointLightParams | RectLightParams | DirectionalLightParams) => {
    console.log('[EditPage] Light params changed:', assetId, lightParams);

    if (!editingScene) return;

    // Scene의 asset lightParams 업데이트
    const updatedAssets = editingScene.assets.map((asset) => {
      if (asset.id === assetId) {
        return { ...asset, lightParams };
      }
      return asset;
    });

    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);
  };

  // 개별 Transform 속성 변경 핸들러
  const handlePropertyChange = useCallback((
    assetId: string | number,
    property: 'position' | 'rotation' | 'scale',
    axis: number,
    value: number
  ) => {
    if (!editingScene) return;

    const updatedAssets = editingScene.assets.map((asset) => {
      if (asset.id === assetId && asset.transform) {
        const newTransform = { ...asset.transform };
        newTransform[property] = [...newTransform[property]] as [number, number, number];
        newTransform[property][axis] = value;
        return { ...asset, transform: newTransform };
      }
      return asset;
    });

    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);
  }, [editingScene]);

  // Uniform Scale 변경 핸들러 (모든 축에 동일한 값 적용)
  const handleUniformScaleChange = useCallback((
    assetId: string | number,
    value: number
  ) => {
    if (!editingScene) return;

    const updatedAssets = editingScene.assets.map((asset) => {
      if (asset.id === assetId && asset.transform) {
        const newTransform = { ...asset.transform };
        newTransform.scale = [value, value, value];
        return { ...asset, transform: newTransform };
      }
      return asset;
    });

    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);
  }, [editingScene]);

  // Light params 변경 핸들러
  const handleLightParamChange = useCallback((
    assetId: string | number,
    paramPath: string,
    value: number | [number, number, number]
  ) => {
    if (!editingScene) return;

    const updatedAssets = editingScene.assets.map((asset) => {
      if (asset.id === assetId && asset.lightParams) {
        const newLightParams = { ...asset.lightParams };

        // Handle nested properties (e.g., "color.0" or "direction")
        if (paramPath.includes('.')) {
          const [prop, index] = paramPath.split('.');
          const propKey = prop as keyof typeof newLightParams;
          if (Array.isArray(newLightParams[propKey])) {
            const arr = [...(newLightParams[propKey] as number[])];
            arr[parseInt(index)] = value as number;
            (newLightParams as any)[propKey] = arr;
          }
        } else {
          (newLightParams as any)[paramPath] = value;
        }

        return { ...asset, lightParams: newLightParams };
      }
      return asset;
    });

    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);
  }, [editingScene]);

  // 오브젝트 추가 핸들러
  const handleAddObject = (meshName: string) => {
    if (!editingScene) return;

    // 고유 ID 생성
    const newId = `${meshName.toLowerCase()}_${Date.now()}`;

    // 기본 Transform (원점에서 약간 앞쪽에 배치)
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

    // Scene에 추가
    setEditingScene({
      ...editingScene,
      assets: [...editingScene.assets, newAsset],
    });
    setIsDirty(true);

    console.log('[EditPage] Added object:', meshName, newId);
  };

  // 조명 추가 핸들러
  const handleAddLight = (lightType: 'directional-light' | 'point-light' | 'rect-light') => {
    if (!editingScene) return;

    const newId = `${lightType}_${Date.now()}`;

    let newLight;
    if (lightType === 'directional-light') {
      newLight = {
        id: newId,
        type: 'directional-light' as const,
        lightParams: {
          direction: [0, -1, -1] as [number, number, number],
          color: [1, 1, 1] as [number, number, number],
          intensity: 5.0,
        },
      };
    } else if (lightType === 'point-light') {
      newLight = {
        id: newId,
        type: 'point-light' as const,
        lightParams: {
          position: [0, 3, 0] as [number, number, number],
          color: [1, 1, 1] as [number, number, number],
          intensity: 10.0,
        },
      };
    } else {
      newLight = {
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
    }

    setEditingScene({
      ...editingScene,
      assets: [...editingScene.assets, newLight],
    });
    setIsDirty(true);

    console.log('[EditPage] Added light:', lightType, newId);
  };

  // 오브젝트 삭제 핸들러
  const handleDeleteObject = useCallback(() => {
    if (!editingScene || !selectedAssetId) return;

    // room.meshName과 일치하는 오브젝트는 삭제 불가
    const assetToDelete = editingScene.assets.find((a) => a.id === selectedAssetId);
    if (assetToDelete && assetToDelete.type === 'object' && assetToDelete.meshName === editingScene.room.meshName) {
      alert('기본 방은 삭제할 수 없습니다.');
      return;
    }

    // Scene에서 제거
    const updatedAssets = editingScene.assets.filter((asset) => asset.id !== selectedAssetId);
    setEditingScene({ ...editingScene, assets: updatedAssets });
    setSelectedAssetId(null);
    setIsDirty(true);

    console.log('[EditPage] Deleted object:', selectedAssetId);
  }, [editingScene, selectedAssetId]);

  // 리스트에서 직접 Asset 삭제 핸들러
  const handleDeleteAssetById = useCallback((assetId: string) => {
    if (!editingScene) return;

    // room.meshName과 일치하는 오브젝트는 삭제 불가
    const assetToDelete = editingScene.assets.find((a) => a.id === assetId);
    if (assetToDelete && assetToDelete.type === 'object' && assetToDelete.meshName === editingScene.room.meshName) {
      alert('기본 방은 삭제할 수 없습니다.');
      return;
    }

    // Scene에서 제거
    const updatedAssets = editingScene.assets.filter((asset) => asset.id !== assetId);
    setEditingScene({ ...editingScene, assets: updatedAssets });
    setIsDirty(true);

    // 삭제된 asset이 선택되어 있었다면 선택 해제
    if (selectedAssetId === assetId) {
      setSelectedAssetId(null);
    }

    console.log('[EditPage] Deleted asset from list:', assetId);
  }, [editingScene, selectedAssetId]);

  // Delete/Backspace 키 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Input/Textarea에서는 삭제 동작 무시
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        event.preventDefault();
        handleDeleteObject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteObject]);

  return (
    <>
      <Header />

      {/* Scene 선택 모달 */}
      {showSceneSelectModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Scene 선택</h2>
              <button className="modal-close" onClick={() => navigate('/')}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ marginBottom: '20px', color: '#6B6B6B' }}>
                편집할 Scene을 선택하거나 새로 만드세요.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button
                  className="modal-button modal-save"
                  onClick={handleOpenCreateSceneModal}
                  style={{ width: '100%' }}
                >
                  새 Scene 만들기
                </button>

                {scenes.length > 0 && (
                  <>
                    <div style={{ textAlign: 'center', color: '#6B6B6B', margin: '8px 0' }}>
                      또는
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                        기존 Scene 불러오기
                      </h3>
                      {scenes.map((s) => (
                        <button
                          key={s.id}
                          className="asset-item clickable"
                          onClick={() => handleSelectFromList(s)}
                          style={{ marginBottom: '8px' }}
                        >
                          <div className="asset-info">
                            <span className="asset-icon">🎬</span>
                            <span className="asset-name">{s.name}</span>
                          </div>
                          <span className="asset-edit">선택</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 새 Scene 생성 모달 */}
      {showCreateSceneModal && (
        <div className="modal-overlay" onClick={() => navigate('/')}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '550px' }}
          >
            <div className="modal-header">
              <h2 className="modal-title">새 Scene 만들기</h2>
              <button
                className="modal-close"
                onClick={() => navigate('/')}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Scene 이름 *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                    placeholder="Scene 이름을 입력하세요"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">방 선택 *</label>
                  <p style={{ fontSize: '12px', color: '#6B6B6B', margin: '0 0 8px 0' }}>
                    방은 Scene 생성 후 변경할 수 없습니다.
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      maxHeight: '250px',
                      overflowY: 'auto',
                    }}
                  >
                    {availableRooms.map((room) => (
                      <button
                        key={room.meshName}
                        type="button"
                        onClick={() => setSelectedRoomMesh(room.meshName)}
                        style={{
                          padding: '12px',
                          border: selectedRoomMesh === room.meshName
                            ? '2px solid #2563EB'
                            : '1px solid #E5E5E5',
                          borderRadius: '8px',
                          backgroundColor: selectedRoomMesh === room.meshName
                            ? '#EFF6FF'
                            : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                          {room.icon}
                        </div>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>
                          {room.name}
                        </div>
                        {room.description && (
                          <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>
                            {room.description}
                          </div>
                        )}
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
                    placeholder="Scene에 대한 설명을 입력하세요 (선택사항)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="modal-button modal-cancel"
                onClick={() => navigate('/')}
              >
                취소
              </button>
              <button
                className="modal-button modal-save"
                onClick={handleCreateNewScene}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="edit-container">
        <div className="edit-layout">
          {/* Left side - Three.js Canvas (미리보기) */}
          <div className="preview-canvas" style={{ position: 'relative' }}>
            <ThreeRenderer
              className="three-canvas"
              scene={editingScene}
              onSelectionChange={handleSelectionChange}
              onTransformChange={handleTransformChange}
              onLightParamsChange={handleLightParamsChange}
            />

            {/* Selected Asset Info Panel */}
            {selectedAssetId && editingScene && (() => {
              const selectedAsset = editingScene.assets.find((a) => a.id === selectedAssetId);
              if (!selectedAsset) return null;

              const isObject = selectedAsset.type === 'object';
              const isLight = selectedAsset.type === 'directional-light' ||
                              selectedAsset.type === 'point-light' ||
                              selectedAsset.type === 'rect-light';

              const inputStyle = {
                width: '60px',
                padding: '2px 4px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '11px',
                textAlign: 'right' as const,
                // Remove number input arrows
                WebkitAppearance: 'none' as const,
                MozAppearance: 'textfield' as const,
              };

              return (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    minWidth: '280px',
                    maxWidth: '320px',
                    maxHeight: 'calc(100vh - 100px)',
                    overflowY: 'auto',
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #444' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00aaff', marginBottom: '4px' }}>
                      {isObject ? '선택된 오브젝트' : '선택된 조명'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {isObject ? selectedAsset.meshName : selectedAsset.type}
                    </div>
                  </div>

                  {/* Object Transform */}
                  {isObject && selectedAsset.transform && (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#ffa500', marginBottom: '6px', fontWeight: 'bold' }}>Position</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: '#888', width: '15px' }}>X:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedAsset.transform.position[0]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handlePropertyChange(selectedAsset.id, 'position', 0, value);
                            }}
                            style={inputStyle}
                          />
                          <span style={{ color: '#888', width: '15px' }}>Y:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedAsset.transform.position[1]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handlePropertyChange(selectedAsset.id, 'position', 1, value);
                            }}
                            style={inputStyle}
                          />
                          <span style={{ color: '#888', width: '15px' }}>Z:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedAsset.transform.position[2]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handlePropertyChange(selectedAsset.id, 'position', 2, value);
                            }}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#ff00ff', marginBottom: '6px', fontWeight: 'bold' }}>Rotation (°)</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: '#888', width: '15px' }}>X:</span>
                          <input
                            type="number"
                            step="1"
                            value={selectedAsset.transform.rotation[0]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handlePropertyChange(selectedAsset.id, 'rotation', 0, value);
                            }}
                            style={inputStyle}
                          />
                          <span style={{ color: '#888', width: '15px' }}>Y:</span>
                          <input
                            type="number"
                            step="1"
                            value={selectedAsset.transform.rotation[1]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handlePropertyChange(selectedAsset.id, 'rotation', 1, value);
                            }}
                            style={inputStyle}
                          />
                          <span style={{ color: '#888', width: '15px' }}>Z:</span>
                          <input
                            type="number"
                            step="1"
                            value={selectedAsset.transform.rotation[2]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handlePropertyChange(selectedAsset.id, 'rotation', 2, value);
                            }}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#00ff00', marginBottom: '6px', fontWeight: 'bold' }}>Scale (Uniform)</div>
                        <input
                          type="number"
                          step="0.1"
                          min="0.01"
                          value={selectedAsset.transform.scale[0]}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value > 0) handleUniformScaleChange(selectedAsset.id, value);
                          }}
                          style={{ ...inputStyle, width: '100px' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Light Params */}
                  {isLight && selectedAsset.lightParams && (
                    <>
                      {selectedAsset.type === 'directional-light' && 'direction' in selectedAsset.lightParams && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#ffa500', marginBottom: '6px', fontWeight: 'bold' }}>Direction</div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: '#888', width: '15px' }}>X:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedAsset.lightParams.direction[0]}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'direction.0', value);
                              }}
                              style={inputStyle}
                            />
                            <span style={{ color: '#888', width: '15px' }}>Y:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedAsset.lightParams.direction[1]}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'direction.1', value);
                              }}
                              style={inputStyle}
                            />
                            <span style={{ color: '#888', width: '15px' }}>Z:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedAsset.lightParams.direction[2]}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'direction.2', value);
                              }}
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      )}

                      {(selectedAsset.type === 'point-light' || selectedAsset.type === 'rect-light') && 'position' in selectedAsset.lightParams && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#ffa500', marginBottom: '6px', fontWeight: 'bold' }}>Position</div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: '#888', width: '15px' }}>X:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedAsset.lightParams.position[0]}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'position.0', value);
                              }}
                              style={inputStyle}
                            />
                            <span style={{ color: '#888', width: '15px' }}>Y:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedAsset.lightParams.position[1]}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'position.1', value);
                              }}
                              style={inputStyle}
                            />
                            <span style={{ color: '#888', width: '15px' }}>Z:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedAsset.lightParams.position[2]}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'position.2', value);
                              }}
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      )}

                      {selectedAsset.type === 'rect-light' && 'u' in selectedAsset.lightParams && 'v' in selectedAsset.lightParams && (
                        <>
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#ff00ff', marginBottom: '6px', fontWeight: 'bold' }}>U Vector</div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ color: '#888', width: '15px' }}>X:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedAsset.lightParams.u[0]}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'u.0', value);
                                }}
                                style={inputStyle}
                              />
                              <span style={{ color: '#888', width: '15px' }}>Y:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedAsset.lightParams.u[1]}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'u.1', value);
                                }}
                                style={inputStyle}
                              />
                              <span style={{ color: '#888', width: '15px' }}>Z:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedAsset.lightParams.u[2]}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'u.2', value);
                                }}
                                style={inputStyle}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#ff00ff', marginBottom: '6px', fontWeight: 'bold' }}>V Vector</div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ color: '#888', width: '15px' }}>X:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedAsset.lightParams.v[0]}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'v.0', value);
                                }}
                                style={inputStyle}
                              />
                              <span style={{ color: '#888', width: '15px' }}>Y:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedAsset.lightParams.v[1]}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'v.1', value);
                                }}
                                style={inputStyle}
                              />
                              <span style={{ color: '#888', width: '15px' }}>Z:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedAsset.lightParams.v[2]}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'v.2', value);
                                }}
                                style={inputStyle}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#00ffff', marginBottom: '6px', fontWeight: 'bold' }}>Color (RGB 0-1)</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: '#888', width: '15px' }}>R:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={selectedAsset.lightParams.color[0]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'color.0', value);
                            }}
                            style={inputStyle}
                          />
                          <span style={{ color: '#888', width: '15px' }}>G:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={selectedAsset.lightParams.color[1]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'color.1', value);
                            }}
                            style={inputStyle}
                          />
                          <span style={{ color: '#888', width: '15px' }}>B:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={selectedAsset.lightParams.color[2]}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) handleLightParamChange(selectedAsset.id, 'color.2', value);
                            }}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#ffff00', marginBottom: '6px', fontWeight: 'bold' }}>Intensity</div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={selectedAsset.lightParams.intensity}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0) handleLightParamChange(selectedAsset.id, 'intensity', value);
                          }}
                          style={{ ...inputStyle, width: '100px' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Delete Button */}
                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #444' }}>
                    <button
                      onClick={handleDeleteObject}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    >
                      🗑️ 삭제 (Delete)
                    </button>
                  </div>

                  {/* Keyboard Shortcuts */}
                  {isObject && (
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #444', fontSize: '10px', color: '#666' }}>
                      <div>단축키: G(이동) R(회전) +/-(스케일)</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right side - Edit Panel */}
          <div className="edit-panel">
            <div className="edit-panel-header">
              <h1 className="edit-title">{editingScene?.name || 'Scene'} 편집</h1>
              <p className="edit-subtitle">
                가구와 조명을 배치하고 실시간으로 확인하세요
              </p>

              {/* Tab Navigation */}
              <div className="edit-tab-nav">
                <button
                  className={`edit-tab-button ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  Scene 정보
                </button>
                <button
                  className={`edit-tab-button ${activeTab === 'objects' ? 'active' : ''}`}
                  onClick={() => setActiveTab('objects')}
                >
                  가구
                </button>
                <button
                  className={`edit-tab-button ${activeTab === 'lights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lights')}
                >
                  조명
                </button>
              </div>
            </div>

            <div className="edit-panel-content">
              {activeTab === 'info' && (
                <div className="edit-section">
                  <h3 className="section-title">기본 정보</h3>

                  <div className="form-group">
                    <label className="form-label">Scene 이름</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingScene?.name || ''}
                      onChange={handleSceneNameChange}
                      placeholder="Scene 이름을 입력하세요"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">설명</label>
                    <textarea
                      className="form-textarea"
                      value={editingScene?.description || ''}
                      onChange={handleSceneDescriptionChange}
                      placeholder="Scene 설명을 입력하세요"
                      rows={3}
                    />
                  </div>

                  <div className="divider"></div>

                  <h3 className="section-title">
                    기본 방
                    <span style={{
                      fontSize: '11px',
                      color: '#9CA3AF',
                      marginLeft: '8px',
                      padding: '2px 8px',
                      backgroundColor: '#F3F4F6',
                      borderRadius: '4px',
                      fontWeight: 'normal',
                    }}>
                      변경 불가
                    </span>
                  </h3>
                  <p className="section-subtitle" style={{ color: '#6B6B6B', fontSize: '13px' }}>
                    방은 Scene 생성 시에만 선택할 수 있습니다.
                  </p>

                  {/* 현재 선택된 방 표시 (읽기 전용) */}
                  {editingScene?.room && (() => {
                    const currentRoomMeta = getAssetMetadata(editingScene.room.meshName);
                    return (
                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <span style={{ fontSize: '28px' }}>
                          {currentRoomMeta?.icon || '🏠'}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: '#1F2937' }}>
                            {currentRoomMeta?.name || editingScene.room.meshName}
                          </div>
                          {currentRoomMeta?.description && (
                            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                              {currentRoomMeta.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'objects' && (
                <div className="edit-section">
                  <h3 className="section-title">가구 추가</h3>

                  {/* 가구 서브카테고리 탭 */}
                  <div className="furniture-subtab-nav">
                    {(['seating', 'table', 'storage', 'bed', 'other'] as FurnitureSubCategory[]).map((sub) => (
                      <button
                        key={sub}
                        className={`furniture-subtab-button ${furnitureSubTab === sub ? 'active' : ''}`}
                        onClick={() => setFurnitureSubTab(sub)}
                      >
                        {sub === 'seating' && '앉는 가구'}
                        {sub === 'table' && '테이블'}
                        {sub === 'storage' && '수납'}
                        {sub === 'bed' && '침대'}
                        {sub === 'other' && '기타'}
                      </button>
                    ))}
                  </div>
                  <div className="object-grid">
                    {getFurnitureBySubCategory(furnitureSubTab).map((asset) => (
                      <button
                        key={asset.meshName}
                        className="object-add-button"
                        onClick={() => handleAddObject(asset.meshName)}
                      >
                        <span className="object-icon">{asset.icon || '📦'}</span>
                        <span>{asset.name}</span>
                      </button>
                    ))}
                    {getFurnitureBySubCategory(furnitureSubTab).length === 0 && (
                      <div className="empty-state">이 카테고리에는 아직 가구가 없습니다</div>
                    )}
                  </div>

                  <div className="divider"></div>

                  {/* 장식 카테고리 */}
                  <h3 className="section-title">장식 추가</h3>
                  <div className="object-grid">
                    {getAssetsByCategory('decoration').map((asset) => (
                      <button
                        key={asset.meshName}
                        className="object-add-button"
                        onClick={() => handleAddObject(asset.meshName)}
                      >
                        <span className="object-icon">{asset.icon || '🎨'}</span>
                        <span>{asset.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="divider"></div>

                  <h3 className="section-title">배치된 오브젝트</h3>
                  <div className="object-list">
                    {objectAssets
                      .filter((asset) => {
                        // 필수 에셋(defaultRoom)은 Scene 정보 탭에서 관리하므로 여기서 제외
                        const required = asset.meshName ? isRequiredAsset(asset.meshName) : false;
                        return !required;
                      })
                      .map((asset) => {
                        const metadata = asset.meshName ? getAssetMetadata(asset.meshName) : null;
                        const isSelected = selectedAssetId === asset.id;

                        return (
                          <div
                            key={asset.id}
                            className={`object-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedAssetId(asset.id)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="object-icon">{metadata?.icon || '📦'}</span>
                              <span className="object-name">
                                {metadata?.name || asset.meshName}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAssetById(asset.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#999',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '4px 8px',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    {objectAssets.filter((asset) => {
                      const required = asset.meshName ? isRequiredAsset(asset.meshName) : false;
                      return !required;
                    }).length === 0 && (
                      <div className="empty-state">오브젝트를 추가해보세요</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'lights' && (
                <div className="edit-section">
                  {/* 태양광 설정 */}
                  <h3 className="section-title">태양광 설정 (기본 조명)</h3>
                  <p className="section-subtitle" style={{ color: '#6B6B6B', fontSize: '13px', marginBottom: '16px' }}>
                    기본 태양광은 삭제 및 직접 수정이 불가능합니다. 시간대, 계절, 방향만 조절할 수 있습니다.
                  </p>

                  {/* 시간대 (낮/밤) */}
                  <div className="form-group">
                    <label className="form-label">시간대</label>
                    <div className="button-group">
                      <button
                        className={`toggle-button ${editingScene?.sunSettings.isDaytime ? 'active' : ''}`}
                        onClick={() => handleDaytimeToggle(true)}
                      >
                        낮
                      </button>
                      <button
                        className={`toggle-button ${!editingScene?.sunSettings.isDaytime ? 'active' : ''}`}
                        onClick={() => handleDaytimeToggle(false)}
                      >
                        밤
                      </button>
                    </div>
                  </div>

                  {/* 시간 슬라이더 (6~18시, 낮에만 활성화) */}
                  <div className="form-group">
                    <label className="form-label">
                      시간: {editingScene?.sunSettings.isDaytime
                        ? `${Math.round(6 + (editingScene?.sunSettings.timeOfDay || 50) * 12 / 100)}시`
                        : '(밤 시간대)'
                      }
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editingScene?.sunSettings.timeOfDay || 50}
                      onChange={(e) => handleSunTimeChange(Number(e.target.value))}
                      className="range-slider"
                      disabled={!editingScene?.sunSettings.isDaytime}
                    />
                    <div className="range-labels">
                      <span>6시 (일출)</span>
                      <span>18시 (일몰)</span>
                    </div>
                  </div>

                  {/* 계절 */}
                  <div className="form-group">
                    <label className="form-label">계절</label>
                    <select
                      value={editingScene?.sunSettings.season || 'summer'}
                      onChange={(e) => handleSeasonChange(e.target.value as any)}
                      className="form-select"
                    >
                      <option value="spring">봄</option>
                      <option value="summer">여름</option>
                      <option value="autumn">가을</option>
                      <option value="winter">겨울</option>
                    </select>
                  </div>

                  {/* 방 방향 */}
                  <div className="form-group">
                    <label className="form-label">방 방향</label>
                    <select
                      value={editingScene?.sunSettings.roomOrientation || 'south'}
                      onChange={(e) => handleRoomOrientationChange(e.target.value as any)}
                      className="form-select"
                    >
                      <option value="east">동향</option>
                      <option value="west">서향</option>
                      <option value="south">남향</option>
                      <option value="north">북향</option>
                    </select>
                  </div>

                  <div className="divider"></div>

                  {/* 추가 조명 */}
                  <h3 className="section-title">추가 조명</h3>
                  <p className="section-subtitle">자유롭게 추가/삭제 가능한 조명입니다. 위치, 색상, 강도 등을 직접 조절할 수 있습니다.</p>

                  <div className="light-grid">
                    <button
                      className="light-add-button"
                      onClick={() => handleAddLight('directional-light')}
                    >
                      <span className="light-icon">☀️</span>
                      <span>평행광</span>
                    </button>
                    <button
                      className="light-add-button"
                      onClick={() => handleAddLight('point-light')}
                    >
                      <span className="light-icon">💡</span>
                      <span>포인트 라이트</span>
                    </button>
                    <button
                      className="light-add-button"
                      onClick={() => handleAddLight('rect-light')}
                    >
                      <span className="light-icon">🔲</span>
                      <span>면광원</span>
                    </button>
                  </div>

                  <div className="divider"></div>

                  <h3 className="section-title">배치된 추가 조명</h3>
                  <div className="light-list">
                    {lightAssets
                      .filter((a) => a.type === 'directional-light' || a.type === 'point-light' || a.type === 'rect-light')
                      .map((asset) => {
                        const isSelected = selectedAssetId === asset.id;
                        return (
                          <div
                            key={asset.id}
                            className={`light-item ${isSelected ? 'selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssetId(asset.id);
                            }}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="light-icon">
                                {asset.type === 'directional-light' ? '☀️' : asset.type === 'point-light' ? '💡' : '🔲'}
                              </span>
                              <span className="light-name">
                                {asset.type === 'directional-light' ? '평행광' : asset.type === 'point-light' ? 'PointLight' : 'RectLight'}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAssetById(asset.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#999',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '4px 8px',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    {lightAssets.filter((a) => a.type === 'directional-light' || a.type === 'point-light' || a.type === 'rect-light').length === 0 && (
                      <div className="empty-state">추가 조명이 없습니다</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="edit-actions">
              <button className="action-button action-cancel" onClick={handleCancel}>
                취소
              </button>
              <button
                className="action-button action-save"
                onClick={handleSave}
                disabled={!isDirty}
                style={{ opacity: isDirty ? 1 : 0.5 }}
              >
                저장
              </button>
              <button className="action-button action-save" onClick={handleSaveAndExit}>
                저장 후 나가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
