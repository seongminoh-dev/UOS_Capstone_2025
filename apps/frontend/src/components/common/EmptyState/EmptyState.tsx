/**
 * EmptyState - 빈 상태 표시 컴포넌트
 *
 * 데이터가 없거나 목록이 비어있을 때 표시
 */

import './EmptyState.css';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message: string;
  action?: React.ReactNode;
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${variant}`}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      {title && <h3 className="empty-state__title">{title}</h3>}
      <p className="empty-state__message">{message}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export default EmptyState;
