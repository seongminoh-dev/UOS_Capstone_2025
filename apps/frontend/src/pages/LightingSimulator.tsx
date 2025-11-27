/**
 * LightingSimulator - 메인 시뮬레이터 페이지
 *
 * 두 가지 모드로 동작:
 * 1. Workspace 모드 (selectedScene === null): 전체 화면 Scene 관리
 * 2. Editor 모드 (selectedScene !== null): 캔버스 + 우측 패널
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './LightingSimulator.css';
import Header from '../components/Header';
import WebGPURenderer from '../components/WebGPURenderer';
import MainRightPanel from '../components/MainRightPanel';
import { WorkspaceView } from '../components/workspace';
import type { SceneFrontend, SunSettings } from '../graphics-core/service/Scene';
import type { WebGPUEngine } from '../graphics-core/service';

export default function LightingSimulator() {
  const navigate = useNavigate();
  const [selectedScene, setSelectedScene] = useState<SceneFrontend | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const engineRef = useRef<WebGPUEngine | null>(null);

  // Engine 준비 완료 콜백
  const handleEngineReady = useCallback((engine: WebGPUEngine) => {
    engineRef.current = engine;
    console.log('[LightingSimulator] Engine ready');
  }, []);

  // 태양 설정 즉시 업데이트 콜백
  const handleSunSettingsChange = useCallback((sunSettings: SunSettings) => {
    if (engineRef.current) {
      engineRef.current.updateSunLight(sunSettings);
    }
    setIsSaved(false);
  }, []);

  // Scene 선택 핸들러 (Workspace → Editor 전환)
  const handleSelectScene = (scene: SceneFrontend | null) => {
    if (scene) {
      // WebGPURenderer가 로딩 UI를 처리하므로 여기서는 바로 Scene 설정
      setSelectedScene(scene);
      setIsSaved(true);
    } else {
      // Editor → Workspace 전환
      setSelectedScene(null);
    }
  };

  // Scene 변경 핸들러
  const handleSceneChange = () => {
    setIsSaved(false);
  };

  // 시간 문자열 계산 (sunSettings.timeOfDay 0-100 → 00:00-24:00)
  const getTimeString = (): string => {
    if (!selectedScene) return '--:--';
    const timeOfDay = selectedScene.sunSettings?.timeOfDay ?? 50;
    const totalMinutes = Math.floor((timeOfDay / 100) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Header />
      <div className="simulator-container">
        {/* Workspace 모드: Scene 미선택 시 전체 화면 */}
        {!selectedScene ? (
          <div className="workspace-mode">
            <WorkspaceView onSelectScene={handleSelectScene} />
          </div>
        ) : (
          /* Editor 모드: Scene 선택됨 */
          <div className="editor-mode">
            <div className="canvas-wrapper">
              {/* WebGPURenderer가 로딩 UI를 자체 처리 */}
              <WebGPURenderer
                key={`${selectedScene.id}-${selectedScene.updatedAt || Date.now()}`}
                className="webgpu-canvas"
                scene={selectedScene}
                onEngineReady={handleEngineReady}
              />

              {/* Canvas Overlay UI */}
              <div className="canvas-overlay">
                {/* Top Left - Scene Info */}
                <div className="overlay-top-left">
                  <div className="scene-status-badge">
                    <span className="scene-name">{selectedScene.name}</span>
                    <span className={`save-status ${isSaved ? 'saved' : 'unsaved'}`}>
                      {isSaved ? '저장됨' : '수정됨'}
                    </span>
                  </div>
                </div>

                {/* Top Right - Quick Actions */}
                <div className="overlay-top-right">
                  <button
                    className="overlay-action-btn"
                    onClick={() => navigate('/edit', { state: { scene: selectedScene } })}
                    title="편집 모드"
                  >
                    <span>✏️</span>
                  </button>
                </div>

                {/* Bottom Left - Zoom Controls */}
                <div className="overlay-bottom-left">
                  <div className="zoom-controls">
                    <button className="zoom-btn" title="축소">−</button>
                    <span className="zoom-level">100%</span>
                    <button className="zoom-btn" title="확대">+</button>
                    <button className="zoom-btn fit" title="화면 맞춤">⊡</button>
                  </div>
                </div>

                {/* Bottom Center - Render Info */}
                <div className="overlay-bottom-center">
                  <div className="render-info">
                    <div className="render-status">
                      <span className="status-dot"></span>
                      <span>렌더링 중</span>
                    </div>
                    <div className="render-time">
                      <span className="time-icon">☀️</span>
                      <span>{getTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Right - Help */}
                <div className="overlay-bottom-right">
                  <div className="control-hint">
                    <span>🖱️ 드래그: 회전</span>
                    <span>⚙️ 휠: 줌</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Main Right Panel (Editor 전용) */}
            {selectedScene && (
              <MainRightPanel
                selectedScene={selectedScene}
                onSelectScene={handleSelectScene}
                onSceneChange={handleSceneChange}
                onSunSettingsChange={handleSunSettingsChange}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
