/**
 * Axios 기반 API Client
 * - Base URL 설정
 * - 인터셉터를 통한 자동 JWT 토큰 추가
 * - 에러 처리
 */

import axios, { AxiosError } from 'axios';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초
});

/**
 * Request Interceptor
 * - 요청 전에 Authorization 헤더에 JWT 토큰 자동 추가
 */
apiClient.interceptors.request.use(
  (config) => {
    // localStorage에서 토큰 가져오기
    const token = localStorage.getItem('token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * - 공통 에러 처리
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 401 Unauthorized - 토큰 만료 또는 인증 실패
    if (error.response?.status === 401) {
      // 로그아웃 처리
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // 로그인 페이지로 리다이렉트 (현재 페이지가 로그인/회원가입이 아닐 때만)
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }

    // 403 Forbidden - 권한 없음
    if (error.response?.status === 403) {
      console.error('접근 권한이 없습니다.');
    }

    // 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('서버 오류가 발생했습니다.');
    }

    return Promise.reject(error);
  }
);

/**
 * API 에러 메시지 추출 헬퍼
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // 서버 응답이 있는 경우
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    // 네트워크 에러
    if (error.message === 'Network Error') {
      return '네트워크 연결을 확인해주세요.';
    }

    // 타임아웃
    if (error.code === 'ECONNABORTED') {
      return '요청 시간이 초과되었습니다.';
    }

    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}

// Default export
export default apiClient;
