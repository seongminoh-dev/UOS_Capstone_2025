/**
 * SceneCard - 공간 카드 컴포넌트
 *
 * Features:
 * - Grid/List view modes
 * - Template/Recently modified badges
 * - Delete action with hover reveal
 * - Relative time display
 */

import type { SceneFrontend } from '../../graphics-core/service/Scene';
import { isDummyScene } from '../../utils/sceneId';
import { getAssetMetadata } from '../../assets/AssetRegistry';
import { TrashIcon, CubeIcon, LightbulbIcon } from '../common';
import './SceneCard.css';

interface SceneCardProps {
  scene: SceneFrontend;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  isRecentlyModified?: boolean;
}

/**
 * Format relative time
 */
function getRelativeTime(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * Get room icon
 */
function getRoomIcon(scene: SceneFrontend): string {
  const roomMeta = getAssetMetadata(scene.room?.meshName || '');
  return roomMeta?.icon || '🏠';
}

export default function SceneCard({
  scene,
  viewMode,
  onClick,
  onDelete,
  isSelected,
  isRecentlyModified,
}: SceneCardProps) {
  const roomIcon = getRoomIcon(scene);
  const canDelete = !isDummyScene(scene.id);
  const isTemplate = isDummyScene(scene.id);

  const furnitureCount = scene.assets.filter((a) => a.type === 'object').length;
  const lightCount = scene.assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  ).length;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  // List View
  if (viewMode === 'list') {
    return (
      <article
        className={`scene-card scene-card--list ${isSelected ? 'is-selected' : ''}`}
        onClick={onClick}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
      >
        {/* Thumbnail */}
        <div className="scene-card__thumb scene-card__thumb--sm">
          {scene.thumbnailUrl ? (
            <img src={scene.thumbnailUrl} alt="" loading="lazy" />
          ) : (
            <span className="scene-card__thumb-icon">{roomIcon}</span>
          )}
        </div>

        {/* Body */}
        <div className="scene-card__body">
          <div className="scene-card__title-row">
            <h3 className="scene-card__title">{scene.name}</h3>
            {isTemplate && (
              <span className="scene-card__label scene-card__label--muted">템플릿</span>
            )}
            {isRecentlyModified && !isTemplate && (
              <span className="scene-card__label scene-card__label--accent">최근 수정</span>
            )}
          </div>
          <div className="scene-card__meta">
            <span className="scene-card__stat">
              <CubeIcon size={12} />
              {furnitureCount}
            </span>
            <span className="scene-card__stat">
              <LightbulbIcon size={12} />
              {lightCount}
            </span>
            <span className="scene-card__time">
              {getRelativeTime(scene.updatedAt || scene.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="scene-card__actions">
          {canDelete && onDelete && (
            <button
              type="button"
              className="scene-card__delete"
              onClick={handleDelete}
              aria-label="삭제"
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      </article>
    );
  }

  // Grid View
  return (
    <article
      className={`scene-card scene-card--grid ${isSelected ? 'is-selected' : ''}`}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Thumbnail */}
      <div className="scene-card__thumb">
        {scene.thumbnailUrl ? (
          <img src={scene.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <div className="scene-card__thumb-placeholder">
            <span className="scene-card__thumb-icon">{roomIcon}</span>
          </div>
        )}

        {/* Badge */}
        {isTemplate && <span className="scene-card__badge">템플릿</span>}
        {isRecentlyModified && !isTemplate && (
          <span className="scene-card__badge scene-card__badge--accent">최근</span>
        )}

        {/* Delete */}
        {canDelete && onDelete && (
          <button
            type="button"
            className="scene-card__delete"
            onClick={handleDelete}
            aria-label="삭제"
          >
            <TrashIcon size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="scene-card__body">
        <h3 className="scene-card__title">{scene.name}</h3>
        <div className="scene-card__meta">
          <span className="scene-card__stat">
            <CubeIcon size={12} />
            {furnitureCount}
          </span>
          <span className="scene-card__stat">
            <LightbulbIcon size={12} />
            {lightCount}
          </span>
          <span className="scene-card__time">
            {getRelativeTime(scene.updatedAt || scene.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
