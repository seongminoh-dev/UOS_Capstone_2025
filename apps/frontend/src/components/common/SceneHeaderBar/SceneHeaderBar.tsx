/**
 * SceneHeaderBar - Simulator/Editor 공용 상단 헤더
 *
 * 두 가지 레이아웃 지원:
 *
 * [Wide Layout] - Editor (전체 화면)
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ← 작업공간  │ SceneName [저장됨] [시뮬레이션|편집]  │     [취소] [저장] │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * [Narrow Layout] - Renderer RightPanel (~300-360px)
 * ┌─────────────────────────────────────┐
 * │ ← 작업공간                   [저장] │  ← Row 1: Navigation + Save
 * ├─────────────────────────────────────┤
 * │ SceneName               [저장됨]    │  ← Row 2: Scene Info
 * ├─────────────────────────────────────┤
 * │ [ 시뮬레이션  |  오브젝트 편집 ]     │  ← Row 3: Mode Switch (full width)
 * └─────────────────────────────────────┘
 */

import { ReactNode } from 'react';
import { ChevronLeftIcon } from '../Icons';
import { SceneModeSwitch } from '../SceneModeSwitch';
import { StatusBadge } from '../StatusBadge';
import type { SceneMode } from '../SceneModeSwitch';
import './SceneHeaderBar.css';

export type SceneHeaderLayout = 'wide' | 'narrow';

export interface SceneHeaderBarProps {
  /** 레이아웃 모드 */
  layout?: SceneHeaderLayout;
  /** 현재 모드 */
  mode: SceneMode;
  /** Scene ID (모드 전환에 사용) */
  sceneId: string | number | null;
  /** Scene 이름 */
  sceneName: string;
  /** 저장 상태 */
  isDirty: boolean;
  /** 작업공간으로 돌아가기 */
  onGoWorkspace: () => void;
  /** 저장 버튼 클릭 */
  onSave?: () => void;
  /** 취소 버튼 클릭 (Editor에서 사용) */
  onCancel?: () => void;
  /** 저장 버튼 활성화 여부 */
  canSave?: boolean;
  /** 모드 변경 전 콜백 */
  onBeforeModeChange?: (newMode: SceneMode) => boolean | void | Promise<boolean | void>;
  /** 우측 추가 액션 */
  rightExtra?: ReactNode;
}

export function SceneHeaderBar({
  layout = 'wide',
  mode,
  sceneId,
  sceneName,
  isDirty,
  onGoWorkspace,
  onSave,
  onCancel,
  canSave = false,
  onBeforeModeChange,
  rightExtra,
}: SceneHeaderBarProps) {
  // Wide Layout - Editor 전체 화면용
  if (layout === 'wide') {
    return (
      <header className={`scene-header scene-header--wide ${isDirty ? 'scene-header--dirty' : ''}`}>
        {/* Left: Back to Workspace */}
        <div className="scene-header__left">
          <button
            type="button"
            className="scene-header__back"
            onClick={onGoWorkspace}
          >
            <ChevronLeftIcon size={14} />
            <span>작업공간</span>
          </button>
        </div>

        {/* Center: Scene Name + Status + Mode Switch */}
        <div className="scene-header__center">
          <div className="scene-header__title-group">
            <h1 className="scene-header__name">{sceneName}</h1>
            <StatusBadge isDirty={isDirty} />
          </div>
          {sceneId && (
            <SceneModeSwitch
              mode={mode}
              sceneId={sceneId}
              onBeforeChange={onBeforeModeChange}
            />
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="scene-header__right">
          {rightExtra}
          {onCancel && (
            <button
              type="button"
              className="scene-header__btn scene-header__btn--secondary"
              onClick={onCancel}
            >
              취소
            </button>
          )}
          {onSave && (
            <button
              type="button"
              className="scene-header__btn scene-header__btn--primary"
              onClick={onSave}
              disabled={!canSave}
            >
              저장
            </button>
          )}
        </div>
      </header>
    );
  }

  // Narrow Layout - Renderer RightPanel용 (3행 구조)
  return (
    <header className={`scene-header scene-header--narrow ${isDirty ? 'scene-header--dirty' : ''}`}>
      {/* Row 1: Back + Save */}
      <div className="scene-header__row scene-header__row--nav">
        <button
          type="button"
          className="scene-header__back scene-header__back--compact"
          onClick={onGoWorkspace}
        >
          <ChevronLeftIcon size={14} />
          <span>작업공간</span>
        </button>
        <div className="scene-header__nav-actions">
          {rightExtra}
          {onSave && (
            <button
              type="button"
              className="scene-header__btn scene-header__btn--primary scene-header__btn--sm"
              onClick={onSave}
              disabled={!canSave}
            >
              저장
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Scene Name + Status */}
      <div className="scene-header__row scene-header__row--info">
        <h1 className="scene-header__name">{sceneName}</h1>
        <StatusBadge isDirty={isDirty} size="compact" />
      </div>

      {/* Row 3: Mode Switch (full width) */}
      {sceneId && (
        <div className="scene-header__row scene-header__row--mode">
          <SceneModeSwitch
            mode={mode}
            sceneId={sceneId}
            onBeforeChange={onBeforeModeChange}
            fullWidth
          />
        </div>
      )}
    </header>
  );
}

export default SceneHeaderBar;
