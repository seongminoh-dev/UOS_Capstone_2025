/**
 * WebGPU 에러 타입 정의
 *
 * 이 파일은 WebGPU 초기화 및 런타임에서 발생할 수 있는 다양한 에러를
 * 구조화된 형태로 정의합니다. InitProgress.ts와 별도로 분리한 이유:
 * - 에러는 초기화 이후 런타임에서도 발생할 수 있음
 * - 에러 타입은 UI 레이어(ErrorBoundary, WebGPURenderer)에서도 참조됨
 * - 관심사 분리로 유지보수성 향상
 */

/**
 * WebGPU 에러 코드 타입
 *
 * - WEBGPU_NOT_SUPPORTED: 브라우저가 WebGPU API를 지원하지 않음
 * - ADAPTER_NOT_FOUND: GPU 어댑터를 찾을 수 없음 (가상 환경, 드라이버 문제 등)
 * - DEVICE_REQUEST_FAILED: GPU 디바이스 생성 실패
 * - GPU_LOST: GPU 연결 끊김 (device.lost 발생)
 * - SHADER_COMPILE_ERROR: 셰이더 컴파일/파이프라인 생성 실패
 * - OUT_OF_MEMORY: GPU 메모리 부족
 * - UNKNOWN: 분류되지 않은 기타 에러
 */
export type WebGPUErrorCode =
  | 'WEBGPU_NOT_SUPPORTED'
  | 'ADAPTER_NOT_FOUND'
  | 'DEVICE_REQUEST_FAILED'
  | 'GPU_LOST'
  | 'SHADER_COMPILE_ERROR'
  | 'OUT_OF_MEMORY'
  | 'UNKNOWN';

/**
 * WebGPU 에러 클래스
 *
 * 일반 Error를 확장하여 에러 코드와 원본 에러를 포함합니다.
 */
export class WebGPUError extends Error {
  public readonly code: WebGPUErrorCode;
  public readonly originalError?: Error;

  constructor(code: WebGPUErrorCode, message: string, originalError?: Error) {
    super(message);
    this.name = 'WebGPUError';
    this.code = code;
    this.originalError = originalError;

    // Error 클래스 상속 시 프로토타입 체인 유지
    Object.setPrototypeOf(this, WebGPUError.prototype);
  }
}

/**
 * WebGPUError 타입 가드
 *
 * @param value - 검사할 값
 * @returns value가 WebGPUError인지 여부
 */
export function isWebGPUError(value: unknown): value is WebGPUError {
  return value instanceof WebGPUError;
}

/**
 * WebGPUErrorCode를 ErrorBoundary의 에러 타입으로 매핑
 *
 * ErrorBoundary에서 사용하는 문자열 키와 호환성을 유지하기 위한 매핑 함수입니다.
 */
export function mapWebGPUErrorCodeToLegacy(code: WebGPUErrorCode): string {
  const mapping: Record<WebGPUErrorCode, string> = {
    WEBGPU_NOT_SUPPORTED: 'webgpu_not_supported',
    ADAPTER_NOT_FOUND: 'adapter_not_found',
    DEVICE_REQUEST_FAILED: 'device_request_failed',
    GPU_LOST: 'webgpu_device_lost',
    SHADER_COMPILE_ERROR: 'shader_compilation',
    OUT_OF_MEMORY: 'webgpu_out_of_memory',
    UNKNOWN: 'unknown',
  };
  return mapping[code];
}
