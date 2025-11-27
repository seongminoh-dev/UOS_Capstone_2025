/**
 * SunCalculator - 태양 위치 계산 유틸리티
 *
 * SunCalc 라이브러리를 사용하여 시간, 계절, 방 방향에 따른 태양의 방향 벡터를 계산합니다.
 *
 * 설계 원칙:
 * - timeOfDay 0-100 → 0-24시 단순 매핑 (50 = 정오)
 * - 밤(태양이 지평선 아래)에는 null 반환 → 인공 조명만 사용
 */

import * as SunCalc from 'suncalc';
import kelvinToRgb from 'kelvin-to-rgb';
import type { Season, RoomOrientation } from '../graphics-core/service/Scene';

// 기본 위치: 서울
const DEFAULT_LATITUDE = 37.5665;
const DEFAULT_LONGITUDE = 126.9780;

/**
 * 계절에 따른 대표 날짜
 * - 춘분/하지/추분/동지를 기준으로 설정
 */
const SEASON_DATES: Record<Season, { month: number; day: number }> = {
  spring: { month: 2, day: 21 },  // 3월 21일 (춘분)
  summer: { month: 5, day: 21 },  // 6월 21일 (하지)
  autumn: { month: 8, day: 21 },  // 9월 21일 (추분)
  winter: { month: 11, day: 21 }, // 12월 21일 (동지)
};

/**
 * 방 방향에 따른 방위각 오프셋
 * - 북쪽을 기준으로 시계방향 회전
 */
const ORIENTATION_OFFSET: Record<RoomOrientation, number> = {
  north: 0,                // 북쪽 (0도)
  east: Math.PI / 2,       // 동쪽 (90도)
  south: Math.PI,          // 남쪽 (180도)
  west: -Math.PI / 2,      // 서쪽 (-90도)
};

/**
 * 색온도 범위 (Kelvin)
 * - 지평선 근처: 붉은 노을
 * - 천정: 태양 표면 온도
 */
const MIN_COLOR_TEMPERATURE = 1800; // 지평선 (붉은 노을)
const MAX_COLOR_TEMPERATURE = 5800; // 천정 (태양 표면 온도)

/**
 * SunSettings로부터 태양의 방향 벡터를 계산합니다.
 *
 * @param timeOfDay - 하루 중 시간 (0-100, 0=자정, 50=정오, 100=자정)
 * @param isDaytime - 낮/밤 토글 (false면 강제로 null 반환)
 * @param season - 계절 (spring/summer/autumn/winter)
 * @param roomOrientation - 방 방향 (north/south/east/west)
 * @param latitude - 위도 (기본값: 서울)
 * @param longitude - 경도 (기본값: 서울)
 * @returns [x, y, z] 방향 벡터 (정규화됨), 또는 밤이면 null
 */
export function calculateSunDirection(
  timeOfDay: number,
  isDaytime: boolean,
  season: Season,
  roomOrientation: RoomOrientation,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): [number, number, number] | null {
  // 1. isDaytime이 false면 즉시 null 반환 (밤 모드)
  if (!isDaytime) {
    return null;
  }

  // 2. 시간 계산 (timeOfDay 0-100 → 0-24시)
  const hour = (timeOfDay / 100) * 24;

  // 3. 계절에 따른 날짜 생성
  const seasonDate = SEASON_DATES[season];
  const date = new Date(2024, seasonDate.month, seasonDate.day);
  date.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

  // 4. 태양 위치 계산
  const sunPos = SunCalc.getPosition(date, latitude, longitude);

  // 5. Altitude가 음수(지평선 아래)이면 밤 → null 반환
  if (sunPos.altitude < 0) {
    return null;
  }

  // 6. Azimuth/Altitude → Direction Vector 변환
  const azimuth = sunPos.azimuth;
  const altitude = sunPos.altitude;

  // 7. 방 방향에 따른 회전 보정
  const correctedAzimuth = azimuth + ORIENTATION_OFFSET[roomOrientation];

  // 8. 구면 좌표 → 직교 좌표 변환
  // SunCalc의 azimuth: 남쪽=0, 시계방향 증가
  // Three.js/WebGPU 좌표계: Y-up, Z-forward
  const x = Math.cos(altitude) * Math.sin(correctedAzimuth);
  const y = -Math.sin(altitude); // 위에서 아래로 (음수)
  const z = Math.cos(altitude) * Math.cos(correctedAzimuth);

  // 9. 정규화 (이미 정규화되어 있지만 안전을 위해)
  const length = Math.sqrt(x * x + y * y + z * z);
  return [x / length, y / length, z / length];
}

/**
 * 태양의 고도각(도)을 반환합니다.
 * - UI 표시나 조명 강도 조절에 사용 가능
 *
 * @returns 고도각 (degrees, -90 ~ 90)
 */
