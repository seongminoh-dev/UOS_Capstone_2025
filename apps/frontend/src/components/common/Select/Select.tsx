/**
 * Select - 공통 드롭다운 선택 컴포넌트
 */

import { SelectHTMLAttributes, forwardRef, useId } from 'react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      label,
      placeholder,
      size = 'md',
      className = '',
      disabled,
      id: propId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = propId || generatedId;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    };

    return (
      <div className={`select-wrapper ${className}`}>
        {label && (
          <label htmlFor={selectId} className="select__label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`select select--${size}`}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label={!label ? placeholder : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="select__arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
