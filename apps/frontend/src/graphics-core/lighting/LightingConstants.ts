/**
 * LightingConstants.ts - Lighting 관련 상수 중앙화
 *
 * Sun/Sky/Environment 관련 모든 상수를 한 곳에서 관리합니다.
 * 기존 SunCalculator.ts, config/index.ts 등에 흩어져 있던 상수들을 통합합니다.
 *
 * 설계 원칙:
 * - 물리 기반 값은 주석으로 근거 설명
 * - 튜닝 가능한 값은 명확히 구분
 * - 그룹별로 정리하여 가독성 확보
 */

import type { Season, RoomOrientation, Vec3 } from './LightingTypes';

// ============================================
// 위치 설정 (태양 위치 계산용)
// ============================================

/** 기본 위도 (Seoul, South Korea - 북위 37.5665도) */
export const DEFAULT_LATITUDE = 37.5665;

/** 기본 경도 (Seoul, South Korea - 동경 126.9780도) */
export const DEFAULT_LONGITUDE = 126.9780;

// ============================================
// 태양 색온도 설정
// ============================================

/**
 * 최소 색온도 (Kelvin)
 * - 지평선 근처의 태양 색상 (붉은 노을)
 * - 약 1800K = 촛불/일출/일몰 색상
 */
export const MIN_COLOR_TEMPERATURE = 1800;

/**
 * 최대 색온도 (Kelvin)
 * - 천정(정오)의 태양 색상
 * - 약 5800K = 태양 표면 온도 (순백색)
 */
export const MAX_COLOR_TEMPERATURE = 5800;

// ============================================
// 태양 강도 설정
// ============================================

/**
 * 태양광 강도 배수
 * - SunCalculator에서 계산된 강도(0-1)에 이 값을 곱함
 * - 실제 물리 기반 값과 렌더링 결과 사이의 조정용
 * - 값을 높이면 태양광이 더 밝아짐
 */
export const SUN_INTENSITY_MULTIPLIER = 15;

// ============================================
// 환경광 강도 설정
// ============================================

/**
 * 환경광 최소 강도
 * - 밤/박명 시 적용되는 최소 환경광
 */
export const MIN_ENV_INTENSITY = 0.02;

/**
 * 환경광 최대 강도
 * - 정오에 적용되는 최대 환경광
 */
export const MAX_ENV_INTENSITY = 1.0;

/**
 * 환경광 기본 범위
 * - 낮 시간대: 0.3 ~ 1.0 범위
 */
export const ENV_INTENSITY_BASE = 0.3;
export const ENV_INTENSITY_RANGE = 0.7; // MAX - BASE

/**
 * 환경 간접광 UI 배수 (0.0 ~ 1.0)
 * - UI에서 0~100% 슬라이더로 조절
 * - 기본값 0.5 = 50%
 */
export const DEFAULT_ENV_INDIRECT_MULT = 0.5;

/**
 * 환경 간접광 강도 배수 (정수)
 * - 환경광 세기 자체를 조절하는 배수
 * - 최종 간접광 = skyColor * EnvIntensity * ENV_INDIRECT_MULT * ENV_INDIRECT_INTENSITY
 * - 실내 씬에서 환경광이 충분히 기여하도록 조정
 */
export const ENV_INDIRECT_INTENSITY = 10;

// ============================================
// 하늘색 기본값 (Rayleigh/Mie 산란 근사)
// ============================================

/** 천정 하늘색 (깊은 파랑 - Rayleigh 우세) */
export const ZENITH_BLUE: Vec3 = [0.15, 0.35, 0.65];

/** 지평선 하늘색 (옅은 파랑) */
export const HORIZON_BLUE: Vec3 = [0.5, 0.6, 0.75];

/** 일몰 지평선색 (주황) */
export const SUNSET_HORIZON: Vec3 = [0.9, 0.4, 0.2];

/** 일몰 하늘색 (보라/분홍) */
export const SUNSET_SKY: Vec3 = [0.6, 0.35, 0.5];

// ============================================
// 밤 하늘색 (달빛/별빛 효과)
// ============================================

/** 밤 하늘색 (어두운 청색) */
export const NIGHT_SKY_COLOR: Vec3 = [0.02, 0.02, 0.06];

/** 밤 지평선색 */
export const NIGHT_HORIZON_COLOR: Vec3 = [0.03, 0.03, 0.05];

/** 밤 지면색 */
export const NIGHT_GROUND_COLOR: Vec3 = [0.01, 0.01, 0.02];

// ============================================
// 박명(Twilight) 색상
// ============================================

/** 박명 하늘색 */
export const TWILIGHT_SKY_COLOR: Vec3 = [0.08, 0.05, 0.15];

/** 박명 지평선색 */
export const TWILIGHT_HORIZON_COLOR: Vec3 = [0.2, 0.1, 0.15];

/** 박명 지면색 */
export const TWILIGHT_GROUND_COLOR: Vec3 = [0.02, 0.02, 0.03];

// ============================================
// 계절별 날짜 매핑
// ============================================

/**
 * 계절에 따른 대표 날짜
 * - 춘분/하지/추분/동지를 기준으로 설정
 * - month는 0-indexed (0 = 1월)
 */
export const SEASON_DATES: Record<Season, { month: number; day: number }> = {
  spring: { month: 2, day: 21 },  // 3월 21일 (춘분)
  summer: { month: 5, day: 21 },  // 6월 21일 (하지)
  autumn: { month: 8, day: 21 },  // 9월 21일 (추분)
  winter: { month: 11, day: 21 }, // 12월 21일 (동지)
};

// ============================================
// 방 방향 오프셋
// ============================================

/**
 * 방 방향에 따른 방위각 오프셋 (radians)
 * - 북쪽을 기준으로 시계방향 회전
 */
export const ORIENTATION_OFFSET: Record<RoomOrientation, number> = {
  north: 0,                // 북쪽 (0도)
  east: Math.PI / 2,       // 동쪽 (90도)
  south: Math.PI,          // 남쪽 (180도)
  west: -Math.PI / 2,      // 서쪽 (-90도)
};

// ============================================
// 기본 하늘 모드
// ============================================

/** 기본 하늘 모드 (2 = 고품질 하늘) */
export const DEFAULT_SKY_MODE = 2;

// ============================================
// 대기 효과 상수
// ============================================

/**
 * 일몰 효과 threshold
 * - 태양 고도가 이 값(sin(altitude)) 이하일 때 일몰 효과 적용
 * - 약 15도 = sin⁻¹(0.25) ≈ 14.5°
 */
export const SUNSET_THRESHOLD = 0.25;

/**
 * 박명 효과 범위 (radians)
 * - 태양이 지평선 아래로 이 각도까지 박명 효과
 * - 약 -19도 (-0.33 rad)
 */
export const TWILIGHT_ALTITUDE_LIMIT = -0.33;

// ============================================
// 지면 반사 계수
// ============================================

/** 지면 반사 - 하늘색 기여도 (R) */
export const GROUND_SKY_FACTOR_R = 0.15;

/** 지면 반사 - 하늘색 기여도 (G) */
export const GROUND_SKY_FACTOR_G = 0.18;

/** 지면 반사 - 하늘색 기여도 (B) */
export const GROUND_SKY_FACTOR_B = 0.12;

/** 지면 반사 - 기본 오프셋 (R) */
export const GROUND_OFFSET_R = 0.05;

/** 지면 반사 - 기본 오프셋 (G) */
export const GROUND_OFFSET_G = 0.08;

/** 지면 반사 - 기본 오프셋 (B) */
export const GROUND_OFFSET_B = 0.03;
