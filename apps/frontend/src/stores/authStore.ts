/**
 * Auth 전역 상태 관리 (Zustand)
 * - 비회원/회원 모두 이용 가능
 * - 비회원: 로컬 데이터만 사용
 * - 회원: 서버와 동기화
 */

import { create } from 'zustand';
import * as authApi from '../lib/api/auth.api';
import type { User, LoginRequest, SignupRequest } from '../lib/api/auth.api';

// ============================================
// 상태 타입 정의
// ============================================

interface AuthState {
  // 상태
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean; // 비회원 모드 여부
  isLoading: boolean;
  error: string | null;

  // 액션
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initAuth: () => void; // 초기화 (localStorage에서 복원)
}

// ============================================
// Zustand Store
// ============================================

export const useAuthStore = create<AuthState>((set) => ({
  // 초기 상태 (비회원)
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: true, // 기본적으로 비회원
  isLoading: false,
  error: null,

  /**
   * 로그인
   */
  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.login(data);

      // 토큰 및 사용자 정보 저장
      const user: User = {
        id: response.id,
        username: response.username,
        email: response.email,
        nickname: response.nickname,
      };

      authApi.saveToken(response.token);
      authApi.saveUser(user);

      set({
        user,
        token: response.token,
        isAuthenticated: true,
        isGuest: false, // 회원 모드로 전환
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '로그인에 실패했습니다.';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  /**
   * 회원가입
   */
  signup: async (data: SignupRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authApi.signup(data);

      // 토큰 및 사용자 정보 저장
      const user: User = {
        id: response.id,
        username: response.username,
        email: response.email,
        nickname: response.nickname,
      };

      authApi.saveToken(response.token);
      authApi.saveUser(user);

      set({
        user,
        token: response.token,
        isAuthenticated: true,
        isGuest: false, // 회원 모드로 전환
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '회원가입에 실패했습니다.';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  /**
   * 로그아웃 (비회원 모드로 전환)
   */
  logout: () => {
    authApi.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: true, // 비회원 모드로 복귀
      isLoading: false,
      error: null,
    });
  },

  /**
   * 에러 메시지 초기화
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 초기화 (localStorage에서 복원)
   */
  initAuth: () => {
    const token = localStorage.getItem('token');
    const user = authApi.getCurrentUser();

    if (token && user) {
      // 로그인 상태 복원
      set({
        user,
        token,
        isAuthenticated: true,
        isGuest: false,
      });
    } else {
      // 비회원 상태
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isGuest: true,
      });
    }
  },
}));
