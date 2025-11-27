/**
 * Onboarding Page - 서비스 소개 및 시작 페이지
 *
 * 첫 방문 사용자를 위한 서비스 소개 및 빠른 시작 안내
 * - 서비스 핵심 가치 전달
 * - 주요 기능 소개
 * - 사용 방법 안내
 * - 빠른 시작 CTA
 */

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './OnboardingPage.css';

// 주요 기능 카드 데이터
const FEATURES = [
  {
    icon: '🌞',
    title: '실시간 조명',
    description: '시간대와 계절에 따른 자연광 변화를 실시간으로 확인하세요',
  },
  {
    icon: '🛋️',
    title: '가구 배치',
    description: '다양한 가구를 드래그하여 원하는 위치에 배치해보세요',
  },
  {
    icon: '🎨',
    title: 'PBR 렌더링',
    description: 'PathTracing 기반의 사실적인 재질과 반사를 경험하세요',
  },
  {
    icon: '💾',
    title: '씬 저장',
    description: '작업한 씬을 저장하고 언제든 다시 불러올 수 있어요',
  },
];

// 사용 단계 데이터
const STEPS = [
  {
    step: 1,
    title: '방 선택',
    description: '침실, 거실, 욕실 등 원하는 방 구조를 선택하세요',
    icon: '🏠',
  },
  {
    step: 2,
    title: '조명 설정',
    description: '시간대, 계절, 방향을 조절하여 원하는 조명을 만드세요',
    icon: '💡',
  },
  {
    step: 3,
    title: '가구 배치',
    description: '의자, 소파, 테이블 등을 추가하고 배치해보세요',
    icon: '🪑',
  },
  {
    step: 4,
    title: '결과 확인',
    description: '실시간으로 렌더링되는 결과를 확인하세요',
    icon: '✨',
  },
];

// 샘플 이미지 (플레이스홀더)
const SAMPLE_IMAGES = [
  { id: 1, name: '모던 침실', time: '낮' },
  { id: 2, name: '아늑한 거실', time: '저녁' },
  { id: 3, name: '미니멀 욕실', time: '아침' },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // 페이지 진입 애니메이션
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SAMPLE_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    navigate('/simulator');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className={`onboarding-page ${isVisible ? 'visible' : ''}`}>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-gradient" />
          <div className="hero-pattern" />
        </div>

        <nav className="hero-nav">
          <div className="nav-logo">
            <div className="logo-icon">
              <div className="logo-shape" />
            </div>
            <span className="logo-text">Intery</span>
          </div>
          <div className="nav-links">
            <button className="nav-link" onClick={() => navigate('/templates')}>
              템플릿
            </button>
            <button className="nav-link" onClick={() => navigate('/guide')}>
              가이드
            </button>
          </div>
          <div className="nav-actions">
            <button className="nav-button secondary" onClick={handleLogin}>
              로그인
            </button>
            <button className="nav-button primary" onClick={handleStart}>
              시작하기
            </button>
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">✨</span>
            <span>WebGPU 기반 실시간 렌더링</span>
          </div>

          <h1 className="hero-title">
            <span className="title-line">당신의 공간을</span>
            <span className="title-line highlight">빛으로 디자인하세요</span>
          </h1>

          <p className="hero-description">
            PathTracing 기술로 구현된 사실적인 조명 시뮬레이터<br />
            로그인 없이도 지금 바로 시작할 수 있어요
          </p>

          <div className="hero-cta">
            <button className="cta-button primary" onClick={handleStart}>
              <span>지금 시작하기</span>
              <span className="cta-arrow">→</span>
            </button>
            <button className="cta-button secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              더 알아보기
            </button>
          </div>

          <div className="hero-note">
            <span className="note-icon">💡</span>
            <span>회원가입 없이 모든 기능을 이용할 수 있어요</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-frame">
            <div className="frame-header">
              <div className="frame-dots">
                <span /><span /><span />
              </div>
              <span className="frame-title">Intery Simulator</span>
            </div>
            <div className="frame-content">
              <div className="preview-placeholder">
                <div className="preview-room">
                  <div className="room-wall left" />
                  <div className="room-wall back" />
                  <div className="room-floor" />
                  <div className="room-light" />
                  <div className="room-furniture sofa" />
                  <div className="room-furniture table" />
                  <div className="room-shadow" />
                </div>
                <div className="preview-overlay">
                  <span className="preview-label">Live Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2 className="section-title">주요 기능</h2>
            <p className="section-description">
              전문가와 일반 사용자 모두를 위한 직관적인 인테리어 도구
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="feature-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="steps-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">How It Works</span>
            <h2 className="section-title">사용 방법</h2>
            <p className="section-description">
              4단계로 쉽게 시작하세요
            </p>
          </div>

          <div className="steps-container">
            <div className="steps-line" />
            {STEPS.map((step, index) => (
              <div
                key={index}
                className="step-item"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="step-number">{step.step}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="gallery-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Gallery</span>
            <h2 className="section-title">렌더링 샘플</h2>
            <p className="section-description">
              Intery로 만들 수 있는 결과물을 확인해보세요
            </p>
          </div>

          <div className="gallery-slider">
            <div className="slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {SAMPLE_IMAGES.map((image, index) => (
                <div key={image.id} className="slider-slide">
                  <div className="slide-content">
                    <div className="slide-placeholder">
                      <div className="placeholder-icon">🏠</div>
                      <span className="placeholder-name">{image.name}</span>
                      <span className="placeholder-time">{image.time} 조명</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="slider-dots">
              {SAMPLE_IMAGES.map((_, index) => (
                <button
                  key={index}
                  className={`slider-dot ${currentSlide === index ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <div className="cta-content">
              <h2 className="cta-title">지금 바로 시작하세요</h2>
              <p className="cta-description">
                복잡한 가입 절차 없이 바로 사용할 수 있어요.<br />
                당신의 공간을 빛으로 디자인해보세요.
              </p>
              <div className="cta-buttons">
                <button className="cta-button primary large" onClick={handleStart}>
                  <span>무료로 시작하기</span>
                  <span className="cta-arrow">→</span>
                </button>
              </div>
              <div className="cta-features">
                <div className="cta-feature">
                  <span className="feature-check">✓</span>
                  <span>로그인 불필요</span>
                </div>
                <div className="cta-feature">
                  <span className="feature-check">✓</span>
                  <span>무료 사용</span>
                </div>
                <div className="cta-feature">
                  <span className="feature-check">✓</span>
                  <span>로컬 저장</span>
                </div>
              </div>
            </div>
            <div className="cta-decoration">
              <div className="decoration-circle large" />
              <div className="decoration-circle medium" />
              <div className="decoration-circle small" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="onboarding-footer">
        <div className="section-container">
          <div className="footer-content">
            <div className="footer-logo">
              <div className="logo-icon small">
                <div className="logo-shape" />
              </div>
              <span className="logo-text">Intery</span>
            </div>
            <p className="footer-description">
              PathTracing 기반 실시간 인테리어 조명 시뮬레이터
            </p>
            <div className="footer-links">
              <button className="footer-link" onClick={() => navigate('/templates')}>
                템플릿
              </button>
              <button className="footer-link" onClick={() => navigate('/guide')}>
                가이드
              </button>
              <button className="footer-link" onClick={() => navigate('/simulator')}>
                시뮬레이터
              </button>
            </div>
            <div className="footer-copyright">
              © 2025 UOS Capstone Project
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default OnboardingPage;
