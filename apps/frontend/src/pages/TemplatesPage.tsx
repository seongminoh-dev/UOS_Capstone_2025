/**
 * TemplatesPage - 템플릿 갤러리
 *
 * WorkspaceView와 동일한 레이아웃 구조:
 * - Header (글로벌 네비게이션)
 * - TopSection: Title + Description
 * - ControlSection: Search | RightControls(Sort, ViewToggle, CreateBtn)
 * - Grid: 4 columns, gapX=20, gapY=24
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { DUMMY_SCENES } from '../graphics-core/data/DummyScenes';
import { getAssetMetadata } from '../assets/AssetRegistry';
import {
  Button,
  SearchIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
  CubeIcon,
  LightbulbIcon,
  EmptyState,
} from '../components/common';
import './TemplatesPage.css';

type SortOption = 'name' | 'assets';
type ViewMode = 'grid' | 'list';

// 템플릿 데이터 (DUMMY_SCENES 기반)
const TEMPLATES = DUMMY_SCENES.map((scene) => ({
  ...scene,
  author: 'Intery',
}));

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: '이름순' },
  { value: 'assets', label: '오브젝트순' },
];

/**
 * Get room icon
 */
function getRoomIcon(meshName?: string): string {
  const roomMeta = getAssetMetadata(meshName || '');
  return roomMeta?.icon || '🏠';
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredTemplates = useMemo(() => {
    let result = [...TEMPLATES];

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.room?.meshName?.toLowerCase().includes(query)
      );
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'assets':
          return b.assets.length - a.assets.length;
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'ko');
      }
    });

    return result;
  }, [searchQuery, sortBy]);

  const handleTemplateClick = useCallback(
    (template: (typeof TEMPLATES)[0]) => {
      navigate('/simulator', { state: { templateId: template.id } });
    },
    [navigate]
  );

  const handleCreateNew = useCallback(() => {
    navigate('/edit', { state: { createNew: true } });
  }, [navigate]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <div className="templates-page">
      <Header />

      <main className="templates">
        <div className="templates__inner">
          {/* TopSection */}
          <section className="templates__top">
            <div className="templates__title-row">
              <h1 className="templates__title">템플릿 갤러리</h1>
              <span className="templates__count">{TEMPLATES.length}개</span>
            </div>
            <p className="templates__desc">
              기본 제공 템플릿으로 빠르게 시작하세요
            </p>
          </section>

          {/* ControlSection */}
          <section className="templates__controls">
            {/* SearchInput */}
            <div className="templates__search">
              <SearchIcon size={16} className="templates__search-icon" />
              <input
                type="text"
                placeholder="템플릿 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="templates__search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="templates__search-clear"
                  onClick={handleClearSearch}
                >
                  ×
                </button>
              )}
            </div>

            {/* RightControls */}
            <div className="templates__right-controls">
              {/* SortFilter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="templates__select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* ViewToggle */}
              <div className="templates__view-toggle">
                <button
                  type="button"
                  className={`templates__view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="그리드 보기"
                >
                  <GridIcon size={16} />
                </button>
                <button
                  type="button"
                  className={`templates__view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="리스트 보기"
                >
                  <ListIcon size={16} />
                </button>
              </div>

              {/* CreateButton */}
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusIcon size={16} />}
                onClick={handleCreateNew}
              >
                새로 만들기
              </Button>
            </div>
          </section>

          {/* Grid / List Content */}
          <section className="templates__content">
            {/* Grid View */}
            {filteredTemplates.length > 0 && viewMode === 'grid' && (
              <div className="templates__grid">
                {filteredTemplates.map((template) => {
                  const roomIcon = getRoomIcon(template.room?.meshName);
                  const furnitureCount = template.assets.filter(
                    (a) => a.type === 'object'
                  ).length;
                  const lightCount = template.assets.filter((a) =>
                    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
                  ).length;

                  return (
                    <article
                      key={template.id}
                      className="template-card"
                      onClick={() => handleTemplateClick(template)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleTemplateClick(template)}
                    >
                      {/* Thumbnail */}
                      <div className="template-card__thumb">
                        <div className="template-card__thumb-placeholder">
                          <span className="template-card__thumb-icon">{roomIcon}</span>
                        </div>
                        <span className="template-card__badge">공식</span>
                        <div className="template-card__overlay">
                          <span className="template-card__use">사용하기</span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="template-card__body">
                        <h3 className="template-card__title">{template.name}</h3>
                        <div className="template-card__meta">
                          <span className="template-card__stat">
                            <CubeIcon size={12} />
                            {furnitureCount}
                          </span>
                          <span className="template-card__stat">
                            <LightbulbIcon size={12} />
                            {lightCount}
                          </span>
                          <span className="template-card__author">{template.author}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {filteredTemplates.length > 0 && viewMode === 'list' && (
              <div className="templates__list">
                {filteredTemplates.map((template) => {
                  const roomIcon = getRoomIcon(template.room?.meshName);
                  const furnitureCount = template.assets.filter(
                    (a) => a.type === 'object'
                  ).length;
                  const lightCount = template.assets.filter((a) =>
                    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
                  ).length;

                  return (
                    <article
                      key={template.id}
                      className="template-card template-card--list"
                      onClick={() => handleTemplateClick(template)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleTemplateClick(template)}
                    >
                      {/* Thumbnail */}
                      <div className="template-card__thumb template-card__thumb--sm">
                        <span className="template-card__thumb-icon">{roomIcon}</span>
                      </div>

                      {/* Body */}
                      <div className="template-card__body">
                        <div className="template-card__title-row">
                          <h3 className="template-card__title">{template.name}</h3>
                          <span className="template-card__label">공식</span>
                        </div>
                        <div className="template-card__meta">
                          <span className="template-card__stat">
                            <CubeIcon size={12} />
                            {furnitureCount}
                          </span>
                          <span className="template-card__stat">
                            <LightbulbIcon size={12} />
                            {lightCount}
                          </span>
                          <span className="template-card__author">{template.author}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        className="template-card__action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateClick(template);
                        }}
                      >
                        사용
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
              <EmptyState
                icon="🔍"
                title="검색 결과 없음"
                message={`"${searchQuery}"에 대한 템플릿이 없습니다.`}
                action={
                  <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                    검색 초기화
                  </Button>
                }
              />
            )}

            {/* Info Section */}
            <div className="templates__info">
              <p className="templates__info-text">
                템플릿을 선택하면 해당 공간으로 시뮬레이터가 열립니다.
                <br />
                원하는 대로 수정한 후 저장하면 내 공간으로 복사됩니다.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
