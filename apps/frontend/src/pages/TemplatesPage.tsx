/**
 * TemplatesPage - 템플릿 갤러리
 *
 * 목적: 제공 템플릿에서 출발점 고르기
 * - 사용자가 카드를 선택하면 템플릿을 복사하여 workspace에 추가
 * - 복사된 Scene으로 시뮬레이터 이동
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { SCENE_TEMPLATES } from '../data/templates';
import { useSceneRepository } from '../stores/sceneRepository';
import { getAssetMetadata } from '../assets/AssetRegistry';
import {
  Button,
  SearchIcon,
  GridIcon,
  ListIcon,
  CubeIcon,
  LightbulbIcon,
  EmptyState,
  useToast,
} from '../components/common';
import './TemplatesPage.css';

type SortOption = 'name' | 'recent';
type ViewMode = 'grid' | 'list';

// 템플릿 데이터
const TEMPLATES = SCENE_TEMPLATES.map((scene) => ({
  ...scene,
  author: 'Intery',
}));

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: '이름순' },
  { value: 'recent', label: '최근 추가순' },
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
  const { toast } = useToast();
  const { createFromTemplate } = useSceneRepository();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isCreating, setIsCreating] = useState(false);

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
        case 'recent':
          // ID 역순 (최근 추가 가정)
          return String(b.id).localeCompare(String(a.id));
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'ko');
      }
    });

    return result;
  }, [searchQuery, sortBy]);

  const handleTemplateClick = useCallback(
    async (template: (typeof TEMPLATES)[0]) => {
      if (isCreating) return;

      setIsCreating(true);
      try {
        // 템플릿을 복사하여 workspace에 추가
        const newScene = await createFromTemplate(template);
        toast.success(`"${newScene.name}" 생성 완료`);

        // 새로 생성된 Scene으로 바로 시뮬레이터 이동
        navigate('/simulator', { state: { scene: newScene } });
      } catch (error) {
        console.error('Failed to create from template:', error);
        toast.error('템플릿 복사에 실패했습니다.');
      } finally {
        setIsCreating(false);
      }
    },
    [createFromTemplate, navigate, toast, isCreating]
  );

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
              <span className="templates__count">{TEMPLATES.length}개의 템플릿</span>
            </div>
            <p className="templates__desc">
              기본 제공 템플릿으로 빠르게 새 공간을 시작하세요.
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
                      className={`template-card ${isCreating ? 'is-disabled' : ''}`}
                      onClick={() => handleTemplateClick(template)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleTemplateClick(template)}
                    >
                      {/* Thumbnail */}
                      <div className="template-card__thumb">
                        <div className="template-card__thumb-placeholder">
                          <span className="template-card__thumb-icon">{roomIcon}</span>
                        </div>
                        <span className="template-card__badge">공식 템플릿</span>
                        <div className="template-card__overlay">
                          <button
                            className="template-card__use-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTemplateClick(template);
                            }}
                            disabled={isCreating}
                          >
                            {isCreating ? '생성 중...' : '이 템플릿으로 시작'}
                          </button>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="template-card__body">
                        <h3 className="template-card__title">{template.name}</h3>
                        <p className="template-card__description">
                          {template.description || '기본 제공 템플릿'}
                        </p>
                        <div className="template-card__meta">
                          <span className="template-card__stat">
                            <CubeIcon size={12} />
                            <span>가구 {furnitureCount}</span>
                          </span>
                          <span className="template-card__stat">
                            <LightbulbIcon size={12} />
                            <span>조명 {lightCount}</span>
                          </span>
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
                      className={`template-card template-card--list ${isCreating ? 'is-disabled' : ''}`}
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
                            <span>{furnitureCount}</span>
                          </span>
                          <span className="template-card__stat">
                            <LightbulbIcon size={12} />
                            <span>{lightCount}</span>
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        className="template-card__action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateClick(template);
                        }}
                        disabled={isCreating}
                      >
                        {isCreating ? '생성 중...' : '사용하기'}
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

            {/* Info Section - 템플릿 사용 방법 안내 */}
            {filteredTemplates.length > 0 && (
              <div className="templates__info">
                <div className="templates__info-icon">🎯</div>
                <div className="templates__info-content">
                  <h4 className="templates__info-title">템플릿 사용 방법</h4>
                  <p className="templates__info-text">
                    템플릿을 선택하면 복사본이 내 작업공간에 추가되고 편집 화면으로 이동합니다.
                    <br />
                    원본 템플릿은 변경되지 않으므로 자유롭게 수정하세요.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
