/**
 * AssetInspector - 선택된 Asset의 Transform/Light 속성 편집 패널
 *
 * Canvas 좌상단에 오버레이로 표시
 * 오브젝트: Position, Rotation, Scale
 * 조명: Position/Direction, Color, Intensity
 */

import type { SceneAsset, Transform, PointLightParams, RectLightParams, DirectionalLightParams } from '../../graphics-core/service/Scene';
import { Button } from '../common';
import './AssetInspector.css';

interface AssetInspectorProps {
  asset: SceneAsset;
  onPropertyChange: (
    assetId: string | number,
    property: 'position' | 'rotation' | 'scale',
    axis: number,
    value: number
  ) => void;
  onUniformScaleChange: (assetId: string | number, value: number) => void;
  onLightParamChange: (
    assetId: string | number,
    paramPath: string,
    value: number | [number, number, number]
  ) => void;
  onDelete: () => void;
}

export function AssetInspector({
  asset,
  onPropertyChange,
  onUniformScaleChange,
  onLightParamChange,
  onDelete,
}: AssetInspectorProps) {
  const isObject = asset.type === 'object';
  const isLight =
    asset.type === 'directional-light' ||
    asset.type === 'point-light' ||
    asset.type === 'rect-light';

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
    <div
      className="asset-inspector"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="asset-inspector__header">
        <div className="asset-inspector__type">
          {isObject ? '선택된 오브젝트' : '선택된 조명'}
        </div>
        <div className="asset-inspector__name">
          {isObject ? asset.meshName : asset.type}
        </div>
      </div>

      {/* Object Transform */}
      {isObject && asset.transform && (
        <>
          {/* Position */}
          <div className="asset-inspector__section">
            <div className="asset-inspector__label asset-inspector__label--position">
              Position
            </div>
            <div className="asset-inspector__row">
              <span className="asset-inspector__axis">X:</span>
              <input
                type="number"
                step="0.1"
                value={asset.transform.position[0]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onPropertyChange(asset.id, 'position', 0, v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
              <span className="asset-inspector__axis">Y:</span>
              <input
                type="number"
                step="0.1"
                value={asset.transform.position[1]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onPropertyChange(asset.id, 'position', 1, v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
              <span className="asset-inspector__axis">Z:</span>
              <input
                type="number"
                step="0.1"
                value={asset.transform.position[2]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onPropertyChange(asset.id, 'position', 2, v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="asset-inspector__section">
            <div className="asset-inspector__label asset-inspector__label--rotation">
              Rotation (°)
            </div>
            <div className="asset-inspector__row">
              <span className="asset-inspector__axis">X:</span>
              <input
                type="number"
                step="1"
                value={asset.transform.rotation[0]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onPropertyChange(asset.id, 'rotation', 0, v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
              <span className="asset-inspector__axis">Y:</span>
              <input
                type="number"
                step="1"
                value={asset.transform.rotation[1]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onPropertyChange(asset.id, 'rotation', 1, v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
              <span className="asset-inspector__axis">Z:</span>
              <input
                type="number"
                step="1"
                value={asset.transform.rotation[2]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onPropertyChange(asset.id, 'rotation', 2, v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
            </div>
          </div>

          {/* Scale (Uniform) */}
          <div className="asset-inspector__section">
            <div className="asset-inspector__label asset-inspector__label--scale">
              Scale (Uniform)
            </div>
            <input
              type="number"
              step="0.1"
              min="0.01"
              value={asset.transform.scale[0]}
              onChange={(e) =>
                handleNumberChange(
                  (v) => v > 0 && onUniformScaleChange(asset.id, v),
                  e
                )
              }
              className="asset-inspector__input asset-inspector__input--wide"
            />
          </div>
        </>
      )}

      {/* Light Params */}
      {isLight && asset.lightParams && (
        <>
          {/* Direction (for directional-light) */}
          {asset.type === 'directional-light' &&
            'direction' in asset.lightParams && (
              <div className="asset-inspector__section">
                <div className="asset-inspector__label asset-inspector__label--position">
                  Direction
                </div>
                <div className="asset-inspector__row">
                  <span className="asset-inspector__axis">X:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={asset.lightParams.direction[0]}
                    onChange={(e) =>
                      handleNumberChange(
                        (v) => onLightParamChange(asset.id, 'direction.0', v),
                        e
                      )
                    }
                    className="asset-inspector__input"
                  />
                  <span className="asset-inspector__axis">Y:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={asset.lightParams.direction[1]}
                    onChange={(e) =>
                      handleNumberChange(
                        (v) => onLightParamChange(asset.id, 'direction.1', v),
                        e
                      )
                    }
                    className="asset-inspector__input"
                  />
                  <span className="asset-inspector__axis">Z:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={asset.lightParams.direction[2]}
                    onChange={(e) =>
                      handleNumberChange(
                        (v) => onLightParamChange(asset.id, 'direction.2', v),
                        e
                      )
                    }
                    className="asset-inspector__input"
                  />
                </div>
              </div>
            )}

          {/* Position (for point-light and rect-light) */}
          {(asset.type === 'point-light' || asset.type === 'rect-light') &&
            'position' in asset.lightParams && (
              <div className="asset-inspector__section">
                <div className="asset-inspector__label asset-inspector__label--position">
                  Position
                </div>
                <div className="asset-inspector__row">
                  <span className="asset-inspector__axis">X:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={asset.lightParams.position[0]}
                    onChange={(e) =>
                      handleNumberChange(
                        (v) => onLightParamChange(asset.id, 'position.0', v),
                        e
                      )
                    }
                    className="asset-inspector__input"
                  />
                  <span className="asset-inspector__axis">Y:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={asset.lightParams.position[1]}
                    onChange={(e) =>
                      handleNumberChange(
                        (v) => onLightParamChange(asset.id, 'position.1', v),
                        e
                      )
                    }
                    className="asset-inspector__input"
                  />
                  <span className="asset-inspector__axis">Z:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={asset.lightParams.position[2]}
                    onChange={(e) =>
                      handleNumberChange(
                        (v) => onLightParamChange(asset.id, 'position.2', v),
                        e
                      )
                    }
                    className="asset-inspector__input"
                  />
                </div>
              </div>
            )}

          {/* U/V Vectors (for rect-light) */}
          {asset.type === 'rect-light' &&
            'u' in asset.lightParams &&
            'v' in asset.lightParams && (
              <>
                <div className="asset-inspector__section">
                  <div className="asset-inspector__label asset-inspector__label--rotation">
                    U Vector
                  </div>
                  <div className="asset-inspector__row">
                    <span className="asset-inspector__axis">X:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={asset.lightParams.u[0]}
                      onChange={(e) =>
                        handleNumberChange(
                          (v) => onLightParamChange(asset.id, 'u.0', v),
                          e
                        )
                      }
                      className="asset-inspector__input"
                    />
                    <span className="asset-inspector__axis">Y:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={asset.lightParams.u[1]}
                      onChange={(e) =>
                        handleNumberChange(
                          (v) => onLightParamChange(asset.id, 'u.1', v),
                          e
                        )
                      }
                      className="asset-inspector__input"
                    />
                    <span className="asset-inspector__axis">Z:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={asset.lightParams.u[2]}
                      onChange={(e) =>
                        handleNumberChange(
                          (v) => onLightParamChange(asset.id, 'u.2', v),
                          e
                        )
                      }
                      className="asset-inspector__input"
                    />
                  </div>
                </div>

                <div className="asset-inspector__section">
                  <div className="asset-inspector__label asset-inspector__label--rotation">
                    V Vector
                  </div>
                  <div className="asset-inspector__row">
                    <span className="asset-inspector__axis">X:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={asset.lightParams.v[0]}
                      onChange={(e) =>
                        handleNumberChange(
                          (v) => onLightParamChange(asset.id, 'v.0', v),
                          e
                        )
                      }
                      className="asset-inspector__input"
                    />
                    <span className="asset-inspector__axis">Y:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={asset.lightParams.v[1]}
                      onChange={(e) =>
                        handleNumberChange(
                          (v) => onLightParamChange(asset.id, 'v.1', v),
                          e
                        )
                      }
                      className="asset-inspector__input"
                    />
                    <span className="asset-inspector__axis">Z:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={asset.lightParams.v[2]}
                      onChange={(e) =>
                        handleNumberChange(
                          (v) => onLightParamChange(asset.id, 'v.2', v),
                          e
                        )
                      }
                      className="asset-inspector__input"
                    />
                  </div>
                </div>
              </>
            )}

          {/* Color */}
          <div className="asset-inspector__section">
            <div className="asset-inspector__label asset-inspector__label--color">
              Color (RGB 0-1)
            </div>
            <div className="asset-inspector__row">
              <span className="asset-inspector__axis">R:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={asset.lightParams.color[0]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onLightParamChange(asset.id, 'color.0', v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
              <span className="asset-inspector__axis">G:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={asset.lightParams.color[1]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onLightParamChange(asset.id, 'color.1', v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
              <span className="asset-inspector__axis">B:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={asset.lightParams.color[2]}
                onChange={(e) =>
                  handleNumberChange(
                    (v) => onLightParamChange(asset.id, 'color.2', v),
                    e
                  )
                }
                className="asset-inspector__input"
              />
            </div>
          </div>

          {/* Intensity */}
          <div className="asset-inspector__section">
            <div className="asset-inspector__label asset-inspector__label--intensity">
              Intensity
            </div>
            <input
              type="number"
              step="0.5"
              min="0"
              value={asset.lightParams.intensity}
              onChange={(e) =>
                handleNumberChange(
                  (v) => v >= 0 && onLightParamChange(asset.id, 'intensity', v),
                  e
                )
              }
              className="asset-inspector__input asset-inspector__input--wide"
            />
          </div>
        </>
      )}

      {/* Delete Button */}
      <div className="asset-inspector__footer">
        <Button variant="danger" size="sm" fullWidth onClick={onDelete}>
          🗑️ 삭제 (Delete)
        </Button>
      </div>

      {/* Keyboard Shortcuts */}
      {isObject && (
        <div className="asset-inspector__shortcuts">
          단축키: G(이동) R(회전) +/-(스케일)
        </div>
      )}
    </div>
  );
}

export default AssetInspector;
