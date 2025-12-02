/**
 * EditPageHeader - Edit 페이지 헤더
 *
 * SceneHeaderBar 공용 컴포넌트를 사용 (wide 레이아웃)
 * 전체 화면에 맞춘 단일 행 레이아웃:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ← 작업공간  │ SceneName [저장됨] [시뮬레이션|편집]  │     [취소] [저장] │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { SceneHeaderBar } from '../common';
import type { SceneMode } from '../common';

export type EditStatus = 'synced' | 'modified';

interface EditPageHeaderProps {
  title: string;
  sceneId: string | number | null;
  status: EditStatus;
  onBack: () => void;
  onCancel: () => void;
  onSave: () => void;
  canSave?: boolean;
  /** 모드 변경 전 콜백 - false 반환 시 전환 취소 */
  onBeforeModeChange?: (newMode: SceneMode) => boolean | void | Promise<boolean | void>;
}

export function EditPageHeader({
  title,
  sceneId,
  status,
  onBack,
  onCancel,
  onSave,
  canSave = false,
  onBeforeModeChange,
}: EditPageHeaderProps) {
  const isDirty = status === 'modified';

  return (
    <SceneHeaderBar
      layout="wide"
      mode="edit"
      sceneId={sceneId}
      sceneName={title}
      isDirty={isDirty}
      onGoWorkspace={onBack}
      onCancel={onCancel}
      onSave={onSave}
      canSave={canSave}
      onBeforeModeChange={onBeforeModeChange}
    />
  );
}

export default EditPageHeader;
