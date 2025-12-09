/**
 * SceneRepository (Zustand Store)
 * - Scene 데이터의 단일 진실 공급원(SSOT)
 * - Local/Server Scene 통합 관리
 * - 편집 시 깊은 복사본 제공 (cloneForEdit)
 *
 * Note: 템플릿은 workspace에 포함되지 않음.
 * 템플릿 사용 시 복사하여 새 Scene으로 저장됨.
 */

import { create } from 'zustand';
import * as sceneApi from '../api/scene.api';
import {
  isTemplateScene,
  isLocalScene,
  isServerScene,
  isNewScene,
  generateLocalId,
  type SceneId,
} from '../utils/sceneId';
import { useAuthStore } from './authStore';
import type { SceneFrontend } from '../graphics-core/service/Scene';

// SceneRepository 인터페이스
interface SceneRepository {
  scenes: SceneFrontend[];
  isLoading: boolean;
  error: string | null;

  getScenes(): SceneFrontend[];
  getSceneById(id: SceneId): SceneFrontend | null;
  cloneForEdit(id: SceneId): SceneFrontend;
  saveScene(scene: SceneFrontend): Promise<SceneFrontend>;
  deleteScene(id: SceneId): Promise<void>;
  loadScenes(): Promise<void>;
  syncLocalToServer(): Promise<void>;
  createFromTemplate(template: SceneFrontend): Promise<SceneFrontend>;
}

export type { SceneId };

const LOCAL_STORAGE_KEY = 'local_scenes';

/**
 * Scene 데이터가 유효한 SceneFrontend 형식인지 검증
 */
function isValidSceneFrontend(scene: unknown): scene is SceneFrontend {
  if (!scene || typeof scene !== 'object') return false;

  const s = scene as Record<string, unknown>;

  // 필수 필드 검증
  if (!s.id || !s.name || !Array.isArray(s.assets)) return false;

  // SceneFrontend 필수 필드 검증
  if (!s.room || typeof s.room !== 'object') return false;
  if (!s.sunSettings || typeof s.sunSettings !== 'object') return false;

  // room 필수 필드 검증
  const room = s.room as Record<string, unknown>;
  if (!room.meshName || !room.transform) return false;

  // sunSettings 필수 필드 검증
  const sun = s.sunSettings as Record<string, unknown>;
  if (typeof sun.timeOfDay !== 'number' || typeof sun.isDaytime !== 'boolean') return false;

  return true;
}

/**
 * localStorage에서 LocalScenes 로드
 * - 유효하지 않은 Scene은 필터링하여 제외
 * - 손상된 데이터 발견 시 정리
 */
function loadLocalScenes(): SceneFrontend[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        console.warn('Invalid local_scenes format, clearing...');
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return [];
      }

      // 유효한 Scene만 필터링
      const validScenes = parsed.filter((scene): scene is SceneFrontend => {
        const isValid = isValidSceneFrontend(scene);
        if (!isValid) {
          console.warn('Invalid scene detected and filtered:', scene?.id || 'unknown');
        }
        return isValid;
      });

      // 필터링된 Scene이 있으면 localStorage 업데이트
      if (validScenes.length !== parsed.length) {
        console.log(`Cleaned ${parsed.length - validScenes.length} invalid scenes from localStorage`);
        if (validScenes.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validScenes));
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }

      return validScenes;
    }
  } catch (error) {
    console.error('Failed to load local scenes, clearing corrupted data:', error);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  return [];
}

/**
 * localStorage에 LocalScenes 저장
 */
function saveLocalScenes(scenes: SceneFrontend[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scenes));
  } catch (error) {
    console.error('Failed to save local scenes:', error);
  }
}

