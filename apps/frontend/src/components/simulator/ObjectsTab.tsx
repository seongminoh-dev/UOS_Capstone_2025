/**
 * ObjectsTab - 오브젝트 탭 (가구 + 조명 통합)
 *
 * Scene에 배치된 가구와 조명을 통합 관리
 */

import { Badge, Button } from '../common';
import type { SceneAsset } from '../../graphics-core/service/Scene';
import './ObjectsTab.css';

interface ObjectsTabProps {
  assets: SceneAsset[];
  onAssetClick: (asset: SceneAsset) => void;
  onAssetDelete: (assetId: string | number) => void;
  onEditPageNavigate: () => void;
}

// Asset 타입별 아이콘
const getAssetIcon = (asset: SceneAsset): string => {
  if (asset.type === 'object') {
    if (asset.meshName === 'TestScene') return '🏠';
    return '📦';
  }
  if (asset.type === 'directional-light') {
    if (asset.id === 'sun' || asset.id === 'Sun' || asset.id === 'sun_light') {
      return '☀️';
    }
    return '🌅';
  }
  if (asset.type === 'point-light') return '💡';
  if (asset.type === 'rect-light') return '🔲';
  return '📦';
};

// Asset 타입별 이름
const getAssetDisplayName = (asset: SceneAsset): string => {
  if (asset.type === 'object') {
    return asset.meshName || 'Object';
  }
  if (asset.type === 'directional-light') {
    if (asset.id === 'sun' || asset.id === 'Sun' || asset.id === 'sun_light') {
      return '자연광';
    }
    return 'DirectionalLight';
  }
  if (asset.type === 'point-light') return 'PointLight';
  if (asset.type === 'rect-light') return 'RectLight';
  return 'Unknown';
};

// 필수 Asset 여부
const isRequiredAsset = (asset: SceneAsset): boolean => {
  // 태양
  if (
    asset.type === 'directional-light' &&
    (asset.id === 'sun' || asset.id === 'Sun' || asset.id === 'sun_light')
  ) {
    return true;
  }
  // TestScene (방)
  if (asset.type === 'object' && asset.meshName === 'TestScene') {
    return true;
  }
  return false;
};

export function ObjectsTab({
  assets,
  onAssetClick,
  onAssetDelete,
  onEditPageNavigate,
}: ObjectsTabProps) {
  // Asset 분류
  const objectAssets = assets.filter((a) => a.type === 'object');
  const lightAssets = assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  );

  // 삭제 가능한 Asset 필터링
  const deletableAssets = assets.filter((a) => !isRequiredAsset(a));
  const hasEditableAssets =
    objectAssets.filter((a) => a.meshName !== 'TestScene').length > 0 ||
    lightAssets.filter(
      (a) =>
        !(
          a.type === 'directional-light' &&
          (a.id === 'sun' || a.id === 'Sun' || a.id === 'sun_light')
        )
    ).length > 0;

  return (
    <div className="objects-tab">
      {/* 조명 섹션 */}
      <div className="objects-tab__section">
        <div className="objects-tab__section-header">
          <h4 className="objects-tab__section-title">조명</h4>
          <span className="objects-tab__count">{lightAssets.length}</span>
        </div>
        <div className="objects-tab__list">
          {lightAssets.map((asset) => {
            const isRequired = isRequiredAsset(asset);
            return (
              <div
                key={asset.id}
                className={`objects-tab__item ${isRequired ? 'objects-tab__item--required' : 'objects-tab__item--clickable'}`}
                onClick={() => !isRequired && onAssetClick(asset)}
              >
                <span className="objects-tab__item-icon">{getAssetIcon(asset)}</span>
                <span className="objects-tab__item-name">{getAssetDisplayName(asset)}</span>
                {isRequired ? (
                  <Badge variant="default">필수</Badge>
                ) : (
                  <button
                    className="objects-tab__item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssetDelete(asset.id);
                    }}
                    title="삭제"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 가구 섹션 */}
      <div className="objects-tab__section">
        <div className="objects-tab__section-header">
          <h4 className="objects-tab__section-title">가구</h4>
          <span className="objects-tab__count">{objectAssets.length}</span>
        </div>
        <div className="objects-tab__list">
          {objectAssets.map((asset) => {
            const isRequired = isRequiredAsset(asset);
            return (
              <div
                key={asset.id}
                className={`objects-tab__item ${isRequired ? 'objects-tab__item--required' : 'objects-tab__item--clickable'}`}
                onClick={() => !isRequired && onAssetClick(asset)}
              >
                <span className="objects-tab__item-icon">{getAssetIcon(asset)}</span>
                <span className="objects-tab__item-name">
                  {asset.meshName === 'TestScene' ? 'TestScene (방)' : asset.meshName}
                </span>
                {isRequired ? (
                  <Badge variant="default">필수</Badge>
                ) : (
                  <button
                    className="objects-tab__item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssetDelete(asset.id);
                    }}
                    title="삭제"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State 또는 편집 유도 */}
      {!hasEditableAssets && (
        <div className="objects-tab__empty">
          <p>추가된 오브젝트가 없습니다</p>
          <Button variant="secondary" size="sm" onClick={onEditPageNavigate}>
            편집 페이지에서 추가
          </Button>
        </div>
      )}
    </div>
  );
}

export default ObjectsTab;
