/**
 * SceneCard - 공간 카드 컴포넌트
 * - 썸네일, 이름, 메타데이터 표시
 * - 그리드/리스트 뷰 모드 지원
 * - 기존 정보에서 모든 메타데이터 유도
 */

import type { SceneFrontend } from '../../graphics-core/service/Scene';
import { isDummyScene } from '../../utils/sceneId';
import { getAssetMetadata } from '../../assets/AssetRegistry';
import './SceneCard.css';

interface SceneCardProps {
  scene: SceneFrontend;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
}

/**
 * 상대 시간 포맷 (예: "2시간 전", "3일 전")
 */
function getRelativeTime(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }
  if (diffDay > 0) return `${diffDay}일 전`;
  if (diffHour > 0) return `${diffHour}시간 전`;
  if (diffMin > 0) return `${diffMin}분 전`;
  return '방금 전';
}

/**
 * 방 템플릿 정보 - room.meshName에서 유도
 */
function getRoomInfo(scene: SceneFrontend): { icon: string; name: string } {
  const roomMeta = getAssetMetadata(scene.room?.meshName || '');
  if (roomMeta) {
    return { icon: roomMeta.icon, name: roomMeta.name };
  }
  return { icon: '🏠', name: scene.room?.meshName || '알 수 없음' };
}

export default function SceneCard({
  scene,
  viewMode,
  onClick,
  onDelete,
  isSelected,
}: SceneCardProps) {
  const room = getRoomInfo(scene);
  const canDelete = !isDummyScene(scene.id);

  // Asset 개수 계산 (용어: 가구/조명)
  const furnitureCount = scene.assets.filter((a) => a.type === 'object').length;
  const lightCount = scene.assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  ).length;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`scene-card-list ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
      >
        {/* 썸네일 */}
        <div className="scene-card-thumbnail-small">
          {scene.thumbnailUrl ? (
            <img src={scene.thumbnailUrl} alt={scene.name} />
          ) : (
            <div className="thumbnail-placeholder">
              <span>{room.icon}</span>
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="scene-card-info">
          <h3 className="scene-card-name">{scene.name}</h3>
          <div className="scene-card-meta">
            <span className="meta-item">
              <span className="meta-icon">{room.icon}</span>
              {room.name}
            </span>
            <span className="meta-divider">•</span>
            <span className="meta-item">{furnitureCount} 가구</span>
            <span className="meta-divider">•</span>
            <span className="meta-item">{lightCount} 조명</span>
          </div>
        </div>

        {/* 시간 & 삭제 (항상 같은 너비 유지) */}
        <div className="scene-card-actions">
          <span className="scene-card-time">
            {getRelativeTime(scene.updatedAt || scene.createdAt)}
          </span>
          <button
            className={`scene-card-delete-btn ${canDelete ? '' : 'hidden'}`}
            onClick={canDelete ? handleDelete : undefined}
            title="삭제"
            disabled={!canDelete}
          >
            🗑️
          </button>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      className={`scene-card-grid ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* 썸네일 */}
      <div className="scene-card-thumbnail">
        {scene.thumbnailUrl ? (
          <img src={scene.thumbnailUrl} alt={scene.name} />
        ) : (
          <div className="thumbnail-placeholder">
            <span className="thumbnail-icon">{room.icon}</span>
            <span className="thumbnail-label">{room.name}</span>
          </div>
        )}

        {/* 삭제 버튼 */}
        {canDelete && onDelete && (
          <button
            className="scene-card-delete-btn"
            onClick={handleDelete}
            title="삭제"
          >
            🗑️
          </button>
        )}
      </div>

      {/* 정보 */}
      <div className="scene-card-content">
        <h3 className="scene-card-name">{scene.name}</h3>
        <div className="scene-card-meta">
          <span className="meta-item">
            {furnitureCount + lightCount}개 배치됨
          </span>
          <span className="meta-time">
            {getRelativeTime(scene.updatedAt || scene.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
