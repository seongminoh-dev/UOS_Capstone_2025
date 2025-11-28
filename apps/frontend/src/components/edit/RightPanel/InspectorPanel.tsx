/**
 * InspectorPanel - 선택된 오브젝트 속성 편집 패널
 *
 * RightPanel에 위치
 * 선택된 오브젝트에 따라 동적 컨텐츠 표시
 * - Header: 오브젝트 이름, 타입, 아이콘
 * - Sections: Transform, Light, Material, Metadata (펼침/접기)
 * - Footer: 삭제 버튼
 */

import { useState } from 'react';
import type { SceneAsset } from '../../../graphics-core/service/Scene';
import { getAssetMetadata } from '../../../assets/AssetRegistry';
import { TransformSection } from './TransformSection';
import { LightSection } from './LightSection';
import { MetadataSection } from './MetadataSection';
import { Button } from '../../common';
import './InspectorPanel.css';

interface InspectorPanelProps {
  asset: SceneAsset | null;
  onPropertyChange: (
    assetId: string | number,
    property: 'position' | 'rotation' | 'scale',
    axis: number,
    value: number
  ) => void;
  onUniformScaleChange: (assetId: string | number, value: number) => void;
  onLightParamChange: (
    assetId: string | number,
    paramPath: string,
    value: number | [number, number, number]
  ) => void;
  onDelete: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`inspector-section ${isOpen ? 'inspector-section--open' : ''}`}>
      <button
        className="inspector-section__header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="inspector-section__title">{title}</span>
        <span className="inspector-section__toggle">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div className="inspector-section__content">{children}</div>}
    </div>
  );
}

export function InspectorPanel({
  asset,
  onPropertyChange,
  onUniformScaleChange,
  onLightParamChange,
  onDelete,
}: InspectorPanelProps) {
  // 선택된 오브젝트가 없으면 빈 상태 표시
  if (!asset) {
    return (
      <div className="inspector-panel">
        <div className="inspector-panel__empty">
          <span className="inspector-panel__empty-icon">🎯</span>
          <span className="inspector-panel__empty-title">오브젝트를 선택하세요</span>
          <span className="inspector-panel__empty-hint">
            캔버스에서 오브젝트를 클릭하거나<br />
            왼쪽 목록에서 선택하세요
          </span>
        </div>
      </div>
    );
  }

  const isObject = asset.type === 'object';
  const isLight = ['directional-light', 'point-light', 'rect-light'].includes(asset.type);
  const metadata = asset.meshName ? getAssetMetadata(asset.meshName) : null;

  // 아이콘 결정
  const getIcon = (): string => {
    if (isObject) return metadata?.icon || '📦';
    if (asset.type === 'point-light') return '💡';
    if (asset.type === 'rect-light') return '🔲';
    if (asset.type === 'directional-light') return '☀️';
    return '📦';
  };

  // 이름 결정
  const getName = (): string => {
    if (isObject) return metadata?.name || asset.meshName || '오브젝트';
    if (asset.type === 'point-light') return '포인트 조명';
    if (asset.type === 'rect-light') return '면광원';
    if (asset.type === 'directional-light') return '방향성 조명';
    return '오브젝트';
  };

  // 타입 라벨
  const getTypeLabel = (): string => {
    if (isObject) return metadata?.category === 'furniture' ? '가구' : '장식';
    return '조명';
  };

  return (
    <div className="inspector-panel">
      {/* Header */}
      <div className="inspector-panel__header">
        <span className="inspector-panel__icon">{getIcon()}</span>
        <div className="inspector-panel__info">
          <span className="inspector-panel__name">{getName()}</span>
          <span className="inspector-panel__type">{getTypeLabel()}</span>
        </div>
      </div>

      {/* Sections */}
      <div className="inspector-panel__sections">
        {/* Transform Section (오브젝트용) */}
        {isObject && asset.transform && (
          <CollapsibleSection title="트랜스폼 (Transform)">
            <TransformSection
              transform={asset.transform}
              onPositionChange={(axis, value) => onPropertyChange(asset.id, 'position', axis, value)}
              onRotationChange={(axis, value) => onPropertyChange(asset.id, 'rotation', axis, value)}
              onScaleChange={(value) => onUniformScaleChange(asset.id, value)}
            />
          </CollapsibleSection>
        )}

        {/* Light Section (조명용) */}
        {isLight && asset.lightParams && (
          <CollapsibleSection title="조명 설정 (Light)">
            <LightSection
              lightType={asset.type as 'directional-light' | 'point-light' | 'rect-light'}
              lightParams={asset.lightParams}
              onParamChange={(paramPath, value) => onLightParamChange(asset.id, paramPath, value)}
            />
          </CollapsibleSection>
        )}

        {/* Metadata Section */}
        <CollapsibleSection title="정보 (Info)" defaultOpen={false}>
          <MetadataSection assetType={asset.type} meshName={asset.meshName} />
        </CollapsibleSection>
      </div>

      {/* Footer - Delete Button */}
      <div className="inspector-panel__footer">
        <Button variant="danger" fullWidth onClick={onDelete}>
          삭제 (Delete)
        </Button>
        <div className="inspector-panel__shortcuts">
          {isObject && <span>단축키: G(이동) R(회전) S(크기)</span>}
          <span>Delete 키로 삭제</span>
        </div>
      </div>
    </div>
  );
}

export default InspectorPanel;
