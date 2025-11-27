/**
 * Scene 타입 정의
 * - SceneAsset, Scene 인터페이스
 * - Structs.ts에서 분리하여 순환 참조 방지
 * - SceneFrontend: 프론트엔드 전용 확장 타입 (room, sunSettings, camera)
 */

// Asset 타입 (내부용 - directional-light 포함)
export type AssetType = 'object' | 'directional-light' | 'point-light' | 'rect-light';

// 사용자가 추가 가능한 Asset 타입 (directional-light 제외)
export type UserAssetType = 'object' | 'point-light' | 'rect-light';

// 계절
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// 방 방향
export type RoomOrientation = 'north' | 'south' | 'east' | 'west';

// Transform (Object/Room용)
export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in degrees
  scale: [number, number, number];
}

// 방 설정 (편집 불가능한 기본 Object)
export interface RoomSettings {
  meshName: string;           // GLB 파일명 ('Bedroom', 'LivingRoom' 등)
  locked: true;               // UI에서 편집 불가 플래그 (항상 true)
  transform: Transform;       // 위치, 회전, 크기

  // 추후 확장 가능 (Optional)
  floorReflectivity?: number;        // 바닥 반사율 (0.0~1.0, SSR용)
  wallColor?: [number, number, number]; // 벽 색상 오버라이드 (RGB 0-1)
  ambientOcclusion?: number;         // AO 강도 (0.0~1.0)
}

// 하늘 모드
export type SkyMode = 0 | 1 | 2;  // 0=없음(회색), 1=일반 하늘, 2=고품질 하늘

// 태양광 설정
export interface SunSettings {
  timeOfDay: number;              // 0~100 (0=자정, 50=정오, 100=자정)
  isDaytime: boolean;             // 낮/밤 토글
  season: Season;                 // 계절
  roomOrientation: RoomOrientation; // 방 방향
  skyMode: SkyMode;               // 0=없음, 1=일반 하늘, 2=고품질 하늘
  envIndirectMultiplier: number;  // 환경 간접광 강도 (0.0~1.0)
}

// 카메라 설정
export interface CameraSettings {
  position: [number, number, number];  // 카메라 위치
  target: [number, number, number];    // 바라보는 지점 (lookAt)
  fov?: number;                        // Field of View (degrees, 기본 45)

  // 추후 확장 가능
  near?: number;  // Near clipping plane
  far?: number;   // Far clipping plane
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

/**
 * SceneFrontend - 프론트엔드 전용 확장 Scene 타입
 * - room: 필수 기본 방 (편집 불가능)
 * - sunSettings: 필수 태양광 설정
 * - camera: 선택적 카메라 설정
 * - assets: 가구 + 추가 조명만 포함 (태양광 제외)
 */
export interface SceneFrontend extends Scene {
  room: RoomSettings;         // 필수: 기본 방 설정 (locked)
  sunSettings: SunSettings;   // 필수: 태양광 설정
  camera?: CameraSettings;    // 선택: 기본 카메라 위치 (없으면 기본값 사용)
}
