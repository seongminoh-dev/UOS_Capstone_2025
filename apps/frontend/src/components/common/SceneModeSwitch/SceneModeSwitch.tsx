/**
 * SceneModeSwitch - 시뮬레이션/편집 모드 전환 토글
 *
 * Pill 형태의 세그먼트 컨트롤:
 * [ ▶ 시뮬레이션 ] [ ✎ 오브젝트 편집 ]
 *
 * 특징:
 * - SceneName보다 시각적 우선순위가 낮은 보조 컨트롤
 * - 활성 상태: 흰색 배경 + 진한 텍스트 + 그림자
 * - 비활성 상태: 투명 배경 + 회색 텍스트
 * - fullWidth prop으로 패널 전체 폭 사용 가능
 *
 * 로직:
 * - navigate, onBeforeChange, onAfterChange는 기존 동작 유지
 * - 이미 선택된 모드 클릭 시 동작 안함
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayIcon, PencilIcon } from '../Icons';
import './SceneModeSwitch.css';

export type SceneMode = 'simulate' | 'edit';

export interface SceneModeSwitchProps {
  mode: SceneMode;
  sceneId: string | number;
  /** 모드 변경 전 콜백 - false 반환 시 전환 취소 */
  onBeforeChange?: (newMode: SceneMode) => boolean | void | Promise<boolean | void>;
  /** 모드 변경 후 콜백 */
  onAfterChange?: (newMode: SceneMode) => void;
  /** 패널 전체 폭 사용 (narrow 레이아웃용) */
  fullWidth?: boolean;
  className?: string;
}

export function SceneModeSwitch({
  mode,
  sceneId,
  onBeforeChange,
  onAfterChange,
  fullWidth = false,
  className = '',
}: SceneModeSwitchProps) {
  const navigate = useNavigate();

  const handleModeChange = useCallback(
    async (newMode: SceneMode) => {
      // 이미 선택된 모드 클릭 시 무시
      if (newMode === mode) return;

      // onBeforeChange 콜백 호출
      if (onBeforeChange) {
        const result = await onBeforeChange(newMode);
        if (result === false) return;
      }

      // 네비게이션 수행
      if (newMode === 'simulate') {
        navigate(`/simulator/scene/${sceneId}`);
      } else {
        navigate(`/editor/scene/${sceneId}`);
      }

      // onAfterChange 콜백 호출
      onAfterChange?.(newMode);
    },
    [mode, sceneId, navigate, onBeforeChange, onAfterChange]
  );

  const containerClass = [
    'scene-mode-switch',
    fullWidth ? 'scene-mode-switch--full-width' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <button
        type="button"
        className={`scene-mode-switch__item ${mode === 'simulate' ? 'scene-mode-switch__item--active' : ''}`}
        onClick={() => handleModeChange('simulate')}
        aria-pressed={mode === 'simulate'}
      >
        <PlayIcon size={14} className="scene-mode-switch__icon" />
        <span className="scene-mode-switch__label">시뮬레이션</span>
      </button>
      <button
        type="button"
        className={`scene-mode-switch__item ${mode === 'edit' ? 'scene-mode-switch__item--active' : ''}`}
        onClick={() => handleModeChange('edit')}
        aria-pressed={mode === 'edit'}
      >
        <PencilIcon size={14} className="scene-mode-switch__icon" />
        <span className="scene-mode-switch__label">오브젝트 편집</span>
      </button>
    </div>
  );
}

export default SceneModeSwitch;
