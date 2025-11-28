/**
 * ObjectTree - Scene Outliner
 *
 * 배치된 모든 오브젝트 목록
 * - 가구/장식/조명 분류
 * - 선택, 숨기기, 삭제 기능
 * - 필터 기능 (전체/가구/조명/장식)
 */

import { useState } from 'react';
import { ObjectTreeItem } from './ObjectTreeItem';
import { getAssetMetadata, isRequiredAsset } from '../../../assets/AssetRegistry';
import type { SceneAsset } from '../../../graphics-core/service/Scene';
import './ObjectTree.css';

type FilterType = 'all' | 'furniture' | 'light' | 'decoration';

const FILTER_OPTIONS: { type: FilterType; label: string; icon: string }[] = [
  { type: 'all', label: '전체', icon: '📋' },
  { type: 'furniture', label: '가구', icon: '🛋️' },
  { type: 'decoration', label: '장식', icon: '🪴' },
  { type: 'light', label: '조명', icon: '💡' },
];

interface ObjectTreeProps {
  assets: SceneAsset[];
  roomMeshName: string;
  selectedAssetId: string | number | null;
  hiddenAssetIds: Set<string | number>;
  onSelectAsset: (id: string | number | null) => void;
  onToggleVisibility: (id: string | number) => void;
  onDeleteAsset: (id: string | number) => void;
}

export function ObjectTree({
  assets,
  roomMeshName,
  selectedAssetId,
  hiddenAssetIds,
  onSelectAsset,
  onToggleVisibility,
  onDeleteAsset,
}: ObjectTreeProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // 오브젝트와 조명 분리
  const objectAssets = assets.filter((a) => a.type === 'object');
  const lightAssets = assets.filter((a) =>
    ['point-light', 'rect-light'].includes(a.type)
  );

  // 필수 오브젝트(방) 제외
  const editableObjects = objectAssets.filter((asset) => {
    if (!asset.meshName) return true;
    // 방 메쉬이거나 필수 오브젝트면 제외
    if (asset.meshName === roomMeshName) return false;
    return !isRequiredAsset(asset.meshName);
  });

  // 가구/장식 분류 (카테고리 기반)
  const furnitureAssets = editableObjects.filter((asset) => {
    const metadata = asset.meshName ? getAssetMetadata(asset.meshName) : null;
    const category = metadata?.category?.toLowerCase() || '';
    return ['sofa', 'table', 'chair', 'bed', 'storage', 'desk'].some((c) =>
      category.includes(c)
    );
  });

  const decorationAssets = editableObjects.filter((asset) => {
    const metadata = asset.meshName ? getAssetMetadata(asset.meshName) : null;
    const category = metadata?.category?.toLowerCase() || '';
    return ['plant', 'decor', 'art', 'rug', 'accessory'].some((c) =>
      category.includes(c)
    );
  });

  // 필터 적용
  const getFilteredObjects = () => {
    switch (filter) {
      case 'furniture':
        return furnitureAssets;
      case 'decoration':
        return decorationAssets;
      case 'light':
        return []; // 조명은 별도 섹션
      case 'all':
      default:
        return editableObjects;
    }
  };

  const getFilteredLights = () => {
    return filter === 'all' || filter === 'light' ? lightAssets : [];
  };

  const filteredObjects = getFilteredObjects();
  const filteredLights = getFilteredLights();

  const totalCount = editableObjects.length + lightAssets.length;
  const filteredCount = filteredObjects.length + filteredLights.length;

  return (
    <div className="object-tree">
      <div className="object-tree__header">
        <span className="object-tree__title">배치된 오브젝트</span>
        <span className="object-tree__count">{totalCount}</span>
      </div>

      {/* 필터 버튼 */}
      {totalCount > 0 && (
        <div className="object-tree__filters">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.type}
              className={`object-tree__filter-btn ${
                filter === option.type ? 'object-tree__filter-btn--active' : ''
              }`}
              onClick={() => setFilter(option.type)}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="object-tree__content">
        {totalCount === 0 ? (
          <div className="object-tree__empty">
            <span className="object-tree__empty-icon">📦</span>
            <span className="object-tree__empty-text">오브젝트를 추가해보세요</span>
            <span className="object-tree__empty-hint">위에서 가구나 조명을 선택하세요</span>
          </div>
        ) : filteredCount === 0 ? (
          <div className="object-tree__empty">
            <span className="object-tree__empty-icon">🔍</span>
            <span className="object-tree__empty-text">해당 타입의 오브젝트가 없습니다</span>
            <span className="object-tree__empty-hint">다른 필터를 선택해보세요</span>
          </div>
        ) : (
          <>
            {/* 오브젝트 섹션 */}
            {filteredObjects.length > 0 && (
              <div className="object-tree__section">
                <div className="object-tree__section-title">
                  {filter === 'furniture' ? '가구' : filter === 'decoration' ? '장식' : '가구/장식'}
                </div>
                {filteredObjects.map((asset) => {
                  const metadata = asset.meshName ? getAssetMetadata(asset.meshName) : null;
                  return (
                    <ObjectTreeItem
                      key={asset.id}
                      id={asset.id}
                      name={metadata?.name || asset.meshName || '오브젝트'}
                      icon={metadata?.icon || '📦'}
                      isSelected={selectedAssetId === asset.id}
                      isVisible={!hiddenAssetIds.has(asset.id)}
                      isDeletable={true}
                      onSelect={() => onSelectAsset(asset.id)}
                      onToggleVisibility={() => onToggleVisibility(asset.id)}
                      onDelete={() => onDeleteAsset(asset.id)}
                    />
                  );
                })}
              </div>
            )}

            {/* 조명 섹션 */}
            {filteredLights.length > 0 && (
              <div className="object-tree__section">
                <div className="object-tree__section-title">조명</div>
                {filteredLights.map((asset) => (
                  <ObjectTreeItem
                    key={asset.id}
                    id={asset.id}
                    name={asset.type === 'point-light' ? '포인트 조명' : '면광원'}
                    icon={asset.type === 'point-light' ? '💡' : '🔲'}
                    isSelected={selectedAssetId === asset.id}
                    isVisible={!hiddenAssetIds.has(asset.id)}
                    isDeletable={true}
                    onSelect={() => onSelectAsset(asset.id)}
                    onToggleVisibility={() => onToggleVisibility(asset.id)}
                    onDelete={() => onDeleteAsset(asset.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ObjectTree;
