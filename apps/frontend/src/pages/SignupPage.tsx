/**
 * SignupPage - 회원가입 페이지
 *
 * 2단 레이아웃:
 * - 좌측: 브랜딩 영역 (로고 + 설명)
 * - 우측: 회원가입 폼
 */

import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSceneRepository } from '../stores/sceneRepository';
import { ChevronLeftIcon } from '../components/common/Icons';
import './AuthPages.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuthStore();
  const { syncLocalToServer, loadScenes } = useSceneRepository();

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

      // 회원가입 성공 후 LocalScenes → Server 동기화
      try {
        await syncLocalToServer();
        await loadScenes();
      } catch (syncError) {
        console.error('Failed to sync local scenes:', syncError);
      }

      navigate('/simulator');
    } catch (err) {
      console.error('Signup failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const displayError = error || validationError;

  return (
    <div className="auth-page">
      {/* Left: Branding */}
      <div className="auth-brand">
        <div className="auth-brand__content">
          <Link to="/" className="auth-brand__logo">
            <div className="auth-brand__logo-icon">
              <div className="auth-brand__logo-shape" />
            </div>
            <span className="auth-brand__logo-text">Intery</span>
          </Link>
          <h1 className="auth-brand__title">
            인테리어 조명
            <br />
            시뮬레이터
          </h1>
          <p className="auth-brand__desc">
            자연광과 인공조명을 실시간으로 시뮬레이션하여
            <br />
            최적의 조명 환경을 찾아보세요.
          </p>
        </div>
        <div className="auth-brand__footer">
          <span>© 2025 Intery. UOS Capstone Project.</span>
        </div>
      </div>

      {/* Right: Form */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          {/* Back Link */}
          <Link to="/simulator" className="auth-back">
            <ChevronLeftIcon size={16} />
            <span>시뮬레이터로 돌아가기</span>
          </Link>

          {/* Header */}
          <div className="auth-header">
            <h2 className="auth-title">회원가입</h2>
            <p className="auth-subtitle">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="auth-link">
                로그인
              </Link>
            </p>
          </div>

          {/* Error */}
          {displayError && (
            <div className="auth-error">
              <span className="auth-error__icon">!</span>
              <span className="auth-error__text">{displayError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="username" className="auth-field__label">
                사용자명
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="영문, 숫자 조합"
                className="auth-field__input"
                required
                disabled={isLoading}
                maxLength={50}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email" className="auth-field__label">
                이메일
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
                className="auth-field__input"
                required
                disabled={isLoading}
                maxLength={100}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="nickname" className="auth-field__label">
                닉네임
              </label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="표시될 이름"
                className="auth-field__input"
                required
                disabled={isLoading}
                maxLength={50}
              />
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="password" className="auth-field__label">
                  비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="최소 6자"
                  className="auth-field__input"
                  required
                  disabled={isLoading}
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="passwordConfirm" className="auth-field__label">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  id="passwordConfirm"
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  placeholder="비밀번호 재입력"
                  className="auth-field__input"
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="auth-submit__spinner" />
                  가입 중...
                </>
              ) : (
                '회원가입'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>또는</span>
          </div>

          {/* Guest Mode */}
          <button
            type="button"
            className="auth-guest"
            onClick={() => navigate('/simulator')}
          >
            비회원으로 시작하기
          </button>

          <p className="auth-guest-hint">
            비회원도 모든 기능을 이용할 수 있습니다.
            <br />
            단, 데이터는 브라우저에만 저장됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
