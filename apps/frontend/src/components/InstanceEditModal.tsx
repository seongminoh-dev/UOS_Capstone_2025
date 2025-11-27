/**
 * Instance 수정 모달
 * - Object: position, rotation, scale
 * - Light: 타입별 파라미터
 */

import { useState, useEffect } from 'react';
import { Modal, Button, Vec3Input, FormField, ColorInput } from './common';
import { PanelSection } from './simulator';
import type { SceneAsset } from '../graphics-core/service/Scene';
import './InstanceEditModal.css';

interface InstanceEditModalProps {
  asset: SceneAsset | null;
  onClose: () => void;
  onSave: (updatedAsset: SceneAsset) => void;
}

// Asset 타입별 표시 이름
const getAssetTitle = (asset: SceneAsset): string => {
  if (asset.type === 'object') {
    return asset.meshName || 'Object';
  }
  if (asset.type === 'directional-light') return 'Directional Light';
  if (asset.type === 'point-light') return 'Point Light';
  if (asset.type === 'rect-light') return 'Rect Light';
  return 'Unknown';
};

export default function InstanceEditModal({
  asset,
  onClose,
  onSave,
}: InstanceEditModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!asset) return;

    if (asset.type === 'object' && asset.transform) {
      setFormData({
        position: [...asset.transform.position],
        rotation: [...asset.transform.rotation],
        scale: [...asset.transform.scale],
      });
    } else if (asset.type === 'directional-light' && asset.lightParams) {
      const params = asset.lightParams as Record<string, unknown>;
      setFormData({
        direction: [...(params.direction as number[])],
        color: [...(params.color as number[])],
        intensity: params.intensity,
      });
    } else if (asset.type === 'point-light' && asset.lightParams) {
      const params = asset.lightParams as Record<string, unknown>;
      setFormData({
        position: [...(params.position as number[])],
        color: [...(params.color as number[])],
        intensity: params.intensity,
      });
    } else if (asset.type === 'rect-light' && asset.lightParams) {
      const params = asset.lightParams as Record<string, unknown>;
      setFormData({
        position: [...(params.position as number[])],
        u: [...(params.u as number[])],
        v: [...(params.v as number[])],
        color: [...(params.color as number[])],
        intensity: params.intensity,
      });
    }
  }, [asset]);

  if (!asset) return null;

  const handleVectorChange = (key: string, index: number, value: string) => {
    const numValue =
      value === '' || value === '-' || value === '.' || value === '-.'
        ? value
        : parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [key]: (prev[key] as (number | string)[]).map((v, i) =>
        i === index ? numValue : v
      ),
    }));
  };

  const handleNumberChange = (key: string, value: string) => {
    const numValue =
      value === '' || value === '-' || value === '.' || value === '-.'
        ? value
        : parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [key]: numValue,
    }));
  };

  const handleSave = () => {
    const toNumber = (val: unknown): number => {
      if (typeof val === 'number') return val;
      const num = parseFloat(val as string);
      return isNaN(num) ? 0 : num;
    };

    const toVec3 = (arr: unknown[]): [number, number, number] => [
      toNumber(arr[0]),
      toNumber(arr[1]),
      toNumber(arr[2]),
    ];

    const updatedAsset: SceneAsset = { ...asset };

    if (asset.type === 'object') {
      updatedAsset.transform = {
        position: toVec3(formData.position as unknown[]),
        rotation: toVec3(formData.rotation as unknown[]),
        scale: toVec3(formData.scale as unknown[]),
      };
    } else if (asset.type === 'directional-light') {
      updatedAsset.lightParams = {
        direction: toVec3(formData.direction as unknown[]),
        color: toVec3(formData.color as unknown[]),
        intensity: toNumber(formData.intensity),
      };
    } else if (asset.type === 'point-light') {
      updatedAsset.lightParams = {
        position: toVec3(formData.position as unknown[]),
        color: toVec3(formData.color as unknown[]),
        intensity: toNumber(formData.intensity),
      };
    } else if (asset.type === 'rect-light') {
      updatedAsset.lightParams = {
        position: toVec3(formData.position as unknown[]),
        u: toVec3(formData.u as unknown[]),
        v: toVec3(formData.v as unknown[]),
        color: toVec3(formData.color as unknown[]),
        intensity: toNumber(formData.intensity),
      };
    }

    onSave(updatedAsset);
  };

  const renderObjectForm = () => (
    <div className="instance-edit-modal__sections">
      <PanelSection title="변환 (Transform)">
        <div className="instance-edit-modal__fields">
          <FormField label="위치" description="Position (X, Y, Z)">
            <Vec3Input
              value={(formData.position as [number, number, number]) || [0, 0, 0]}
              onChange={(index, value) =>
                handleVectorChange('position', index, value)
              }
              step={0.1}
            />
          </FormField>

          <FormField label="회전" description="Rotation (degrees)">
            <Vec3Input
              value={(formData.rotation as [number, number, number]) || [0, 0, 0]}
              onChange={(index, value) =>
                handleVectorChange('rotation', index, value)
              }
              step={1}
            />
          </FormField>

          <FormField label="크기" description="Scale">
            <Vec3Input
              value={(formData.scale as [number, number, number]) || [1, 1, 1]}
              onChange={(index, value) =>
                handleVectorChange('scale', index, value)
              }
              step={0.1}
            />
          </FormField>
        </div>
      </PanelSection>
    </div>
  );

  const renderPointLightForm = () => (
    <div className="instance-edit-modal__sections">
      <PanelSection title="위치">
        <FormField label="Position" description="X, Y, Z">
          <Vec3Input
            value={(formData.position as [number, number, number]) || [0, 0, 0]}
            onChange={(index, value) =>
              handleVectorChange('position', index, value)
            }
            step={0.1}
          />
        </FormField>
      </PanelSection>

      <PanelSection title="조명 속성">
        <div className="instance-edit-modal__fields">
          <FormField label="색상" description="RGB (0-1)">
            <ColorInput
              value={(formData.color as [number, number, number]) || [1, 1, 1]}
              onChange={(index, value) =>
                handleVectorChange('color', index, value)
              }
            />
          </FormField>

          <FormField label="강도" description="Intensity">
            <input
              type="number"
              step={0.1}
              value={(formData.intensity as number) ?? 1}
              onChange={(e) => handleNumberChange('intensity', e.target.value)}
            />
          </FormField>
        </div>
      </PanelSection>
    </div>
  );

  const renderRectLightForm = () => (
    <div className="instance-edit-modal__sections">
      <PanelSection title="위치 및 방향">
        <div className="instance-edit-modal__fields">
          <FormField label="위치" description="Position (X, Y, Z)">
            <Vec3Input
              value={(formData.position as [number, number, number]) || [0, 0, 0]}
              onChange={(index, value) =>
                handleVectorChange('position', index, value)
              }
              step={0.1}
            />
          </FormField>

          <FormField label="방향 U" description="U Vector">
            <Vec3Input
              value={(formData.u as [number, number, number]) || [1, 0, 0]}
              onChange={(index, value) => handleVectorChange('u', index, value)}
              step={0.1}
            />
          </FormField>

          <FormField label="방향 V" description="V Vector">
            <Vec3Input
              value={(formData.v as [number, number, number]) || [0, 1, 0]}
              onChange={(index, value) => handleVectorChange('v', index, value)}
              step={0.1}
            />
          </FormField>
        </div>
      </PanelSection>

      <PanelSection title="조명 속성">
        <div className="instance-edit-modal__fields">
          <FormField label="색상" description="RGB (0-1)">
            <ColorInput
              value={(formData.color as [number, number, number]) || [1, 1, 1]}
              onChange={(index, value) =>
                handleVectorChange('color', index, value)
              }
            />
          </FormField>

          <FormField label="강도" description="Intensity">
            <input
              type="number"
              step={0.1}
              value={(formData.intensity as number) ?? 1}
              onChange={(e) => handleNumberChange('intensity', e.target.value)}
            />
          </FormField>
        </div>
      </PanelSection>
    </div>
  );

  const renderFormContent = () => {
    switch (asset.type) {
      case 'object':
        return renderObjectForm();
      case 'point-light':
        return renderPointLightForm();
      case 'rect-light':
        return renderRectLightForm();
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${getAssetTitle(asset)} 수정`}
      size="md"
      footer={
        <div className="instance-edit-modal__actions">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave}>
            저장
          </Button>
        </div>
      }
    >
      {renderFormContent()}
    </Modal>
  );
}
