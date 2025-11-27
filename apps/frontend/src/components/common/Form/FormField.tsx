/**
 * FormField - 폼 필드 래퍼 컴포넌트
 *
 * 라벨 + 입력 필드를 감싸는 공통 컴포넌트
 */

import { ReactNode } from 'react';
import './FormField.css';

export interface FormFieldProps {
  label: string;
  description?: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}

export function FormField({
  label,
  description,
  children,
  required = false,
  error,
}: FormFieldProps) {
  return (
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      <div className="form-field__header">
        <label className="form-field__label">
          {label}
          {required && <span className="form-field__required">*</span>}
        </label>
        {description && (
          <span className="form-field__description">{description}</span>
        )}
      </div>
      <div className="form-field__content">{children}</div>
      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
}

export default FormField;
