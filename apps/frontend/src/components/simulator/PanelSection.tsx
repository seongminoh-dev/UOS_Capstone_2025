/**
 * PanelSection - 패널 내부 섹션 컴포넌트
 *
 * 환경/오브젝트/정보 탭 내부의 섹션을 일관되게 표시
 *
 * 구조:
 * ┌─────────────────────────────────────────┐
 * │  타이틀                    [카운트] [액션] │
 * │  설명 텍스트 (optional)                  │
 * ├─────────────────────────────────────────┤
 * │  children                               │
 * └─────────────────────────────────────────┘
 */

import type { ReactNode } from 'react';
import './PanelSection.css';

interface PanelSectionProps {
  /** 섹션 제목 */
  title: string;
  /** 섹션 설명 (선택) */
  description?: string;
  /** 카운트 배지 (선택) */
  count?: number;
  /** 헤더 우측 액션 (선택, 예: 편집 버튼) */
  action?: ReactNode;
  /** 섹션 내용 */
  children: ReactNode;
}

export function PanelSection({
  title,
  description,
  count,
  action,
  children,
}: PanelSectionProps) {
  const hasHeaderExtras = count !== undefined || action;

  return (
    <div className="panel-section">
      {/* Header */}
      <div className="panel-section__header">
        <h4 className="panel-section__title">{title}</h4>
        {hasHeaderExtras && (
          <div className="panel-section__extras">
            {count !== undefined && (
              <span className="panel-section__count">{count}</span>
            )}
            {action && (
              <div className="panel-section__action">{action}</div>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="panel-section__description">{description}</p>
      )}

      {/* Content */}
      <div className="panel-section__content">{children}</div>
    </div>
  );
}

export default PanelSection;
