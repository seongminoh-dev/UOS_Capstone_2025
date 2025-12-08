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
    name: '작은 방',
    meshName: 'small_room',
    category: 'room',
    icon: '🏠',
    isRequired: true,
    description: '창문이 있는 4평정도의 작은 방 입니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [0.11, 0.90, 1.16],
        target: [0.05, 0.95, -0.24],
        fov: 50,
      },
    },
  },
  {
    name: '안방(침실)',
    meshName: 'bed_room',
    category: 'room',
    icon: '🛏️',
    description: '창문이 있는 8평정도의 침실 방입니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [0.11, 0.90, 1.16],
        target: [0.05, 0.95, -0.24],
        fov: 50,
      },
    },
  },
  {
    name: '거실',
    meshName: 'living_room',
    category: 'room',
    icon: '🏠',
    description: '넓은 창이 있는 14평정도의 넓은 공간입니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [0.11, 0.90, 1.16],
        target: [0.05, 0.95, -0.24],
        fov: 50,
      },
    },
  },
  {
    name: '침실(창문없음/사전구성)',
    meshName: 'Bedroom',
    category: 'room',
    icon: '🛏️',
    description: '침실로 가구를 포함하여 꾸며져 있는 방, 창문이 없습습니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [0.11, 0.90, 1.16],
        target: [0.05, 0.95, -0.24],
        fov: 50,
      },
    },
  },
  {
    name: '침실(창문/사전구성)',
    meshName: 'BedroomAndWindow',
    category: 'room',
    icon: '🛏️',
    description: '침실로 가구를 포함하여 꾸며져 있는 방, 창문이 존재합니다.',
    roomConfig: {
      scale: [1, 1, 1],
      camera: {
        position: [-2.28, 4.11, 6.15],
        target: [-1.04, 3.90, 5.52],
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
    name: '의자 1',
    meshName: 'Chair1',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🪑',
    tags: ['seating', '앉기', '의자'],
    description: '의자 변형 1',
  },
  {
    name: '의자 2',
    meshName: 'Chair2',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🪑',
    tags: ['seating', '앉기', '의자'],
    description: '의자 변형 2',
  },
  {
    name: '의자 3',
    meshName: 'Chair3',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🪑',
    tags: ['seating', '앉기', '의자'],
    description: '의자 변형 3',
  },
  {
    name: '의자 4',
    meshName: 'Chair4',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🪑',
    tags: ['seating', '앉기', '의자'],
    description: '의자 변형 4',
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
    name: '소파 1',
    meshName: 'Sofa1',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🛋️',
    tags: ['seating', '앉기', '소파'],
    description: '소파 변형 1',
  },
  {
    name: '소파 2',
    meshName: 'Sofa2',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🛋️',
    tags: ['seating', '앉기', '소파'],
    description: '소파 변형 2',
  },
  {
    name: '소파 3',
    meshName: 'Sofa3',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🛋️',
    tags: ['seating', '앉기', '소파'],
    description: '소파 변형 3',
  },
  {
    name: '소파 4',
    meshName: 'Sofa4',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🛋️',
    tags: ['seating', '앉기', '소파'],
    description: '소파 변형 4',
  },
  {
    name: '소파 5',
    meshName: 'Sofa5',
    category: 'furniture',
    subCategory: 'seating',
    icon: '🛋️',
    tags: ['seating', '앉기', '소파'],
    description: '소파 변형 5',
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

  // ===== Furniture > Table (테이블) =====
  {
    name: '테이블 1',
    meshName: 'Table1',
    category: 'furniture',
    subCategory: 'table',
    icon: '🪵',
    tags: ['table', '테이블'],
    description: '테이블 1',
  },
  {
    name: '테이블 2',
    meshName: 'Table2',
    category: 'furniture',
    subCategory: 'table',
    icon: '🪵',
    tags: ['table', '테이블'],
    description: '테이블 2',
  },
  {
    name: '테이블 3',
    meshName: 'table3',
    category: 'furniture',
    subCategory: 'table',
    icon: '🪵',
    tags: ['table', '테이블'],
    description: '테이블 3',
  },
  {
    name: '테이블 4',
    meshName: 'table4',
    category: 'furniture',
    subCategory: 'table',
    icon: '🪵',
    tags: ['table', '테이블'],
    description: '테이블 4',
  },
  {
    name: '테이블 5',
    meshName: 'Table5',
    category: 'furniture',
    subCategory: 'table',
    icon: '🪵',
    tags: ['table', '테이블'],
    description: '테이블 5',
  },

  // ===== Furniture > Storage (수납) =====
  {
    name: '선반 1',
    meshName: 'Shelf1',
    category: 'furniture',
    subCategory: 'storage',
    icon: '🗄️',
    tags: ['storage', '수납', '선반'],
    description: '선반 1',
  },
  {
    name: '선반 2',
    meshName: 'Shelf2',
    category: 'furniture',
    subCategory: 'storage',
    icon: '🗄️',
    tags: ['storage', '수납', '선반'],
    description: '선반 2',
  },

  // ===== Lighting (조명 기구) =====
  {
    name: '램프',
    meshName: 'Lamp',
    category: 'lighting',
    icon: '💡',
    description: '스탠드 램프',
  },
  {
    name: '조명 1',
    meshName: 'Light1',
    category: 'lighting',
    icon: '💡',
    description: '조명 1',
  },
  {
    name: '조명 2',
    meshName: 'Light2',
    category: 'lighting',
    icon: '💡',
    description: '조명 2',
  },
  {
    name: '조명 3',
    meshName: 'Light3',
    category: 'lighting',
    icon: '💡',
    description: '조명 3',
  },
  {
    name: '조명 4',
    meshName: 'Light4',
    category: 'lighting',
    icon: '💡',
    description: '조명 4',
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
    name: '흰색 창문',
    meshName: 'WhiteWindow',
    category: 'decoration',
    icon: '🪟',
    tags: ['window', '창문'],
    description: '흰색 창문',
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
