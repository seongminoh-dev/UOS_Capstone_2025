/**
 * MetadataSection - 오브젝트 메타데이터 표시
 *
 * - 오브젝트 타입
 * - 이름(읽기 전용)
 */

import { getAssetMetadata } from '../../../assets/AssetRegistry';
import './MetadataSection.css';

interface MetadataSectionProps {
  assetType: string;
  meshName?: string;
}

export function MetadataSection({ assetType, meshName }: MetadataSectionProps) {
  const metadata = meshName ? getAssetMetadata(meshName) : null;

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'object':
        return '오브젝트';
      case 'point-light':
        return '포인트 조명';
      case 'rect-light':
        return '면광원';
      case 'directional-light':
        return '방향성 조명';
      default:
        return type;
    }
  };

  return (
    <div className="metadata-section">
      <div className="metadata-section__item">
        <span className="metadata-section__label">타입</span>
        <span className="metadata-section__value">{getTypeLabel(assetType)}</span>
      </div>

      {meshName && (
        <div className="metadata-section__item">
          <span className="metadata-section__label">메쉬</span>
          <span className="metadata-section__value">{meshName}</span>
        </div>
      )}

      {metadata?.category && (
        <div className="metadata-section__item">
          <span className="metadata-section__label">카테고리</span>
          <span className="metadata-section__value">
            {metadata.category === 'furniture' && '가구'}
            {metadata.category === 'decoration' && '장식'}
            {metadata.category === 'lighting' && '조명'}
            {metadata.category === 'room' && '방'}
          </span>
        </div>
      )}

      {metadata?.description && (
        <div className="metadata-section__item metadata-section__item--full">
          <span className="metadata-section__label">설명</span>
          <span className="metadata-section__value metadata-section__value--desc">
            {metadata.description}
          </span>
        </div>
      )}
    </div>
  );
}

export default MetadataSection;
