/**
 * Templates Page - 씬 템플릿 갤러리
 *
 * 기본 제공 씬과 커뮤니티 씬을 탐색하는 페이지
 * - 기본 템플릿: 시스템 제공 씬
 * - 커뮤니티 템플릿: 다른 유저 공유 씬 (추후 확장)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { DUMMY_SCENES } from '../graphics-core/data/DummyScenes';
import './TemplatesPage.css';

// 템플릿 카테고리
type Category = 'all' | 'official' | 'community';

// 기본 제공 템플릿 (DUMMY_SCENES 기반)
const OFFICIAL_TEMPLATES = DUMMY_SCENES.map((scene) => ({
  ...scene,
  type: 'official' as const,
  author: '인태리',
  likes: 0,
  thumbnail: null,
}));

// 커뮤니티 템플릿 (추후 API 연동, 현재는 플레이스홀더)
const COMMUNITY_TEMPLATES: typeof OFFICIAL_TEMPLATES = [
  // 추후 커뮤니티 기능 확장 시 API에서 로드
];

function TemplatesPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 필터링된 템플릿
  const filteredTemplates = [...OFFICIAL_TEMPLATES, ...COMMUNITY_TEMPLATES].filter(
    (template) => {
      // 카테고리 필터
      if (category === 'official' && template.type !== 'official') return false;
      if (category === 'community' && template.type !== 'community') return false;

      // 검색 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.author.toLowerCase().includes(query)
        );
      }

      return true;
    }
  );

  const handleTemplateClick = (template: (typeof OFFICIAL_TEMPLATES)[0]) => {
    // 시뮬레이터로 이동하면서 템플릿 정보 전달
    navigate('/simulator', { state: { templateId: template.id } });
  };

  const handleStartNew = () => {
    navigate('/edit', { state: { createNew: true } });
  };

  return (
    <div className="templates-page">
      <Header />

      <main className="templates-main">
        <div className="templates-container">
          {/* 페이지 헤더 */}
          <div className="templates-header">
            <div className="header-content">
              <h1 className="templates-title">템플릿 갤러리</h1>
              <p className="templates-description">
                다양한 공간 템플릿으로 빠르게 시작하세요
              </p>
            </div>
            <button className="btn-create-new" onClick={handleStartNew}>
              <span className="btn-icon">+</span>
              <span>새로 만들기</span>
            </button>
          </div>

          {/* 필터 & 검색 */}
          <div className="templates-toolbar">
            <div className="category-tabs">
              <button
                className={`category-tab ${category === 'all' ? 'active' : ''}`}
                onClick={() => setCategory('all')}
              >
                전체
              </button>
              <button
                className={`category-tab ${category === 'official' ? 'active' : ''}`}
                onClick={() => setCategory('official')}
              >
                기본 템플릿
              </button>
              <button
                className={`category-tab ${category === 'community' ? 'active' : ''}`}
                onClick={() => setCategory('community')}
                disabled={COMMUNITY_TEMPLATES.length === 0}
              >
                커뮤니티
                {COMMUNITY_TEMPLATES.length === 0 && (
                  <span className="coming-soon">Coming Soon</span>
                )}
              </button>
            </div>

            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="템플릿 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* 템플릿 그리드 */}
          {filteredTemplates.length > 0 ? (
            <div className="templates-grid">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="template-card"
                  onClick={() => handleTemplateClick(template)}
                >
                  <div className="template-thumbnail">
                    {template.thumbnail ? (
                      <img src={template.thumbnail} alt={template.name} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <span className="placeholder-icon">🏠</span>
                      </div>
                    )}
                    <div className="template-overlay">
                      <button className="btn-use-template">사용하기</button>
                    </div>
                  </div>
                  <div className="template-info">
                    <h3 className="template-name">{template.name}</h3>
                    <div className="template-meta">
                      <span className="template-author">
                        {template.type === 'official' ? (
                          <span className="official-badge">공식</span>
                        ) : (
                          template.author
                        )}
                      </span>
                      {template.type === 'community' && (
                        <span className="template-likes">❤️ {template.likes}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="templates-empty">
              <div className="empty-icon">📭</div>
              <p className="empty-message">
                {searchQuery
                  ? '검색 결과가 없습니다'
                  : '아직 템플릿이 없습니다'}
              </p>
            </div>
          )}

          {/* 커뮤니티 CTA (추후 기능) */}
          {category !== 'community' && (
            <div className="community-cta">
              <div className="cta-content">
                <h3>나만의 공간을 공유하세요</h3>
                <p>
                  작업한 씬을 커뮤니티에 공유하고 다른 사용자들과 영감을 나눠보세요.
                  <br />
                  <span className="cta-note">커뮤니티 기능은 곧 출시됩니다!</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TemplatesPage;
