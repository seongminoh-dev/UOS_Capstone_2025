/**
 * Slider - 공통 슬라이더 컴포넌트
 *
 * 범위 선택을 위한 슬라이더
 * 시간, 강도 등 연속적인 값 조절에 사용
 */

import { InputHTMLAttributes, forwardRef, useMemo } from 'react';
import './Slider.css';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  valueLabel?: string;
  showLabels?: boolean;
  minLabel?: string;
  maxLabel?: string;
  size?: 'sm' | 'md';
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      label,
      valueLabel,
      showLabels = false,
      minLabel,
      maxLabel,
      size = 'md',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // 채워진 비율 계산
    const fillPercentage = useMemo(() => {
      return ((value - min) / (max - min)) * 100;
    }, [value, min, max]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    };

    return (
      <div className={`slider ${className}`}>
        {(label || valueLabel) && (
          <div className="slider__header">
            {label && <span className="slider__label">{label}</span>}
            {valueLabel && <span className="slider__value">{valueLabel}</span>}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          className={`slider__input slider__input--${size}`}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={valueLabel}
          style={{
            '--fill-percentage': `${fillPercentage}%`,
          } as React.CSSProperties}
          {...props}
        />
        {showLabels && (
          <div className="slider__labels">
            <span>{minLabel ?? min}</span>
            <span>{maxLabel ?? max}</span>
          </div>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export default Slider;
