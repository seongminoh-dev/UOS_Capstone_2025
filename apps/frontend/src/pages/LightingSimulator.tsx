/**
 * LightingSimulator - 메인 시뮬레이터 페이지
 *
 * 두 가지 레이아웃 모드:
 * 1. list: WorkspaceView (Scene 목록, 카드 그리드)
 * 2. simulator: LightSimulatorLayout (Canvas + Control Panel)
 */

import { useState, useCallback } from 'react';
import './LightingSimulator.css';
import Header from '../components/Header';
import { LightSimulatorLayout } from '../components/simulator';
import { WorkspaceView } from '../components/workspace';
import type { SceneFrontend } from '../graphics-core/service/Scene';

type LayoutMode = 'list' | 'simulator';

export default function LightingSimulator() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list');
  const [selectedScene, setSelectedScene] = useState<SceneFrontend | null>(null);

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
