/**
 * ============================================
 * Frontend 중앙 설정 파일
 * ============================================
 *
 * 이 파일은 프론트엔드 전체에서 사용되는 설정값들을 중앙 관리합니다.
 * 매직 넘버를 피하고 유지보수성을 높이기 위해 모든 설정값은 이 파일에서 관리합니다.
 *
 * 사용법:
 *   import { CONFIG } from '@/config';
 *   또는
 *   import { CONFIG } from '../config';
 *
 * 주의사항:
 *   - WGSL 셰이더의 상수는 이 파일에서 관리하지 않습니다 (GPU 코드는 런타임 변경 불가)
 *   - 환경별 설정이 필요한 경우 .env 파일과 함께 사용하세요
 */

// ============================================
// 렌더러 설정
// ============================================

export const RENDERER_CONFIG = {
  /**
   * 최소 렌더링 너비 (픽셀)
   * - 이 크기 미만에서는 렌더링을 중단하고 경고 표시
   * - 너무 작은 해상도에서의 성능 저하 방지
   */
  MIN_WIDTH: 512,

  /**
   * 최소 렌더링 높이 (픽셀)
   * - MIN_WIDTH와 함께 4:3 비율 유지
   */
  MIN_HEIGHT: 384,

  /**
   * 최대 내부 렌더링 너비 (픽셀)
   * - WebGPU 내부 해상도 제한 (성능 최적화)
   * - CSS로는 더 크게 표시 가능하지만 실제 렌더링은 이 해상도로 제한
   */
  MAX_WIDTH: 1024,

  /**
   * 최대 내부 렌더링 높이 (픽셀)
   * - MAX_WIDTH와 함께 4:3 비율 유지
   */
  MAX_HEIGHT: 768,

  /**
   * FPS 계산을 위한 프레임 샘플 수
   * - 최근 N개 프레임의 평균으로 FPS 계산
   * - 값이 클수록 안정적이지만 반응이 느림
   */
  FRAME_TIME_SAMPLE_COUNT: 60,
} as const;

// ============================================
// 카메라 컨트롤 설정
// ============================================

export const CAMERA_CONFIG = {
  /**
   * 카메라 이동 속도 (units/second)
   * - WASD 키 입력 시 초당 이동 거리
   * - deltaTime과 곱해서 프레임 독립적 이동 구현
   */
  MOVE_SPEED: 5.0,

  /**
   * 마우스 감도 (degrees/pixel)
   * - 마우스 이동 시 카메라 회전 속도
   * - 값이 클수록 민감하게 반응
   */
  MOUSE_SENSITIVITY: 0.1,
} as const;

// ============================================
// 조명 설정
// ============================================

export const LIGHTING_CONFIG = {
  /**
   * 태양광 강도 배수
   * - SunCalculator에서 계산된 강도에 이 값을 곱함
   * - 실제 물리 기반 값과 렌더링 결과 사이의 조정용
   * - 값을 높이면 태양광이 더 밝아짐
   */
  SUN_INTENSITY_MULTIPLIER: 15,

  /**
   * 최소 색온도 (Kelvin)
   * - 지평선 근처의 태양 색상 (붉은 노을)
   * - 약 1800K = 촛불/일출/일몰 색상
   */
  MIN_COLOR_TEMPERATURE: 1800,

  /**
   * 최대 색온도 (Kelvin)
   * - 천정(정오)의 태양 색상
   * - 약 5800K = 태양 표면 온도 (순백색)
   */
  MAX_COLOR_TEMPERATURE: 5800,
} as const;

// ============================================
// 위치 설정 (태양 위치 계산용)
// ============================================

export const LOCATION_CONFIG = {
  /**
   * 기본 위도 (Seoul, South Korea)
   * - 태양 위치 계산에 사용
   * - 북위 37.5665도
   */
  DEFAULT_LATITUDE: 37.5665,

  /**
   * 기본 경도 (Seoul, South Korea)
   * - 태양 위치 계산에 사용
   * - 동경 126.9780도
   */
  DEFAULT_LONGITUDE: 126.9780,
} as const;

// ============================================
// 통합 설정 객체
// ============================================

/**
 * 모든 설정을 포함하는 통합 객체
 *
 * @example
 * import { CONFIG } from '../config';
 * const speed = CONFIG.camera.MOVE_SPEED;
 */
export const CONFIG = {
  renderer: RENDERER_CONFIG,
  camera: CAMERA_CONFIG,
  lighting: LIGHTING_CONFIG,
  location: LOCATION_CONFIG,
} as const;

// 타입 export (필요시 사용)
export type RendererConfig = typeof RENDERER_CONFIG;
export type CameraConfig = typeof CAMERA_CONFIG;
export type LightingConfig = typeof LIGHTING_CONFIG;
export type LocationConfig = typeof LOCATION_CONFIG;
export type AppConfig = typeof CONFIG;
