import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import LightingSimulator from './LightingSimulator';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Routes>
          {/* 메인 페이지 (씬 렌더링) */}
          <Route path="/" element={<LightingSimulator />} />

          {/* 로그인/회원가입 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* TODO: 편집 페이지 (Three.js) */}
          {/* <Route path="/edit" element={<EditPage />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
