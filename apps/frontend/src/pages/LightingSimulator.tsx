/**
 * LightingSimulator - 메인 시뮬레이터 페이지
 *
 * 두 가지 모드로 동작:
 * 1. Workspace 모드 (selectedScene === null): 전체 화면 Scene 관리
 * 2. Editor 모드 (selectedScene !== null): 캔버스 + 우측 패널
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import './LightingSimulator.css';
import Header from '../components/Header';
import WebGPURenderer from '../components/WebGPURenderer';
import { ControlPanel, CanvasOverlay } from '../components/simulator';
import { WorkspaceView } from '../components/workspace';
import type { SceneFrontend, SunSettings } from '../graphics-core/service/Scene';
import type { WebGPUEngine } from '../graphics-core/service';

export default function LightingSimulator() {
  const [selectedScene, setSelectedScene] = useState<SceneFrontend | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const engineRef = useRef<WebGPUEngine | null>(null);

  // 현재 시간 문자열 (오버레이용)
  const [currentTimeString, setCurrentTimeString] = useState('12:00');

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

    // 시간 문자열 업데이트
    const totalMinutes = Math.floor((sunSettings.timeOfDay / 100) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setCurrentTimeString(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    );
  }, []);

  // Scene 선택 핸들러 (Workspace → Editor 전환)
  const handleSelectScene = useCallback((scene: SceneFrontend | null) => {
    if (scene) {
      setSelectedScene(scene);
      setIsSaved(true);

      // 초기 시간 문자열 설정
      const timeOfDay = scene.sunSettings?.timeOfDay ?? 50;
      const totalMinutes = Math.floor((timeOfDay / 100) * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setCurrentTimeString(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      );
    } else {
      setSelectedScene(null);
    }
  }, []);

  // Renderer key (Scene 변경 시 리렌더링)
  const rendererKey = useMemo(() => {
    if (!selectedScene) return '';
    return `${selectedScene.id}-${selectedScene.updatedAt || Date.now()}`;
  }, [selectedScene]);

  return (
    <>
      <Header />
      <div className="simulator-container">
        {/* Workspace 모드: Scene 미선택 시 전체 화면 */}
        {!selectedScene ? (
          <div className="simulator__workspace">
            <WorkspaceView onSelectScene={handleSelectScene} />
          </div>
        ) : (
          /* Editor 모드: Scene 선택됨 */
          <div className="simulator__editor">
            {/* Canvas Area */}
            <div className="simulator__canvas">
              <WebGPURenderer
                key={rendererKey}
                className="simulator__webgpu"
                scene={selectedScene}
                onEngineReady={handleEngineReady}
              />

              {/* Canvas Overlay */}
              <CanvasOverlay
                sceneName={selectedScene.name}
                timeString={currentTimeString}
                isSaved={isSaved}
              />
            </div>

            {/* Control Panel */}
            <ControlPanel
              scene={selectedScene}
              onSceneSelect={handleSelectScene}
              onSunSettingsChange={handleSunSettingsChange}
            />
          </div>
        )}
      </div>
    </>
  );
}
