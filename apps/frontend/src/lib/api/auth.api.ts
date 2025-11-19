/**
 * Auth API 서비스
 * - 로그인, 회원가입 API 호출
 */

import { apiClient } from './client';

// ============================================
// 타입 정의
// ============================================

export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  password: string;
  email: string;
  nickname: string;
}

export interface AuthResponse {
  id: number;
  username: string;
  email: string;
  nickname: string;
  token: string;
  message: string;
}

// ============================================
// API 함수
// ============================================

/**
 * 로그인
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
}

/**
 * 회원가입
 */
export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/signup', data);
  return response.data;
}

/**
 * 로그아웃 (클라이언트 측)
 * - 현재 백엔드에 logout API가 없으므로 로컬 토큰만 제거
 */
export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * 현재 저장된 사용자 정보 가져오기
 */
export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

/**
 * 토큰 저장
 */
export function saveToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * 사용자 정보 저장
 */
export function saveUser(user: User): void {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * 인증 여부 확인
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('token');
  return !!token;
}
