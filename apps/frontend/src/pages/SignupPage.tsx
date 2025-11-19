import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './AuthPages.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    passwordConfirm: '',
    email: '',
    nickname: '',
  });

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError('');

    // 비밀번호 확인
    if (formData.password !== formData.passwordConfirm) {
      setValidationError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 길이 확인
    if (formData.password.length < 6) {
      setValidationError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      await signup({
        username: formData.username,
        password: formData.password,
        email: formData.email,
        nickname: formData.nickname,
      });
      // 회원가입 성공 시 메인 페이지로 이동
      navigate('/');
    } catch (err) {
      // 에러는 store에서 처리됨
      console.error('Signup failed:', err);
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
          <span className="logo-text">인태리</span>
        </div>

        {/* Title */}
        <h1 className="auth-title">회원가입</h1>
        <p className="auth-subtitle">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="auth-link">
            로그인
          </a>
        </p>

        {/* Error Message */}
        {(error || validationError) && (
          <div className="auth-error">
            <span>{error || validationError}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              사용자명 *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="사용자명 (영문, 숫자)"
              className="form-input"
              required
              disabled={isLoading}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              이메일 *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
              className="form-input"
              required
              disabled={isLoading}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname" className="form-label">
              닉네임 *
            </label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="닉네임"
              className="form-input"
              required
              disabled={isLoading}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              비밀번호 *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호 (최소 6자)"
              className="form-input"
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm" className="form-label">
              비밀번호 확인 *
            </label>
            <input
              type="password"
              id="passwordConfirm"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              placeholder="비밀번호 재입력"
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
            {isLoading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        {/* Guest Mode Notice */}
        <div className="auth-notice">
          <p>
            💡 <strong>비회원으로도 이용 가능합니다!</strong>
            <br />
            로그인 없이 모든 기능을 사용할 수 있습니다.
          </p>
          <button
            type="button"
            className="guest-button"
            onClick={() => navigate('/')}
          >
            비회원으로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
