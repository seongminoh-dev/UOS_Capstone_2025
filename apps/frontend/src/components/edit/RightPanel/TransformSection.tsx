/**
 * TransformSection - Transform 속성 편집 섹션
 *
 * - Position X/Y/Z
 * - Rotation X/Y/Z (degrees)
 * - Scale (Uniform)
 * - Compact UI with number inputs
 */

import type { Transform } from '../../../graphics-core/service/Scene';
import './TransformSection.css';

interface TransformSectionProps {
  transform: Transform;
  onPositionChange: (axis: number, value: number) => void;
  onRotationChange: (axis: number, value: number) => void;
  onScaleChange: (value: number) => void;
}

export function TransformSection({
  transform,
  onPositionChange,
  onRotationChange,
  onScaleChange,
}: TransformSectionProps) {
  const handleNumberChange = (
    callback: (value: number) => void,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      callback(value);
    }
  };

  return (
    <div className="transform-section">
      {/* Position */}
      <div className="transform-section__group">
        <div className="transform-section__label">
          <span className="transform-section__label-dot transform-section__label-dot--position" />
          위치 (Position)
        </div>
        <div className="transform-section__row">
          <div className="transform-section__field">
            <span className="transform-section__axis transform-section__axis--x">X</span>
            <input
              type="number"
              step="0.1"
              value={transform.position[0]}
              onChange={(e) => handleNumberChange((v) => onPositionChange(0, v), e)}
              className="transform-section__input"
            />
          </div>
          <div className="transform-section__field">
            <span className="transform-section__axis transform-section__axis--y">Y</span>
            <input
              type="number"
              step="0.1"
              value={transform.position[1]}
              onChange={(e) => handleNumberChange((v) => onPositionChange(1, v), e)}
              className="transform-section__input"
            />
          </div>
          <div className="transform-section__field">
            <span className="transform-section__axis transform-section__axis--z">Z</span>
            <input
              type="number"
              step="0.1"
              value={transform.position[2]}
              onChange={(e) => handleNumberChange((v) => onPositionChange(2, v), e)}
              className="transform-section__input"
            />
          </div>
        </div>
      </div>

      {/* Rotation */}
      <div className="transform-section__group">
        <div className="transform-section__label">
          <span className="transform-section__label-dot transform-section__label-dot--rotation" />
          회전 (Rotation °)
        </div>
        <div className="transform-section__row">
          <div className="transform-section__field">
            <span className="transform-section__axis transform-section__axis--x">X</span>
            <input
              type="number"
              step="5"
              value={transform.rotation[0]}
              onChange={(e) => handleNumberChange((v) => onRotationChange(0, v), e)}
              className="transform-section__input"
            />
          </div>
          <div className="transform-section__field">
            <span className="transform-section__axis transform-section__axis--y">Y</span>
            <input
              type="number"
              step="5"
              value={transform.rotation[1]}
              onChange={(e) => handleNumberChange((v) => onRotationChange(1, v), e)}
              className="transform-section__input"
            />
          </div>
          <div className="transform-section__field">
            <span className="transform-section__axis transform-section__axis--z">Z</span>
            <input
              type="number"
              step="5"
              value={transform.rotation[2]}
              onChange={(e) => handleNumberChange((v) => onRotationChange(2, v), e)}
              className="transform-section__input"
            />
          </div>
        </div>
      </div>

      {/* Scale (Uniform) */}
      <div className="transform-section__group">
        <div className="transform-section__label">
          <span className="transform-section__label-dot transform-section__label-dot--scale" />
          크기 (Scale)
        </div>
        <div className="transform-section__row transform-section__row--single">
          <input
            type="number"
            step="0.1"
            min="0.01"
            value={transform.scale[0]}
            onChange={(e) => handleNumberChange((v) => v > 0 && onScaleChange(v), e)}
            className="transform-section__input transform-section__input--wide"
          />
          <span className="transform-section__hint">균일 크기 조절</span>
        </div>
      </div>
    </div>
  );
}

export default TransformSection;
