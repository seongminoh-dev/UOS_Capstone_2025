/**
 * CameraHelpOverlay - 카메라 조작 도움말
 *
 * Canvas 좌하단에 표시
 * - 마우스 조작: 회전, 이동, 줌
 * - 키보드 이동: WASDQE
 * - 시점 저장: V키
 */

import { useState, useEffect, useCallback } from 'react';
import './CameraHelpOverlay.css';

interface CameraHelpOverlayProps {
  className?: string;
  onSaveCamera?: () => void;
}

export function CameraHelpOverlay({ className = '', onSaveCamera }: CameraHelpOverlayProps) {
  const [isSaving, setIsSaving] = useState(false);

  // 저장 처리 (애니메이션 포함)
  const handleSave = useCallback(() => {
    if (isSaving) return;
    setIsSaving(true);
    onSaveCamera?.();
  }, [isSaving, onSaveCamera]);

  // V키 이벤트 리스닝 (저장 애니메이션 동기화)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'v' || e.key === 'V') && !isSaving) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setIsSaving(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving]);

  // 애니메이션 종료 후 상태 리셋
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => setIsSaving(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  return (
    <div className={`camera-help-overlay ${className}`}>
      {/* 마우스 조작 */}
      <div className="camera-help-overlay__item">
        <span className="camera-help-overlay__key">🖱️ 좌클릭 드래그</span>
        <span className="camera-help-overlay__desc">카메라 회전</span>
      </div>
      <div className="camera-help-overlay__item">
        <span className="camera-help-overlay__key">🖱️ 우클릭 드래그</span>
        <span className="camera-help-overlay__desc">카메라 이동</span>
      </div>
      <div className="camera-help-overlay__item">
        <span className="camera-help-overlay__key">🖱️ 스크롤</span>
        <span className="camera-help-overlay__desc">줌 인/아웃</span>
      </div>

      {/* 구분선 */}
      <div className="camera-help-overlay__divider" />

      {/* 키보드 이동 */}
      <div className="camera-help-overlay__item">
        <span className="camera-help-overlay__key">⌨️ WASD</span>
        <span className="camera-help-overlay__desc">앞뒤좌우 이동</span>
      </div>
      <div className="camera-help-overlay__item">
        <span className="camera-help-overlay__key">⌨️ Q / E</span>
        <span className="camera-help-overlay__desc">상하 이동</span>
      </div>

      {/* 구분선 */}
      <div className="camera-help-overlay__divider" />

      {/* 시점 저장 버튼 */}
      <button
        className={`camera-help-overlay__save-btn ${isSaving ? 'camera-help-overlay__save-btn--saving' : ''}`}
        onClick={handleSave}
        title="현재 카메라 시점을 저장합니다 (V)"
        disabled={isSaving}
      >
        <span className="camera-help-overlay__save-icon">{isSaving ? '✓' : '📷'}</span>
        <span className="camera-help-overlay__save-label">{isSaving ? '저장됨!' : '시점 저장'}</span>
        <span className="camera-help-overlay__save-shortcut">V</span>
      </button>
    </div>
  );
}

export default CameraHelpOverlay;
