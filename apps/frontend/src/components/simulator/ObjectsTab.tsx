/**
 * ObjectsTab - 오브젝트 탭 (가구 + 조명 통합)
 *
 * Scene에 배치된 가구와 조명을 통합 관리
 * 저장 후 렌더링 필요
 */

import { Button } from '../common';
import { PanelSection } from './PanelSection';
import { ObjectListItem } from './ObjectListItem';
import { RenderModeHint } from './RenderModeHint';
import type { SceneAsset } from '../../graphics-core/service/Scene';
import './ObjectsTab.css';

interface ObjectsTabProps {
  assets: SceneAsset[];
  selectedAssetId?: string | number | null;
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
    if (asset.meshName === 'TestScene') return 'TestScene (방)';
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
  if (
    asset.type === 'directional-light' &&
    (asset.id === 'sun' || asset.id === 'Sun' || asset.id === 'sun_light')
  ) {
    return true;
  }
  if (asset.type === 'object' && asset.meshName === 'TestScene') {
    return true;
  }
  return false;
};

export function ObjectsTab({
  assets,
  selectedAssetId,
  onAssetClick,
  onAssetDelete,
  onEditPageNavigate,
}: ObjectsTabProps) {
  // Asset 분류
  const objectAssets = assets.filter((a) => a.type === 'object');
  const lightAssets = assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  );

  // 편집 가능한 Asset 존재 여부
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
      {/* 저장 후 렌더링 안내 */}
      <RenderModeHint mode="save-required" />

      {/* 조명 섹션 */}
      <PanelSection title="조명" count={lightAssets.length}>
        <div className="objects-tab__list">
          {lightAssets.map((asset) => {
            const locked = isRequiredAsset(asset);
            return (
              <ObjectListItem
                key={asset.id}
                icon={getAssetIcon(asset)}
                name={getAssetDisplayName(asset)}
                selected={selectedAssetId === asset.id}
                locked={locked}
                onClick={locked ? undefined : () => onAssetClick(asset)}
                onDelete={locked ? undefined : () => onAssetDelete(asset.id)}
              />
            );
          })}
        </div>
      </PanelSection>

      {/* 가구 섹션 */}
      <PanelSection title="가구" count={objectAssets.length}>
        <div className="objects-tab__list">
          {objectAssets.map((asset) => {
            const locked = isRequiredAsset(asset);
            return (
              <ObjectListItem
                key={asset.id}
                icon={getAssetIcon(asset)}
                name={getAssetDisplayName(asset)}
                selected={selectedAssetId === asset.id}
                locked={locked}
                onClick={locked ? undefined : () => onAssetClick(asset)}
                onDelete={locked ? undefined : () => onAssetDelete(asset.id)}
              />
            );
          })}
        </div>
      </PanelSection>

      {/* Empty State */}
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
