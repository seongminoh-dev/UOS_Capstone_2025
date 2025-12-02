/**
 * SceneViewerPage - WebGPU 시뮬레이터 화면
 *
 * 경로: /simulator/scene/:sceneId
 * URL에서 sceneId를 읽어 store에서 Scene을 로드하여 렌더링
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import WebGPURenderer from '../components/WebGPURenderer';
import { ControlPanel, CanvasOverlay } from '../components/simulator';
import { useSceneRepository } from '../stores/sceneRepository';
import { EmptyState, Button } from '../components/common';
import type { SceneFrontend, SunSettings } from '../graphics-core/service/Scene';
import type { WebGPUEngine } from '../graphics-core/service';
import './LightingSimulator.css';
import '../components/simulator/LightSimulatorLayout.css';
import './SceneViewerPage.css';

export default function SceneViewerPage() {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  const { scenes, getSceneById, loadScenes, isLoading } = useSceneRepository();

  // Engine ref
  const engineRef = useRef<WebGPUEngine | null>(null);

  // Scene 상태
  const [scene, setScene] = useState<SceneFrontend | null>(null);
  const [notFound, setNotFound] = useState(false);

  // UI 상태
  const [isSaved, setIsSaved] = useState(true);
  const [currentTimeString, setCurrentTimeString] = useState('12:00');
  const [renderStats, setRenderStats] = useState({ fps: 0, frameTime: 0 });
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // ─────────────────────────────────────────────
  // Scene 로드
  // ─────────────────────────────────────────────
  useEffect(() => {
    async function loadScene() {
      if (!sceneId) {
        setNotFound(true);
        return;
      }

      // scenes가 비어있으면 로드
      if (scenes.length === 0 && !isLoading) {
        await loadScenes();
      }
    }

    loadScene();
  }, [sceneId, scenes.length, isLoading, loadScenes]);

  // scenes 로드 후 Scene 찾기
  useEffect(() => {
    if (!sceneId || isLoading) return;

    // sceneId 파싱 (숫자면 number, 아니면 string)
    const parsedId = /^\d+$/.test(sceneId) ? parseInt(sceneId, 10) : sceneId;
    const foundScene = getSceneById(parsedId);

    if (foundScene) {
      setScene(foundScene);
      setNotFound(false);

      // 시간 문자열 초기화
      const timeOfDay = foundScene.sunSettings?.timeOfDay ?? 50;
      const totalMinutes = Math.floor((timeOfDay / 100) * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setCurrentTimeString(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    } else if (scenes.length > 0) {
      // scenes 로드됐는데 못 찾음
      setNotFound(true);
    }
  }, [sceneId, scenes, isLoading, getSceneById]);

  // ─────────────────────────────────────────────
  // Engine 콜백
  // ─────────────────────────────────────────────
  const handleEngineReady = useCallback((engine: WebGPUEngine) => {
    engineRef.current = engine;

    engine.onFrameTimeUpdate = (frameTime: number) => {
      const fps = frameTime > 0 ? Math.round(1000 / frameTime) : 0;
      setRenderStats({ fps, frameTime });
    };

    engine.onCameraUpdate = (pos) => {
      setCameraPosition(pos);
    };

    console.log('[SceneViewerPage] Engine ready');
  }, []);

  // ─────────────────────────────────────────────
  // Sun Settings 변경
  // ─────────────────────────────────────────────
  const handleSunSettingsChange = useCallback((sunSettings: SunSettings) => {
    if (engineRef.current) {
      engineRef.current.updateSunLight(sunSettings);
    }
    setIsSaved(false);

    const totalMinutes = Math.floor((sunSettings.timeOfDay / 100) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    setCurrentTimeString(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  }, []);

  // ─────────────────────────────────────────────
  // Scene 선택 (저장 후 업데이트 or Back)
  // ─────────────────────────────────────────────
  const handleSceneSelect = useCallback(
    (newScene: SceneFrontend | null) => {
      if (!newScene) {
        // Back to workspace
        navigate('/simulator/list');
      } else {
        // 저장된 새 scene으로 업데이트
        setScene(newScene);
        setIsSaved(true);
      }
    },
    [navigate]
  );

  // ─────────────────────────────────────────────
  // Renderer key
  // ─────────────────────────────────────────────
  const rendererKey = useMemo(() => {
    return scene ? `${scene.id}-${scene.updatedAt || Date.now()}` : 'empty';
  }, [scene]);

  // ─────────────────────────────────────────────
  // Not Found 상태
  // ─────────────────────────────────────────────
  if (notFound) {
    return (
      <>
        <Header />
        <main className="simulator-page">
          <div className="scene-viewer-page__not-found">
            <EmptyState
              icon="🔍"
              title="공간을 찾을 수 없습니다"
              message={`ID "${sceneId}"에 해당하는 공간이 없습니다.`}
              action={
                <Button variant="primary" onClick={() => navigate('/simulator/list')}>
                  목록으로 돌아가기
                </Button>
              }
            />
          </div>
        </main>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // 로딩 상태
  // ─────────────────────────────────────────────
  if (!scene) {
    return (
      <>
        <Header />
        <main className="simulator-page">
          <div className="scene-viewer-page__loading">
            <div className="scene-viewer-page__spinner" />
            <span>공간을 불러오는 중...</span>
          </div>
        </main>
      </>
    );
  }

  // ─────────────────────────────────────────────
  // 메인 렌더링
  // ─────────────────────────────────────────────
  return (
    <>
      <Header />
      <main className="simulator-page">
        <div className="light-simulator">
          {/* Canvas Area */}
          <div className="light-simulator__canvas">
            <WebGPURenderer
              key={rendererKey}
              className="light-simulator__webgpu"
              scene={scene}
              onEngineReady={handleEngineReady}
            />

            {/* Canvas Overlay */}
            <CanvasOverlay
              sceneName={scene.name}
              timeString={currentTimeString}
              isSaved={isSaved}
              renderStats={renderStats}
              cameraPosition={cameraPosition ?? undefined}
            />
          </div>

          {/* Control Panel */}
          <div className="light-simulator__panel">
            <ControlPanel
              scene={scene}
              onSceneSelect={handleSceneSelect}
              onSunSettingsChange={handleSunSettingsChange}
            />
          </div>
        </div>
      </main>
    </>
  );
}
