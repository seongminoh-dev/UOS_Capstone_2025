/**
 * Scene Store (Zustand)
 * - 게스트 모드: 메모리 내 Scene 관리 (새로고침 시 소실)
 * - 회원 모드: 서버 API와 동기화
 */

import { create } from 'zustand';
import type { Scene } from '../graphics-core/service/Scene';
import * as sceneApi from '../lib/api/scene.api';
import { useAuthStore } from './authStore';

interface SceneState {
  // 상태
  scenes: Scene[]; // 현재 사용 가능한 Scene 목록
  isLoading: boolean;
  error: string | null;

  // 게스트 모드용 메모리 저장소
  guestScenes: Scene[];
  guestNextId: number;

  // Actions
  loadScenes: () => Promise<void>; // Scene 목록 로드 (게스트: 메모리, 회원: API)
  createScene: (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt' | 'username'>) => Promise<Scene>;
  updateScene: (scene: Scene) => Promise<Scene>;
  deleteScene: (sceneId: number | string) => Promise<void>;
  getSceneById: (sceneId: number | string) => Scene | null;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  // 초기 상태
  scenes: [],
  isLoading: false,
  error: null,
  guestScenes: [],
  guestNextId: 1,

  // Scene 목록 로드
  loadScenes: async () => {
    set({ isLoading: true, error: null });

    try {
      const authStore = useAuthStore.getState();

      if (authStore.isGuest || !authStore.user) {
        // 게스트 모드: 메모리에서 로드
        const { guestScenes } = get();
        set({ scenes: guestScenes, isLoading: false });
      } else {
        // 회원 모드: API에서 로드
        const username = authStore.user.username;
        const scenes = await sceneApi.getScenesByUsername(username);
        set({ scenes, isLoading: false });
      }
    } catch (error: any) {
      console.error('Failed to load scenes:', error);
      set({ error: error.message || 'Failed to load scenes', isLoading: false });
    }
  },

  // Scene 생성
  createScene: async (sceneData) => {
    set({ isLoading: true, error: null });

    try {
      const authStore = useAuthStore.getState();

      if (authStore.isGuest || !authStore.user) {
        // 게스트 모드: 메모리에 저장
        const { guestScenes, guestNextId } = get();
        const newScene: Scene = {
          ...sceneData,
          id: guestNextId,
          username: 'guest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedGuestScenes = [...guestScenes, newScene];
        set({
          guestScenes: updatedGuestScenes,
          scenes: updatedGuestScenes,
          guestNextId: guestNextId + 1,
          isLoading: false,
        });

        return newScene;
      } else {
        // 회원 모드: API로 저장
        const username = authStore.user.username;
        const sceneToCreate: Scene = {
          ...sceneData,
          id: 0, // 서버가 할당
          username,
          createdAt: '',
          updatedAt: '',
        };

        const createdScene = await sceneApi.createScene(sceneToCreate, username);
        const { scenes } = get();
        set({ scenes: [...scenes, createdScene], isLoading: false });

        return createdScene;
      }
    } catch (error: any) {
      console.error('Failed to create scene:', error);
      set({ error: error.message || 'Failed to create scene', isLoading: false });
      throw error;
    }
  },

  // Scene 수정
  updateScene: async (scene) => {
    set({ isLoading: true, error: null });

    try {
      const authStore = useAuthStore.getState();

      if (authStore.isGuest || !authStore.user) {
        // 게스트 모드: 메모리 업데이트
        const { guestScenes } = get();
        const updatedScene = {
          ...scene,
          updatedAt: new Date().toISOString(),
        };

        // Scene이 이미 guestScenes에 있는지 확인
        const existingIndex = guestScenes.findIndex((s) => s.id === scene.id);
        let updatedGuestScenes: Scene[];

        if (existingIndex >= 0) {
          // 기존 Scene 업데이트
          updatedGuestScenes = guestScenes.map((s) =>
            s.id === scene.id ? updatedScene : s
          );
        } else {
          // 새로운 Scene 추가 (더미 Scene을 처음 편집하는 경우)
          updatedGuestScenes = [...guestScenes, updatedScene];
        }

        set({
          guestScenes: updatedGuestScenes,
          scenes: updatedGuestScenes,
          isLoading: false,
        });

        return updatedScene;
      } else {
        // 회원 모드: API로 업데이트
        const username = authStore.user.username;
        const updatedScene = await sceneApi.updateScene(
          scene.id as number,
          scene,
          username
        );

        const { scenes } = get();
        const updatedScenes = scenes.map((s) => (s.id === scene.id ? updatedScene : s));
        set({ scenes: updatedScenes, isLoading: false });

        return updatedScene;
      }
    } catch (error: any) {
      console.error('Failed to update scene:', error);
      set({ error: error.message || 'Failed to update scene', isLoading: false });
      throw error;
    }
  },

  // Scene 삭제
  deleteScene: async (sceneId) => {
    set({ isLoading: true, error: null });

    try {
      const authStore = useAuthStore.getState();

      if (authStore.isGuest || !authStore.user) {
        // 게스트 모드: 메모리에서 삭제
        const { guestScenes } = get();
        const updatedGuestScenes = guestScenes.filter((s) => s.id !== sceneId);

        set({
          guestScenes: updatedGuestScenes,
          scenes: updatedGuestScenes,
          isLoading: false,
        });
      } else {
        // 회원 모드: API로 삭제
        const username = authStore.user.username;
        await sceneApi.deleteScene(sceneId as number, username);

        const { scenes } = get();
        const updatedScenes = scenes.filter((s) => s.id !== sceneId);
        set({ scenes: updatedScenes, isLoading: false });
      }
    } catch (error: any) {
      console.error('Failed to delete scene:', error);
      set({ error: error.message || 'Failed to delete scene', isLoading: false });
      throw error;
    }
  },

  // Scene 조회 (로컬)
  getSceneById: (sceneId) => {
    const { scenes } = get();
    return scenes.find((s) => s.id === sceneId) || null;
  },
}));
