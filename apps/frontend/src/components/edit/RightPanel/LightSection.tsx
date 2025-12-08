/**
 * LightSection - 조명 속성 편집 섹션
 *
 * - Position (point-light, rect-light)
 * - Direction (directional-light)
 * - Color (RGB 0-1)
 * - Intensity
 * - U/V Vectors (rect-light)
 */

import type { PointLightParams, RectLightParams, DirectionalLightParams } from '../../../graphics-core/service/Scene';
import './LightSection.css';

interface LightSectionProps {
  lightType: 'directional-light' | 'point-light' | 'rect-light';
  lightParams: PointLightParams | RectLightParams | DirectionalLightParams;
  onParamChange: (paramPath: string, value: number | [number, number, number]) => void;
}

export function LightSection({ lightType, lightParams, onParamChange }: LightSectionProps) {
  const handleNumberChange = (
    paramPath: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onParamChange(paramPath, value);
    }
  };

  // RGB to Hex 변환
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Hex to RGB 변환
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ];
    }
    return [1, 1, 1];
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rgb = hexToRgb(e.target.value);
    onParamChange('color.0', rgb[0]);
    onParamChange('color.1', rgb[1]);
    onParamChange('color.2', rgb[2]);
  };

  return (
    <div className="light-section">
      {/* Position (point-light, rect-light) */}
      {(lightType === 'point-light' || lightType === 'rect-light') &&
        'position' in lightParams && (
          <div className="light-section__group">
            <div className="light-section__label">
              <span className="light-section__label-dot light-section__label-dot--position" />
              위치 (Position)
            </div>
            <div className="light-section__row">
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--x">X</span>
                <input
                  type="number"
                  step="0.1"
                  value={lightParams.position[0]}
                  onChange={(e) => handleNumberChange('position.0', e)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--y">Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={lightParams.position[1]}
                  onChange={(e) => handleNumberChange('position.1', e)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--z">Z</span>
                <input
                  type="number"
                  step="0.1"
                  value={lightParams.position[2]}
                  onChange={(e) => handleNumberChange('position.2', e)}
                  className="light-section__input"
                />
              </div>
            </div>
          </div>
        )}

      {/* Direction (directional-light) */}
      {lightType === 'directional-light' && 'direction' in lightParams && (
        <div className="light-section__group">
          <div className="light-section__label">
            <span className="light-section__label-dot light-section__label-dot--position" />
            방향 (Direction)
          </div>
          <div className="light-section__row">
            <div className="light-section__field">
              <span className="light-section__axis light-section__axis--x">X</span>
              <input
                type="number"
                step="0.1"
                value={lightParams.direction[0]}
                onChange={(e) => handleNumberChange('direction.0', e)}
                className="light-section__input"
              />
            </div>
            <div className="light-section__field">
              <span className="light-section__axis light-section__axis--y">Y</span>
              <input
                type="number"
                step="0.1"
                value={lightParams.direction[1]}
                onChange={(e) => handleNumberChange('direction.1', e)}
                className="light-section__input"
              />
            </div>
            <div className="light-section__field">
              <span className="light-section__axis light-section__axis--z">Z</span>
              <input
                type="number"
                step="0.1"
                value={lightParams.direction[2]}
                onChange={(e) => handleNumberChange('direction.2', e)}
                className="light-section__input"
              />
            </div>
          </div>
        </div>
      )}

      {/* U/V Vectors (rect-light) */}
      {lightType === 'rect-light' && 'u' in lightParams && 'v' in lightParams && (
        <>
          <div className="light-section__group">
            <div className="light-section__label">
              <span className="light-section__label-dot light-section__label-dot--u" />
              U 벡터 (가로)
            </div>
            <div className="light-section__row">
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--x">X</span>
                <input
                  type="number"
                  step="0.1"
                  value={(lightParams as RectLightParams).u[0]}
                  onChange={(e) => handleNumberChange('u.0', e)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--y">Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={(lightParams as RectLightParams).u[1]}
                  onChange={(e) => handleNumberChange('u.1', e)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--z">Z</span>
                <input
                  type="number"
                  step="0.1"
                  value={(lightParams as RectLightParams).u[2]}
                  onChange={(e) => handleNumberChange('u.2', e)}
                  className="light-section__input"
                />
              </div>
            </div>
          </div>

          <div className="light-section__group">
            <div className="light-section__label">
              <span className="light-section__label-dot light-section__label-dot--v" />
              V 벡터 (세로)
            </div>
            <div className="light-section__row">
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--x">X</span>
                <input
                  type="number"
                  step="0.1"
                  value={(lightParams as RectLightParams).v[0]}
                  onChange={(e) => handleNumberChange('v.0', e)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--y">Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={(lightParams as RectLightParams).v[1]}
                  onChange={(e) => handleNumberChange('v.1', e)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--z">Z</span>
                <input
                  type="number"
                  step="0.1"
                  value={(lightParams as RectLightParams).v[2]}
                  onChange={(e) => handleNumberChange('v.2', e)}
                  className="light-section__input"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Color */}
      <div className="light-section__group">
        <div className="light-section__label">
          <span className="light-section__label-dot light-section__label-dot--color" />
          색상 (Color)
        </div>
        <div className="light-section__color-row">
          {/* 컬러칩 */}
          <input
            type="color"
            value={rgbToHex(lightParams.color[0], lightParams.color[1], lightParams.color[2])}
            onChange={handleColorChange}
            className="light-section__color-chip"
          />
          {/* R */}
          <span className="light-section__color-label light-section__color-label--r">R</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={lightParams.color[0].toFixed(2)}
            onChange={(e) => handleNumberChange('color.0', e)}
            className="light-section__color-input"
          />
          {/* G */}
          <span className="light-section__color-label light-section__color-label--g">G</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={lightParams.color[1].toFixed(2)}
            onChange={(e) => handleNumberChange('color.1', e)}
            className="light-section__color-input"
          />
          {/* B */}
          <span className="light-section__color-label light-section__color-label--b">B</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={lightParams.color[2].toFixed(2)}
            onChange={(e) => handleNumberChange('color.2', e)}
            className="light-section__color-input"
          />
        </div>
      </div>

      {/* Intensity */}
      <div className="light-section__group">
        <div className="light-section__label">
          <span className="light-section__label-dot light-section__label-dot--intensity" />
          밝기 (Intensity)
        </div>
        <div className="light-section__row light-section__row--single">
          <input
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={lightParams.intensity}
            onChange={(e) => handleNumberChange('intensity', e)}
            className="light-section__slider"
          />
          <input
            type="number"
            step="0.5"
            min="0"
            value={lightParams.intensity}
            onChange={(e) => handleNumberChange('intensity', e)}
            className="light-section__input light-section__input--small"
          />
        </div>
      </div>
    </div>
  );
}

export default LightSection;
