/**
 * CameraHelpOverlay - 카메라 조작 도움말
 *
 * Canvas 좌하단에 표시
 * - 마우스 조작: 회전, 이동, 줌
 * - 키보드 이동: WASDQE
 * - 시점 저장: V키
 */

import './CameraHelpOverlay.css';

interface CameraHelpOverlayProps {
  className?: string;
  onSaveCamera?: () => void;
}

export function CameraHelpOverlay({ className = '', onSaveCamera }: CameraHelpOverlayProps) {
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
        className="camera-help-overlay__save-btn"
        onClick={onSaveCamera}
        title="현재 카메라 시점을 저장합니다 (V)"
      >
        <span className="camera-help-overlay__save-icon">📷</span>
        <span className="camera-help-overlay__save-label">시점 저장</span>
        <span className="camera-help-overlay__save-shortcut">V</span>
      </button>
    </div>
  );
}

export default CameraHelpOverlay;
