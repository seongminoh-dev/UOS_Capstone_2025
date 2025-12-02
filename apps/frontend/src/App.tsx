import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ViewportGuard, ToastProvider } from './components/common';
import OnboardingPage from './pages/OnboardingPage';
import TemplatesPage from './pages/TemplatesPage';
import GuidePage from './pages/GuidePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import EditPage from './pages/EditPage';
import WorkspacePage from './pages/WorkspacePage';
import SceneViewerPage from './pages/SceneViewerPage';

function App() {
  return (
    <ViewportGuard>
      <ToastProvider>
        <BrowserRouter>
          <div className="app-root">
            <Routes>
              {/* 온보딩/랜딩 페이지 */}
              <Route path="/" element={<OnboardingPage />} />

              {/* ============================================
                  시뮬레이터 라우트
                  - /simulator → /simulator/list로 리다이렉트
                  - /simulator/list → Workspace (Scene 목록)
                  - /simulator/scene/:sceneId → WebGPU 렌더링
                  ============================================ */}
              <Route path="/simulator" element={<Navigate to="/simulator/list" replace />} />
              <Route path="/simulator/list" element={<WorkspacePage />} />
              <Route path="/simulator/scene/:sceneId" element={<SceneViewerPage />} />

              {/* ============================================
                  에디터 라우트
                  - /editor/scene/:sceneId → 기존 Scene 편집
                  - /editor/new → 새 Scene 생성
                  - /edit → /editor/new로 리다이렉트 (하위호환)
                  ============================================ */}
              <Route path="/editor/scene/:sceneId" element={<EditPage />} />
              <Route path="/editor/new" element={<EditPage />} />
              <Route path="/edit" element={<EditPage />} />

              {/* 템플릿 갤러리 */}
              <Route path="/templates" element={<TemplatesPage />} />

              {/* 사용 가이드 */}
              <Route path="/guide" element={<GuidePage />} />

              {/* 로그인/회원가입 */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ViewportGuard>
  );
}

export default App;
