import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSceneRepository } from '../stores/sceneRepository';
import './AuthPages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const { syncLocalToServer, loadScenes } = useSceneRepository();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(formData);

      // 로그인 성공 후 LocalScenes → Server 동기화
      try {
        await syncLocalToServer();
        await loadScenes();
      } catch (syncError) {
        console.error('Failed to sync local scenes:', syncError);
        // 동기화 실패해도 로그인은 성공 처리
      }

      // 로그인 성공 시 시뮬레이터 페이지로 이동
      navigate('/simulator');
    } catch (err) {
      // 에러는 store에서 처리됨
      console.error('Login failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">
            <div className="logo-shape"></div>
          </div>
          <span className="logo-text">Intery</span>
        </div>

        {/* Title */}
        <h1 className="auth-title">로그인</h1>
        <p className="auth-subtitle">
          계정이 없으신가요?{' '}
          <a href="/signup" className="auth-link">
            회원가입
          </a>
        </p>

        {/* Error Message */}
        {error && (
          <div className="auth-error">
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              사용자명
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="사용자명을 입력하세요"
              className="form-input"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              className="form-input"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* Guest Mode Notice */}
        <div className="auth-notice">
          <p>
            💡 <strong>비회원으로도 이용 가능합니다!</strong>
            <br />
            로그인 없이 모든 기능을 사용할 수 있습니다.
            <br />
            (단, 데이터는 서버에 저장되지 않습니다)
          </p>
          <button
            type="button"
            className="guest-button"
            onClick={() => navigate('/simulator')}
          >
            비회원으로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
