/**
 * Scene 타입 정의
 * - SceneAsset, Scene 인터페이스
 * - Structs.ts에서 분리하여 순환 참조 방지
 */

// Asset 타입
export type AssetType = 'object' | 'directional-light' | 'point-light' | 'rect-light';

// Transform (Object용)
export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in degrees
  scale: [number, number, number];
}

// Light Parameters
export interface DirectionalLightParams {
  direction: [number, number, number];
  color: [number, number, number]; // RGB 0-1
  intensity: number;
}

export interface PointLightParams {
  position: [number, number, number];
  color: [number, number, number]; // RGB 0-1
  intensity: number;
}

export interface RectLightParams {
  position: [number, number, number];
  u: [number, number, number]; // 첫 번째 모서리 벡터
  v: [number, number, number]; // 두 번째 모서리 벡터
  color: [number, number, number]; // RGB 0-1
  intensity: number;
}

// Scene Asset (Object 또는 Light)
export interface SceneAsset {
  id: string | number; // 고유 식별자 (예: "chair_0", "light_1")
  type: AssetType;

  // Object용 필드
  meshName?: string; // GLB 파일명 (예: "Chair", "TestScene")
  transform?: Transform;

  // Light용 필드
  lightParams?: DirectionalLightParams | PointLightParams | RectLightParams;
}

// Scene 정의 (Backend CRUD 호환)
export interface Scene {
  id: string | number; // UUID 또는 auto-increment
  name: string;
  description?: string; // 선택적 설명
  thumbnailUrl?: string; // 썸네일 이미지 URL
  assets: SceneAsset[];
  username?: string; // 소유자 username
  createdAt?: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp
}

// Scene 목록 조회용 (가벼운 버전)
export interface SceneListItem {
  id: string | number;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  assetCount: number; // assets.length
  createdAt?: string;
  updatedAt?: string;
}
