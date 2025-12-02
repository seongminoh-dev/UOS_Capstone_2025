/**
 * WorkspacePage - Scene 목록 화면
 *
 * 경로: /simulator/list
 * 기존 WorkspaceView를 그대로 사용하되, 라우터 기반 네비게이션으로 변경
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { WorkspaceView } from '../components/workspace';
import type { SceneFrontend } from '../graphics-core/service/Scene';
import './LightingSimulator.css';

export default function WorkspacePage() {
  const navigate = useNavigate();

  // Scene 선택 시 /simulator/scene/:id로 이동
  const handleSelectScene = useCallback(
    (scene: SceneFrontend) => {
      navigate(`/simulator/scene/${scene.id}`);
    },
    [navigate]
  );

  return (
    <>
      <Header />
      <main className="simulator-page">
        <WorkspaceView onSelectScene={handleSelectScene} />
      </main>
    </>
  );
}
