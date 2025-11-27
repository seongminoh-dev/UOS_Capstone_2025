/**
 * InfoTab - Scene 정보 탭
 *
 * Scene 메타데이터, 렌더링 설정 정보
 */

import { useState } from 'react';
import { Button } from '../common';
import { PanelSection } from './PanelSection';
import { getAssetMetadata } from '../../assets/AssetRegistry';
import type { SceneFrontend } from '../../graphics-core/service/Scene';
import './InfoTab.css';

interface InfoTabProps {
  scene: SceneFrontend;
  onSceneNameChange: (name: string) => void;
  onSceneDescriptionChange: (description: string) => void;
}

export function InfoTab({
  scene,
  onSceneNameChange,
  onSceneDescriptionChange,
}: InfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scene.name);
  const [editDescription, setEditDescription] = useState(scene.description || '');

  const handleStartEdit = () => {
    setEditName(scene.name);
    setEditDescription(scene.description || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editName.trim()) {
      onSceneNameChange(editName.trim());
      onSceneDescriptionChange(editDescription.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  // Asset 통계
  const objectCount = scene.assets.filter((a) => a.type === 'object').length;
  const lightCount = scene.assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  ).length;

  // 방 정보
  const roomMeta = getAssetMetadata(scene.room.meshName);
  const roomDisplay = roomMeta
    ? `${roomMeta.icon} ${roomMeta.name}`
    : scene.room.meshName;

  return (
    <div className="info-tab">
      {/* Scene 정보 */}
      <PanelSection
        title="Scene 정보"
        action={
          !isEditing && (
            <Button variant="ghost" size="sm" onClick={handleStartEdit}>
              편집
            </Button>
          )
        }
      >
        {isEditing ? (
          <div className="info-tab__edit-form">
            <div className="info-tab__field">
              <label className="info-tab__label">이름</label>
              <input
                type="text"
                className="info-tab__input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Scene 이름"
              />
            </div>
            <div className="info-tab__field">
              <label className="info-tab__label">설명</label>
              <textarea
                className="info-tab__textarea"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Scene 설명 (선택사항)"
                rows={3}
              />
            </div>
            <div className="info-tab__edit-actions">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                저장
              </Button>
            </div>
          </div>
        ) : (
          <div className="info-tab__info-list">
            <div className="info-tab__info-item">
              <span className="info-tab__info-label">ID</span>
              <span className="info-tab__info-value info-tab__info-value--mono">
                {scene.id}
              </span>
            </div>
            <div className="info-tab__info-item">
              <span className="info-tab__info-label">이름</span>
              <span className="info-tab__info-value">{scene.name}</span>
            </div>
            <div className="info-tab__info-item">
              <span className="info-tab__info-label">방</span>
              <span className="info-tab__info-value">{roomDisplay}</span>
            </div>
            <div className="info-tab__info-item">
              <span className="info-tab__info-label">설명</span>
              <span className="info-tab__info-value">
                {scene.description || '(없음)'}
              </span>
            </div>
          </div>
        )}
      </PanelSection>

      {/* Asset 통계 */}
      <PanelSection title="Asset 통계">
        <div className="info-tab__stats">
          <div className="info-tab__stat">
            <span className="info-tab__stat-value">{scene.assets.length}</span>
            <span className="info-tab__stat-label">총 Asset</span>
          </div>
          <div className="info-tab__stat">
            <span className="info-tab__stat-value">{objectCount}</span>
            <span className="info-tab__stat-label">오브젝트</span>
          </div>
          <div className="info-tab__stat">
            <span className="info-tab__stat-value">{lightCount}</span>
            <span className="info-tab__stat-label">조명</span>
          </div>
        </div>
      </PanelSection>

      {/* 렌더링 정보 */}
      <PanelSection title="렌더링 설정">
        <div className="info-tab__info-list">
          <div className="info-tab__info-item">
            <span className="info-tab__info-label">해상도</span>
            <span className="info-tab__info-value">1920 x 1080</span>
          </div>
          <div className="info-tab__info-item">
            <span className="info-tab__info-label">샘플 수</span>
            <span className="info-tab__info-value">256 SPP</span>
          </div>
          <div className="info-tab__info-item">
            <span className="info-tab__info-label">렌더러</span>
            <span className="info-tab__info-value">ReSTIR DI</span>
          </div>
        </div>
      </PanelSection>
    </div>
  );
}

export default InfoTab;
