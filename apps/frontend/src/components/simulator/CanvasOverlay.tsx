/**
 * CanvasOverlay - Canvas 위에 표시되는 오버레이 UI
 *
 * 최소한의 정보만 표시:
 * - 해상도 + FPS/프레임타임
 * - 현재 시간
 * - 카메라 조작 안내
 */

import { RENDERER_CONFIG } from '../../config';
import './CanvasOverlay.css';

interface RenderStats {
  fps: number;
  frameTime: number;
}

interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

interface CanvasOverlayProps {
  sceneName: string;
  timeString: string;
  isSaved: boolean;
  renderStats?: RenderStats;
  cameraPosition?: CameraPosition;
}

export function CanvasOverlay({
  sceneName,
  timeString,
  isSaved,
  renderStats,
  cameraPosition,
}: CanvasOverlayProps) {
  const { MAX_WIDTH, MAX_HEIGHT } = RENDERER_CONFIG;

  // 해상도 + FPS 문자열 생성
  const getResolutionDisplay = () => {
    if (!renderStats) {
      return `${MAX_WIDTH}×${MAX_HEIGHT}`;
    }
    const { fps, frameTime } = renderStats;
    return `${MAX_WIDTH}×${MAX_HEIGHT} (${fps} FPS / ${frameTime.toFixed(0)}ms)`;
  };

  return (
    <div className="canvas-overlay">
      {/* Bottom Left - Render Info */}
      <div className="canvas-overlay__bottom-left">
        <div className="canvas-overlay__render-info">
          <span className="canvas-overlay__status-dot" />
          <span className="canvas-overlay__resolution">{getResolutionDisplay()}</span>
          <span className="canvas-overlay__divider">|</span>
          <span className="canvas-overlay__time-icon">☀️</span>
          <span className="canvas-overlay__time">{timeString}</span>
          {cameraPosition && (
            <>
              <span className="canvas-overlay__divider">|</span>
              <span className="canvas-overlay__camera">
                {cameraPosition.x.toFixed(1)}, {cameraPosition.y.toFixed(1)}, {cameraPosition.z.toFixed(1)}
              </span>
            </>
          )}
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
