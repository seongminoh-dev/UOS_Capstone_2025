/**
 * ControlPanel - Editor 모드 우측 패널
 *
 * 구성:
 * - Header: Scene 이름 + 저장 상태 + 액션 버튼 (한 줄 컴팩트)
 * - TimeOfDayCard: 시간/계절/방향 (히어로 카드 스타일)
 * - Tabs: 환경/오브젝트/정보 (언더라인 스타일)
 *
 * 렌더링 규칙:
 * - 태양/환경: 실시간 반영
 * - 오브젝트: 저장 후 렌더링
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tabs,
  ConfirmModal,
  useToast,
} from '../common';
import { LightSimulatorHeader } from './LightSimulatorHeader';
import type { SimulatorStatus } from './LightSimulatorHeader';
import { TimeOfDayCard } from './TimeOfDayCard';
import { EnvironmentTab } from './EnvironmentTab';
import { ObjectsTab } from './ObjectsTab';
import { InfoTab } from './InfoTab';
import InstanceEditModal from '../InstanceEditModal';
import { useSceneRepository } from '../../stores/sceneRepository';
import { useSunSettings } from '../../hooks';
import type { SceneFrontend, SceneAsset, SunSettings } from '../../graphics-core/service/Scene';
import './ControlPanel.css';

type TabType = 'environment' | 'objects' | 'info';

interface ControlPanelProps {
  scene: SceneFrontend;
  onSceneSelect: (scene: SceneFrontend | null) => void;
  onSunSettingsChange?: (settings: SunSettings) => void;
}

export function ControlPanel({
  scene,
  onSceneSelect,
  onSunSettingsChange,
}: ControlPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveScene } = useSceneRepository();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('environment');

  // 현재 편집 중인 Scene (deep copy)
  const [currentScene, setCurrentScene] = useState<SceneFrontend>(() =>
    JSON.parse(JSON.stringify(scene))
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Scene이 변경되면 상태 리셋
  useEffect(() => {
    setCurrentScene(JSON.parse(JSON.stringify(scene)));
    setHasUnsavedChanges(false);
  }, [scene.id]);

  // 태양 설정 훅
  const sunSettings = useSunSettings({
    initialSettings: scene.sunSettings,
    onSettingsChange: useCallback(
      (settings: SunSettings) => {
        setCurrentScene((prev) => ({ ...prev, sunSettings: settings }));
        setHasUnsavedChanges(true);
        onSunSettingsChange?.(settings);
      },
      [onSunSettingsChange]
    ),
  });

  // 모달 상태
  const [editingAsset, setEditingAsset] = useState<SceneAsset | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'workspace' | 'edit' | null>(null);
  const [deletingAssetId, setDeletingAssetId] = useState<string | number | null>(null);
  const [dontShowDeleteConfirm, setDontShowDeleteConfirm] = useState(false);

  // 상태 계산 (rendering 상태 제거 - 저장 시 자동 렌더링)
  const getStatus = (): SimulatorStatus => {
    if (hasUnsavedChanges) return 'modified';
    return 'synced';
  };

  // Workspace로 돌아가기 (저장 확인)
  const handleBackToWorkspace = () => {
    if (hasUnsavedChanges) {
      setPendingAction('workspace');
      setShowSaveConfirm(true);
    } else {
      onSceneSelect(null);
    }
  };

  // Scene 저장 (저장 = 자동 재렌더링)
  const handleSave = async () => {
    try {
      const saved = await saveScene(currentScene);
      setHasUnsavedChanges(false);
      onSceneSelect({ ...saved });
      toast.success('저장되었습니다');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('저장에 실패했습니다');
    }
  };

  // Edit 페이지로 이동 (저장 확인)
  const handleEditPage = () => {
    if (hasUnsavedChanges) {
      setPendingAction('edit');
      setShowSaveConfirm(true);
    } else {
      navigate('/edit', { state: { scene: currentScene } });
    }
  };

  // 저장 확인 모달 - 저장 후 진행
  const handleSaveAndProceed = async () => {
    try {
      const saved = await saveScene(currentScene);
      setHasUnsavedChanges(false);
      setShowSaveConfirm(false);

      if (pendingAction === 'workspace') {
        onSceneSelect(null);
      } else if (pendingAction === 'edit') {
        navigate('/edit', { state: { scene: saved } });
      }
      setPendingAction(null);
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('저장에 실패했습니다');
    }
  };

  // 저장 확인 모달 - 저장 없이 진행
  const handleDiscardAndProceed = () => {
    setShowSaveConfirm(false);

    if (pendingAction === 'workspace') {
      onSceneSelect(null);
    } else if (pendingAction === 'edit') {
      navigate('/edit', { state: { scene } });
    }
    setPendingAction(null);
  };

  // Asset 편집 저장
  const handleSaveAsset = (updatedAsset: SceneAsset) => {
    setCurrentScene((prev) => ({
      ...prev,
      assets: prev.assets.map((a) =>
        a.id === updatedAsset.id ? updatedAsset : a
      ),
    }));
    setHasUnsavedChanges(true);
    setEditingAsset(null);
  };

  // Asset 삭제 요청
  const handleDeleteAssetRequest = (assetId: string | number) => {
    // 필수 Asset 체크
    const asset = currentScene.assets.find((a) => a.id === assetId);
    if (!asset) return;

    if (
      asset.type === 'directional-light' &&
      (asset.id === 'sun' || asset.id === 'Sun' || asset.id === 'sun_light')
    ) {
      toast.warning('자연광은 필수 조명으로 삭제할 수 없습니다');
      return;
    }

    if (asset.type === 'object' && asset.meshName === 'TestScene') {
      toast.warning('방(TestScene)은 필수 오브젝트로 삭제할 수 없습니다');
      return;
    }

    // "오늘은 다시 보지 않음" 체크
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('skipDeleteConfirm');

    if (savedDate === today) {
      handleDeleteAsset(assetId);
    } else {
      setDeletingAssetId(assetId);
    }
  };

  // Asset 삭제 실행
  const handleDeleteAsset = (assetId: string | number) => {
    setCurrentScene((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== assetId),
    }));
    setHasUnsavedChanges(true);
    setDeletingAssetId(null);

    if (dontShowDeleteConfirm) {
      localStorage.setItem('skipDeleteConfirm', new Date().toDateString());
      setDontShowDeleteConfirm(false);
    }
  };

  // Scene 정보 변경
  const handleSceneNameChange = (name: string) => {
    setCurrentScene((prev) => ({ ...prev, name }));
    setHasUnsavedChanges(true);
  };

  const handleSceneDescriptionChange = (description: string) => {
    setCurrentScene((prev) => ({ ...prev, description }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="control-panel">
      {/* Header */}
      <LightSimulatorHeader
        title={currentScene.name}
        status={getStatus()}
        onBack={handleBackToWorkspace}
        onEditScene={handleEditPage}
        onSave={handleSave}
        canSave={hasUnsavedChanges}
      />

      {/* Time of Day Card */}
      <div className="control-panel__time-card">
        <TimeOfDayCard
          timeOfDay={sunSettings.sunTime}
          onTimeChange={sunSettings.setSunTime}
          timeString={sunSettings.getTimeString()}
          isAnimating={sunSettings.isAnimating}
          onToggleAnimation={sunSettings.toggleAnimation}
          animationSpeed={sunSettings.animationSpeed}
          onAnimationSpeedChange={sunSettings.setAnimationSpeed}
        />
      </div>

      {/* Tabs - 언더라인 스타일 */}
      <div className="control-panel__tabs">
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v as TabType)} variant="underline">
          <Tabs.List>
            <Tabs.Tab value="environment" icon="🌤️">
              환경
            </Tabs.Tab>
            <Tabs.Tab value="objects" icon="📦">
              오브젝트
            </Tabs.Tab>
            <Tabs.Tab value="info" icon="ℹ️">
              정보
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="environment">
            <EnvironmentTab
              skyMode={sunSettings.skyMode}
              onSkyModeChange={sunSettings.setSkyMode}
              envIndirectMult={sunSettings.envIndirectMult}
              onEnvIndirectMultChange={sunSettings.setEnvIndirectMult}
              direction={sunSettings.roomDirection}
              onDirectionChange={sunSettings.setRoomDirection}
              season={sunSettings.season}
              onSeasonChange={sunSettings.setSeason}
            />
          </Tabs.Panel>

          <Tabs.Panel value="objects">
            <ObjectsTab
              assets={currentScene.assets}
              onAssetClick={setEditingAsset}
              onAssetDelete={handleDeleteAssetRequest}
              onEditPageNavigate={handleEditPage}
            />
          </Tabs.Panel>

          <Tabs.Panel value="info">
            <InfoTab
              scene={currentScene}
              onSceneNameChange={handleSceneNameChange}
              onSceneDescriptionChange={handleSceneDescriptionChange}
            />
          </Tabs.Panel>
        </Tabs>
      </div>

      {/* Instance Edit Modal */}
      {editingAsset && (
        <InstanceEditModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={handleSaveAsset}
        />
      )}

      {/* Save Confirm Modal */}
      <ConfirmModal
        isOpen={showSaveConfirm}
        onClose={() => {
          setShowSaveConfirm(false);
          setPendingAction(null);
        }}
        onConfirm={handleSaveAndProceed}
        onCancel={handleDiscardAndProceed}
        title="저장하지 않은 변경사항"
        message="변경사항을 저장하시겠습니까?"
        confirmText="저장"
        cancelText="저장 안 함"
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deletingAssetId !== null}
        onClose={() => {
          setDeletingAssetId(null);
          setDontShowDeleteConfirm(false);
        }}
        onConfirm={() => deletingAssetId && handleDeleteAsset(deletingAssetId)}
        title="오브젝트 삭제"
        message="이 오브젝트를 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        checkbox={{
          label: '오늘은 다시 보지 않음',
          checked: dontShowDeleteConfirm,
          onChange: setDontShowDeleteConfirm,
        }}
      />
    </div>
  );
}

export default ControlPanel;
