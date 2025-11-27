import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import OnboardingPage from './pages/OnboardingPage';
import LightingSimulator from './pages/LightingSimulator';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import EditPage from './pages/EditPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          {/* 온보딩/랜딩 페이지 */}
          <Route path="/" element={<OnboardingPage />} />

          {/* 시뮬레이터 (씬 렌더링) */}
          <Route path="/simulator" element={<LightingSimulator />} />

          {/* 로그인/회원가입 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 편집 페이지 (Three.js 실시간 미리보기) */}
          <Route path="/edit" element={<EditPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
