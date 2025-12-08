/**
 * ViewportInfo - 뷰포트 정보 표시
 *
 * Canvas 우하단에 표시
 * - Gizmo 모드
 * - 선택된 오브젝트
 */

import type { GizmoMode } from './GizmoModeSelector';
import './ViewportInfo.css';

interface ViewportInfoProps {
  gizmoMode: GizmoMode;
  selectedObjectName?: string;
  className?: string;
}

export function ViewportInfo({ gizmoMode, selectedObjectName, className = '' }: ViewportInfoProps) {
  const getModeLabel = (mode: GizmoMode): string => {
    switch (mode) {
      case 'translate':
        return '이동 (G)';
      case 'rotate':
        return '회전 (R)';
      case 'scale':
        return '크기 (S)';
      default:
        return mode;
    }
  };

  return (
    <div className={`viewport-info ${className}`}>
      {selectedObjectName && (
        <div className="viewport-info__item">
          <span className="viewport-info__label">선택:</span>
          <span className="viewport-info__value">{selectedObjectName}</span>
        </div>
      )}
      <div className="viewport-info__item">
        <span className="viewport-info__label">모드:</span>
        <span className="viewport-info__value">{getModeLabel(gizmoMode)}</span>
      </div>
    </div>
  );
}

export default ViewportInfo;
