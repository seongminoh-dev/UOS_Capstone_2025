/**
 * Instance 수정 모달
 * - Object: position, rotation, scale
 * - Light: 타입별 파라미터
 */

import { useState, useEffect } from 'react';
import type { SceneAsset } from '../graphics-core/service/Scene';
import './InstanceEditModal.css';

interface InstanceEditModalProps {
  asset: SceneAsset | null;
  onClose: () => void;
  onSave: (updatedAsset: SceneAsset) => void;
}

export default function InstanceEditModal({
  asset,
  onClose,
  onSave,
}: InstanceEditModalProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!asset) return;

    if (asset.type === 'object' && asset.transform) {
      setFormData({
        position: [...asset.transform.position],
        rotation: [...asset.transform.rotation],
        scale: [...asset.transform.scale],
      });
    } else if (asset.type === 'directional-light' && asset.lightParams) {
      const params = asset.lightParams as any;
      setFormData({
        direction: [...params.direction],
        color: [...params.color],
        intensity: params.intensity,
      });
    } else if (asset.type === 'point-light' && asset.lightParams) {
      const params = asset.lightParams as any;
      setFormData({
        position: [...params.position],
        color: [...params.color],
        intensity: params.intensity,
      });
    } else if (asset.type === 'rect-light' && asset.lightParams) {
      const params = asset.lightParams as any;
      setFormData({
        position: [...params.position],
        u: [...params.u],
        v: [...params.v],
        color: [...params.color],
        intensity: params.intensity,
      });
    }
  }, [asset]);

  if (!asset) return null;

  const handleVectorChange = (key: string, index: number, value: string) => {
    // 빈 문자열이나 "-", "." 등 입력 중인 상태 허용
    const numValue = value === '' || value === '-' || value === '.' || value === '-.'
      ? value
      : parseFloat(value);
    setFormData((prev: any) => ({
      ...prev,
      [key]: prev[key].map((v: number, i: number) => (i === index ? numValue : v)),
    }));
  };

  const handleNumberChange = (key: string, value: string) => {
    // 빈 문자열이나 "-", "." 등 입력 중인 상태 허용
    const numValue = value === '' || value === '-' || value === '.' || value === '-.'
      ? value
      : parseFloat(value);
    setFormData((prev: any) => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const handleSave = () => {
    // 문자열을 숫자로 변환하는 헬퍼 함수
    const toNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    };

    const toVec3 = (arr: any[]): [number, number, number] => [
      toNumber(arr[0]),
      toNumber(arr[1]),
      toNumber(arr[2]),
    ];

    const updatedAsset: SceneAsset = { ...asset };

    if (asset.type === 'object') {
      updatedAsset.transform = {
        position: toVec3(formData.position),
        rotation: toVec3(formData.rotation),
        scale: toVec3(formData.scale),
      };
    } else if (asset.type === 'directional-light') {
      updatedAsset.lightParams = {
        direction: toVec3(formData.direction),
        color: toVec3(formData.color),
        intensity: toNumber(formData.intensity),
      };
    } else if (asset.type === 'point-light') {
      updatedAsset.lightParams = {
        position: toVec3(formData.position),
        color: toVec3(formData.color),
        intensity: toNumber(formData.intensity),
      };
    } else if (asset.type === 'rect-light') {
      updatedAsset.lightParams = {
        position: toVec3(formData.position),
        u: toVec3(formData.u),
        v: toVec3(formData.v),
        color: toVec3(formData.color),
        intensity: toNumber(formData.intensity),
      };
    }

    onSave(updatedAsset);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {asset.type === 'object' ? asset.meshName : asset.type} 수정
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Object */}
          {asset.type === 'object' && (
            <>
              <div className="form-section">
                <h3 className="form-section-title">위치 (Position)</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[0] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 0, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[1] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 1, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[2] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 2, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">회전 (Rotation, degrees)</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>X</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.rotation?.[0] || 0}
                      onChange={(e) =>
                        handleVectorChange('rotation', 0, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Y</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.rotation?.[1] || 0}
                      onChange={(e) =>
                        handleVectorChange('rotation', 1, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Z</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.rotation?.[2] || 0}
                      onChange={(e) =>
                        handleVectorChange('rotation', 2, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">크기 (Scale)</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.scale?.[0] || 1}
                      onChange={(e) =>
                        handleVectorChange('scale', 0, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.scale?.[1] || 1}
                      onChange={(e) =>
                        handleVectorChange('scale', 1, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.scale?.[2] || 1}
                      onChange={(e) =>
                        handleVectorChange('scale', 2, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Point Light */}
          {asset.type === 'point-light' && (
            <>
              <div className="form-section">
                <h3 className="form-section-title">위치 (Position)</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[0] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 0, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[1] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 1, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[2] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 2, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">색상 (Color, RGB 0-1)</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>R</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.color?.[0] || 1}
                      onChange={(e) =>
                        handleVectorChange('color', 0, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>G</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.color?.[1] || 1}
                      onChange={(e) =>
                        handleVectorChange('color', 1, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>B</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.color?.[2] || 1}
                      onChange={(e) =>
                        handleVectorChange('color', 2, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">강도 (Intensity)</h3>
                <input
                  type="number"
                  step="0.1"
                  className="full-width-input"
                  value={formData.intensity || 1}
                  onChange={(e) => handleNumberChange('intensity', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Rect Light */}
          {asset.type === 'rect-light' && (
            <>
              <div className="form-section">
                <h3 className="form-section-title">위치 (Position)</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[0] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 0, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[1] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 1, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.position?.[2] || 0}
                      onChange={(e) =>
                        handleVectorChange('position', 2, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">방향 U</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.u?.[0] || 0}
                      onChange={(e) => handleVectorChange('u', 0, e.target.value)}
                    />
                  </div>
                  <div className="vector-input">
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.u?.[1] || 0}
                      onChange={(e) => handleVectorChange('u', 1, e.target.value)}
                    />
                  </div>
                  <div className="vector-input">
                    <label>Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.u?.[2] || 0}
                      onChange={(e) => handleVectorChange('u', 2, e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">방향 V</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.v?.[0] || 0}
                      onChange={(e) => handleVectorChange('v', 0, e.target.value)}
                    />
                  </div>
                  <div className="vector-input">
                    <label>Y</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.v?.[1] || 0}
                      onChange={(e) => handleVectorChange('v', 1, e.target.value)}
                    />
                  </div>
                  <div className="vector-input">
                    <label>Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.v?.[2] || 0}
                      onChange={(e) => handleVectorChange('v', 2, e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">색상 (Color, RGB 0-1)</h3>
                <div className="vector-inputs">
                  <div className="vector-input">
                    <label>R</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.color?.[0] || 1}
                      onChange={(e) =>
                        handleVectorChange('color', 0, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>G</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.color?.[1] || 1}
                      onChange={(e) =>
                        handleVectorChange('color', 1, e.target.value)
                      }
                    />
                  </div>
                  <div className="vector-input">
                    <label>B</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.color?.[2] || 1}
                      onChange={(e) =>
                        handleVectorChange('color', 2, e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="form-section-title">강도 (Intensity)</h3>
                <input
                  type="number"
                  step="0.1"
                  className="full-width-input"
                  value={formData.intensity || 1}
                  onChange={(e) => handleNumberChange('intensity', e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="modal-button modal-cancel" onClick={onClose}>
            취소
          </button>
          <button className="modal-button modal-save" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
