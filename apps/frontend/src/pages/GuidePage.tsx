/**
 * Guide Page - 사용 가이드
 *
 * 서비스 사용법을 단계별로 안내하는 페이지
 * - 기본 사용법
 * - 기능별 상세 가이드
 * - FAQ
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './GuidePage.css';

// 가이드 섹션 타입
type GuideSection = 'getting-started' | 'lighting' | 'furniture' | 'scene' | 'faq';

// 시작 가이드 단계
const GETTING_STARTED_STEPS = [
  {
    step: 1,
    title: '템플릿 선택',
    description: '템플릿 갤러리에서 원하는 공간을 선택하거나, 새로운 씬을 만들어 시작하세요.',
    icon: '🏠',
    tips: ['침실, 거실, 욕실 등 다양한 공간 템플릿 제공', '빈 씬에서 처음부터 구성도 가능'],
  },
  {
    step: 2,
    title: '환경 설정',
    description: '시간대, 계절, 방향을 조절하여 원하는 자연광 환경을 만드세요.',
    icon: '🌤️',
    tips: ['슬라이더로 시간 조절 (일출~일몰)', '계절별 태양 고도 자동 반영', '방 방향에 따른 채광 시뮬레이션'],
  },
  {
    step: 3,
    title: '가구 배치',
    description: '편집 모드에서 가구를 추가하고 위치를 조정하세요.',
    icon: '🪑',
    tips: ['드래그로 위치 이동', '회전 및 크기 조절 가능', '실시간 미리보기 제공'],
  },
  {
    step: 4,
    title: '결과 확인',
    description: 'PathTracing 렌더링으로 사실적인 결과물을 확인하세요.',
    icon: '✨',
    tips: ['실시간 렌더링 품질 조절', '로컬에 씬 저장 가능', '언제든 다시 불러와 수정'],
  },
];

// 기능별 가이드
const FEATURE_GUIDES = {
  lighting: {
    title: '조명 설정 가이드',
    icon: '💡',
    sections: [
      {
        subtitle: '시간 조절',
        content: '시간 슬라이더를 움직여 하루 중 원하는 시간대의 조명을 시뮬레이션합니다. 일출, 정오, 일몰 등 다양한 시간대의 자연광 변화를 확인할 수 있습니다.',
      },
      {
        subtitle: '계절 선택',
        content: '봄, 여름, 가을, 겨울 계절에 따라 태양의 고도와 빛의 색온도가 달라집니다. 계절별 채광 차이를 미리 확인해보세요.',
      },
      {
        subtitle: '방 방향',
        content: '동서남북 방향 설정으로 실제 공간의 방위에 맞는 채광을 시뮬레이션합니다. 남향, 동향 등 방향에 따른 빛의 차이를 비교해보세요.',
      },
      {
        subtitle: '환경광 설정',
        content: '하늘 모드와 간접광 강도를 조절하여 전체적인 분위기를 세밀하게 조정할 수 있습니다.',
      },
    ],
  },
  furniture: {
    title: '가구 배치 가이드',
    icon: '🛋️',
    sections: [
      {
        subtitle: '가구 추가',
        content: '편집 모드의 가구 탭에서 원하는 가구를 선택하여 씬에 추가합니다. 의자, 소파, 테이블 등 다양한 가구를 제공합니다.',
      },
      {
        subtitle: '위치 조절',
        content: '추가된 가구를 클릭하고 드래그하여 원하는 위치로 이동시킵니다. 격자에 스냅되어 정렬이 쉽습니다.',
      },
      {
        subtitle: '회전 및 크기',
        content: '선택된 가구의 회전 각도와 크기를 조절할 수 있습니다. 공간에 맞게 자유롭게 배치해보세요.',
      },
      {
        subtitle: '삭제',
        content: '불필요한 가구는 선택 후 삭제 버튼을 눌러 제거할 수 있습니다.',
      },
    ],
  },
  scene: {
    title: '씬 관리 가이드',
    icon: '💾',
    sections: [
      {
        subtitle: '씬 저장',
        content: '작업한 씬은 브라우저의 로컬 스토리지에 저장됩니다. 저장 버튼을 눌러 현재 상태를 저장하세요.',
      },
      {
        subtitle: '씬 불러오기',
        content: '저장된 씬 목록에서 원하는 씬을 선택하여 불러올 수 있습니다. 이전 작업을 이어서 진행하세요.',
      },
      {
        subtitle: '씬 삭제',
        content: '더 이상 필요 없는 씬은 목록에서 삭제할 수 있습니다. 삭제된 씬은 복구할 수 없으니 주의하세요.',
      },
      {
        subtitle: '새 씬 만들기',
        content: '새로 만들기 버튼을 눌러 빈 씬에서 시작하거나, 템플릿을 기반으로 새 씬을 만들 수 있습니다.',
      },
    ],
  },
};

// FAQ 데이터
const FAQ_ITEMS = [
  {
    question: '로그인 없이도 사용할 수 있나요?',
    answer: '네, 모든 기능을 로그인 없이 사용할 수 있습니다. 씬은 브라우저의 로컬 스토리지에 저장되므로, 같은 브라우저에서 다시 접속하면 이전 작업을 이어갈 수 있습니다.',
  },
  {
    question: 'WebGPU를 지원하지 않는 브라우저에서도 사용할 수 있나요?',
    answer: 'Intery는 WebGPU 기반으로 동작합니다. Chrome, Edge 등 최신 브라우저에서 WebGPU가 활성화되어 있어야 합니다. Safari는 아직 제한적으로 지원됩니다.',
  },
  {
    question: '렌더링 품질을 조절할 수 있나요?',
    answer: 'PathTracing 렌더링은 시간이 지남에 따라 점진적으로 품질이 향상됩니다. 설정을 변경하면 렌더링이 초기화되고 다시 시작됩니다.',
  },
  {
    question: '내 씬을 다른 사람과 공유할 수 있나요?',
    answer: '현재 버전에서는 로컬 저장만 지원합니다. 커뮤니티 공유 기능은 추후 업데이트될 예정입니다.',
  },
  {
    question: '권장 사용 환경은 어떻게 되나요?',
    answer: 'Intery는 WebGPU 기반의 고품질 렌더링을 위해 데스크톱 환경(1024px 이상)에 최적화되어 있습니다. Chrome, Edge 등 WebGPU를 지원하는 최신 브라우저에서 최상의 경험을 제공합니다.',
  },
];

function GuidePage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<GuideSection>('getting-started');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleStartSimulator = () => {
    navigate('/simulator');
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="guide-page">
      <Header />

      <main className="guide-main">
        <div className="guide-container">
          {/* 사이드바 네비게이션 */}
          <aside className="guide-sidebar">
            <nav className="guide-nav">
              <button
                className={`nav-item ${activeSection === 'getting-started' ? 'active' : ''}`}
                onClick={() => setActiveSection('getting-started')}
              >
                <span className="nav-icon">🚀</span>
                <span>시작하기</span>
              </button>
              <button
                className={`nav-item ${activeSection === 'lighting' ? 'active' : ''}`}
                onClick={() => setActiveSection('lighting')}
              >
                <span className="nav-icon">💡</span>
                <span>조명 설정</span>
              </button>
              <button
                className={`nav-item ${activeSection === 'furniture' ? 'active' : ''}`}
                onClick={() => setActiveSection('furniture')}
              >
                <span className="nav-icon">🛋️</span>
                <span>가구 배치</span>
              </button>
              <button
                className={`nav-item ${activeSection === 'scene' ? 'active' : ''}`}
                onClick={() => setActiveSection('scene')}
              >
                <span className="nav-icon">💾</span>
                <span>씬 관리</span>
              </button>
              <button
                className={`nav-item ${activeSection === 'faq' ? 'active' : ''}`}
                onClick={() => setActiveSection('faq')}
              >
                <span className="nav-icon">❓</span>
                <span>FAQ</span>
              </button>
            </nav>

            <div className="sidebar-cta">
              <button className="btn-start" onClick={handleStartSimulator}>
                시뮬레이터 시작
              </button>
            </div>
          </aside>

          {/* 메인 컨텐츠 */}
          <div className="guide-content">
            {/* 시작하기 */}
            {activeSection === 'getting-started' && (
              <section className="content-section">
                <div className="section-header">
                  <h1>시작하기</h1>
                  <p>Intery를 처음 사용하시나요? 4단계로 쉽게 시작할 수 있어요.</p>
                </div>

                <div className="steps-container">
                  {GETTING_STARTED_STEPS.map((step, index) => (
                    <div key={index} className="step-card">
                      <div className="step-header">
                        <span className="step-number">{step.step}</span>
                        <span className="step-icon">{step.icon}</span>
                      </div>
                      <h3 className="step-title">{step.title}</h3>
                      <p className="step-description">{step.description}</p>
                      <ul className="step-tips">
                        {step.tips.map((tip, tipIndex) => (
                          <li key={tipIndex}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="quick-start-cta">
                  <h3>준비되셨나요?</h3>
                  <p>지금 바로 시뮬레이터를 시작해보세요.</p>
                  <button className="btn-primary-large" onClick={handleStartSimulator}>
                    시뮬레이터 시작하기
                  </button>
                </div>
              </section>
            )}

            {/* 기능별 가이드 */}
            {(activeSection === 'lighting' ||
              activeSection === 'furniture' ||
              activeSection === 'scene') && (
              <section className="content-section">
                <div className="section-header">
                  <div className="header-icon">
                    {FEATURE_GUIDES[activeSection].icon}
                  </div>
                  <h1>{FEATURE_GUIDES[activeSection].title}</h1>
                </div>

                <div className="feature-sections">
                  {FEATURE_GUIDES[activeSection].sections.map((section, index) => (
                    <div key={index} className="feature-card">
                      <h3>{section.subtitle}</h3>
                      <p>{section.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ */}
            {activeSection === 'faq' && (
              <section className="content-section">
                <div className="section-header">
                  <h1>자주 묻는 질문</h1>
                  <p>궁금한 점이 있으신가요?</p>
                </div>

                <div className="faq-list">
                  {FAQ_ITEMS.map((item, index) => (
                    <div
                      key={index}
                      className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
                    >
                      <button
                        className="faq-question"
                        onClick={() => toggleFaq(index)}
                      >
                        <span>{item.question}</span>
                        <span className="faq-toggle">
                          {expandedFaq === index ? '−' : '+'}
                        </span>
                      </button>
                      {expandedFaq === index && (
                        <div className="faq-answer">
                          <p>{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default GuidePage;