export function getSunAltitudeDegrees(
  timeOfDay: number,
  season: Season,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): number {
  const hour = (timeOfDay / 100) * 24;
  const seasonDate = SEASON_DATES[season];
  const date = new Date(2024, seasonDate.month, seasonDate.day);
  date.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

  const sunPos = SunCalc.getPosition(date, latitude, longitude);
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
  season: Season,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): boolean {
  if (!isDaytime) return false;

  const hour = (timeOfDay / 100) * 24;
  const seasonDate = SEASON_DATES[season];
  const date = new Date(2024, seasonDate.month, seasonDate.day);
  date.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

  const sunPos = SunCalc.getPosition(date, latitude, longitude);
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
 * 태양의 색온도를 계산합니다 (고도각 기반 보간).
 *
 * @param altitude - 태양 고도 (radians)
 * @returns RGB 색상 [r, g, b] (0-1 정규화)
 */
export function calculateSunColor(altitude: number): [number, number, number] {
  if (altitude < 0) {
    // 밤
    return [0, 0, 0];
  }

  // 고도각 → Kelvin 선형 보간
  const t = Math.max(0, Math.sin(altitude)); // 0-1
  const kelvin = MIN_COLOR_TEMPERATURE + (MAX_COLOR_TEMPERATURE - MIN_COLOR_TEMPERATURE) * t;

  // Kelvin → RGB 변환
  const [r, g, b] = kelvinToRgb(kelvin);

  // 0-255 → 0-1 정규화
  return [r / 255, g / 255, b / 255];
}

/**
 * DirectionalLight Parameters 인터페이스
 */
export interface DirectionalLightParams {
  direction: [number, number, number];
  color: [number, number, number];
  intensity: number;
}

/**
 * 환경광 파라미터 인터페이스 (물리 기반)
 */
export interface EnvironmentParams {
  // 하늘 기본색 (Rayleigh 산란 결과)
  skyColor: [number, number, number];
  // 지평선 색상 (대기 경로 길이에 따른 색상)
  horizonColor: [number, number, number];
  // 지면 반사색
  groundColor: [number, number, number];
  // 태양 방향 (정규화)
  sunDirection: [number, number, number];
  // 태양 강도 (0-1, 고도 기반)
  sunIntensity: number;
  // 환경광 전체 강도
  environmentIntensity: number;
}

/**
 * 선형 보간 헬퍼 함수
 */
function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * clampedT,
    a[1] + (b[1] - a[1]) * clampedT,
    a[2] + (b[2] - a[2]) * clampedT,
  ];
}

/**
 * 물리 기반 환경 파라미터를 계산합니다.
 * Rayleigh/Mie 산란을 근사하여 시간대별 하늘색을 계산합니다.
 *
 * 물리적 원리:
 * - Rayleigh Scattering: λ^-4 법칙, 파란색이 더 많이 산란 → 낮 하늘이 파란 이유
 * - Mie Scattering: 태양 주변 밝은 광채(aureole) 형성
 * - 대기 경로 길이: 태양이 낮을수록 빛이 대기를 더 많이 통과 → 붉은색
 *
 * @param timeOfDay - 하루 중 시간 (0-100)
 * @param isDaytime - 낮/밤 토글
 * @param season - 계절
 * @param roomOrientation - 방 방향
 * @returns 환경 파라미터
 */
