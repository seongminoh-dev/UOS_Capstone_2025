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

  // ─────────────────────────────────────────────
  // Asset 로딩 단계 전용 필드 (phase === 'loadAssets' 일 때만 유효)
  // ─────────────────────────────────────────────

  /** 로딩 완료된 asset 수 */
  loadedCount?: number;
  /** 전체 로딩할 asset 수 */
  totalCount?: number;
  /** 현재 로딩 중인 asset의 표시 이름 (예: "Wooden Chair") */
  currentAssetName?: string;
  /** 현재 로딩 중인 asset의 경로/ID (예: "models/chair.glb") */
  currentAssetPath?: string;
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
  createAdapter: { label: 'Searching GPU adapter', labelKo: 'GPU 어댑터 검색 중' },
  initDevice: { label: 'Initializing GPU device', labelKo: 'GPU 디바이스 초기화 중' },
  initContext: { label: 'Configuring render context', labelKo: '렌더링 Context 구성 중' },
  loadAssets: { label: 'Loading assets', labelKo: '리소스 로딩 중' },
  buildPipelines: { label: 'Building render pipelines', labelKo: '렌더링 파이프라인 빌드 중' },
  warmup: { label: 'Preparing first render', labelKo: '첫 렌더링 준비 중' },
};

/** 총 단계 수 */
export const TOTAL_INIT_STEPS = 7;

// ─────────────────────────────────────────────
// 타입 가드 헬퍼
// ─────────────────────────────────────────────

/** loadAssets 단계인지 확인하고 asset 정보가 있는지 체크 */
export function isAssetLoadingProgress(
  progress: InitProgress
): progress is InitProgress & {
  loadedCount: number;
  totalCount: number;
} {
  return (
    progress.phase === 'loadAssets' &&
    typeof progress.loadedCount === 'number' &&
    typeof progress.totalCount === 'number'
  );
}
