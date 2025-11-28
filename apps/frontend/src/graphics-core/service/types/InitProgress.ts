/**
 * WebGPU 초기화 단계별 프로그레스 타입 정의
 */

/** 초기화 단계 Phase 타입 */
export type InitPhase =
  | 'checkSupport'    // WebGPU 지원 확인
  | 'createAdapter'   // GPU 어댑터 생성
  | 'initDevice'      // GPU 디바이스 초기화
  | 'initContext'     // Canvas Context 구성
  | 'loadAssets'      // 모델/텍스처 로딩
  | 'buildPipelines'  // Shader/Pipeline 빌드
  | 'warmup';         // Warm-up 렌더링

/** 초기화 진행 상황 정보 */
export interface InitProgress {
  /** 현재 단계 */
  phase: InitPhase;
  /** 현재 단계 번호 (1-based) */
  step: number;
  /** 총 단계 수 */
  totalSteps: number;
  /** 사용자에게 표시할 메시지 (선택) */
  message?: string;
}

/** 진행 상황 콜백 함수 타입 */
export type OnProgressCallback = (progress: InitProgress) => void;

/** 초기화 옵션 */
export interface InitializeOptions {
  /** 진행 상황 콜백 */
  onProgress?: OnProgressCallback;
}

/** Phase별 메타데이터 */
export const PHASE_METADATA: Record<InitPhase, { label: string; labelKo: string }> = {
  checkSupport: { label: 'Checking WebGPU support', labelKo: 'WebGPU 지원 확인 중' },
  createAdapter: { label: 'Creating GPU adapter', labelKo: 'GPU 어댑터 생성 중' },
  initDevice: { label: 'Initializing device', labelKo: '디바이스 초기화 중' },
  initContext: { label: 'Configuring context', labelKo: 'Context 구성 중' },
  loadAssets: { label: 'Loading assets', labelKo: '모델·텍스처 로딩 중' },
  buildPipelines: { label: 'Building pipelines', labelKo: 'Shader/Pipeline 빌드 중' },
  warmup: { label: 'Warming up renderer', labelKo: '렌더러 준비 중' },
};

/** 총 단계 수 */
export const TOTAL_INIT_STEPS = 7;
