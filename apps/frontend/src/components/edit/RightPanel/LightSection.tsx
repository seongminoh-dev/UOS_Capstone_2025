/**
 * LightSection - 조명 속성 편집 섹션
 *
 * - Position (point-light, rect-light)
 * - Direction (directional-light)
 * - Color (RGB 0-1)
 * - Intensity
 * - U/V Vectors (rect-light)
 */

import { useState } from 'react';
import type { PointLightParams, RectLightParams, DirectionalLightParams } from '../../../graphics-core/service/Scene';
import './LightSection.css';

interface LightSectionProps {
  lightType: 'directional-light' | 'point-light' | 'rect-light';
  lightParams: PointLightParams | RectLightParams | DirectionalLightParams;
  onParamChange: (paramPath: string, value: number | [number, number, number]) => void;
}

export function LightSection({ lightType, lightParams, onParamChange }: LightSectionProps) {
  // 입력 중인 값을 임시로 저장 (빈 문자열, '-', '.' 등 허용)
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  const handleNumberChange = (
    paramPath: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = e.target.value;

    // 임시 값 저장 (빈 문자열, '-', '.', '-.' 등 허용)
    setTempValues(prev => ({ ...prev, [paramPath]: rawValue }));

    // 유효한 숫자인 경우에만 실제 값 업데이트
    const value = parseFloat(rawValue);
    if (!isNaN(value)) {
      onParamChange(paramPath, value);
    }
  };

  // blur 시 임시 값 정리 (빈 값이면 0으로 리셋)
  const handleBlur = (paramPath: string, defaultValue: number = 0) => {
    const tempValue = tempValues[paramPath];
    if (tempValue === '' || tempValue === '-' || tempValue === '.' || tempValue === '-.') {
      onParamChange(paramPath, defaultValue);
    }
    // 임시 값 삭제
    setTempValues(prev => {
      const { [paramPath]: _, ...rest } = prev;
      return rest;
    });
  };

  // 표시할 값 결정 (임시 값이 있으면 임시 값, 없으면 실제 값)
  const getDisplayValue = (paramPath: string, actualValue: number): string => {
    if (paramPath in tempValues) {
      return tempValues[paramPath];
    }
    return String(actualValue);
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
    // 색상은 배열 전체를 한 번에 업데이트 (race condition 방지)
    onParamChange('color', rgb);
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
                  value={getDisplayValue('position.0', lightParams.position[0])}
                  onChange={(e) => handleNumberChange('position.0', e)}
                  onBlur={() => handleBlur('position.0', 0)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--y">Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={getDisplayValue('position.1', lightParams.position[1])}
                  onChange={(e) => handleNumberChange('position.1', e)}
                  onBlur={() => handleBlur('position.1', 0)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--z">Z</span>
                <input
                  type="number"
                  step="0.1"
                  value={getDisplayValue('position.2', lightParams.position[2])}
                  onChange={(e) => handleNumberChange('position.2', e)}
                  onBlur={() => handleBlur('position.2', 0)}
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
                value={getDisplayValue('direction.0', lightParams.direction[0])}
                onChange={(e) => handleNumberChange('direction.0', e)}
                onBlur={() => handleBlur('direction.0', 0)}
                className="light-section__input"
              />
            </div>
            <div className="light-section__field">
              <span className="light-section__axis light-section__axis--y">Y</span>
              <input
                type="number"
                step="0.1"
                value={getDisplayValue('direction.1', lightParams.direction[1])}
                onChange={(e) => handleNumberChange('direction.1', e)}
                onBlur={() => handleBlur('direction.1', 0)}
                className="light-section__input"
              />
            </div>
            <div className="light-section__field">
              <span className="light-section__axis light-section__axis--z">Z</span>
              <input
                type="number"
                step="0.1"
                value={getDisplayValue('direction.2', lightParams.direction[2])}
                onChange={(e) => handleNumberChange('direction.2', e)}
                onBlur={() => handleBlur('direction.2', 0)}
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
                  value={getDisplayValue('u.0', (lightParams as RectLightParams).u[0])}
                  onChange={(e) => handleNumberChange('u.0', e)}
                  onBlur={() => handleBlur('u.0', 0)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--y">Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={getDisplayValue('u.1', (lightParams as RectLightParams).u[1])}
                  onChange={(e) => handleNumberChange('u.1', e)}
                  onBlur={() => handleBlur('u.1', 0)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--z">Z</span>
                <input
                  type="number"
                  step="0.1"
                  value={getDisplayValue('u.2', (lightParams as RectLightParams).u[2])}
                  onChange={(e) => handleNumberChange('u.2', e)}
                  onBlur={() => handleBlur('u.2', 0)}
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
                  value={getDisplayValue('v.0', (lightParams as RectLightParams).v[0])}
                  onChange={(e) => handleNumberChange('v.0', e)}
                  onBlur={() => handleBlur('v.0', 0)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--y">Y</span>
                <input
                  type="number"
                  step="0.1"
                  value={getDisplayValue('v.1', (lightParams as RectLightParams).v[1])}
                  onChange={(e) => handleNumberChange('v.1', e)}
                  onBlur={() => handleBlur('v.1', 0)}
                  className="light-section__input"
                />
              </div>
              <div className="light-section__field">
                <span className="light-section__axis light-section__axis--z">Z</span>
                <input
                  type="number"
                  step="0.1"
                  value={getDisplayValue('v.2', (lightParams as RectLightParams).v[2])}
                  onChange={(e) => handleNumberChange('v.2', e)}
                  onBlur={() => handleBlur('v.2', 0)}
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
            value={'color.0' in tempValues ? tempValues['color.0'] : lightParams.color[0].toFixed(2)}
            onChange={(e) => handleNumberChange('color.0', e)}
            onBlur={() => handleBlur('color.0', 1)}
            className="light-section__color-input"
          />
          {/* G */}
          <span className="light-section__color-label light-section__color-label--g">G</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={'color.1' in tempValues ? tempValues['color.1'] : lightParams.color[1].toFixed(2)}
            onChange={(e) => handleNumberChange('color.1', e)}
            onBlur={() => handleBlur('color.1', 1)}
            className="light-section__color-input"
          />
          {/* B */}
          <span className="light-section__color-label light-section__color-label--b">B</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={'color.2' in tempValues ? tempValues['color.2'] : lightParams.color[2].toFixed(2)}
            onChange={(e) => handleNumberChange('color.2', e)}
            onBlur={() => handleBlur('color.2', 1)}
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
        <div className="light-section__row light-section__row--intensity">
          <input
            type="number"
            step="0.5"
            min="0"
            value={getDisplayValue('intensity', lightParams.intensity)}
            onChange={(e) => handleNumberChange('intensity', e)}
            onBlur={() => handleBlur('intensity', 1)}
            className="light-section__input light-section__input--intensity"
          />
        </div>
      </div>
    </div>
  );
}

export default LightSection;
