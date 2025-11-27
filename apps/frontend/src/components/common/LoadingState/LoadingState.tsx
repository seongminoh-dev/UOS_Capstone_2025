/**
 * LoadingState - 로딩 상태 표시 컴포넌트
 *
 * 데이터 로딩 중이거나 처리 중일 때 표시
 */

import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  variant?: 'default' | 'fullscreen' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
  message = '로딩 중...',
  subMessage,
  variant = 'default',
  size = 'md',
}: LoadingStateProps) {
  return (
    <div className={`loading-state loading-state--${variant} loading-state--${size}`}>
      <div className="loading-state__spinner">
        <div className="loading-state__ring" />
      </div>
      {message && <p className="loading-state__message">{message}</p>}
      {subMessage && <p className="loading-state__sub-message">{subMessage}</p>}
    </div>
  );
}

export default LoadingState;
