/**
 * LightSimulatorHeader - 조명 시뮬레이터 헤더
 *
 * SceneHeaderBar 공용 컴포넌트를 사용 (narrow 레이아웃)
 * Renderer 우측 패널 (~300-360px)에 맞춘 3행 레이아웃:
 *
 * ┌─────────────────────────────────────┐
 * │ ← 작업공간                   [저장] │  ← Row 1: Navigation + Save
 * ├─────────────────────────────────────┤
 * │ SceneName               [저장됨]    │  ← Row 2: Scene Info
 * ├─────────────────────────────────────┤
 * │ [ 시뮬레이션  |  오브젝트 편집 ]     │  ← Row 3: Mode Switch
 * └─────────────────────────────────────┘
 */

import { SceneHeaderBar } from '../common';
import type { SceneMode } from '../common';

export type SimulatorStatus = 'synced' | 'modified' | 'rendering';

interface LightSimulatorHeaderProps {
  title: string;
  sceneId: string | number;
  status: SimulatorStatus;
  onBack: () => void;
  onSave: () => void;
  canSave?: boolean;
  /** 모드 변경 전 콜백 - false 반환 시 전환 취소 */
  onBeforeModeChange?: (newMode: SceneMode) => boolean | void | Promise<boolean | void>;
}

export function LightSimulatorHeader({
  title,
  sceneId,
  status,
  onBack,
  onSave,
  canSave = false,
  onBeforeModeChange,
}: LightSimulatorHeaderProps) {
  const isDirty = status === 'modified';

  return (
    <SceneHeaderBar
      layout="narrow"
      mode="simulate"
      sceneId={sceneId}
      sceneName={title}
      isDirty={isDirty}
      onGoWorkspace={onBack}
      onSave={onSave}
      canSave={canSave}
      onBeforeModeChange={onBeforeModeChange}
    />
  );
}
