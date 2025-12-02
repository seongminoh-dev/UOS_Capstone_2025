/**
 * SunModel.ts - 태양 위치/색상/강도 계산
 *
 * SunCalc 라이브러리를 사용하여 시간, 계절, 방 방향에 따른 태양 파라미터를 계산합니다.
 *
 * 기존 SunCalculator.ts의 태양 관련 로직을 이관:
 * - calculateSunDirection
 * - calculateSunIntensity
 * - calculateSunColor
 * - calculateSunLightParams
 *
 * 설계 원칙:
 * - timeOfDay 0-100 → 0-24시 단순 매핑 (50 = 정오)
 * - 밤(태양이 지평선 아래)에는 null 반환
 * - 물리 기반 강도: sin(altitude)
 */

import * as SunCalc from 'suncalc';
import kelvinToRgb from 'kelvin-to-rgb';

import type { LightingSettings, SunParameters, Vec3 } from './LightingTypes';
import {
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,
  MIN_COLOR_TEMPERATURE,
  MAX_COLOR_TEMPERATURE,
  SEASON_DATES,
  ORIENTATION_OFFSET,
} from './LightingConstants';

// ============================================
// 내부 헬퍼 함수
// ============================================

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
 * 태양 위치(altitude, azimuth) 계산
 */
function getSunPosition(
  timeOfDay: number,
  season: LightingSettings['season'],
  latitude: number,
  longitude: number
): { altitude: number; azimuth: number } {
  const date = createDateFromSettings(timeOfDay, season);
  return SunCalc.getPosition(date, latitude, longitude);
}

/**
 * 색온도(Kelvin) → RGB 변환 (0-1 정규화)
 */
function kelvinToNormalizedRgb(kelvin: number): Vec3 {
  const [r, g, b] = kelvinToRgb(kelvin);
  return [r / 255, g / 255, b / 255];
}

/**
 * 고도각 → 색온도 계산 (선형 보간)
 */
function calculateColorTemperature(altitude: number): number {
  const t = Math.max(0, Math.sin(altitude)); // 0-1
  return MIN_COLOR_TEMPERATURE + (MAX_COLOR_TEMPERATURE - MIN_COLOR_TEMPERATURE) * t;
}

// ============================================
// 공개 API
// ============================================

/**
 * 태양의 고도각(도)을 반환합니다.
 * - UI 표시나 조명 강도 조절에 사용 가능
 *
 * @returns 고도각 (degrees, -90 ~ 90)
 */
export function getSunAltitudeDegrees(
  timeOfDay: number,
  season: LightingSettings['season'],
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): number {
  const sunPos = getSunPosition(timeOfDay, season, latitude, longitude);
  return (sunPos.altitude * 180) / Math.PI;
}

/**
 * 현재 설정이 낮인지 밤인지 판단합니다.
 *
 * @returns true if sun is above horizon
 */
export function isSunAboveHorizon(
  timeOfDay: number,
  isDaytime: boolean,
  season: LightingSettings['season'],
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): boolean {
  if (!isDaytime) return false;

  const sunPos = getSunPosition(timeOfDay, season, latitude, longitude);
  return sunPos.altitude >= 0;
}

/**
 * 태양의 강도를 계산합니다 (물리 기반).
 * 태양 복사량은 sin(altitude)에 비례합니다.
 *
 * @param altitude - 태양 고도 (radians)
 * @returns 강도 (0.0-1.0)
 */
export function calculateSunIntensity(altitude: number): number {
  // 물리 기반: 태양 복사량 = sin(altitude)
  // altitude < 0 (지평선 아래) → 0.0
  // altitude = 90° (천정) → 1.0
  return Math.max(0, Math.sin(altitude));
}

/**
 * 태양의 색상을 계산합니다 (색온도 기반).
 *
 * @param altitude - 태양 고도 (radians)
 * @returns RGB 색상 [r, g, b] (0-1 정규화)
 */
export function calculateSunColor(altitude: number): Vec3 {
  if (altitude < 0) {
    return [0, 0, 0];
  }

  const kelvin = calculateColorTemperature(altitude);
  return kelvinToNormalizedRgb(kelvin);
}

