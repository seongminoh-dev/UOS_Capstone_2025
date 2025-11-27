/**
 * ObjectListItem - 오브젝트 리스트 아이템 컴포넌트
 *
 * 가구/조명 등 Scene 내 오브젝트를 표시하는 리스트 아이템
 *
 * 상태:
 * - selected: 선택됨 (강조 테두리)
 * - hidden: 숨김 상태 (투명도 감소)
 * - locked: 고정됨 (삭제 불가, 필수 뱃지 표시)
 * - modified: 변경됨 (점 표시)
 * - disabled: 비활성화
 */

import type { ReactNode } from 'react';
import { Badge } from '../common';
import { EyeIcon, EyeOffIcon, TrashIcon } from '../common/Icons';
import './ObjectListItem.css';

interface ObjectListItemProps {
  /** 아이콘 (이모지 또는 ReactNode) */
  icon: string | ReactNode;
  /** 표시 이름 */
  name: string;
  /** 부가 정보 (예: 타입, 위치 등) */
  subtitle?: string;

  /** 선택 상태 */
  selected?: boolean;
  /** 숨김 상태 */
  hidden?: boolean;
  /** 고정(잠금) 상태 - 삭제/이동 불가 */
  locked?: boolean;
  /** 변경됨 표시 */
  modified?: boolean;
  /** 비활성화 */
  disabled?: boolean;

  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 숨김 토글 핸들러 */
  onToggleHidden?: () => void;
  /** 삭제 핸들러 */
  onDelete?: () => void;
}

export function ObjectListItem({
  icon,
  name,
  subtitle,
  selected = false,
  hidden = false,
  locked = false,
  modified = false,
  disabled = false,
  onClick,
  onToggleHidden,
  onDelete,
}: ObjectListItemProps) {
  const isClickable = !disabled && !locked && !!onClick;

  // 클래스 조합
  const classNames = [
    'object-list-item',
    selected && 'object-list-item--selected',
    hidden && 'object-list-item--hidden',
    locked && 'object-list-item--locked',
    modified && 'object-list-item--modified',
    disabled && 'object-list-item--disabled',
    isClickable && 'object-list-item--clickable',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (isClickable) {
      onClick?.();
    }
  };

  const handleToggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleHidden?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div className={classNames} onClick={handleClick}>
      {/* Icon */}
      <span className="object-list-item__icon">
        {typeof icon === 'string' ? icon : icon}
      </span>

      {/* Content */}
      <div className="object-list-item__content">
        <span className="object-list-item__name">{name}</span>
        {subtitle && (
          <span className="object-list-item__subtitle">{subtitle}</span>
        )}
      </div>

      {/* Status */}
      <div className="object-list-item__status">
        {modified && !locked && (
          <span className="object-list-item__modified-dot" title="변경됨" />
        )}
        {locked && <Badge variant="default">필수</Badge>}
      </div>

      {/* Actions */}
      {!locked && (onToggleHidden || onDelete) && (
        <div className="object-list-item__actions">
          {onToggleHidden && (
            <button
              type="button"
              className={`object-list-item__action-btn ${hidden ? 'object-list-item__action-btn--active' : ''}`}
              onClick={handleToggleHidden}
              title={hidden ? '표시' : '숨기기'}
            >
              {hidden ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="object-list-item__action-btn object-list-item__action-btn--danger"
              onClick={handleDelete}
              title="삭제"
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ObjectListItem;