export function calculateEnvironmentParams(
  timeOfDay: number,
  isDaytime: boolean,
  season: Season,
  roomOrientation: RoomOrientation,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): EnvironmentParams {
  // 기본 밤 색상 (어두운 청색 - 달빛/별빛 효과)
  const nightSkyColor: [number, number, number] = [0.02, 0.02, 0.06];
  const nightHorizonColor: [number, number, number] = [0.03, 0.03, 0.05];
  const nightGroundColor: [number, number, number] = [0.01, 0.01, 0.02];

  // 밤 모드 (isDaytime = false)
  if (!isDaytime) {
    return {
      skyColor: nightSkyColor,
      horizonColor: nightHorizonColor,
      groundColor: nightGroundColor,
      sunDirection: [0, -1, 0], // 아래 방향 (태양 없음)
      sunIntensity: 0,
      environmentIntensity: 0.02,
    };
  }

  // 시간 및 태양 위치 계산
  const hour = (timeOfDay / 100) * 24;
  const seasonDate = SEASON_DATES[season];
  const date = new Date(2024, seasonDate.month, seasonDate.day);
  date.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

  const sunPos = SunCalc.getPosition(date, latitude, longitude);
  const altitude = sunPos.altitude;
  const azimuth = sunPos.azimuth;

  // 태양 방향 계산 (방 방향 보정 포함)
  const correctedAzimuth = azimuth + ORIENTATION_OFFSET[roomOrientation];
  const sunDirX = Math.cos(altitude) * Math.sin(correctedAzimuth);
  const sunDirY = -Math.sin(altitude);
  const sunDirZ = Math.cos(altitude) * Math.cos(correctedAzimuth);
  const sunDirection: [number, number, number] = [sunDirX, sunDirY, sunDirZ];

  // 밤 (태양이 지평선 아래)
  if (altitude < 0) {
    // 박명(twilight) 효과: 태양이 지평선 바로 아래일 때
    const twilightFactor = Math.max(0, 1 + altitude * 3); // -0.33rad에서 0

    const twilightSkyColor: [number, number, number] = [0.08, 0.05, 0.15];
    const twilightHorizonColor: [number, number, number] = [0.2, 0.1, 0.15];

    return {
      skyColor: lerpVec3(nightSkyColor, twilightSkyColor, twilightFactor),
      horizonColor: lerpVec3(nightHorizonColor, twilightHorizonColor, twilightFactor),
      groundColor: lerpVec3(nightGroundColor, [0.02, 0.02, 0.03], twilightFactor),
      sunDirection,
      sunIntensity: 0,
      environmentIntensity: 0.02 + twilightFactor * 0.1,
    };
  }

  // 낮: 물리 기반 색상 계산
  // t = 0 (지평선) ~ 1 (천정)
  const t = Math.sin(altitude);

  // === Rayleigh Scattering 근사 ===
  // 높은 고도: 깊은 파란색 (Rayleigh 우세)
  // 낮은 고도: 옅은 파란색/흰색
  const zenithBlue: [number, number, number] = [0.15, 0.35, 0.65];  // 천정 (깊은 파랑)
  const horizonBlue: [number, number, number] = [0.5, 0.6, 0.75];   // 지평선 (옅은 파랑)

  // === 일출/일몰 색상 (대기 경로 길이 효과) ===
  // 태양이 낮을 때: 긴 대기 경로 → 파란색 산란 → 붉은색/주황색 도달
  const sunsetHorizon: [number, number, number] = [0.9, 0.4, 0.2];  // 일몰 지평선 (주황)
  const sunsetSky: [number, number, number] = [0.6, 0.35, 0.5];     // 일몰 하늘 (보라/분홍)

  // 일출/일몰 혼합 factor (태양 고도 15도 이하에서 강해짐)
  const sunsetFactor = Math.pow(Math.max(0, 1 - t * 4), 2); // 0~0.25rad에서 효과

  // 하늘색 계산: Rayleigh + 일몰 효과
  const baseSkyColor = lerpVec3(horizonBlue, zenithBlue, t);
  const skyColor = lerpVec3(baseSkyColor, sunsetSky, sunsetFactor * 0.6);

  // 지평선색 계산: 기본 + 일몰 효과
  const baseHorizonColor = lerpVec3([0.6, 0.65, 0.8], horizonBlue, t);
  const horizonColor = lerpVec3(baseHorizonColor, sunsetHorizon, sunsetFactor);

  // === 지면 반사색 ===
  // 하늘색의 영향을 받음 (ambient occlusion 효과)
  const groundColor: [number, number, number] = [
    skyColor[0] * 0.15 + 0.05,
    skyColor[1] * 0.18 + 0.08,
    skyColor[2] * 0.12 + 0.03,
  ];

  // 태양 강도: sin(altitude) 기반 (물리적으로 정확)
  const sunIntensity = Math.max(0, Math.sin(altitude));

  // 환경광 전체 강도
  const environmentIntensity = 0.3 + t * 0.7; // 0.3 ~ 1.0

  return {
    skyColor,
    horizonColor,
    groundColor,
    sunDirection,
    sunIntensity,
    environmentIntensity,
  };
}

/**
 * 태양광 파라미터를 한 번에 계산합니다 (통합 함수).
 *
 * @returns DirectionalLight 파라미터, 또는 밤이면 null
 */
export function calculateSunLightParams(
  timeOfDay: number,
  isDaytime: boolean,
  season: Season,
  roomOrientation: RoomOrientation,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): DirectionalLightParams | null {
  // 1. isDaytime이 false면 즉시 null 반환
  if (!isDaytime) {
    return null;
  }

  // 2. 시간 계산
  const hour = (timeOfDay / 100) * 24;

  // 3. 계절에 따른 날짜 생성
  const seasonDate = SEASON_DATES[season];
  const date = new Date(2024, seasonDate.month, seasonDate.day);
  date.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

  // 4. 태양 위치 계산
  const sunPos = SunCalc.getPosition(date, latitude, longitude);

  // 5. Altitude가 음수면 밤 → null 반환
  if (sunPos.altitude < 0) {
    return null;
  }

  const { altitude, azimuth } = sunPos;

  // 6. Direction Vector 계산
  const correctedAzimuth = azimuth + ORIENTATION_OFFSET[roomOrientation];
  const x = Math.cos(altitude) * Math.sin(correctedAzimuth);
  const y = -Math.sin(altitude);
  const z = Math.cos(altitude) * Math.cos(correctedAzimuth);
  const length = Math.sqrt(x * x + y * y + z * z);
  const direction: [number, number, number] = [x / length, y / length, z / length];

  // 7. Intensity 계산 (물리 기반)
  const intensity = calculateSunIntensity(altitude);

  // 8. Color 계산 (색온도 기반)
  const color = calculateSunColor(altitude);

  return {
    direction,
    color,
    intensity,
  };
}
