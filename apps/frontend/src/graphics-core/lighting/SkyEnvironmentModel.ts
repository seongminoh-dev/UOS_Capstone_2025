/**
 * SkyEnvironmentModel.ts - 하늘/환경광 계산
 *
 * 물리 기반 환경 파라미터를 계산합니다.
 * Rayleigh/Mie 산란을 근사하여 시간대별 하늘색을 계산합니다.
 *
 * 기존 SunCalculator.ts의 환경광 관련 로직을 이관:
 * - calculateEnvironmentParams
 *
 * 물리적 원리:
 * - Rayleigh Scattering: λ^-4 법칙, 파란색이 더 많이 산란 → 낮 하늘이 파란 이유
 * - Mie Scattering: 태양 주변 밝은 광채(aureole) 형성
 * - 대기 경로 길이: 태양이 낮을수록 빛이 대기를 더 많이 통과 → 붉은색
 */

import * as SunCalc from 'suncalc';

import type {
  LightingSettings,
  EnvironmentParameters,
  SunParameters,
  Vec3,
} from './LightingTypes';
import {
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  DEFAULT_ENV_INDIRECT_MULT,
  ENV_INDIRECT_INTENSITY,
  DEFAULT_SKY_MODE,
  ENV_INTENSITY_BASE,
  ENV_INTENSITY_RANGE,
  MIN_ENV_INTENSITY,
  ZENITH_BLUE,
  HORIZON_BLUE,
  SUNSET_HORIZON,
  SUNSET_SKY,
  NIGHT_SKY_COLOR,
  NIGHT_HORIZON_COLOR,
  NIGHT_GROUND_COLOR,
  TWILIGHT_SKY_COLOR,
  TWILIGHT_HORIZON_COLOR,
  TWILIGHT_GROUND_COLOR,
  TWILIGHT_ALTITUDE_LIMIT,
  SEASON_DATES,
  ORIENTATION_OFFSET,
  GROUND_SKY_FACTOR_R,
  GROUND_SKY_FACTOR_G,
  GROUND_SKY_FACTOR_B,
  GROUND_OFFSET_R,
  GROUND_OFFSET_G,
  GROUND_OFFSET_B,
} from './LightingConstants';

// ============================================
// 내부 헬퍼 함수
// ============================================

/**
 * 선형 보간 헬퍼 함수
 */
function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * clampedT,
    a[1] + (b[1] - a[1]) * clampedT,
    a[2] + (b[2] - a[2]) * clampedT,
  ];
}

/**
 * timeOfDay (0-100) → Date 객체 생성
 */
function createDateFromSettings(
  timeOfDay: number,
  season: LightingSettings['season']
): Date {
  const hour = (timeOfDay / 100) * 24;
  const seasonDate = SEASON_DATES[season];
  const date = new Date(2024, seasonDate.month, seasonDate.day);
  date.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
  return date;
}

/**
 * 지면 반사색 계산
 * - 하늘색의 영향을 받음 (ambient occlusion 효과)
 */
function calculateGroundColor(skyColor: Vec3): Vec3 {
  return [
    skyColor[0] * GROUND_SKY_FACTOR_R + GROUND_OFFSET_R,
    skyColor[1] * GROUND_SKY_FACTOR_G + GROUND_OFFSET_G,
    skyColor[2] * GROUND_SKY_FACTOR_B + GROUND_OFFSET_B,
  ];
}

// ============================================
// 공개 API
// ============================================

/**
 * 환경 파라미터를 계산합니다.
 *
 * @param settings - Lighting 설정
 * @param sun - 태양 파라미터 (null이면 밤)
 * @returns 환경 파라미터
 */
