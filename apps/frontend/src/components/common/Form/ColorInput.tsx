/**
 * ColorInput - RGB 색상 입력 컴포넌트
 *
 * Vec3Input 기반에 색상 프리뷰 추가
 * RGB 값은 0-1 범위로 입력받음
 */

import { Vec3Input } from './Vec3Input';
import type { Vec3Labels } from './Vec3Input';
import './ColorInput.css';

export interface ColorInputProps {
  value: [number | string, number | string, number | string];
  onChange: (index: number, value: string) => void;
  disabled?: boolean;
}

const COLOR_LABELS: Vec3Labels = ['R', 'G', 'B'];

export function ColorInput({ value, onChange, disabled = false }: ColorInputProps) {
  // RGB 0-1 값을 CSS rgb()로 변환
  const toNumber = (v: number | string): number => {
    if (typeof v === 'number') return v;
    const num = parseFloat(v);
    return isNaN(num) ? 0 : num;
  };

  const r = Math.round(Math.min(1, Math.max(0, toNumber(value[0]))) * 255);
  const g = Math.round(Math.min(1, Math.max(0, toNumber(value[1]))) * 255);
  const b = Math.round(Math.min(1, Math.max(0, toNumber(value[2]))) * 255);

  const previewColor = `rgb(${r}, ${g}, ${b})`;

  return (
    <div className="color-input">
      <div
        className="color-input__preview"
        style={{ backgroundColor: previewColor }}
        title={`RGB(${r}, ${g}, ${b})`}
      />
      <div className="color-input__fields">
        <Vec3Input
          value={value}
          onChange={onChange}
          labels={COLOR_LABELS}
          step={0.1}
          min={0}
          max={1}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default ColorInput;
