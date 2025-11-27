/**
 * CanvasOverlay - Canvas 위에 표시되는 오버레이 UI
 *
 * 최소한의 정보만 표시:
 * - 렌더링 상태
 * - 현재 시간
 * - 카메라 조작 안내
 */

import { Badge } from '../common';
import './CanvasOverlay.css';

interface CanvasOverlayProps {
  sceneName: string;
  timeString: string;
  isSaved: boolean;
}

export function CanvasOverlay({
  sceneName,
  timeString,
  isSaved,
}: CanvasOverlayProps) {
  return (
    <div className="canvas-overlay">
      {/* Bottom Left - Render Info */}
      <div className="canvas-overlay__bottom-left">
        <div className="canvas-overlay__render-info">
          <span className="canvas-overlay__status-dot" />
          <span className="canvas-overlay__status-text">렌더링 중</span>
          <span className="canvas-overlay__divider">|</span>
          <span className="canvas-overlay__time-icon">☀️</span>
          <span className="canvas-overlay__time">{timeString}</span>
        </div>
      </div>

      {/* Bottom Right - Camera Controls Help */}
      <div className="canvas-overlay__bottom-right">
        <div className="canvas-overlay__controls-help">
          <div className="canvas-overlay__control-item">
            <kbd>LMB</kbd>
            <span>시점 회전</span>
          </div>
          <div className="canvas-overlay__control-item">
            <kbd>WASD</kbd>
            <span>이동</span>
          </div>
          <div className="canvas-overlay__control-item">
            <kbd>Q/E</kbd>
            <span>상하</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CanvasOverlay;
