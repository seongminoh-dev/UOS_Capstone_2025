/**
 * Lighting Module - 통합 export
 *
 * Sun/Sky/Environment 관련 모든 기능을 이 모듈에서 제공합니다.
 *
 * 사용법:
 *   import { computeLighting, LightingSettings } from '../lighting';
 *   import { SUN_INTENSITY_MULTIPLIER } from '../lighting';
 */

// ============================================
// Types
// ============================================

export type {
  // Basic types
  Vec3,
  Season,
  RoomOrientation,
  SkyMode,
  SunSettings,

  // Sun types
  SunParameters,

  // Environment types
  EnvironmentParameters,

  // Lighting types
  LightingSettings,
  LightingResult,

  // GPU data types
  DirectionalLightData,
  EnvironmentUniformData,
} from './LightingTypes';

// ============================================
// Constants
// ============================================

export {
  // Location
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE,

  // Color temperature
  MIN_COLOR_TEMPERATURE,
  MAX_COLOR_TEMPERATURE,

  // Sun intensity
  SUN_INTENSITY_MULTIPLIER,

  // Environment intensity
  MIN_ENV_INTENSITY,
  MAX_ENV_INTENSITY,
  ENV_INTENSITY_BASE,
  ENV_INTENSITY_RANGE,
  DEFAULT_ENV_INDIRECT_MULT,
  ENV_INDIRECT_INTENSITY,

  // Sky colors
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

  // Season/Orientation mappings
  SEASON_DATES,
  ORIENTATION_OFFSET,

  // Defaults
  DEFAULT_SKY_MODE,
  SUNSET_THRESHOLD,
  TWILIGHT_ALTITUDE_LIMIT,

  // Ground reflection
  GROUND_SKY_FACTOR_R,
  GROUND_SKY_FACTOR_G,
  GROUND_SKY_FACTOR_B,
  GROUND_OFFSET_R,
  GROUND_OFFSET_G,
  GROUND_OFFSET_B,
} from './LightingConstants';

// ============================================
// Sun Model
// ============================================

export {
  // Main API
  computeSunParameters,

  // Utilities
  getSunAltitudeDegrees,
  isSunAboveHorizon,
  calculateSunIntensity,
  calculateSunColor,
  calculateSunDirection,

  // Legacy (deprecated)
  calculateSunLightParams,
} from './SunModel';

// ============================================
// Sky/Environment Model
// ============================================

export {
  // Main API
  computeEnvironmentParameters,

  // Legacy (deprecated)
  calculateEnvironmentParams,
} from './SkyEnvironmentModel';

// ============================================
// Unified Lighting Model
// ============================================

export {
  // Main API
  computeLighting,

  // Converters
  sunSettingsToLightingSettings,
  extractDirectionalLightData,
  extractEnvironmentUniformData,

  // State checkers
  isDay,
  isTwilight,
  isNight,
  isSunsetOrSunrise,

  // Debug
  lightingToDebugString,
} from './LightingModel';
