/**
 * LightingTypes.ts - Lighting 모듈 타입 정의
 *
 * Sun/Sky/Environment 관련 모든 타입을 중앙화하여 관리합니다.
 * Scene.ts의 타입들과 호환성을 유지하면서, graphics-core 내부용 타입으로 확장합니다.
 */

import type { Season, RoomOrientation, SkyMode, SunSettings } from '../service/Scene';

// Re-export Scene types for convenience
export type { Season, RoomOrientation, SkyMode, SunSettings };

// ============================================
// 기본 타입
// ============================================

/** RGB 색상 (0-1 정규화) */
export type Vec3 = [number, number, number];

// ============================================
// 태양 관련 타입
// ============================================

/**
 * 태양 파라미터 (계산 결과)
 * - SunModel.computeSunParameters()의 반환값
 */
export interface SunParameters {
  /** 태양 방향 벡터 (정규화, 빛이 향하는 방향) */
  direction: Vec3;

  /** 태양 색상 (색온도 기반, RGB 0-1) */
  color: Vec3;

  /** 태양 강도 (0.0-1.0, 고도 기반) */
  intensity: number;

  /** 태양 고도 (radians, 디버깅/확장용) */
  altitude: number;

  /** 태양 방위각 (radians, 디버깅/확장용) */
  azimuth: number;
}

// ============================================
// 환경광 관련 타입
// ============================================

/**
 * 환경 파라미터 (계산 결과)
 * - SkyEnvironmentModel.computeEnvironmentParameters()의 반환값
 */
export interface EnvironmentParameters {
  /** 천정 하늘색 (Rayleigh 산란 결과) */
  skyColor: Vec3;

  /** 지평선 색상 (대기 경로 길이에 따른 색상) */
  horizonColor: Vec3;

  /** 지면 반사색 (ambient occlusion 효과 포함) */
  groundColor: Vec3;

  /** 환경광 전체 강도 (0.0-1.0) */
  envIntensity: number;

  /** 하늘 모드 (0: 없음, 1: 일반, 2: 고품질) */
  envMode: SkyMode;

  /** 간접광 배수 (bounce에서 환경광 강도) */
  envIndirectMult: number;
}

// ============================================
// 통합 Lighting 타입
// ============================================

/**
 * Lighting 모델 최종 결과
 * - LightingModel.computeLighting()의 반환값
 */
export interface LightingResult {
  /** 태양 파라미터 (null이면 밤/태양 없음) */
  sun: SunParameters | null;

  /** 환경 파라미터 */
  environment: EnvironmentParameters;

  /** 태양 방향 (environment에서도 사용, 편의를 위해 중복) */
  sunDirection: Vec3;

  /** 최종 태양 강도 (intensity * multiplier) */
  finalSunIntensity: number;
}

/**
 * Lighting 설정 (입력)
 * - SunSettings를 확장하여 graphics-core 내부용으로 사용
 * - 추가적인 튜닝 파라미터 포함
 */
export interface LightingSettings extends SunSettings {
  // SunSettings의 모든 필드 상속:
  // - timeOfDay: number
  // - isDaytime: boolean
  // - season: Season
  // - roomOrientation: RoomOrientation
  // - skyMode: SkyMode
  // - envIndirectMultiplier: number

  // === 확장 필드 (선택적) ===

  /** 위도 (기본: 서울) */
  latitude?: number;

  /** 경도 (기본: 서울) */
  longitude?: number;

  /** 대기 혼탁도 (미래 확장용, 기본: 2.0) */
  turbidity?: number;

  /** 태양 색상 오버라이드 (null이면 자동 계산) */
  overrideSunColor?: Vec3 | null;

  /** 태양 강도 배수 오버라이드 (null이면 기본값 사용) */
  sunIntensityMultiplier?: number;
}

// ============================================
// GPU 전달용 타입
// ============================================

/**
 * GPU Uniform 버퍼에 전달할 환경 데이터
 * - Renderer.UpdateEnvironment()의 파라미터 형태와 일치
 */
export interface EnvironmentUniformData {
  skyColor: Vec3;
  horizonColor: Vec3;
  groundColor: Vec3;
  sunDirection: Vec3;
  sunIntensity: number;
  envIntensity: number;
  envMode: number;
  envIndirectMult: number;
}

/**
 * GPU Light 버퍼에 전달할 DirectionalLight 데이터
 * - World.UpdateDirectionalLight()의 파라미터 형태와 일치
 */
export interface DirectionalLightData {
  direction: Vec3;
  color: Vec3;
  intensity: number;
}
