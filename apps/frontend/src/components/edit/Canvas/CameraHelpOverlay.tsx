/**
 * CameraHelpOverlay - 카메라 조작 도움말
 *
 * Canvas 좌하단에 표시
 * 마우스 조작 설명: 회전, 이동, 줌
 */

import './CameraHelpOverlay.css';

interface CameraHelpOverlayProps {
  className?: string;
}

export function CameraHelpOverlay({ className = '' }: CameraHelpOverlayProps) {
  return (
    <div className={`camera-help-overlay ${className}`}>
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
    </div>
  );
}

export default CameraHelpOverlay;
