/**
 * ConfirmModal - 확인/취소 모달
 *
 * 삭제 확인, 저장 확인 등에 사용
 */

import { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from '../Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** 취소 버튼 클릭 시 호출 (미지정 시 onClose 호출) */
  onCancel?: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
  /** 추가 체크박스 (예: "오늘은 다시 보지 않음") */
  checkbox?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'default',
  isLoading = false,
  checkbox,
}: ConfirmModalProps) {
  const handleCancel = onCancel ?? onClose;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="confirm-modal__content">
        <p className="confirm-modal__message">{message}</p>
        {checkbox && (
          <label className="confirm-modal__checkbox">
            <input
              type="checkbox"
              checked={checkbox.checked}
              onChange={(e) => checkbox.onChange(e.target.checked)}
            />
            <span>{checkbox.label}</span>
          </label>
        )}
      </div>
    </Modal>
  );
}

export default ConfirmModal;
