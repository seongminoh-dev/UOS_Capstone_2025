/**
 * LightingSimulator - 메인 시뮬레이터 페이지
 *
 * 두 가지 레이아웃 모드:
 * 1. list: WorkspaceView (Scene 목록, 카드 그리드)
 * 2. simulator: LightSimulatorLayout (Canvas + Control Panel)
 *
 * location.state로 scene을 직접 전달받으면 바로 시뮬레이터 모드로 진입
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './LightingSimulator.css';
import Header from '../components/Header';
import { LightSimulatorLayout } from '../components/simulator';
import { WorkspaceView } from '../components/workspace';
import type { SceneFrontend } from '../graphics-core/service/Scene';

type LayoutMode = 'list' | 'simulator';

export default function LightingSimulator() {
  const location = useLocation();
  const navigate = useNavigate();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
  const [selectedScene, setSelectedScene] = useState<SceneFrontend | null>(null);

  // location.state로 scene이 전달되면 바로 시뮬레이터 모드로 진입
  useEffect(() => {
    const state = location.state as { scene?: SceneFrontend } | null;
    if (state?.scene) {
      setSelectedScene(state.scene);
      setLayoutMode('simulator');
      // state 초기화 (뒤로가기 시 다시 적용되지 않도록)
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  // Scene 선택 핸들러 (list → simulator 전환)
  const handleSelectScene = useCallback((scene: SceneFrontend | null) => {
    if (scene) {
      setSelectedScene(scene);
      setLayoutMode('simulator');
    }
  }, []);

  // Workspace로 복귀 (simulator → list)
  const handleBackToWorkspace = useCallback(() => {
    setSelectedScene(null);
    setLayoutMode('list');
  }, []);

  return (
    <>
      <Header />
      <main className="simulator-page">
        {/* List Mode: Scene 목록 */}
        {layoutMode === 'list' && (
          <WorkspaceView onSelectScene={handleSelectScene} />
        )}

        {/* Simulator Mode: Canvas + Panel */}
        {layoutMode === 'simulator' && selectedScene && (
          <LightSimulatorLayout
            scene={selectedScene}
            onBack={handleBackToWorkspace}
          />
        )}
      </main>
    </>
  );
}
