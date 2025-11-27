import { useState, useCallback } from 'react';
import './LightingSimulator.css';
import Header from '../components/Header';
import WebGPURenderer from '../components/WebGPURenderer';
import MainRightPanel from '../components/MainRightPanel';
import ErrorBoundary from '../components/ErrorBoundary';
import type { Scene } from '../graphics-core/service/Scene';

export default function LightingSimulator() {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rendererKey, setRendererKey] = useState(0);

  // ErrorBoundary 리셋 시 렌더러 재마운트를 위한 키 증가
  const handleErrorReset = useCallback(() => {
    setRendererKey((prev) => prev + 1);
  }, []);

  const handleSelectScene = (scene: Scene | null) => {
    if (scene) {
      setIsLoading(true);
      // TODO: WebGPUEngine에 Scene 전달
      setTimeout(() => {
        setSelectedScene(scene);
        setIsLoading(false);
      }, 500);
    } else {
      setSelectedScene(null);
    }
  };

  const handleSceneChange = () => {
    // TODO: Scene 변경 감지 로직
    console.log('Scene changed');
  };

  return (
    <>
      <Header />
      <div className="simulator-container">
        <div className="simulator-layout">
          {/* Left side - WebGPU Canvas */}
          <div className="canvas-wrapper">
            {!selectedScene ? (
              // Scene 선택 전
              <div className="canvas-placeholder">
                <div className="placeholder-content">
                  <div className="placeholder-icon">🎬</div>
                  <h3>Scene을 선택해주세요</h3>
                  <p>우측 패널에서 렌더링할 Scene을 선택하세요</p>
                </div>
              </div>
            ) : isLoading ? (
              // 로딩 중
              <div className="canvas-placeholder">
                <div className="placeholder-content">
                  <div className="placeholder-icon loading">⏳</div>
                  <h3>Scene 로딩 중...</h3>
                  <p>{selectedScene.name}</p>
                </div>
              </div>
            ) : (
              // 렌더링 - ErrorBoundary로 감싸서 GPU 에러 처리
              <ErrorBoundary
                key={rendererKey}
                fallbackTitle="WebGPU 렌더링 오류"
                onReset={handleErrorReset}
              >
                <WebGPURenderer
                  key={`${selectedScene.id}-${selectedScene.updatedAt || Date.now()}`}
                  className="webgpu-canvas"
                  scene={selectedScene}
                />
              </ErrorBoundary>
            )}
          </div>

          {/* Right side - Main Right Panel */}
          <MainRightPanel
            selectedScene={selectedScene}
            onSelectScene={handleSelectScene}
            onSceneChange={handleSceneChange}
          />
        </div>
      </div>
    </>
  );
}
