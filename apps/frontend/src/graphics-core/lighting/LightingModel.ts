/**
 * LightingModel.ts - 통합 Lighting 모델
 *
 * Sun + Sky/Environment를 통합하여 최종 Lighting 결과를 생성합니다.
 * WebGPUEngine에서 이 모듈만 호출하면 모든 lighting 파라미터를 얻을 수 있습니다.
 *
 * 사용법:
 *   import { computeLighting } from '../lighting';
 *   const lighting = computeLighting(settings);
 *   // lighting.sun - 태양 파라미터
 *   // lighting.environment - 환경 파라미터
 *   // lighting.sunDirection - 태양 방향 (편의용)
 *   // lighting.finalSunIntensity - 최종 태양 강도 (multiplier 적용됨)
 */

import type {
  LightingSettings,
  LightingResult,
  SunParameters,
  EnvironmentParameters,
  DirectionalLightData,
  EnvironmentUniformData,
  Vec3,
  SunSettings,
} from './LightingTypes';
import { computeSunParameters } from './SunModel';
import { computeEnvironmentParameters } from './SkyEnvironmentModel';
import {
  SUN_INTENSITY_MULTIPLIER,
  DEFAULT_ENV_INDIRECT_MULT,
  DEFAULT_SKY_MODE,
  ENV_INDIRECT_INTENSITY,
} from './LightingConstants';

// ============================================
// 공개 API
// ============================================

/**
 * 통합 Lighting 계산
 *
 * @param settings - Lighting 설정
 * @returns 전체 Lighting 결과 (sun + environment)
 */
export function computeLighting(settings: LightingSettings): LightingResult {
  // 1. 태양 파라미터 계산
  const sun = computeSunParameters(settings);

  // 2. 환경 파라미터 계산
  const environment = computeEnvironmentParameters(settings, sun);

  // 3. 태양 방향 (sun이 없으면 기본값)
  const sunDirection: Vec3 = sun?.direction ?? [0, -1, 0];

  // 4. 최종 태양 강도 (multiplier 적용)
  const multiplier = settings.sunIntensityMultiplier ?? SUN_INTENSITY_MULTIPLIER;
  const finalSunIntensity = sun ? sun.intensity * multiplier : 0;

  return {
    sun,
    environment,
    sunDirection,
    finalSunIntensity,
  };
}

/**
 * SunSettings → LightingSettings 변환
 * - React에서 받은 SunSettings를 graphics-core용 LightingSettings로 변환
 */
export function sunSettingsToLightingSettings(
  sunSettings: SunSettings
): LightingSettings {
  return {
    timeOfDay: sunSettings.timeOfDay,
    isDaytime: sunSettings.isDaytime,
    season: sunSettings.season,
    roomOrientation: sunSettings.roomOrientation,
    skyMode: sunSettings.skyMode ?? DEFAULT_SKY_MODE,
    envIndirectMultiplier: sunSettings.envIndirectMultiplier ?? DEFAULT_ENV_INDIRECT_MULT,
  };
}

/**
 * LightingResult → DirectionalLightData 추출
 * - World.UpdateDirectionalLight()에 전달할 데이터
 */
export function extractDirectionalLightData(
  lighting: LightingResult
): DirectionalLightData | null {
  if (!lighting.sun) {
    return null;
  }

  return {
    direction: lighting.sun.direction,
    color: lighting.sun.color,
    intensity: lighting.finalSunIntensity,
  };
}

/**
 * LightingResult → EnvironmentUniformData 추출
 * - Renderer.UpdateEnvironment()에 전달할 데이터
 * - envIndirectMult: UI 값(0~1) × ENV_INDIRECT_INTENSITY 적용
 */
export function extractEnvironmentUniformData(
  lighting: LightingResult
): EnvironmentUniformData {
  const env = lighting.environment;

  return {
    skyColor: env.skyColor,
    horizonColor: env.horizonColor,
    groundColor: env.groundColor,
    sunDirection: lighting.sunDirection,
    sunIntensity: lighting.sun?.intensity ?? 0,
    envIntensity: env.envIntensity,
    envMode: env.envMode,
    // UI 슬라이더(0~1) × 고정 강도 배수 = 최종 간접광 강도
    envIndirectMult: env.envIndirectMult * ENV_INDIRECT_INTENSITY,
  };
}

// ============================================
// 편의 함수
// ============================================

/**
 * 낮인지 판단
 */
export function isDay(lighting: LightingResult): boolean {
  return lighting.sun !== null;
}

/**
 * 박명(twilight)인지 판단
 * - 태양이 지평선 아래이지만 환경광 강도가 밤보다 높음
 */
export function isTwilight(lighting: LightingResult): boolean {
  return lighting.sun === null && lighting.environment.envIntensity > 0.05;
}

/**
 * 밤인지 판단
 */
export function isNight(lighting: LightingResult): boolean {
  return lighting.sun === null && lighting.environment.envIntensity <= 0.05;
}

/**
 * 일출/일몰인지 판단
 * - 태양 고도가 15도 이하
 */
export function isSunsetOrSunrise(lighting: LightingResult): boolean {
  if (!lighting.sun) return false;
  return lighting.sun.altitude < 0.26; // ~15 degrees in radians
}

// ============================================
// 디버깅 유틸리티
// ============================================

/**
 * Lighting 결과를 로그 문자열로 변환
 */
export function lightingToDebugString(lighting: LightingResult): string {
  const sunStatus = lighting.sun
    ? `Sun: alt=${(lighting.sun.altitude * 180 / Math.PI).toFixed(1)}°, int=${lighting.finalSunIntensity.toFixed(2)}`
    : 'Sun: none (night)';

  const envStatus = `Env: mode=${lighting.environment.envMode}, int=${lighting.environment.envIntensity.toFixed(2)}, indirect=${lighting.environment.envIndirectMult.toFixed(2)}`;

  return `[Lighting] ${sunStatus} | ${envStatus}`;
}
