/**
 * WorkspaceView - Scene 관리 Workspace
 *
 * Wireframe Structure:
 * - MainWrapper: maxWidth=1200, paddingX=24, paddingTop=28
 * - TopSection: Title + Badge + Description
 * - ControlSection: Search | RightControls(Filter, Sort, ViewToggle, CreateBtn)
 * - Grid: 4 columns, gapX=20, gapY=24
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SceneCard from './SceneCard';
import type { SceneFrontend } from '../../graphics-core/service/Scene';
import { useSceneRepository } from '../../stores/sceneRepository';
import { useAuthStore } from '../../stores/authStore';
import {
  useToast,
  Button,
  ConfirmModal,
  EmptyState,
  SearchIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
} from '../common';
import { isDummyScene } from '../../utils/sceneId';
import './WorkspaceView.css';

interface WorkspaceViewProps {
  onSelectScene: (scene: SceneFrontend) => void;
}

type SortOption = 'recent' | 'name' | 'created';
type FilterOption = 'all' | 'templates' | 'my-scenes';
type ViewMode = 'grid' | 'list';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: '최근 수정순' },
  { value: 'created', label: '생성일순' },
  { value: 'name', label: '이름순' },
];

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'templates', label: '템플릿' },
  { value: 'my-scenes', label: '내 공간' },
];

const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export default function WorkspaceView({ onSelectScene }: WorkspaceViewProps) {
  const navigate = useNavigate();
  const { scenes, isLoading, loadScenes, deleteScene } = useSceneRepository();
  const { isGuest } = useAuthStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [deletingScene, setDeletingScene] = useState<SceneFrontend | null>(null);
  const [hiddenDummyIds, setHiddenDummyIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  const filteredScenes = useMemo(() => {
    let result = scenes.filter((s) => !hiddenDummyIds.has(s.id));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.room?.meshName?.toLowerCase().includes(query)
      );
    }

    if (filterBy === 'templates') {
      result = result.filter((s) => isDummyScene(s.id));
    } else if (filterBy === 'my-scenes') {
      result = result.filter((s) => !isDummyScene(s.id));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ko');
        case 'created':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'recent':
        default:
          return (
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
          );
      }
    });

    return result;
  }, [scenes, searchQuery, filterBy, sortBy, hiddenDummyIds]);

  const recentlyModifiedIds = useMemo(() => {
    const now = Date.now();
    const ids = new Set<string | number>();
    scenes.forEach((s) => {
      const updatedAt = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
      if (now - updatedAt < RECENT_THRESHOLD_MS) {
        ids.add(s.id);
      }
    });
    return ids;
  }, [scenes]);

  const handleDeleteRequest = useCallback((scene: SceneFrontend) => {
    setDeletingScene(scene);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingScene) return;
    try {
      if (isDummyScene(deletingScene.id)) {
        setHiddenDummyIds((prev) => new Set(prev).add(deletingScene.id));
      } else {
        await deleteScene(deletingScene.id);
      }
      toast.success('삭제되었습니다.');
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
    setDeletingScene(null);
  }, [deletingScene, deleteScene, toast]);

  const handleCancelDelete = useCallback(() => {
    setDeletingScene(null);
  }, []);

  const handleCreateNew = useCallback(() => {
    navigate('/edit', { state: { createNew: true } });
  }, [navigate]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterBy('all');
    setSortBy('recent');
  }, []);

  return (
    <div className="workspace">
      <div className="workspace__inner">
        {/* ========================================
            TopSection
            ======================================== */}
        <section className="workspace__top">
          <div className="workspace__title-row">
            <h1 className="workspace__title">내 작업공간</h1>
            {isGuest && <span className="workspace__badge">게스트</span>}
          </div>
          <p className="workspace__desc">
            공간을 선택하거나 새로 만들어 시작하세요
          </p>
        </section>

        {/* ========================================
            ControlSection
            ======================================== */}
        <section className="workspace__controls">
          {/* SearchInput */}
          <div className="workspace__search">
            <SearchIcon size={16} className="workspace__search-icon" />
            <input
              type="text"
              placeholder="이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="workspace__search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="workspace__search-clear"
                onClick={handleClearSearch}
              >
                ×
              </button>
            )}
          </div>

          {/* RightControls */}
          <div className="workspace__right-controls">
            {/* SelectFilter */}
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="workspace__select"
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* SortFilter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="workspace__select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* ViewToggle */}
            <div className="workspace__view-toggle">
              <button
                type="button"
                className={`workspace__view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="그리드 보기"
              >
                <GridIcon size={16} />
              </button>
              <button
                type="button"
                className={`workspace__view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
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

        {/* ========================================
            Grid / List Content (Scrollable)
            ======================================== */}
        <div className="workspace__content">
          {/* Loading */}
          {isLoading && scenes.length === 0 && (
            <div className="workspace__loading">
              <div className="workspace__spinner" />
              <span className="workspace__loading-text">불러오는 중...</span>
            </div>
          )}

          {/* Grid View */}
          {!isLoading && filteredScenes.length > 0 && viewMode === 'grid' && (
            <div className="workspace__grid">
              {filteredScenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  viewMode="grid"
                  onClick={() => onSelectScene(scene)}
                  onDelete={() => handleDeleteRequest(scene)}
                  isRecentlyModified={recentlyModifiedIds.has(scene.id)}
                />
              ))}
              {/* AddNewCard (dashed) - 3개 이하일 때만 표시 */}
              {filteredScenes.length < 4 && (
                <div
                  className="workspace__add-card"
                  onClick={handleCreateNew}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                >
                  <div className="workspace__add-icon">
                    <PlusIcon size={24} />
                  </div>
                  <span className="workspace__add-label">새 공간 만들기</span>
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {!isLoading && filteredScenes.length > 0 && viewMode === 'list' && (
            <div className="workspace__list">
              {filteredScenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  viewMode="list"
                  onClick={() => onSelectScene(scene)}
                  onDelete={() => handleDeleteRequest(scene)}
                  isRecentlyModified={recentlyModifiedIds.has(scene.id)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredScenes.length === 0 && (
            <EmptyState
              icon={searchQuery ? '🔍' : '📁'}
              title={searchQuery ? '검색 결과 없음' : '공간이 없습니다'}
              message={
                searchQuery
                  ? `"${searchQuery}"에 대한 결과가 없습니다.`
                  : '새 공간을 만들어 시작하세요.'
              }
              action={
                <div className="workspace__empty-actions">
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                      초기화
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<PlusIcon size={16} />}
                    onClick={handleCreateNew}
                  >
                    새로 만들기
                  </Button>
                </div>
              }
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingScene}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="삭제"
        message={
          <>
            <strong>"{deletingScene?.name}"</strong>을(를) 삭제할까요?
            <br />
            <span style={{ color: 'var(--color-error)', fontSize: '13px' }}>
              이 작업은 되돌릴 수 없습니다.
            </span>
          </>
        }
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
}
