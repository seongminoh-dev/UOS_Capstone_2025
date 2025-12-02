/**
 * StatusBadge - Scene 저장 상태 표시 배지
 *
 * 저장 상태에 따라 다른 색상의 점과 텍스트를 표시:
 * - 저장됨: 초록색 점 + "저장됨"
 * - 변경됨: 주황색 점 + "변경됨"
 */

import './StatusBadge.css';

export interface StatusBadgeProps {
  /** 변경 여부 (true: 변경됨, false: 저장됨) */
  isDirty: boolean;
  /** 크기 변형 */
  size?: 'default' | 'compact';
  /** 추가 클래스 */
  className?: string;
}

export function StatusBadge({
  isDirty,
  size = 'default',
  className = '',
}: StatusBadgeProps) {
  const statusClass = isDirty ? 'status-badge--dirty' : 'status-badge--saved';
  const sizeClass = size === 'compact' ? 'status-badge--compact' : '';

  return (
    <span className={`status-badge ${statusClass} ${sizeClass} ${className}`}>
      <span className="status-badge__dot" />
      <span className="status-badge__label">
        {isDirty ? '변경됨' : '저장됨'}
      </span>
    </span>
  );
}

export default StatusBadge;
