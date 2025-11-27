/**
 * Vec3Input - 3축 벡터 입력 컴포넌트
 *
 * X, Y, Z 또는 R, G, B 같은 3개의 숫자 입력을 위한 컴포넌트
 */

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
            value={value[index] ?? 0}
            onChange={(e) => onChange(index, e.target.value)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

export default Vec3Input;
