/**
 * EditPageHeader - Edit 페이지 헤더
 *
 * 두 줄 레이아웃 (Simulator와 동일한 패턴):
 * ┌──────────────────────────────────────────────────────────┐
 * │ ← Simulator                                              │  ← 상단 (36px)
 * ├──────────────────────────────────────────────────────────┤
 * │ 공간 이름 [상태뱃지]                        [취소] [저장] │  ← 하단 (48px)
 * └──────────────────────────────────────────────────────────┘
 */

import { ChevronLeftIcon } from '../common/Icons';
import './EditPageHeader.css';

export type EditStatus = 'synced' | 'modified';

interface EditPageHeaderProps {
  title: string;
  status: EditStatus;
  onBack: () => void;
  onCancel: () => void;
  onSave: () => void;
  canSave?: boolean;
}

export function EditPageHeader({
  title,
  status,
  onBack,
  onCancel,
  onSave,
  canSave = false,
}: EditPageHeaderProps) {
  const isDirty = status === 'modified';

  const statusConfig = {
    synced: { label: '저장됨', className: 'edit-header__badge--synced' },
    modified: { label: '수정됨', className: 'edit-header__badge--modified' },
  };

  return (
    <header className={`edit-header ${isDirty ? 'edit-header--dirty' : ''}`}>
      {/* 상단: 네비게이션 */}
      <div className="edit-header__nav">
        <button className="edit-header__back-btn" onClick={onBack}>
          <ChevronLeftIcon size={14} />
          <span>Simulator</span>
        </button>
      </div>

      {/* 하단: 제목 + 액션 */}
      <div className="edit-header__main">
        <div className="edit-header__left">
          <h2 className="edit-header__title">{title}</h2>
          <span className={`edit-header__badge ${statusConfig[status].className}`}>
            {statusConfig[status].label}
          </span>
        </div>

        <div className="edit-header__actions">
          <button
            className="edit-header__btn edit-header__btn--secondary"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className="edit-header__btn edit-header__btn--primary"
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

export default EditPageHeader;