export const useSceneRepository = create<SceneRepository>((set, get) => ({
  scenes: [],
  isLoading: false,
  error: null,

  /**
   * 전체 Scene 목록 반환
   */
  getScenes: () => get().scenes,

  /**
   * ID로 Scene 조회
   */
  getSceneById: (id: SceneId) => {
    return get().scenes.find((s) => s.id === id) || null;
  },

  /**
   * 편집용 깊은 복사본 생성
   * - Repository의 원본에 영향 없이 편집 가능
   */
  cloneForEdit: (id: SceneId) => {
    const scene = get().getSceneById(id);
    if (!scene) {
      throw new Error(`Scene not found: ${id}`);
    }
    // 깊은 복사
    return JSON.parse(JSON.stringify(scene));
  },

  /**
   * 템플릿에서 새 Scene 생성
   * - 템플릿을 복사하여 workspace에 추가
   * - 새 ID 생성 (local_ 또는 server)
   */
  createFromTemplate: async (template: SceneFrontend) => {
    const authStore = useAuthStore.getState();
    const isLoggedIn = !authStore.isGuest && authStore.user !== null;
    const now = new Date().toISOString();

    if (isLoggedIn) {
      // 회원: ServerScene 생성
      const username = authStore.user!.username;
      const newScene: SceneFrontend = {
        ...JSON.parse(JSON.stringify(template)),
        id: 0, // 서버가 할당
        name: `${template.name} (복사본)`,
        username,
        createdAt: now,
        updatedAt: now,
      };
      const created = await sceneApi.createScene(newScene, username);

      // 백엔드 응답에 timestamp가 없으면 현재 시간으로 설정
      const createdWithTimestamp: SceneFrontend = {
        ...created,
        createdAt: created.createdAt || now,
        updatedAt: created.updatedAt || now,
      };

      set((state) => ({
        scenes: [...state.scenes, createdWithTimestamp],
      }));
      return createdWithTimestamp;
    } else {
      // 비회원: LocalScene 생성
      const newId = generateLocalId();
      const newScene: SceneFrontend = {
        ...JSON.parse(JSON.stringify(template)),
        id: newId,
        name: `${template.name} (복사본)`,
        createdAt: now,
        updatedAt: now,
      };

      const localScenes = get().scenes.filter((s) => isLocalScene(s.id));
      const updatedLocals = [...localScenes, newScene];
      saveLocalScenes(updatedLocals);

      set({ scenes: updatedLocals });
      return newScene;
    }
  },

  /**
   * Scene 저장
   * - TemplateScene 수정 시 → 새 Scene 생성 (ID 변경)
   * - NewScene (new_* prefix) → 새 Scene 생성
   * - LocalScene → localStorage 저장
   * - ServerScene → API 호출
   */
  saveScene: async (scene: SceneFrontend) => {
    const authStore = useAuthStore.getState();
    const isLoggedIn = !authStore.isGuest && authStore.user !== null;

    // TemplateScene 또는 NewScene 수정 시 새 Scene으로 분기
    if (isTemplateScene(scene.id) || isNewScene(scene.id)) {
      if (isLoggedIn) {
        // 회원: 새 ServerScene 생성
        const username = authStore.user!.username;
        const now = new Date().toISOString();
        const newScene: SceneFrontend = {
          ...scene,
          id: 0, // 서버가 할당
          username,
          createdAt: now,
          updatedAt: now,
        };
        const created = await sceneApi.createScene(newScene, username);

        // 백엔드 응답에 updatedAt이 없으면 현재 시간으로 설정
        const createdWithTimestamp: SceneFrontend = {
          ...created,
          createdAt: created.createdAt || now,
          updatedAt: created.updatedAt || now,
        };

        set((state) => ({
          scenes: [...state.scenes, createdWithTimestamp],
        }));
        return createdWithTimestamp;
      } else {
        // 비회원: 새 LocalScene 생성
        const newId = generateLocalId();
        const newScene: SceneFrontend = {
          ...scene,
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const localScenes = get().scenes.filter((s) => isLocalScene(s.id));
        const updatedLocals = [...localScenes, newScene];
        saveLocalScenes(updatedLocals);

        set({ scenes: updatedLocals });
        return newScene;
      }
    }

    // ServerScene 업데이트
    if (isServerScene(scene.id)) {
      const username = authStore.user!.username;
      const now = new Date().toISOString();
      const updated = await sceneApi.updateScene(scene.id as number, scene, username);

      // 백엔드 응답에 updatedAt이 없으면 현재 시간으로 설정
      const updatedWithTimestamp: SceneFrontend = {
        ...updated,
        updatedAt: updated.updatedAt || now,
      };

      set((state) => ({
        scenes: state.scenes.map((s) => (s.id === updatedWithTimestamp.id ? updatedWithTimestamp : s)),
      }));
      return updatedWithTimestamp;
    }

    // LocalScene 업데이트
    if (isLocalScene(scene.id)) {
      const updatedScene: SceneFrontend = {
        ...scene,
        updatedAt: new Date().toISOString(),
      };

      const localScenes = get().scenes.filter((s) => isLocalScene(s.id));
      const updatedLocals = localScenes.map((s) =>
        s.id === scene.id ? updatedScene : s
      );
      saveLocalScenes(updatedLocals);

      set({ scenes: updatedLocals });
      return updatedScene;
    }

    throw new Error(`Unknown scene type: ${scene.id}`);
  },

  /**
   * Scene 삭제
   * - TemplateScene은 삭제 불가
   */
  deleteScene: async (id: SceneId) => {
    if (isTemplateScene(id)) {
      throw new Error('템플릿은 삭제할 수 없습니다');
    }

    const authStore = useAuthStore.getState();

    if (isServerScene(id)) {
      const username = authStore.user!.username;
      await sceneApi.deleteScene(id as number, username);
    } else if (isLocalScene(id)) {
      const localScenes = get()
        .scenes.filter((s) => isLocalScene(s.id))
        .filter((s) => s.id !== id);
      saveLocalScenes(localScenes);
    }

    set((state) => ({
      scenes: state.scenes.filter((s) => s.id !== id),
    }));
  },

  /**
   * Scene 목록 로드
   * - 회원: ServerScenes (API)
   * - 비회원: LocalScenes (localStorage)
   * - 템플릿은 포함하지 않음
   */
  loadScenes: async () => {
    set({ isLoading: true, error: null });

    try {
      const authStore = useAuthStore.getState();
      const isLoggedIn = !authStore.isGuest && authStore.user !== null;

      let allScenes: SceneFrontend[] = [];

      if (isLoggedIn) {
        // 회원: 서버에서 Scene 로드
        const username = authStore.user!.username;
        const serverScenes = await sceneApi.getScenesByUsername(username);
        allScenes = serverScenes;
      } else {
        // 비회원: localStorage에서 Scene 로드
        const localScenes = loadLocalScenes();
        allScenes = localScenes;
      }

      set({ scenes: allScenes, isLoading: false });
    } catch (error) {
      console.error('Failed to load scenes:', error);
      set({
        error: (error as Error).message,
        isLoading: false,
        scenes: [], // 에러 시 빈 배열
      });
    }
  },

  /**
   * LocalScenes → Server 동기화
   * - 로그인 시 호출
   * - LocalScenes를 Server에 업로드하고 localStorage 비움
   */
  syncLocalToServer: async () => {
    const authStore = useAuthStore.getState();
    if (authStore.isGuest || !authStore.user) {
      return; // 비회원은 동기화 불가
    }

    const localScenes = get().scenes.filter((s) => isLocalScene(s.id));
    if (localScenes.length === 0) {
      return;
    }

    const username = authStore.user.username;
    const uploaded: SceneFrontend[] = [];

    for (const scene of localScenes) {
      try {
        const newScene: SceneFrontend = {
          ...scene,
          id: 0, // 서버가 새 ID 할당
          username,
        };
        const created = await sceneApi.createScene(newScene, username);
        uploaded.push(created);
      } catch (error) {
        console.error(`Failed to sync scene: ${scene.name}`, error);
      }
    }

    // localStorage 비우기
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    // store 업데이트: local scenes 제거, server scenes 추가
    set((state) => ({
      scenes: [...state.scenes.filter((s) => !isLocalScene(s.id)), ...uploaded],
    }));

    // 동기화 결과 로그
    if (uploaded.length > 0) {
      console.log(`${uploaded.length}개의 Scene이 계정에 동기화되었습니다`);
    }
  },
}));
