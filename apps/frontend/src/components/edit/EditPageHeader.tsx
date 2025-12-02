/**
 * EditPageHeader - Editor 페이지 헤더 래퍼
 *
 * SceneHeaderBar(layout="wide")를 사용하여 전체 화면에 최적화된 단일 행 레이아웃 제공
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ← 작업공간  │  SceneName · [저장됨] · [시뮬|편집]  │     [취소] [저장] │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * 구조: Left(Back) | Center(Name·Status·Mode) | Right(Cancel·Save)
 *
 * 특징:
 * - 단일 행에서 모든 정보와 액션 표시
 * - SceneName이 가장 눈에 띄게 (16px, semibold)
 * - 저장/취소 버튼은 항상 우측 끝에 위치
 * - Scene 이름이 길면 ellipsis 처리 (max-width: 280px)
 * - 768px 이하에서는 2행으로 wrap
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
