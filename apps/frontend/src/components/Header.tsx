import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isGuest, logout, initAuth } = useAuthStore();

  // 초기화: localStorage에서 인증 상태 복원
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo Section */}
        <Link to="/" className="header-logo">
          <div className="logo-icon">
            <div className="logo-shape"></div>
          </div>
          <span className="logo-text">인태리</span>
        </Link>

        {/* Navigation */}
        <nav className="header-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            씬
          </Link>
          <Link to="/edit" className={`nav-link ${location.pathname === '/edit' ? 'active' : ''}`}>
            편집
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="header-auth">
          {isAuthenticated && !isGuest ? (
            // 회원 모드
            <>
              <div className="user-info">
                <span className="user-nickname">{user?.nickname}</span>
              </div>
              <button
                className="auth-button auth-logout"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            // 비회원 모드
            <>
              <Link to="/login">
                <button className="auth-button auth-login">로그인</button>
              </Link>
              <Link to="/signup">
                <button className="auth-button auth-signup">회원가입</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
