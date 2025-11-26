/**
 * Scene ID 유틸리티
 * - ID 형식으로 Scene 출처 구분
 * - dummy_* : DummyScene (읽기 전용)
 * - local_* : LocalScene (비회원, localStorage)
 * - number  : ServerScene (회원, Backend API)
 */

export type SceneId = string | number;

/**
 * DummyScene 여부 확인
 * @param id Scene ID
 * @returns dummy_ prefix로 시작하면 true
 */
export function isDummyScene(id: SceneId): boolean {
  return typeof id === 'string' && id.startsWith('dummy_');
}

/**
 * LocalScene 여부 확인
 * @param id Scene ID
 * @returns local_ prefix로 시작하면 true
 */
export function isLocalScene(id: SceneId): boolean {
  return typeof id === 'string' && id.startsWith('local_');
}

/**
 * ServerScene 여부 확인
 * @param id Scene ID
 * @returns number 타입이면 true
 */
export function isServerScene(id: SceneId): boolean {
  return typeof id === 'number';
}

/**
 * NewScene 여부 확인 (아직 저장되지 않은 새 Scene)
 * @param id Scene ID
 * @returns new_ prefix로 시작하면 true
 */
export function isNewScene(id: SceneId): boolean {
  return typeof id === 'string' && id.startsWith('new_');
}

/**
 * LocalScene ID 생성
 * @returns local_${timestamp} 형식의 고유 ID
 */
export function generateLocalId(): string {
  return `local_${Date.now()}`;
}