/**
 * 태양의 방향 벡터를 계산합니다.
 *
 * @returns [x, y, z] 방향 벡터 (정규화됨), 또는 밤이면 null
 */
export function calculateSunDirection(
  settings: LightingSettings
): Vec3 | null {
  const {
    timeOfDay,
    isDaytime,
    season,
    roomOrientation,
    latitude = DEFAULT_LATITUDE,
    longitude = DEFAULT_LONGITUDE,
  } = settings;

  // isDaytime이 false면 즉시 null 반환 (밤 모드)
  if (!isDaytime) {
    return null;
  }

  const sunPos = getSunPosition(timeOfDay, season, latitude, longitude);

  // Altitude가 음수(지평선 아래)이면 밤 → null 반환
  if (sunPos.altitude < 0) {
    return null;
  }

  const { altitude, azimuth } = sunPos;

  // 방 방향에 따른 회전 보정
  const correctedAzimuth = azimuth + ORIENTATION_OFFSET[roomOrientation];

  // 구면 좌표 → 직교 좌표 변환
  // SunCalc의 azimuth: 남쪽=0, 시계방향 증가
  // WebGPU 좌표계: Y-up, Z-forward
  const x = Math.cos(altitude) * Math.sin(correctedAzimuth);
  const y = -Math.sin(altitude); // 위에서 아래로 (음수)
  const z = Math.cos(altitude) * Math.cos(correctedAzimuth);

  // 정규화 (이미 정규화되어 있지만 안전을 위해)
  const length = Math.sqrt(x * x + y * y + z * z);
  return [x / length, y / length, z / length];
}

/**
 * 태양 파라미터를 계산합니다 (통합 함수).
 *
 * @param settings - Lighting 설정
 * @returns SunParameters, 또는 밤이면 null
 */
export function computeSunParameters(
  settings: LightingSettings
): SunParameters | null {
  const {
    timeOfDay,
    isDaytime,
    season,
    roomOrientation,
    latitude = DEFAULT_LATITUDE,
    longitude = DEFAULT_LONGITUDE,
    overrideSunColor,
  } = settings;

  // isDaytime이 false면 즉시 null 반환
  if (!isDaytime) {
    return null;
  }

  // 태양 위치 계산
  const sunPos = getSunPosition(timeOfDay, season, latitude, longitude);

  // Altitude가 음수면 밤 → null 반환
  if (sunPos.altitude < 0) {
    return null;
  }

  const { altitude, azimuth } = sunPos;

  // 방향 벡터 계산
  const correctedAzimuth = azimuth + ORIENTATION_OFFSET[roomOrientation];
  const x = Math.cos(altitude) * Math.sin(correctedAzimuth);
  const y = -Math.sin(altitude);
  const z = Math.cos(altitude) * Math.cos(correctedAzimuth);
  const length = Math.sqrt(x * x + y * y + z * z);
  const direction: Vec3 = [x / length, y / length, z / length];

  // 강도 계산 (물리 기반)
  const intensity = calculateSunIntensity(altitude);

  // 색상 계산 (오버라이드 또는 자동 계산)
  const color: Vec3 = overrideSunColor ?? calculateSunColor(altitude);

  return {
    direction,
    color,
    intensity,
    altitude,
    azimuth: correctedAzimuth,
  };
}

// ============================================
// 하위 호환성을 위한 레거시 함수
// (기존 SunCalculator.ts의 API 유지)
// ============================================

/**
 * @deprecated Use computeSunParameters instead
 * 태양광 파라미터를 한 번에 계산합니다 (통합 함수).
 */
export function calculateSunLightParams(
  timeOfDay: number,
  isDaytime: boolean,
  season: LightingSettings['season'],
  roomOrientation: LightingSettings['roomOrientation'],
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): { direction: Vec3; color: Vec3; intensity: number } | null {
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

  const result = computeSunParameters(settings);

  if (!result) {
    return null;
  }

  return {
    direction: result.direction,
    color: result.color,
    intensity: result.intensity,
  };
}
