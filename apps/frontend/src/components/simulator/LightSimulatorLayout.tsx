/**
 * LightSimulatorLayout - 조명 시뮬레이터 전용 레이아웃
 *
 * 헤더 아래 전체 영역을 사용하는 full-width 레이아웃
 * - 왼쪽: Canvas 영역 (flex: 1)
 * - 오른쪽: Control Panel (380px)
 */

import { useRef, useCallback, useState, useMemo } from 'react';
import WebGPURenderer from '../WebGPURenderer';
import { ControlPanel } from './ControlPanel';
import { CanvasOverlay } from './CanvasOverlay';
import type { SceneFrontend, SunSettings } from '../../graphics-core/service/Scene';
import type { WebGPUEngine } from '../../graphics-core/service';
import './LightSimulatorLayout.css';

interface RenderStats {
  fps: number;
  frameTime: number;
}

interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

interface LightSimulatorLayoutProps {
  scene: SceneFrontend;
  onBack: () => void;
}

export function LightSimulatorLayout({ scene: initialScene, onBack }: LightSimulatorLayoutProps) {
  const engineRef = useRef<WebGPUEngine | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneFrontend>(initialScene);
  const [isSaved, setIsSaved] = useState(true);
  const [currentTimeString, setCurrentTimeString] = useState(() => {
    const timeOfDay = initialScene.sunSettings?.timeOfDay ?? 50;
    const totalMinutes = Math.floor((timeOfDay / 100) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });
  const [renderStats, setRenderStats] = useState<RenderStats>({ fps: 0, frameTime: 0 });
  const [cameraPosition, setCameraPosition] = useState<CameraPosition | null>(null);

  // 렌더러 로딩 완료 상태 (ControlPanel 차단용)
  const [isRendererReady, setIsRendererReady] = useState(false);

  // Engine 준비 완료 콜백
  const handleEngineReady = useCallback((engine: WebGPUEngine) => {
    engineRef.current = engine;
    setIsRendererReady(true);

    // FPS 업데이트 콜백 등록
    engine.onFrameTimeUpdate = (frameTime: number) => {
      const fps = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
      setRenderStats({ fps, frameTime });
    };

    // 카메라 위치 업데이트 콜백 등록
    engine.onCameraUpdate = (pos: { x: number; y: number; z: number }) => {
      setCameraPosition(pos);
    };

    console.log('[LightSimulatorLayout] Engine ready');
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

  // Scene 선택 핸들러 (null이면 Workspace로 복귀, 새 scene이면 업데이트)
  const handleSceneSelect = useCallback(
    (newScene: SceneFrontend | null) => {
      if (!newScene) {
        onBack();
      } else {
        // 저장된 새 scene으로 업데이트 → rendererKey 변경 → 재렌더링
        setCurrentScene(newScene);
        setIsSaved(true);
      }
    },
    [onBack]
  );

  // Renderer key (Scene 변경 시 리렌더링)
  const rendererKey = useMemo(() => {
    return `${currentScene.id}-${currentScene.updatedAt || Date.now()}`;
  }, [currentScene]);

  return (
    <div className="light-simulator">
      {/* Canvas Area */}
      <div className="light-simulator__canvas">
        <WebGPURenderer
          key={rendererKey}
          className="light-simulator__webgpu"
          scene={currentScene}
          onEngineReady={handleEngineReady}
        />

        {/* Canvas Overlay */}
        <CanvasOverlay
          sceneName={currentScene.name}
          timeString={currentTimeString}
          isSaved={isSaved}
          renderStats={renderStats}
          cameraPosition={cameraPosition ?? undefined}
        />
      </div>

      {/* Control Panel - 렌더러 로딩 완료 후에만 표시 (상호작용 버그 방지) */}
      {isRendererReady && (
        <div className="light-simulator__panel">
          <ControlPanel
            scene={currentScene}
            onSceneSelect={handleSceneSelect}
            onSunSettingsChange={handleSunSettingsChange}
          />
        </div>
      )}
    </div>
  );
}
