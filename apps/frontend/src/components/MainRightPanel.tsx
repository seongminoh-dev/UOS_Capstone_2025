/**
 * 메인 화면 Right Panel (개편)
 * - Scene 선택 탭
 * - 조명/가구/정보 탭
 * - /edit 페이지와 일관된 디자인
 * - SceneRepository (SSOT) 사용
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainRightPanel.css';
import type { SceneFrontend, SceneAsset, SunSettings, SkyMode } from '../graphics-core/service/Scene';
import { DUMMY_SCENES } from '../graphics-core/data/DummyScenes';
import InstanceEditModal from './InstanceEditModal';
import { getAssetMetadata } from '../assets/AssetRegistry';
import { useSceneRepository } from '../stores/sceneRepository';
import { useAuthStore } from '../stores/authStore';
import { isDummyScene } from '../utils/sceneId';

interface MainRightPanelProps {
  selectedScene: SceneFrontend | null;
  onSelectScene: (scene: SceneFrontend | null) => void;
  onSceneChange: () => void; // Scene 변경 감지
  onSunSettingsChange?: (sunSettings: SunSettings) => void; // 태양 설정 즉시 업데이트
}

type Tab = 'environment' | 'furniture' | 'lighting' | 'info';

export default function MainRightPanel({
  selectedScene,
  onSelectScene,
  onSceneChange,
  onSunSettingsChange,
}: MainRightPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('environment');

  // Zustand Stores
  const { scenes, loadScenes, saveScene, deleteScene } = useSceneRepository();
  const { user, isGuest } = useAuthStore();

  // Instance 편집 모달
  const [editingAsset, setEditingAsset] = useState<SceneAsset | null>(null);

  // Save Confirm 모달
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    SceneFrontend | null | 'edit'
  >(null);

  // Scene 변경 감지 상태
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentScene, setCurrentScene] = useState<SceneFrontend | null>(null);

  // 태양 설정 상태 (Scene의 sunSettings와 동기화)
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day');
  const [sunTime, setSunTime] = useState(50); // 0-100 (Scene 형식)
  const [season, setSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [roomDirection, setRoomDirection] = useState<'north' | 'south' | 'east' | 'west'>('south');
  const [skyMode, setSkyMode] = useState<0 | 1 | 2>(2); // 하늘 모드: 0=없음, 1=일반, 2=고품질
  const [envIndirectMult, setEnvIndirectMult] = useState(50); // 환경 간접광 강도 (0-100%)

  // Scene 목록 로드 (초기화)
  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // Scene이 변경되면 상태 초기화 (sunSettings 동기화 포함)
  useEffect(() => {
    if (selectedScene) {
      setCurrentScene(JSON.parse(JSON.stringify(selectedScene))); // Deep copy
      setHasUnsavedChanges(false);

      // sunSettings에서 UI 상태 초기화
      const sun = selectedScene.sunSettings;
      setTimeOfDay(sun.isDaytime ? 'day' : 'night');
      setSunTime(sun.timeOfDay);
      setSeason(sun.season);
      setRoomDirection(sun.roomOrientation);
      setSkyMode(sun.skyMode ?? 2); // 기본값: 고품질 하늘
      setEnvIndirectMult(Math.round((sun.envIndirectMultiplier ?? 0.5) * 100)); // 기본값: 50%
    }
  }, [selectedScene]);

  // 태양 설정 변경 시 currentScene.sunSettings 업데이트 + 즉시 렌더링 반영
  useEffect(() => {
    if (currentScene) {
      const updatedSunSettings: SunSettings = {
        timeOfDay: sunTime,
        isDaytime: timeOfDay === 'day',
        season: season,
        roomOrientation: roomDirection,
        skyMode: skyMode,
        envIndirectMultiplier: envIndirectMult / 100, // 0-100 → 0.0-1.0
      };

      // 값이 실제로 변경되었는지 확인
      const sun = currentScene.sunSettings;
      const hasChanged =
        sun.timeOfDay !== updatedSunSettings.timeOfDay ||
        sun.isDaytime !== updatedSunSettings.isDaytime ||
        sun.season !== updatedSunSettings.season ||
        sun.roomOrientation !== updatedSunSettings.roomOrientation ||
        sun.skyMode !== updatedSunSettings.skyMode ||
        sun.envIndirectMultiplier !== updatedSunSettings.envIndirectMultiplier;

      if (hasChanged) {
        setCurrentScene({
          ...currentScene,
          sunSettings: updatedSunSettings,
        });
        setHasUnsavedChanges(true);

        // 즉시 렌더링에 반영 (저장 없이)
        if (onSunSettingsChange) {
          onSunSettingsChange(updatedSunSettings);
        }
      }
    }
  }, [timeOfDay, sunTime, season, roomDirection, skyMode, envIndirectMult, onSunSettingsChange]);

  // Asset 저장 핸들러
  const handleSaveAsset = (updatedAsset: SceneAsset) => {
    if (!currentScene) return;

    const updatedAssets = currentScene.assets.map((asset) =>
      asset.id === updatedAsset.id ? updatedAsset : asset
    );

    setCurrentScene({ ...currentScene, assets: updatedAssets });
    setHasUnsavedChanges(true);
    setEditingAsset(null);
    onSceneChange();
  };

  // Scene 변경 핸들러 (확인 필요)
  const handleSceneChangeRequest = (newScene: SceneFrontend | null) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(newScene);
      setShowSaveConfirm(true);
    } else {
      onSelectScene(newScene);
    }
  };

  // /edit 페이지로 이동 (확인 필요)
  const handleEditPageRequest = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation('edit');
      setShowSaveConfirm(true);
    } else {
      navigate('/edit', { state: { scene: currentScene } });
    }
  };

  // 저장 확인 모달 - 저장 후 이동
  const handleSaveAndNavigate = async () => {
    if (!currentScene) return;

    try {
      // Scene 저장 (SceneRepository 사용)
      const saved = await saveScene(currentScene);
      setHasUnsavedChanges(false);
      setShowSaveConfirm(false);

      if (pendingNavigation === 'edit') {
        navigate('/edit', { state: { scene: saved } });
      } else {
        onSelectScene(pendingNavigation as SceneFrontend | null);
      }
      setPendingNavigation(null);
    } catch (error) {
      console.error('Failed to save scene:', error);
      alert('Scene 저장에 실패했습니다.');
    }
  };

  // 저장 확인 모달 - 저장 안 하고 이동
  const handleDiscardAndNavigate = () => {
    setHasUnsavedChanges(false);
    setShowSaveConfirm(false);

    if (pendingNavigation === 'edit') {
      navigate('/edit', { state: { scene: selectedScene } });
    } else {
      onSelectScene(pendingNavigation as SceneFrontend | null);
    }
    setPendingNavigation(null);
  };

  // 저장 확인 모달 - 취소
  const handleCancelNavigation = () => {
    setShowSaveConfirm(false);
    setPendingNavigation(null);
  };

  // Scene 정보 편집 상태
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingSceneName, setEditingSceneName] = useState('');
  const [editingSceneDescription, setEditingSceneDescription] = useState('');

  // 새 Scene 만들기 - /edit 페이지로 이동 (createNew 모드)
  const handleCreateNewSceneRequest = () => {
    navigate('/edit', { state: { createNew: true } });
  };

  // "저장하고 적용" 버튼 핸들러
  const handleSaveAndRender = async () => {
    if (!currentScene) return;

    try {
      // Scene 저장 (SceneRepository 사용)
      const savedScene = await saveScene(currentScene);

      // 로컬 상태 초기화
      setHasUnsavedChanges(false);

      // 부모 컴포넌트에 저장된 Scene 전달 (렌더링 업데이트)
      onSelectScene({ ...savedScene });

      // 피드백
      alert('Scene이 저장되고 렌더링에 적용되었습니다.');
    } catch (error) {
      console.error('Failed to save scene:', error);
      alert('Scene 저장에 실패했습니다.');
    }
  };

  // Asset 삭제 핸들러
  const [deletingAssetId, setDeletingAssetId] = useState<
    string | number | null
  >(null);
  const [dontShowDeleteConfirm, setDontShowDeleteConfirm] = useState(false);

  const handleDeleteAssetRequest = (assetId: string | number) => {
    // 태양(Sun) 삭제 방지
    if (assetId === 'sun' || assetId === 'Sun' || assetId === 'sun_light') {
      alert('자연광은 필수 조명으로 삭제할 수 없습니다.');
      return;
    }

    // TestScene 삭제 방지
    if (!currentScene) return;
    const asset = currentScene.assets.find((a) => a.id === assetId);
    if (asset && asset.type === 'object' && asset.meshName === 'TestScene') {
      alert('방(TestScene)은 필수 오브젝트로 삭제할 수 없습니다.');
      return;
    }

    // localStorage에서 "오늘은 다시 보지 않음" 체크 여부 확인
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('skipDeleteConfirm');

    if (savedDate === today) {
      // 바로 삭제
      handleDeleteAsset(assetId);
    } else {
      // 확인 모달 표시
      setDeletingAssetId(assetId);
    }
  };

  const handleDeleteAsset = (assetId: string | number) => {
    if (!currentScene) return;

    const updatedAssets = currentScene.assets.filter((a) => a.id !== assetId);
    setCurrentScene({ ...currentScene, assets: updatedAssets });
    setHasUnsavedChanges(true);
    setDeletingAssetId(null);
    onSceneChange();

    // "오늘은 다시 보지 않음" 체크 시 저장
    if (dontShowDeleteConfirm) {
      const today = new Date().toDateString();
      localStorage.setItem('skipDeleteConfirm', today);
      setDontShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingAssetId(null);
    setDontShowDeleteConfirm(false);
  };

  // Scene 삭제 관련 상태
  const [deletingSceneId, setDeletingSceneId] = useState<
    number | string | null
  >(null);
  const [hiddenDummySceneIds, setHiddenDummySceneIds] = useState<
    Set<string | number>
  >(new Set());

  // Scene 삭제 요청 핸들러
  const handleDeleteSceneRequest = (
    sceneId: number | string,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
    }
    setDeletingSceneId(sceneId);
  };

  // Scene 삭제 확인 핸들러
  const handleConfirmDeleteScene = async () => {
    if (!deletingSceneId) return;

    try {
      const isDeletingCurrentScene =
        selectedScene && selectedScene.id === deletingSceneId;

      // Dummy Scene인지 확인
      if (isDummyScene(deletingSceneId)) {
        // Dummy Scene은 로컬 상태로 숨김 처리 (삭제 불가)
        setHiddenDummySceneIds((prev) => new Set(prev).add(deletingSceneId));
      } else {
        // 일반 Scene은 store에서 삭제
        await deleteScene(deletingSceneId);
      }

      setDeletingSceneId(null);

      // 렌더링 중인 씬 삭제 시 씬 선택 화면으로
      if (isDeletingCurrentScene) {
        onSelectScene(null);
      }
    } catch (error) {
      console.error('Failed to delete scene:', error);
      alert('Scene 삭제에 실패했습니다.');
    }
  };

  // Scene 삭제 취소 핸들러
  const handleCancelDeleteScene = () => {
    setDeletingSceneId(null);
  };

  // Scene 정보 편집 시작
  const handleStartEditingInfo = () => {
    if (!currentScene) return;
    setEditingSceneName(currentScene.name);
    setEditingSceneDescription(currentScene.description || '');
    setIsEditingInfo(true);
  };

  // Scene 정보 저장
  const handleSaveSceneInfo = () => {
    if (!currentScene) return;
    if (!editingSceneName.trim()) {
      alert('Scene 이름을 입력해주세요.');
      return;
    }

    setCurrentScene({
      ...currentScene,
      name: editingSceneName,
      description: editingSceneDescription,
    });
    setHasUnsavedChanges(true);
    setIsEditingInfo(false);
    onSceneChange();
  };

  // Scene 정보 편집 취소
  const handleCancelEditingInfo = () => {
    setIsEditingInfo(false);
  };

  // Scene이 선택되지 않았을 때 - Scene 목록 표시
  if (!selectedScene) {
    // SceneRepository에서 이미 Dummy + Local/Server Scene이 통합되어 있음
    // 숨긴 DummyScene만 필터링
    const availableScenes = scenes.filter((s) => !hiddenDummySceneIds.has(s.id));

    return (
      <div className="main-right-panel">
        <div className="panel-header">
          <h1 className="panel-title">Scene 선택</h1>
          <p className="panel-subtitle">
            {isGuest
              ? '게스트 모드 - 저장된 Scene은 세션이 종료되면 사라집니다'
              : '렌더링할 Scene을 선택하세요'}
          </p>
        </div>

        <div className="panel-content">
          <div className="scene-list">
            {availableScenes.map((scene) => (
              <div key={scene.id} className="scene-card-wrapper">
                <button
                  className="scene-card"
                  onClick={() => onSelectScene(scene)}
                >
                  <div className="scene-card-header">
                    <h3>{scene.name}</h3>
                    <span className="scene-asset-count">
                      {scene.assets.length}개 Asset
                    </span>
                  </div>
                  {scene.description && (
                    <p className="scene-description">{scene.description}</p>
                  )}
                </button>
                <button
                  className="scene-delete-btn"
                  onClick={(e) => handleDeleteSceneRequest(scene.id, e)}
                  title="Scene 삭제"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="scene-actions">
            <button
              className="action-button action-primary"
              onClick={handleCreateNewSceneRequest}
            >
              새 Scene 만들기
            </button>
          </div>
        </div>

        {/* Scene 삭제 확인 모달 */}
        {deletingSceneId && (
          <div className="modal-overlay" onClick={handleCancelDeleteScene}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-header">
                <h2 className="modal-title">Scene 삭제</h2>
                <button
                  className="modal-close"
                  onClick={handleCancelDeleteScene}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ padding: '24px' }}>
                <p style={{ margin: 0, lineHeight: '1.6' }}>
                  이 Scene을 삭제하시겠습니까?
                  <br />
                  <span style={{ color: '#DC2626', fontSize: '13px' }}>
                    이 작업은 되돌릴 수 없습니다.
                  </span>
                </p>
              </div>

              <div className="modal-actions">
                <button
                  className="modal-button modal-cancel"
                  onClick={handleCancelDeleteScene}
                >
                  취소
                </button>
                <button
                  className="modal-button modal-save"
                  onClick={handleConfirmDeleteScene}
                  style={{ backgroundColor: '#DC2626' }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Scene이 선택되었을 때 - 조명/가구/정보 탭
  if (!currentScene) return null; // currentScene이 로드되기 전

  const objectAssets = currentScene.assets.filter((a) => a.type === 'object');
  const lightAssets = currentScene.assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  );
  const testScene = objectAssets.find((a) => a.meshName === 'TestScene');

  // 태양은 특별한 DirectionalLight (id로 식별)
  const sunLight = lightAssets.find(
    (a) =>
      a.type === 'directional-light' &&
      (a.id === 'sun' || a.id === 'Sun' || a.id === 'sun_light')
  );

  // 일반 DirectionalLight들 (태양 제외)
  const directionalLights = lightAssets.filter(
    (a) =>
      a.type === 'directional-light' &&
      a.id !== 'sun' &&
      a.id !== 'Sun' &&
      a.id !== 'sun_light'
  );

  return (
    <div className="main-right-panel">
      <div className="panel-header">
        <div className="scene-info-header">
          <h1 className="panel-title">{selectedScene.name}</h1>
          <button
            className="change-scene-button"
            onClick={() => handleSceneChangeRequest(null)}
          >
            Scene 변경
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="panel-tab-nav">
          <button
            className={`panel-tab-button ${
              activeTab === 'environment' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('environment')}
          >
            환경
          </button>
          <button
            className={`panel-tab-button ${
              activeTab === 'furniture' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('furniture')}
          >
            가구
          </button>
          <button
            className={`panel-tab-button ${
              activeTab === 'lighting' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('lighting')}
          >
            조명
          </button>
          <button
            className={`panel-tab-button ${
              activeTab === 'info' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('info')}
          >
            정보
          </button>
        </div>
      </div>

      <div className="panel-content">
        {/* 환경 탭 */}
        {activeTab === 'environment' && (
          <div className="tab-section">
            {/* 태양 설정 */}
            <div className="section-card">
              <h3 className="section-title">태양 설정</h3>

              {/* 시간대 */}
              <div className="form-group">
                <label className="form-label">시간대</label>
                <div className="button-group">
                  <button
                    className={`toggle-button ${
                      timeOfDay === 'day' ? 'active' : ''
                    }`}
                    onClick={() => setTimeOfDay('day')}
                  >
                    낮
                  </button>
                  <button
                    className={`toggle-button ${
                      timeOfDay === 'night' ? 'active' : ''
                    }`}
                    onClick={() => setTimeOfDay('night')}
                  >
                    밤
                  </button>
                </div>
              </div>

              {/* 시간 (20분 단위로 세밀하게 조절) */}
              <div className="form-group">
                <label className="form-label">
                  시간: {Math.floor((sunTime / 100) * 24)}시
                </label>
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="20"
                  value={Math.round(sunTime / 100 * 1440)}
                  onChange={(e) => setSunTime(Number(e.target.value) / 1440 * 100)}
                  className="range-slider"
                />
                <div className="range-labels">
                  <span>0시 (자정)</span>
                  <span>24시 (자정)</span>
                </div>
              </div>

              {/* 계절 */}
              <div className="form-group">
                <label className="form-label">계절</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value as 'spring' | 'summer' | 'autumn' | 'winter')}
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
                  value={roomDirection}
                  onChange={(e) => setRoomDirection(e.target.value as 'north' | 'south' | 'east' | 'west')}
                  className="form-select"
                >
                  <option value="east">동향</option>
                  <option value="west">서향</option>
                  <option value="south">남향</option>
                  <option value="north">북향</option>
                </select>
              </div>
            </div>

            {/* 환경 설정 */}
            <div className="section-card">
              <h3 className="section-title">환경 설정</h3>

              {/* 하늘 설정 */}
              <div className="form-group">
                <label className="form-label">하늘 설정</label>
                <div className="button-group">
                  <button
                    className={`toggle-button ${skyMode === 2 ? 'active' : ''}`}
                    onClick={() => setSkyMode(2)}
                  >
                    고품질
                  </button>
                  <button
                    className={`toggle-button ${skyMode === 1 ? 'active' : ''}`}
                    onClick={() => setSkyMode(1)}
                  >
                    일반
                  </button>
                  <button
                    className={`toggle-button ${skyMode === 0 ? 'active' : ''}`}
                    onClick={() => setSkyMode(0)}
                  >
                    없음
                  </button>
                </div>
              </div>

              {/* 환경 간접광 */}
              <div className="form-group">
                <label className="form-label">
                  환경 간접광: {envIndirectMult}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={envIndirectMult}
                  onChange={(e) => setEnvIndirectMult(Number(e.target.value))}
                  className="range-slider"
                />
                <div className="range-labels">
                  <span>0% (없음)</span>
                  <span>100% (물리 기반)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 조명 탭 */}
        {activeTab === 'lighting' && (
          <div className="tab-section">
            <div className="section-card">
              <h3 className="section-title">배치된 조명</h3>

              {/* 태양 (특별한 DirectionalLight, 필수) */}
              {sunLight && (
                <div className="asset-item required">
                  <div className="asset-info">
                    <span className="asset-icon">☀️</span>
                    <span className="asset-name">자연광</span>
                  </div>
                  <span className="asset-badge">필수</span>
                </div>
              )}

              {/* 일반 DirectionalLight */}
              {directionalLights.map((asset) => (
                <div key={asset.id} className="asset-item clickable">
                  <div
                    className="asset-info"
                    onClick={() => setEditingAsset(asset)}
                    style={{ flex: 1, cursor: 'pointer' }}
                  >
                    <span className="asset-icon">🌅</span>
                    <span className="asset-name">DirectionalLight</span>
                  </div>
                  <button
                    className="asset-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAssetRequest(asset.id);
                    }}
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Point Light & Rect Light */}
              {lightAssets
                .filter(
                  (a) => a.type === 'point-light' || a.type === 'rect-light'
                )
                .map((asset) => (
                  <div key={asset.id} className="asset-item clickable">
                    <div
                      className="asset-info"
                      onClick={() => setEditingAsset(asset)}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      <span className="asset-icon">
                        {asset.type === 'point-light' ? '💡' : '🔲'}
                      </span>
                      <span className="asset-name">
                        {asset.type === 'point-light'
                          ? 'PointLight'
                          : 'RectLight'}
                      </span>
                    </div>
                    <button
                      className="asset-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAssetRequest(asset.id);
                      }}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}

              {directionalLights.length === 0 &&
                lightAssets.filter(
                  (a) => a.type === 'point-light' || a.type === 'rect-light'
                ).length === 0 && (
                  <div className="empty-state">
                    추가 조명이 없습니다
                    <br />
                    <button
                      className="link-button"
                      onClick={handleEditPageRequest}
                    >
                      편집 페이지에서 추가하기
                    </button>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* 가구 탭 */}
        {activeTab === 'furniture' && (
          <div className="tab-section">
            <div className="section-card">
              <h3 className="section-title">배치된 오브젝트</h3>

              {/* TestScene (필수) */}
              {testScene && (
                <div className="asset-item required">
                  <div className="asset-info">
                    <span className="asset-icon">🏠</span>
                    <span className="asset-name">TestScene (방)</span>
                  </div>
                  <span className="asset-badge">필수</span>
                </div>
              )}

              {/* 기타 오브젝트 */}
              {objectAssets
                .filter((a) => a.meshName !== 'TestScene')
                .map((asset) => (
                  <div key={asset.id} className="asset-item clickable">
                    <div
                      className="asset-info"
                      onClick={() => setEditingAsset(asset)}
                      style={{ flex: 1, cursor: 'pointer' }}
                    >
                      <span className="asset-icon">📦</span>
                      <span className="asset-name">{asset.meshName}</span>
                    </div>
                    <button
                      className="asset-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAssetRequest(asset.id);
                      }}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                ))}

              {objectAssets.filter((a) => a.meshName !== 'TestScene').length ===
                0 && (
                <div className="empty-state">
                  가구가 없습니다
                  <br />
                  <button
                    className="link-button"
                    onClick={handleEditPageRequest}
                  >
                    편집 페이지에서 추가하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 정보 탭 */}
        {activeTab === 'info' && (
          <div className="tab-section">
            <div className="section-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h3 className="section-title" style={{ margin: 0 }}>
                  Scene 정보
                </h3>
                {!isEditingInfo && (
                  <button
                    className="link-button"
                    onClick={handleStartEditingInfo}
                    style={{ fontSize: '14px' }}
                  >
                    편집
                  </button>
                )}
              </div>

              {!isEditingInfo ? (
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Scene ID</span>
                    <span className="info-value">{selectedScene.id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Scene 이름</span>
                    <span className="info-value">{currentScene.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">방</span>
                    <span className="info-value">
                      {(() => {
                        const roomMeta = getAssetMetadata(currentScene.room.meshName);
                        return roomMeta ? `${roomMeta.icon} ${roomMeta.name}` : currentScene.room.meshName;
                      })()}
                      <span style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        marginLeft: '6px',
                        padding: '2px 6px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '4px'
                      }}>
                        변경 불가
                      </span>
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">설명</span>
                    <span className="info-value">
                      {currentScene.description || '(없음)'}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Scene 이름</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSceneName}
                      onChange={(e) => setEditingSceneName(e.target.value)}
                      placeholder="Scene 이름 입력"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      방
                      <span style={{
                        fontSize: '10px',
                        color: '#9CA3AF',
                        marginLeft: '6px',
                        padding: '2px 6px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '4px'
                      }}>
                        변경 불가
                      </span>
                    </label>
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        color: '#6B7280',
                        fontSize: '14px',
                      }}
                    >
                      {(() => {
                        const roomMeta = getAssetMetadata(currentScene.room.meshName);
                        return roomMeta ? `${roomMeta.icon} ${roomMeta.name}` : currentScene.room.meshName;
                      })()}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">설명</label>
                    <textarea
                      className="form-input"
                      value={editingSceneDescription}
                      onChange={(e) =>
                        setEditingSceneDescription(e.target.value)
                      }
                      placeholder="Scene 설명 입력"
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="modal-button modal-cancel"
                      onClick={handleCancelEditingInfo}
                      style={{ flex: 1 }}
                    >
                      취소
                    </button>
                    <button
                      className="modal-button modal-save"
                      onClick={handleSaveSceneInfo}
                      style={{ flex: 1 }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="section-card">
              <h3 className="section-title">Asset 통계</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">총 Asset 수</span>
                  <span className="info-value">
                    {selectedScene.assets.length}개
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">오브젝트</span>
                  <span className="info-value">{objectAssets.length}개</span>
                </div>
                <div className="info-item">
                  <span className="info-label">조명</span>
                  <span className="info-value">{lightAssets.length}개</span>
                </div>
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-title">렌더링 설정</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">해상도</span>
                  <span className="info-value">1920 x 1080</span>
                </div>
                <div className="info-item">
                  <span className="info-label">샘플 수</span>
                  <span className="info-value">256 SPP</span>
                </div>
                <div className="info-item">
                  <span className="info-label">렌더러</span>
                  <span className="info-value">ReSTIR DI</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 액션 버튼 */}
      <div className="panel-actions">
        <button
          className="action-button action-secondary"
          onClick={handleEditPageRequest}
        >
          상세 편집
        </button>
        <button
          className="action-button action-primary"
          disabled={!hasUnsavedChanges}
          onClick={handleSaveAndRender}
          style={{
            opacity: hasUnsavedChanges ? 1 : 0.5,
            cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
          }}
        >
          {hasUnsavedChanges ? '저장하고 적용' : '렌더링'}
        </button>
      </div>

      {/* Instance 편집 모달 */}
      {editingAsset && (
        <InstanceEditModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={handleSaveAsset}
        />
      )}

      {/* 저장 확인 모달 */}
      {showSaveConfirm && (
        <div className="modal-overlay" onClick={handleCancelNavigation}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className="modal-header">
              <h2 className="modal-title">저장하지 않은 변경사항</h2>
              <button className="modal-close" onClick={handleCancelNavigation}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, lineHeight: '1.6' }}>
                Scene에 저장하지 않은 변경사항이 있습니다.
                <br />
                변경사항을 저장하고 다시 렌더링하시겠습니까?
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="modal-button modal-cancel"
                onClick={handleDiscardAndNavigate}
              >
                저장 안 함
              </button>
              <button
                className="modal-button modal-save"
                onClick={handleSaveAndNavigate}
              >
                저장하고 계속
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deletingAssetId && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px' }}
          >
            <div className="modal-header">
              <h2 className="modal-title">오브젝트 삭제</h2>
              <button className="modal-close" onClick={handleCancelDelete}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, marginBottom: '16px', lineHeight: '1.6' }}>
                이 오브젝트를 삭제하시겠습니까?
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#6B6B6B',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={dontShowDeleteConfirm}
                  onChange={(e) => setDontShowDeleteConfirm(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                오늘은 다시 보지 않음
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="modal-button modal-cancel"
                onClick={handleCancelDelete}
              >
                취소
              </button>
              <button
                className="modal-button modal-save"
                onClick={() => handleDeleteAsset(deletingAssetId)}
                style={{ backgroundColor: '#DC2626' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scene 삭제 확인 모달 */}
      {deletingSceneId && (
        <div className="modal-overlay" onClick={handleCancelDeleteScene}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '450px' }}
          >
            <div className="modal-header">
              <h2 className="modal-title">Scene 삭제</h2>
              <button className="modal-close" onClick={handleCancelDeleteScene}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, marginBottom: '16px', lineHeight: '1.6' }}>
                이 Scene을 삭제하시겠습니까?
                <br />
                <span style={{ color: '#DC2626', fontSize: '13px' }}>
                  이 작업은 되돌릴 수 없습니다.
                </span>
              </p>
              {selectedScene && selectedScene.id === deletingSceneId && (
                <p
                  style={{
                    margin: 0,
                    padding: '12px',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#92400E',
                  }}
                >
                  현재 렌더링 중인 Scene입니다. 삭제 시 Scene 선택 화면으로
                  이동합니다.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="modal-button modal-cancel"
                onClick={handleCancelDeleteScene}
              >
                취소
              </button>
              <button
                className="modal-button modal-save"
                onClick={handleConfirmDeleteScene}
                style={{ backgroundColor: '#DC2626' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
