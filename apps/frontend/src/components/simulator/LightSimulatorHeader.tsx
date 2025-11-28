/**
 * LightSimulatorHeader - 조명 시뮬레이터 헤더
 *
 * 두 줄 레이아웃:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ ← Workspace                                                  │  ← 상단: 네비게이션
 * ├──────────────────────────────────────────────────────────────┤
 * │ Scene 제목 [상태뱃지]                [씬 편집] [저장]         │  ← 하단: 제목 + 액션
 * └──────────────────────────────────────────────────────────────┘
 */

import { ChevronLeftIcon, ExternalLinkIcon } from '../common';
import './LightSimulatorHeader.css';

export type SimulatorStatus = 'synced' | 'modified' | 'rendering';

interface LightSimulatorHeaderProps {
  title: string;
  status: SimulatorStatus;
  onBack: () => void;
  onEditScene: () => void;
  onSave: () => void;
  canSave?: boolean;
}

const STATUS_CONFIG: Record<SimulatorStatus, { label: string; className: string }> = {
  synced: { label: '저장됨', className: 'header__badge--synced' },
  modified: { label: '변경됨', className: 'header__badge--modified' },
  rendering: { label: '렌더링 중', className: 'header__badge--rendering' },
};

export function LightSimulatorHeader({
  title,
  status,
  onBack,
  onEditScene,
  onSave,
  canSave = false,
}: LightSimulatorHeaderProps) {
  const statusConfig = STATUS_CONFIG[status];
  const isDirty = status === 'modified';

  return (
    <header className={`panel-header-v2 ${isDirty ? 'panel-header-v2--dirty' : ''}`}>
      {/* Top Row: Navigation */}
      <div className="header__nav">
        <button
          type="button"
          className="header__back-btn"
          onClick={onBack}
        >
          <ChevronLeftIcon size={14} />
          <span>Workspace</span>
        </button>
      </div>

      {/* Bottom Row: Title + Actions */}
      <div className="header__main">
        <div className="header__left">
          <h2 className="header__title">{title}</h2>
          <span className={`header__badge ${statusConfig.className}`}>
            {status === 'rendering' && <span className="header__spinner" />}
            {statusConfig.label}
          </span>
        </div>

        <div className="header__actions">
          <button
            type="button"
            className="header__btn header__btn--secondary"
            onClick={onEditScene}
          >
            <span>씬 편집</span>
            <ExternalLinkIcon size={12} />
          </button>

          <button
            type="button"
            className="header__btn header__btn--primary"
            onClick={onSave}
            disabled={!canSave}
          >
            저장
          </button>
        </div>
      </div>
    </header>
  );
}
