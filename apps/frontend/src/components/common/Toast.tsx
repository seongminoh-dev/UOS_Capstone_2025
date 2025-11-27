/**
 * Toast - 알림 메시지 컴포넌트
 *
 * 사용자 피드백을 위한 비침입적 알림
 * - 성공/에러/경고/정보 타입 지원
 * - 자동 사라짐 (4초)
 * - 수동 닫기 가능
 */

import { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (isExiting) {
      const exitTimer = setTimeout(() => {
        onClose(toast.id);
      }, 300); // 애니메이션 시간
      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, toast.id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
  };

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-label="알림">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
