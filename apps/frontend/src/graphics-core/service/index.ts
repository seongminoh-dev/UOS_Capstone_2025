/**
 * Graphics Core - Public Service API
 * React 컴포넌트에서 사용하는 공개 API
 */

// Scene 타입 re-export
export type {
  AssetType,
  Transform,
  DirectionalLightParams,
  PointLightParams,
  RectLightParams,
  SceneAsset,
  Scene,
  SceneListItem,
} from './Scene';

// WebGPUEngine export
export { WebGPUEngine } from './WebGPUEngine';

// InitProgress 타입 및 상수 export
export type {
  InitPhase,
  InitProgress,
  InitializeOptions,
  OnProgressCallback,
} from './types/InitProgress';
export { PHASE_METADATA, TOTAL_INIT_STEPS } from './types/InitProgress';
