/**
 * 중앙 Asset Registry
 * - MainPage (WebGPU)와 EditPage (Three.js)가 공유
 * - 모든 GLB Asset의 메타데이터 관리
 *
 * 새 GLB 추가 방법:
 * 1. /public/assets/에 GLB 파일 추가
 * 2. 아래 배열에 메타데이터 추가
 * 3. 자동으로 양쪽 렌더러에서 사용 가능
 */

import type { AssetMetadata, AssetCategory, FurnitureSubCategory, RoomConfig } from './AssetTypes';

/**
 * 기본 Room 설정 (fallback)
 */
const DEFAULT_ROOM_CONFIG: RoomConfig = {
  scale: [1, 1, 1],
  camera: {
    position: [5, 5, 5],
    target: [0, 1, 0],
    fov: 45,
  },
};

/**
 * 전체 Asset Registry
 */
export const ASSET_REGISTRY: AssetMetadata[] = [
  // ===== Room (방 구조) =====
  {
    name: '벽면이 없는 작은 방',
    meshName: 'TestScene',
    category: 'room',
    icon: '🏠',
    isRequired: true,
    description: '한쪽 벽면이 없는 작은 방입니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [0.06, 2.12, 7.38],
        target: [-0.1, -0.22, 0.06],
        fov: 50,
      },
    },
  },
  {
    name: '침실(안방)',
    meshName: 'BedroomEdit',
    category: 'room',
    icon: '🛏️',
    description: '침대, 책상, 의자, 옷장을 포함하는 창문이 없는 방입니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [6.83, 3.49, -0.33],
        target: [0, 0, 0],
        fov: 60,
      },
    },
  },
  {
    name: '욕실',
    meshName: 'Bathroom',
    category: 'room',
    icon: '🚿',
    description: '샤워기, 세면대를 포함하는 욕실 방입니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [100, 100, 100],
        target: [0, 0.5, 0],
        fov: 50,
      },
    },
  },
 
  // ===== Furniture > Seating (앉는 가구) =====
  {
    name: '의자',
    meshName: 'Chair',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🪑',
    tags: ['seating', '앉기', '의자'],
    description: '기본 의자',
  },
  {
    name: '소파',
    meshName: 'Sofa',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🛋️',
    tags: ['seating', '앉기', '소파'],
    description: '편안한 소파',
  },
  {
    name: '테스트 소파',
    meshName: 'TEST_Sofa',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🛋️',
    tags: ['seating', 'test'],
    description: '테스트용 소파',
  },
  {
    name: '벤치',
    meshName: 'Bench',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🪑',
    tags: ['seating', '앉기', '벤치'],
    description: '긴 벤치',
  },

  // ===== Lighting (조명 기구) =====
  {
    name: '램프',
    meshName: 'Lamp',
    category: 'lighting',
    icon: '💡',
    description: '스탠드 램프',
  },

  // ===== Decoration (장식) =====
  {
    name: '창문',
    meshName: 'Window',
    category: 'decoration',
    icon: '🪟',
    tags: ['window', '창문'],
    description: '기본 창문',
  },
  {
    name: '순수 창문',
    meshName: 'PureWindow',
    category: 'decoration',
    icon: '🪟',
    tags: ['window', '창문'],
    description: '투명 창문',
  },
  {
    name: '가짜 창문',
    meshName: 'FakeWindow',
    category: 'decoration',
    icon: '🪟',
    tags: ['window', '창문'],
    description: '장식용 창문',
  },
  {
    name: '거울',
    meshName: 'Mirror',
    category: 'decoration',
    icon: '🪞',
    tags: ['mirror', '거울'],
    description: '벽걸이 거울',
  },
  {
    name: '유리컵',
    meshName: 'Glass',
    category: 'decoration',
    icon: '🥃',
    tags: ['glass', '컵'],
    description: '투명 유리컵',
  },
  {
    name: '스타벅스 컵',
    meshName: 'StarbucksCup',
    category: 'decoration',
    icon: '☕',
    tags: ['cup', '컵', 'starbucks'],
    description: '스타벅스 커피 컵',
  },
  {
    name: '컵 세트',
    meshName: 'Cups',
    category: 'decoration',
    icon: '☕',
    tags: ['cup', '컵'],
    description: '여러 개의 컵',
  },
];

/**
 * GLB 파일 경로 생성
 */
export function getAssetPath(meshName: string): string {
  return `/assets/${meshName}.glb`;
}

/**
 * meshName으로 Asset 메타데이터 찾기
 */
export function getAssetMetadata(meshName: string): AssetMetadata | undefined {
  return ASSET_REGISTRY.find((asset) => asset.meshName === meshName);
}

/**
 * 카테고리별 Asset 필터링
 */
export function getAssetsByCategory(category: AssetCategory): AssetMetadata[] {
  return ASSET_REGISTRY.filter((asset) => asset.category === category);
}

/**
 * 가구 서브카테고리별 Asset 필터링
 */
export function getFurnitureBySubCategory(subCategory: FurnitureSubCategory): AssetMetadata[] {
  return ASSET_REGISTRY.filter(
    (asset) => asset.category === 'furniture' && asset.subCategory === subCategory
  );
}

/**
 * 모든 사용 가능한 meshName 목록
 */
export function getAllAvailableMeshNames(): string[] {
  return ASSET_REGISTRY.map((asset) => asset.meshName);
}

/**
 * 필수 Asset인지 확인 (삭제 불가)
 */
export function isRequiredAsset(meshName: string): boolean {
  const metadata = getAssetMetadata(meshName);
  return metadata?.isRequired === true;
}

/**
 * 카테고리 표시 이름
 */
export function getCategoryDisplayName(category: AssetCategory): string {
  const names: Record<AssetCategory, string> = {
    room: '방 구조',
    furniture: '가구',
    lighting: '조명',
    decoration: '장식',
  };
  return names[category];
}

/**
 * 서브카테고리 표시 이름
 */
export function getSubCategoryDisplayName(subCategory: FurnitureSubCategory): string {
  const names: Record<FurnitureSubCategory, string> = {
    seating: '앉는 가구',
    table: '테이블',
    storage: '수납',
    bed: '침대',
    other: '기타',
  };
  return names[subCategory];
}

/**
 * Room 설정 가져오기 (scale, camera 등)
 * roomConfig가 없으면 기본값 반환
 */
export function getRoomConfig(meshName: string): RoomConfig {
  const metadata = getAssetMetadata(meshName);
  return metadata?.roomConfig || DEFAULT_ROOM_CONFIG;
}
