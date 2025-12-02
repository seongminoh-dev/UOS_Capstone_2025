/**
 * LightSimulatorHeader - 조명 시뮬레이터 헤더 래퍼
 *
 * SceneHeaderBar(layout="narrow")를 사용하여 Renderer 우측 패널에 최적화된 3행 레이아웃 제공
 *
 * ┌─────────────────────────────────────┐
 * │ ← 작업공간                   [저장] │  ← Row 1: Top Bar (bg-muted)
 * ├─────────────────────────────────────┤
 * │ SceneName               [저장됨]    │  ← Row 2: Title
 * │                                     │
 * │ [ 시뮬레이션  |  오브젝트 편집 ]     │  ← Row 3: Mode Switch
 * └─────────────────────────────────────┘
 *
 * 특징:
 * - Row 1과 Row 2 사이에 구분선으로 앱 레벨/Scene 레벨 분리
 * - 저장 버튼은 Row 1 우측에 위치 (Scene 헤더의 책임)
 * - Scene 이름이 길면 ellipsis 처리 (max-width: 160px)
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
