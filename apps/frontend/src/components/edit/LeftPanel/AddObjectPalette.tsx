/**
 * AddObjectPalette - 초보자 중심 "가구/조명 추가" UI
 *
 * LeftPanel 상단에 위치
 * 탭 구조: [가구] [장식] [조명]
 * 클릭 시 즉시 Viewport 중앙에 배치
 */

import { useState } from 'react';
import { getFurnitureBySubCategory, getAssetsByCategory } from '../../../assets/AssetRegistry';
import type { FurnitureSubCategory } from '../../../assets/AssetTypes';
import './AddObjectPalette.css';

interface AddObjectPaletteProps {
  onAddObject: (meshName: string) => void;
  onAddLight: (lightType: 'point-light' | 'rect-light') => void;
}

type PaletteTab = 'furniture' | 'decoration' | 'lighting';

const FURNITURE_SUBTABS: { key: FurnitureSubCategory; label: string }[] = [
  { key: 'seating', label: '앉는 가구' },
  { key: 'table', label: '테이블' },
  { key: 'storage', label: '수납' },
  { key: 'bed', label: '침대' },
  { key: 'other', label: '기타' },
];

export function AddObjectPalette({ onAddObject, onAddLight }: AddObjectPaletteProps) {
  const [activeTab, setActiveTab] = useState<PaletteTab>('furniture');
  const [furnitureSubTab, setFurnitureSubTab] = useState<FurnitureSubCategory>('seating');

  const furnitureAssets = getFurnitureBySubCategory(furnitureSubTab);
  const decorationAssets = getAssetsByCategory('decoration');
  const lightingAssets = getAssetsByCategory('lighting');

  return (
    <div className="add-palette">
      <div className="add-palette__header">
        <span className="add-palette__title">오브젝트 추가</span>
      </div>

      {/* 메인 탭 */}
      <div className="add-palette__tabs">
        <button
          className={`add-palette__tab ${activeTab === 'furniture' ? 'add-palette__tab--active' : ''}`}
          onClick={() => setActiveTab('furniture')}
        >
          가구
        </button>
        <button
          className={`add-palette__tab ${activeTab === 'decoration' ? 'add-palette__tab--active' : ''}`}
          onClick={() => setActiveTab('decoration')}
        >
          장식
        </button>
        <button
          className={`add-palette__tab ${activeTab === 'lighting' ? 'add-palette__tab--active' : ''}`}
          onClick={() => setActiveTab('lighting')}
        >
          조명
        </button>
      </div>

      {/* 가구 탭 콘텐츠 */}
      {activeTab === 'furniture' && (
        <>
          {/* 서브탭 */}
          <div className="add-palette__subtabs">
            {FURNITURE_SUBTABS.map((sub) => (
              <button
                key={sub.key}
                className={`add-palette__subtab ${furnitureSubTab === sub.key ? 'add-palette__subtab--active' : ''}`}
                onClick={() => setFurnitureSubTab(sub.key)}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* 가구 그리드 */}
          <div className="add-palette__grid">
            {furnitureAssets.length > 0 ? (
              furnitureAssets.map((asset) => (
                <button
                  key={asset.meshName}
                  className="add-palette__item"
                  onClick={() => onAddObject(asset.meshName)}
                  title={asset.description}
                >
                  <span className="add-palette__item-icon">{asset.icon || '📦'}</span>
                  <span className="add-palette__item-name">{asset.name}</span>
                </button>
              ))
            ) : (
              <div className="add-palette__empty">이 카테고리에는 아직 가구가 없습니다</div>
            )}
          </div>
        </>
      )}

      {/* 장식 탭 콘텐츠 */}
      {activeTab === 'decoration' && (
        <div className="add-palette__grid">
          {decorationAssets.length > 0 ? (
            decorationAssets.map((asset) => (
              <button
                key={asset.meshName}
                className="add-palette__item"
                onClick={() => onAddObject(asset.meshName)}
                title={asset.description}
              >
                <span className="add-palette__item-icon">{asset.icon || '🎨'}</span>
                <span className="add-palette__item-name">{asset.name}</span>
              </button>
            ))
          ) : (
            <div className="add-palette__empty">장식 오브젝트가 없습니다</div>
          )}
        </div>
      )}

      {/* 조명 탭 콘텐츠 */}
      {activeTab === 'lighting' && (
        <div className="add-palette__grid">
          {/* 조명 기구 */}
          {lightingAssets.map((asset) => (
            <button
              key={asset.meshName}
              className="add-palette__item"
              onClick={() => onAddObject(asset.meshName)}
              title={asset.description}
            >
              <span className="add-palette__item-icon">{asset.icon || '💡'}</span>
              <span className="add-palette__item-name">{asset.name}</span>
            </button>
          ))}

          {/* 광원 */}
          <div className="add-palette__divider">
            <span>광원</span>
          </div>

          <button
            className="add-palette__item add-palette__item--light"
            onClick={() => onAddLight('point-light')}
            title="점 광원 - 전구처럼 모든 방향으로 빛을 방출"
          >
            <span className="add-palette__item-icon">💡</span>
            <span className="add-palette__item-name">포인트 조명</span>
          </button>

          <button
            className="add-palette__item add-palette__item--light"
            onClick={() => onAddLight('rect-light')}
            title="면 광원 - 형광등처럼 넓은 면에서 빛을 방출"
          >
            <span className="add-palette__item-icon">🔲</span>
            <span className="add-palette__item-name">면광원</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default AddObjectPalette;
