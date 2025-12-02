/**
 * SimulatorLayout - /simulator 하위 라우트 공용 레이아웃
 *
 * 구조:
 * - Header (공용)
 * - Canvas (WebGPU, 숨김 가능)
 * - Outlet (WorkspacePage 또는 SceneViewerPage)
 *
 * 핵심:
 * - WebGPUEngine을 Context로 공유
 * - list 모드에서 Canvas는 숨김 처리 (display: none)
 * - scene 모드에서 Canvas 표시 + ControlPanel
 */

import { useRef, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { SimulatorProvider, useSimulator } from '../contexts';
import { PHASE_METADATA, isAssetLoadingProgress } from '../graphics-core/service';
import { WebGPUError } from '../graphics-core/service/types/WebGPUError';
import { WEBGPU_ERROR_SOLUTIONS } from '../components/ErrorBoundary';
import { Button } from '../components/common';
import './SimulatorLayout.css';

// ─────────────────────────────────────────────
// 내부 레이아웃 (Context 내부에서 사용)
// ─────────────────────────────────────────────

function SimulatorLayoutInner() {
  const location = useLocation();
  const { isEngineReady, isSceneLoading, initProgress, error, retry } = useSimulator();

  // 현재 모드 판단: /simulator/scene/:id이면 canvas 모드
  const isCanvasMode = location.pathname.includes('/simulator/scene/');

  // 로딩 상태 표시 여부
  const showLoading = !isEngineReady || isSceneLoading;

  return (
    <>
      <Header />
      <main className="simulator-layout">
        {/* WebGPU 에러 화면 */}
        {error && (
          <WebGPUErrorView error={error} onRetry={retry} />
        )}

        {/* 로딩 오버레이 (Canvas 모드에서만) */}
        {!error && showLoading && isCanvasMode && (
          <LoadingOverlay initProgress={initProgress} />
        )}

        {/* Outlet: 하위 라우트 렌더링 */}
        <Outlet />
      </main>
    </>
  );
}

// ─────────────────────────────────────────────
// 에러 뷰
// ─────────────────────────────────────────────

interface WebGPUErrorViewProps {
  error: WebGPUError;
  onRetry: () => void;
}

function WebGPUErrorView({ error, onRetry }: WebGPUErrorViewProps) {
  const solution = WEBGPU_ERROR_SOLUTIONS[error.code];

  return (
    <div className="simulator-layout__error">
      <div className="simulator-layout__error-card">
        <div className="simulator-layout__error-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fa5252" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="simulator-layout__error-title">{solution.title}</h2>
        <p className="simulator-layout__error-desc">{solution.description}</p>
        <div className="simulator-layout__error-solutions">
          <h3>해결 방법</h3>
          <ul>
            {solution.solutions.map((sol, i) => (
              <li key={i}><span>{i + 1}</span>{sol}</li>
            ))}
          </ul>
        </div>
        <div className="simulator-layout__error-actions">
          {solution.canRetry && (
            <Button variant="primary" onClick={onRetry}>다시 시도</Button>
          )}
          <Button variant="secondary" onClick={() => window.location.reload()}>
            페이지 새로고침
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 로딩 오버레이
// ─────────────────────────────────────────────

interface LoadingOverlayProps {
  initProgress: ReturnType<typeof useSimulator>['initProgress'];
}

function LoadingOverlay({ initProgress }: LoadingOverlayProps) {
  return (
    <div className="simulator-layout__loading">
      <div className="simulator-layout__loading-content">
        {/* 스피너 */}
        <div className="simulator-layout__spinner">
          <div className="simulator-layout__spinner-ring" />
          <div className="simulator-layout__spinner-icon">🏠</div>
        </div>

        {/* 단계 표시 */}
        {initProgress && (
          <div className="simulator-layout__progress-step">
            Step {initProgress.step} / {initProgress.totalSteps}
          </div>
        )}

        {/* 프로그레스 바 */}
        {initProgress && (
          <div className="simulator-layout__progress-bar">
            <div
              className="simulator-layout__progress-fill"
              style={{ width: `${(initProgress.step / initProgress.totalSteps) * 100}%` }}
            />
          </div>
        )}

        {/* 메인 텍스트 */}
        <div className="simulator-layout__loading-title">
          {initProgress
            ? PHASE_METADATA[initProgress.phase]?.labelKo || initProgress.message
            : '렌더러 준비 중'}
        </div>

        {/* Asset 로딩 상세 */}
        {initProgress && isAssetLoadingProgress(initProgress) && (
          <div className="simulator-layout__asset-progress">
            <div className="simulator-layout__asset-header">
              <span>메시 로딩</span>
              <span>
                {initProgress.loadedCount} / {initProgress.totalCount}
                ({Math.round((initProgress.loadedCount / initProgress.totalCount) * 100)}%)
              </span>
            </div>
            <div className="simulator-layout__asset-bar">
              <div
                className="simulator-layout__asset-fill"
                style={{ width: `${(initProgress.loadedCount / initProgress.totalCount) * 100}%` }}
              />
            </div>
            {initProgress.currentAssetName && (
              <div className="simulator-layout__asset-current">
                <span className="simulator-layout__asset-dot" />
                현재: <strong>{initProgress.currentAssetName}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 Layout (Provider 포함)
// ─────────────────────────────────────────────

export default function SimulatorLayout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // 반응형 크기 처리
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // 최대 해상도 제한
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 960;

        let newWidth = Math.min(width, MAX_WIDTH);
        let newHeight = newWidth * 3 / 4;

        if (newHeight > MAX_HEIGHT) {
          newHeight = MAX_HEIGHT;
          newWidth = newHeight * 4 / 3;
        }

        setCanvasSize({ width: Math.max(newWidth, 512), height: Math.max(newHeight, 384) });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <SimulatorProvider canvasRef={canvasRef}>
      {/* Hidden Canvas Container (항상 존재) */}
      <div
        ref={containerRef}
        className="simulator-layout__canvas-container"
        style={{ position: 'absolute', left: '-9999px', width: '100%', height: '100%' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ display: 'block' }}
        />
      </div>

      <SimulatorLayoutInner />
    </SimulatorProvider>
  );
}
