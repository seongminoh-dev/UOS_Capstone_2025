/**
 * WorkspaceView - Scene 관리 Workspace
 * - 최근 작업, 전체 Scene 목록
 * - 검색, 필터, 정렬, 뷰 모드 전환
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SceneCard from './SceneCard';
import type { SceneFrontend } from '../../graphics-core/service/Scene';
import { useSceneRepository } from '../../stores/sceneRepository';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../common';
import { isDummyScene } from '../../utils/sceneId';
import './WorkspaceView.css';

interface WorkspaceViewProps {
  onSelectScene: (scene: SceneFrontend) => void;
}

type SortOption = 'recent' | 'name' | 'created';
type FilterOption = 'all' | 'templates' | 'my-scenes';
type ViewMode = 'grid' | 'list';

export default function WorkspaceView({ onSelectScene }: WorkspaceViewProps) {
  const navigate = useNavigate();
  const { scenes, loadScenes, deleteScene } = useSceneRepository();
  const { isGuest } = useAuthStore();
  const { toast } = useToast();

  // UI 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // 삭제 모달 상태
  const [deletingSceneId, setDeletingSceneId] = useState<string | number | null>(null);

  // 숨긴 Dummy Scene (세션 내에서만 유지)
  const [hiddenDummyIds, setHiddenDummyIds] = useState<Set<string | number>>(new Set());

  // Scene 목록 로드
  useEffect(() => {
    loadScenes();
  }, [loadScenes]);

  // 최근 작업: 내 Scene만 (템플릿 제외), 최근 수정 기준 상위 3개
  // Scene이 5개 이상일 때만 표시 (적으면 전체 목록으로 충분)
  const recentScenes = useMemo(() => {
    const myScenes = scenes.filter(
      (s) => !hiddenDummyIds.has(s.id) && !isDummyScene(s.id) && (s.updatedAt || s.createdAt)
    );

    // 내 Scene이 없거나 전체 Scene이 5개 미만이면 최근 작업 섹션 숨김
    if (myScenes.length === 0 || scenes.length < 5) {
      return [];
    }

    return [...myScenes]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3);
  }, [scenes, hiddenDummyIds]);

  // 필터링된 Scene 목록
  const filteredScenes = useMemo(() => {
    let result = scenes.filter((s) => !hiddenDummyIds.has(s.id));

    // 검색 필터 (이름, 설명, 방 이름으로 검색)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.room?.meshName?.toLowerCase().includes(query)
      );
    }

    // 카테고리 필터
    if (filterBy === 'templates') {
      result = result.filter((s) => isDummyScene(s.id));
    } else if (filterBy === 'my-scenes') {
      result = result.filter((s) => !isDummyScene(s.id));
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'ko');
        case 'created':
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
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

  // 삭제 핸들러
  const handleDeleteRequest = (sceneId: string | number) => {
    setDeletingSceneId(sceneId);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSceneId) return;

    try {
      if (isDummyScene(deletingSceneId)) {
        // Dummy Scene은 숨김 처리
        setHiddenDummyIds((prev) => new Set(prev).add(deletingSceneId));
      } else {
        await deleteScene(deletingSceneId);
      }
    } catch (error) {
      console.error('Failed to delete scene:', error);
      toast.error('Scene 삭제에 실패했습니다.');
    }
    setDeletingSceneId(null);
  };

  const handleCancelDelete = () => {
    setDeletingSceneId(null);
  };

  // 새 Scene 만들기
  const handleCreateNew = () => {
    navigate('/edit', { state: { createNew: true } });
  };

  return (
    <div className="workspace-view">
      {/* Header */}
      <div className="workspace-header">
        <div className="workspace-title-section">
          <h1 className="workspace-title">내 작업공간</h1>
          <p className="workspace-subtitle">
            {isGuest
              ? '게스트 모드 - 로그인하면 클라우드에 저장됩니다'
              : '공간을 선택하거나 새로 만들어 시작하세요'}
          </p>
        </div>
        <button className="create-scene-btn" onClick={handleCreateNew}>
          <span className="btn-icon">+</span>
          <span>새 공간</span>
        </button>
      </div>

      {/* 최근 작업 섹션 */}
      {recentScenes.length > 0 && !searchQuery && filterBy === 'all' && (
        <section className="workspace-section">
          <h2 className="section-title">최근 작업</h2>
          <div className="recent-scenes-grid">
            {recentScenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                viewMode="grid"
                onClick={() => onSelectScene(scene)}
                onDelete={() => handleDeleteRequest(scene.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 전체 공간 섹션 */}
      <section className="workspace-section workspace-section-full">
        <div className="section-header">
          <h2 className="section-title">
            {filterBy === 'templates'
              ? '기본 템플릿'
              : filterBy === 'my-scenes'
              ? '내 공간'
              : '전체 공간'}
            <span className="scene-count">{filteredScenes.length}</span>
          </h2>

          {/* 컨트롤 바 */}
          <div className="workspace-controls">
            {/* 검색 */}
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* 필터 */}
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="control-select"
            >
              <option value="all">전체</option>
              <option value="templates">기본 템플릿</option>
              <option value="my-scenes">내 공간</option>
            </select>

            {/* 정렬 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="control-select"
            >
              <option value="recent">최근 수정순</option>
              <option value="created">생성일순</option>
              <option value="name">이름순</option>
            </select>

            {/* 뷰 모드 토글 */}
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="그리드 보기"
              >
                ▦
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="리스트 보기"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Scene 목록 */}
        {filteredScenes.length > 0 ? (
          <div className={`scenes-container ${viewMode}`}>
            {filteredScenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                viewMode={viewMode}
                onClick={() => onSelectScene(scene)}
                onDelete={() => handleDeleteRequest(scene.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-scenes">
            <div className="empty-icon">🔍</div>
            <p className="empty-text">
              {searchQuery
                ? `"${searchQuery}"에 대한 검색 결과가 없습니다`
                : '표시할 Scene이 없습니다'}
            </p>
            {!searchQuery && filterBy === 'my-scenes' && (
              <button className="empty-action-btn" onClick={handleCreateNew}>
                첫 Scene 만들기
              </button>
            )}
          </div>
        )}
      </section>

      {/* 삭제 확인 모달 */}
      {deletingSceneId && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Scene 삭제</h2>
              <button className="modal-close" onClick={handleCancelDelete}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                이 Scene을 삭제하시겠습니까?
                <br />
                <span className="warning-text">이 작업은 되돌릴 수 없습니다.</span>
              </p>
            </div>
            <div className="modal-actions">
              <button className="modal-button modal-cancel" onClick={handleCancelDelete}>
                취소
              </button>
              <button
                className="modal-button modal-delete"
                onClick={handleConfirmDelete}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
