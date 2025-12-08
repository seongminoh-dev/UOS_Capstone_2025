/**
 * Vec3Input - 3축 벡터 입력 컴포넌트
 *
 * X, Y, Z 또는 R, G, B 같은 3개의 숫자 입력을 위한 컴포넌트
 * 입력 중 빈 값이나 임시 값('-', '.') 허용
 */

import { useState, useCallback } from 'react';
import './Vec3Input.css';

export type Vec3Labels = [string, string, string];

export interface Vec3InputProps {
  value: [number | string, number | string, number | string];
  onChange: (index: number, value: string) => void;
  labels?: Vec3Labels;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}

const DEFAULT_LABELS: Vec3Labels = ['X', 'Y', 'Z'];

export function Vec3Input({
  value,
  onChange,
  labels = DEFAULT_LABELS,
  step = 0.1,
  min,
  max,
  disabled = false,
}: Vec3InputProps) {
  // 입력 중인 값을 임시로 저장 (빈 문자열, '-', '.' 등 허용)
  const [tempValues, setTempValues] = useState<Record<number, string>>({});

  const handleChange = useCallback((index: number, rawValue: string) => {
    // 임시 값 저장
    setTempValues(prev => ({ ...prev, [index]: rawValue }));
    // 부모에게 전달 (빈 값도 전달해서 부모가 처리)
    onChange(index, rawValue);
  }, [onChange]);

  const handleBlur = useCallback((index: number, defaultValue: number = 0) => {
    const tempValue = tempValues[index];
    // 빈 값이나 불완전한 값이면 기본값으로 설정
    if (tempValue === '' || tempValue === '-' || tempValue === '.' || tempValue === '-.') {
      onChange(index, String(defaultValue));
    }
    // 임시 값 삭제
    setTempValues(prev => {
      const { [index]: _, ...rest } = prev;
      return rest;
    });
  }, [tempValues, onChange]);

  // 표시할 값 결정
  const getDisplayValue = (index: number): string | number => {
    if (index in tempValues) {
      return tempValues[index];
    }
    return value[index] ?? 0;
  };

  return (
    <div className="vec3-input">
      {labels.map((label, index) => (
        <div key={label} className="vec3-input__field">
          <label className="vec3-input__label">{label}</label>
          <input
            type="number"
            className="vec3-input__input"
            step={step}
            min={min}
            max={max}
            value={getDisplayValue(index)}
            onChange={(e) => handleChange(index, e.target.value)}
            onBlur={() => handleBlur(index, 0)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

export default Vec3Input;
