/**
 * Asset 관리 시스템 타입 정의
 * - MainPage (WebGPU)와 EditPage (Three.js)가 공유
 */

/**
 * Asset 카테고리
 */
export type AssetCategory = 'room' | 'furniture' | 'lighting' | 'decoration';

/**
 * 가구 서브카테고리 (상세 분류)
 */
export type FurnitureSubCategory = 'seating' | 'table' | 'storage' | 'bed' | 'other';

/**
 * Asset 메타데이터
 */
export interface AssetMetadata {
  /** 표시 이름 (한글 가능) */
  name: string;

  /** 파일명 (GLB 파일명, 예: 'Chair', 'Sofa') */
  meshName: string;

  /** 카테고리 */
  category: AssetCategory;

  /** 가구 서브카테고리 (furniture 타입만) */
  subCategory?: FurnitureSubCategory;

  /** 이모지 아이콘 (썸네일 대체) */
  icon?: string;

  /** 검색/필터용 태그 */
  tags?: string[];

  /** 삭제 불가 여부 (TestScene 등) */
  isRequired?: boolean;

  /** 설명 */
  description?: string;

  /** 스타일 (선택) */
  style?: string;
}
