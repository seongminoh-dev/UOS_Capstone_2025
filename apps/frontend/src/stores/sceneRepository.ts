/**
 * SceneRepository (Zustand Store)
 * - Scene 데이터의 단일 진실 공급원(SSOT)
 * - Dummy/Local/Server Scene 통합 관리
 * - 편집 시 깊은 복사본 제공 (cloneForEdit)
 */

import { create } from 'zustand';
import { DUMMY_SCENES } from '../graphics-core/data/DummyScenes';
import * as sceneApi from '../api/scene.api';
import {
  isDummyScene,
  isLocalScene,
  isServerScene,
  generateLocalId,
  type SceneId,
} from '../utils/sceneId';
import { useAuthStore } from './authStore';
import type { SceneFrontend } from '../graphics-core/service/Scene';

// SceneRepository 인터페이스 (store 내부 정의)
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
}

export type { SceneId };

const LOCAL_STORAGE_KEY = 'local_scenes';

/**
 * localStorage에서 LocalScenes 로드
 */
function loadLocalScenes(): SceneFrontend[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as SceneFrontend[];
    }
  } catch (error) {
    console.error('Failed to load local scenes:', error);
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
   * Scene 저장
   * - DummyScene 수정 시 → 새 Scene 생성 (ID 변경)
   * - LocalScene → localStorage 저장
   * - ServerScene → API 호출
   */
  saveScene: async (scene: SceneFrontend) => {
    const authStore = useAuthStore.getState();
    const isLoggedIn = !authStore.isGuest && authStore.user !== null;

    // DummyScene 수정 시 새 Scene으로 분기
    if (isDummyScene(scene.id)) {
      if (isLoggedIn) {
        // 회원: 새 ServerScene 생성
        const username = authStore.user!.username;
        const newScene: SceneFrontend = {
          ...scene,
          id: 0, // 서버가 할당
          username,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const created = await sceneApi.createScene(newScene, username);
        set((state) => ({
          scenes: [...state.scenes, created],
        }));
        return created;
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

        set((state) => ({
          scenes: [...DUMMY_SCENES, ...updatedLocals],
        }));
        return newScene;
      }
    }

    // ServerScene 업데이트
    if (isServerScene(scene.id)) {
      const username = authStore.user!.username;
      const updated = await sceneApi.updateScene(scene.id as number, scene, username);
      set((state) => ({
        scenes: state.scenes.map((s) => (s.id === updated.id ? updated : s)),
      }));
      return updated;
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

      set((state) => ({
        scenes: [...DUMMY_SCENES, ...updatedLocals],
      }));
      return updatedScene;
    }

    throw new Error(`Unknown scene type: ${scene.id}`);
  },

  /**
   * Scene 삭제
   * - DummyScene은 삭제 불가
   */
  deleteScene: async (id: SceneId) => {
    if (isDummyScene(id)) {
      throw new Error('DummyScene은 삭제할 수 없습니다');
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
   * - DummyScenes는 항상 포함
   * - 회원: ServerScenes (API)
   * - 비회원: LocalScenes (localStorage)
   */
  loadScenes: async () => {
    set({ isLoading: true, error: null });

    try {
      const authStore = useAuthStore.getState();
      const isLoggedIn = !authStore.isGuest && authStore.user !== null;

      // DummyScenes는 항상 포함
      let allScenes: SceneFrontend[] = [...DUMMY_SCENES];

      if (isLoggedIn) {
        // 회원: 서버에서 Scene 로드
        const username = authStore.user!.username;
        const serverScenes = await sceneApi.getScenesByUsername(username);
        allScenes = [...allScenes, ...serverScenes];
      } else {
        // 비회원: localStorage에서 Scene 로드
        const localScenes = loadLocalScenes();
        allScenes = [...allScenes, ...localScenes];
      }

      set({ scenes: allScenes, isLoading: false });
    } catch (error) {
      console.error('Failed to load scenes:', error);
      set({
        error: (error as Error).message,
        isLoading: false,
        scenes: [...DUMMY_SCENES], // 에러 시 최소한 DummyScenes는 표시
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

    // 동기화 결과 반환 (토스트 알림용)
    if (uploaded.length > 0) {
      console.log(`${uploaded.length}개의 Scene이 계정에 동기화되었습니다`);
    }
  },
}));
