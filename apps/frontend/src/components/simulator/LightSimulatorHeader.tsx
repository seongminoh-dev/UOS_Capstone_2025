/**
 * LightSimulatorHeader - 조명 시뮬레이터 헤더
 *
 * 두 줄 레이아웃:
 * ┌──────────────────────────────────────────────┐
 * │ 제목   [상태]                         [저장] │  ← top row
 * │ [씬 편집하기]   [재렌더링]                   │  ← bottom row
 * └──────────────────────────────────────────────┘
 */

import { ExternalLinkIcon, RefreshIcon } from '../common';
import './LightSimulatorHeader.css';

export type SimulatorStatus = 'synced' | 'modified' | 'rendering';

interface LightSimulatorHeaderProps {
  title: string;
  status: SimulatorStatus;
  onEditScene: () => void;
  onRerender: () => void;
  onSave: () => void;
  canRerender?: boolean;
  canSave?: boolean;
}

const STATUS_CONFIG: Record<SimulatorStatus, { label: string; className: string }> = {
  synced: { label: '최신', className: 'simulator-header__badge--synced' },
  modified: { label: '변경됨', className: 'simulator-header__badge--modified' },
  rendering: { label: '렌더링 중', className: 'simulator-header__badge--rendering' },
};

export function LightSimulatorHeader({
  title,
  status,
  onEditScene,
  onRerender,
  onSave,
  canRerender = false,
  canSave = false,
}: LightSimulatorHeaderProps) {
  const statusConfig = STATUS_CONFIG[status];

  return (
    <header className="simulator-header">
      {/* Top Row: 제목 + 뱃지 | 저장 */}
      <div className="simulator-header__top">
        <div className="simulator-header__title-group">
          <h2 className="simulator-header__title">{title}</h2>
          <span className={`simulator-header__badge ${statusConfig.className}`}>
            {status === 'rendering' && (
              <span className="simulator-header__spinner" />
            )}
            {statusConfig.label}
          </span>
        </div>
        <button
          type="button"
          className="simulator-header__save-btn"
          onClick={onSave}
          disabled={!canSave}
        >
          저장
        </button>
      </div>

      {/* Bottom Row: 액션 버튼들 */}
      <div className="simulator-header__bottom">
        <button
          type="button"
          className="simulator-header__action-btn"
          onClick={onEditScene}
        >
          씬 편집하기
          <ExternalLinkIcon size={12} />
        </button>
        <button
          type="button"
          className={`simulator-header__action-btn ${canRerender ? 'simulator-header__action-btn--primary' : ''}`}
          onClick={onRerender}
        >
          <RefreshIcon size={12} />
          재렌더링
        </button>
      </div>
    </header>
  );
}
