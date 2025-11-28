/**
 * RenderModeHint - 렌더링 모드 안내 배너
 *
 * 실시간 렌더링 vs 저장 후 렌더링을 사용자에게 안내
 */

import './RenderModeHint.css';

interface RenderModeHintProps {
  /** 렌더링 모드 */
  mode: 'realtime' | 'save-required';
}

const MODE_CONFIG = {
  realtime: {
    icon: '⚡',
    label: '실시간 반영',
    description: '변경사항이 즉시 화면에 반영됩니다',
    className: 'render-mode-hint--realtime',
  },
  'save-required': {
    icon: '💾',
    label: '저장 후 반영',
    description: '변경사항은 저장 후 렌더링에 반영됩니다',
    className: 'render-mode-hint--save',
  },
};

export function RenderModeHint({ mode }: RenderModeHintProps) {
  const config = MODE_CONFIG[mode];

  return (
    <div className={`render-mode-hint ${config.className}`}>
      <span className="render-mode-hint__icon">{config.icon}</span>
      <div className="render-mode-hint__content">
        <span className="render-mode-hint__label">{config.label}</span>
        <span className="render-mode-hint__description">{config.description}</span>
      </div>
    </div>
  );
}

export default RenderModeHint;