export function computeEnvironmentParameters(
  settings: LightingSettings,
  sun: SunParameters | null
): EnvironmentParameters {
  const {
    timeOfDay,
    isDaytime,
    season,
    roomOrientation,
    skyMode = DEFAULT_SKY_MODE,
    envIndirectMultiplier = DEFAULT_ENV_INDIRECT_MULT,
    latitude = DEFAULT_LATITUDE,
    longitude = DEFAULT_LONGITUDE,
  } = settings;

  // 밤 모드 (isDaytime = false)
  if (!isDaytime) {
    return {
      skyColor: [...NIGHT_SKY_COLOR] as Vec3,
      horizonColor: [...NIGHT_HORIZON_COLOR] as Vec3,
      groundColor: [...NIGHT_GROUND_COLOR] as Vec3,
      envIntensity: MIN_ENV_INTENSITY,
      envMode: skyMode,
      envIndirectMult: envIndirectMultiplier,
    };
  }

  // 시간 및 태양 위치 계산
  const date = createDateFromSettings(timeOfDay, season);
  const sunPos = SunCalc.getPosition(date, latitude, longitude);
  const altitude = sunPos.altitude;

  // 밤 (태양이 지평선 아래)
  if (altitude < 0) {
    // 박명(twilight) 효과: 태양이 지평선 바로 아래일 때
    const twilightFactor = Math.max(0, 1 + altitude / Math.abs(TWILIGHT_ALTITUDE_LIMIT));

    return {
      skyColor: lerpVec3(NIGHT_SKY_COLOR, TWILIGHT_SKY_COLOR, twilightFactor),
      horizonColor: lerpVec3(NIGHT_HORIZON_COLOR, TWILIGHT_HORIZON_COLOR, twilightFactor),
      groundColor: lerpVec3(NIGHT_GROUND_COLOR, TWILIGHT_GROUND_COLOR, twilightFactor),
      envIntensity: MIN_ENV_INTENSITY + twilightFactor * 0.1,
      envMode: skyMode,
      envIndirectMult: envIndirectMultiplier,
    };
  }

  // 낮: 물리 기반 색상 계산
  // t = 0 (지평선) ~ 1 (천정)
  const t = Math.sin(altitude);

  // === Rayleigh Scattering 근사 ===
  // 높은 고도: 깊은 파란색 (Rayleigh 우세)
  // 낮은 고도: 옅은 파란색/흰색

  // === 일출/일몰 색상 (대기 경로 길이 효과) ===
  // 태양이 낮을 때: 긴 대기 경로 → 파란색 산란 → 붉은색/주황색 도달

  // 일출/일몰 혼합 factor (태양 고도 15도 이하에서 강해짐)
  const sunsetFactor = Math.pow(Math.max(0, 1 - t * 4), 2); // 0~0.25rad에서 효과

  // 하늘색 계산: Rayleigh + 일몰 효과
  const baseSkyColor = lerpVec3(HORIZON_BLUE, ZENITH_BLUE, t);
  const skyColor = lerpVec3(baseSkyColor, SUNSET_SKY, sunsetFactor * 0.6);

  // 지평선색 계산: 기본 + 일몰 효과
  const baseHorizonBlend: Vec3 = [0.6, 0.65, 0.8];
  const baseHorizonColor = lerpVec3(baseHorizonBlend, HORIZON_BLUE, t);
  const horizonColor = lerpVec3(baseHorizonColor, SUNSET_HORIZON, sunsetFactor);

  // 지면 반사색
  const groundColor = calculateGroundColor(skyColor);

  // 환경광 전체 강도
  const envIntensity = ENV_INTENSITY_BASE + t * ENV_INTENSITY_RANGE; // 0.3 ~ 1.0

  return {
    skyColor,
    horizonColor,
    groundColor,
    envIntensity,
    envMode: skyMode,
    envIndirectMult: envIndirectMultiplier,
  };
}

// ============================================
// 하위 호환성을 위한 레거시 함수
// (기존 SunCalculator.ts의 API 유지)
// ============================================

/**
 * @deprecated Use computeEnvironmentParameters instead
 * 물리 기반 환경 파라미터를 계산합니다.
 */
export function calculateEnvironmentParams(
  timeOfDay: number,
  isDaytime: boolean,
  season: LightingSettings['season'],
  roomOrientation: LightingSettings['roomOrientation'],
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): {
  skyColor: Vec3;
  horizonColor: Vec3;
  groundColor: Vec3;
  sunDirection: Vec3;
  sunIntensity: number;
  environmentIntensity: number;
} {
  const settings: LightingSettings = {
    timeOfDay,
    isDaytime,
    season,
    roomOrientation,
    skyMode: 2,
    envIndirectMultiplier: 0.5,
    latitude,
    longitude,
  };

  const result = computeEnvironmentParameters(settings, null);

  // 태양 방향 계산 (레거시 API 호환)
  let sunDirection: Vec3 = [0, -1, 0];
  let sunIntensity = 0;

  if (isDaytime) {
    const date = createDateFromSettings(timeOfDay, season);
    const sunPos = SunCalc.getPosition(date, latitude, longitude);
    const altitude = sunPos.altitude;
    const azimuth = sunPos.azimuth;

    const correctedAzimuth = azimuth + ORIENTATION_OFFSET[roomOrientation];
    const sunDirX = Math.cos(altitude) * Math.sin(correctedAzimuth);
    const sunDirY = -Math.sin(altitude);
    const sunDirZ = Math.cos(altitude) * Math.cos(correctedAzimuth);
    sunDirection = [sunDirX, sunDirY, sunDirZ];

    sunIntensity = Math.max(0, Math.sin(altitude));
  }

  return {
    skyColor: result.skyColor,
    horizonColor: result.horizonColor,
    groundColor: result.groundColor,
    sunDirection,
    sunIntensity,
    environmentIntensity: result.envIntensity,
  };
}
