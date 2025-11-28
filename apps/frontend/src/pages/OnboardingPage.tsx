/**
 * OnboardingPage - 랜딩 페이지
 *
 * 프로덕션 퀄리티 랜딩 페이지:
 * - Hero Section: 브랜드 메시지 + 시각적 프리뷰
 * - Features Section: 주요 기능 소개
 * - How It Works: 사용 단계 안내
 * - CTA Section: 시작하기 유도
 * - Footer: 링크 및 저작권
 */

import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import './OnboardingPage.css';

// 주요 기능 데이터
const FEATURES = [
  {
    icon: '☀️',
    title: '실시간 자연광',
    description: '시간대와 계절에 따른 자연광 변화를 실시간으로 확인하세요',
  },
  {
    icon: '💡',
    title: '조명 시뮬레이션',
    description: '다양한 인공 조명을 배치하고 효과를 미리 확인해보세요',
  },
  {
    icon: '🛋️',
    title: '가구 배치',
    description: '드래그 앤 드롭으로 쉽게 가구를 배치하고 조절하세요',
  },
  {
    icon: '✨',
    title: 'PBR 렌더링',
    description: 'PathTracing 기반의 사실적인 재질과 그림자를 경험하세요',
  },
];

// 사용 단계 데이터
const STEPS = [
  {
    step: 1,
    title: '공간 선택',
    description: '침실, 거실 등 원하는 방을 선택하세요',
  },
  {
    step: 2,
    title: '조명 설정',
    description: '시간과 계절을 조절하여 자연광을 설정하세요',
  },
  {
    step: 3,
    title: '가구 배치',
    description: '가구와 조명을 추가하고 배치해보세요',
  },
  {
    step: 4,
    title: '결과 확인',
    description: '실시간 렌더링으로 결과를 확인하세요',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStart = () => {
    navigate('/simulator');
  };

  return (
    <div className={`onboarding ${isVisible ? 'is-visible' : ''}`}>
      <Header />

      {/* Scrollable content area */}
      <div className="onboarding__scroll-area">
        {/* Hero Section */}
        <section className="onboarding__hero">
        <div className="onboarding__hero-bg">
          <div className="onboarding__hero-gradient" />
          <div className="onboarding__hero-pattern" />
        </div>

        <div className="onboarding__hero-inner">
          <div className="onboarding__hero-content">
            <span className="onboarding__badge">
              <span className="onboarding__badge-dot" />
              WebGPU 기반 실시간 렌더링
            </span>

            <h1 className="onboarding__title">
              당신의 공간을
              <br />
              <span className="onboarding__title-highlight">빛으로 디자인하세요</span>
            </h1>

            <p className="onboarding__desc">
              PathTracing 기술로 구현된 사실적인 인테리어 조명 시뮬레이터.
              <br />
              로그인 없이 지금 바로 시작할 수 있습니다.
            </p>

            <div className="onboarding__cta">
              <button className="onboarding__cta-btn onboarding__cta-btn--primary" onClick={handleStart}>
                지금 시작하기
                <span className="onboarding__cta-arrow">→</span>
              </button>
              <button
                className="onboarding__cta-btn onboarding__cta-btn--secondary"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                더 알아보기
              </button>
            </div>

            <p className="onboarding__hint">
              <span className="onboarding__hint-icon">💡</span>
              회원가입 없이 모든 기능을 무료로 이용할 수 있어요
            </p>
          </div>

          <div className="onboarding__hero-visual">
            <div className="onboarding__preview">
              <div className="onboarding__preview-header">
                <div className="onboarding__preview-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="onboarding__preview-title">Intery Simulator</span>
              </div>
              <div className="onboarding__preview-content">
                <div className="onboarding__preview-room">
                  <div className="onboarding__preview-wall onboarding__preview-wall--back" />
                  <div className="onboarding__preview-wall onboarding__preview-wall--left" />
                  <div className="onboarding__preview-floor" />
                  <div className="onboarding__preview-light" />
                  <div className="onboarding__preview-furniture onboarding__preview-furniture--sofa" />
                  <div className="onboarding__preview-furniture onboarding__preview-furniture--table" />
                </div>
                <div className="onboarding__preview-label">
                  <span className="onboarding__preview-label-dot" />
                  Live Preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="onboarding__features" id="features">
        <div className="onboarding__section-inner">
          <div className="onboarding__section-header">
            <span className="onboarding__section-badge">Features</span>
            <h2 className="onboarding__section-title">주요 기능</h2>
            <p className="onboarding__section-desc">
              전문가와 일반 사용자 모두를 위한 직관적인 인테리어 도구
            </p>
          </div>

          <div className="onboarding__features-grid">
            {FEATURES.map((feature, index) => (
              <article key={index} className="onboarding__feature-card">
                <span className="onboarding__feature-icon">{feature.icon}</span>
                <h3 className="onboarding__feature-title">{feature.title}</h3>
                <p className="onboarding__feature-desc">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="onboarding__steps">
        <div className="onboarding__section-inner">
          <div className="onboarding__section-header">
            <span className="onboarding__section-badge">How It Works</span>
            <h2 className="onboarding__section-title">사용 방법</h2>
            <p className="onboarding__section-desc">4단계로 쉽게 시작하세요</p>
          </div>

          <div className="onboarding__steps-grid">
            {STEPS.map((step) => (
              <div key={step.step} className="onboarding__step">
                <span className="onboarding__step-number">{step.step}</span>
                <h3 className="onboarding__step-title">{step.title}</h3>
                <p className="onboarding__step-desc">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="onboarding__cta-section">
        <div className="onboarding__section-inner">
          <div className="onboarding__cta-card">
            <div className="onboarding__cta-card-content">
              <h2 className="onboarding__cta-title">지금 바로 시작하세요</h2>
              <p className="onboarding__cta-desc">
                복잡한 가입 절차 없이 바로 사용할 수 있어요.
                <br />
                당신의 공간을 빛으로 디자인해보세요.
              </p>
              <button className="onboarding__cta-btn onboarding__cta-btn--white" onClick={handleStart}>
                무료로 시작하기
                <span className="onboarding__cta-arrow">→</span>
              </button>
              <div className="onboarding__cta-features">
                <span className="onboarding__cta-feature">
                  <span className="onboarding__cta-check">✓</span>
                  로그인 불필요
                </span>
                <span className="onboarding__cta-feature">
                  <span className="onboarding__cta-check">✓</span>
                  무료 사용
                </span>
                <span className="onboarding__cta-feature">
                  <span className="onboarding__cta-check">✓</span>
                  로컬 저장
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Footer */}
        <footer className="onboarding__footer">
          <div className="onboarding__section-inner">
            <div className="onboarding__footer-content">
              <div className="onboarding__footer-logo">
                <div className="onboarding__footer-logo-icon">
                  <div className="onboarding__footer-logo-shape" />
                </div>
                <span className="onboarding__footer-logo-text">Intery</span>
              </div>
              <p className="onboarding__footer-desc">
                PathTracing 기반 실시간 인테리어 조명 시뮬레이터
              </p>
              <nav className="onboarding__footer-nav">
                <button onClick={() => navigate('/templates')}>템플릿</button>
                <button onClick={() => navigate('/guide')}>가이드</button>
                <button onClick={() => navigate('/simulator')}>시뮬레이터</button>
              </nav>
              <p className="onboarding__footer-copyright">
                © 2025 UOS Capstone Project
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
