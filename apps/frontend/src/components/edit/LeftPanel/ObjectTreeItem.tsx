/**
 * ObjectTreeItem - 오브젝트 트리 개별 아이템
 *
 * - 아이콘 + 이름
 * - 눈 아이콘(보이기/숨기기)
 * - 삭제 아이콘(hover 시 표시)
 * - 클릭 시 해당 오브젝트 선택
 * - 선택된 아이템은 강조 테두리(Left border 4px)
 */

import './ObjectTreeItem.css';

interface ObjectTreeItemProps {
  id: string | number;
  name: string;
  icon: string;
  isSelected: boolean;
  isVisible: boolean;
  isDeletable?: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export function ObjectTreeItem({
  name,
  icon,
  isSelected,
  isVisible,
  isDeletable = true,
  onSelect,
  onToggleVisibility,
  onDelete,
}: ObjectTreeItemProps) {
  return (
    <div
      className={`object-tree-item ${isSelected ? 'object-tree-item--selected' : ''} ${!isVisible ? 'object-tree-item--hidden' : ''}`}
      onClick={onSelect}
    >
      <div className="object-tree-item__content">
        <span className="object-tree-item__icon">{icon}</span>
        <span className="object-tree-item__name">{name}</span>
      </div>
      <div className="object-tree-item__actions">
        <button
          className="object-tree-item__action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          title={isVisible ? '숨기기' : '보이기'}
        >
          {isVisible ? '👁️' : '👁️‍🗨️'}
        </button>
        {isDeletable && (
          <button
            className="object-tree-item__action-btn object-tree-item__action-btn--delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default ObjectTreeItem;
