/**
 * ThreeSceneAdapter - SceneFrontend를 Three.js 명령으로 변환
 *
 * 역할:
 * - Frontend 타입 (SceneFrontend)과 Three.js (ThreeSceneManager) 사이의 변환 계층
 * - Room, Sun, Assets를 Three.js 명령으로 변환
 * - three-core가 Frontend 타입에 독립적
 *
 * 장점:
 * - three-core가 Frontend 타입에 독립적
 * - npm 모듈화 가능
 * - 명확한 책임 분리
 */

import type { SceneFrontend, SceneAsset } from '../graphics-core/service/Scene';
import type { ThreeSceneManager } from '../three-core/ThreeSceneManager';

/** Asset 로드 결과 */
export interface AssetLoadResult {
  assetId: string | number;
  success: boolean;
  error?: string;
}

/** Scene 로드 결과 */
export interface SceneLoadResult {
  success: boolean;
  roomLoaded: boolean;
  objectCount: number;
  lightCount: number;
  failedAssets: AssetLoadResult[];
}

export class ThreeSceneAdapter {
  /**
   * SceneFrontend → ThreeSceneManager 명령으로 변환
   *
   * @param scene - 변환할 Scene
   * @param manager - ThreeSceneManager 인스턴스
   * @returns 로드 결과 (성공/실패 정보 포함)
   */
  static async loadSceneToManager(scene: SceneFrontend, manager: ThreeSceneManager): Promise<SceneLoadResult> {
    const result: SceneLoadResult = {
      success: true,
      roomLoaded: false,
      objectCount: 0,
      lightCount: 0,
      failedAssets: [],
    };

    // 1. Clear existing scene
    manager.clearScene();

    // 2. ✅ DefaultRoom 설정 (선택 불가능하게 만들기 위해)
    manager.setDefaultRoom(scene.room.meshName);

    // 3. ✅ Room 로드 (편집 불가능한 기본 Object)
    const roomAsset: SceneAsset = {
      id: 'room',
      type: 'object',
      meshName: scene.room.meshName,
      transform: scene.room.transform,
    };

    try {
      await manager.loadAsset(roomAsset);
      result.roomLoaded = true;
      console.log(`[ThreeSceneAdapter] Room loaded: ${scene.room.meshName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ThreeSceneAdapter] Failed to load room: ${scene.room.meshName}`, error);
      result.failedAssets.push({
        assetId: 'room',
        success: false,
        error: `Room 로드 실패: ${errorMsg}`,
      });
      // Room 로드 실패는 심각한 오류이므로 success를 false로 설정
      result.success = false;
    }

    // 4. ❌ Sun → DirectionalLight 비활성화 (Three.js에서는 너무 밝음)
    // WebGPU Renderer에서만 태양빛 렌더링
    console.log('[ThreeSceneAdapter] Sun light disabled for Three.js renderer');

    // 5. ✅ Assets 로드 (Objects + Point/Rect Lights만)
    for (const asset of scene.assets) {
      if (asset.type === 'object') {
        // Object Asset 처리
        try {
          await manager.loadAsset(asset);
          result.objectCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[ThreeSceneAdapter] Failed to load object asset ${asset.id}`, error);
          result.failedAssets.push({
            assetId: asset.id,
            success: false,
            error: `오브젝트 로드 실패 (${asset.meshName || 'unknown'}): ${errorMsg}`,
          });
        }
      } else if (asset.type === 'point-light' || asset.type === 'rect-light') {
        // Light Asset 처리
        try {
          manager.loadLightAsset(asset);
          result.lightCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[ThreeSceneAdapter] Failed to load light asset ${asset.id}`, error);
          result.failedAssets.push({
            assetId: asset.id,
            success: false,
            error: `조명 로드 실패 (${asset.type}): ${errorMsg}`,
          });
        }
      }
      // Note: directional-light는 sunSettings에서 자동 생성되므로 여기서 제외
    }

    console.log(`[ThreeSceneAdapter] Scene loaded: ${scene.name}`);
    console.log(`- Room: ${result.roomLoaded ? 'loaded' : 'FAILED'}`);
    console.log(`- Sun: disabled (Three.js)`);
    console.log(`- Objects: ${result.objectCount}`);
    console.log(`- Lights: ${result.lightCount}`);
    if (result.failedAssets.length > 0) {
      console.warn(`- Failed assets: ${result.failedAssets.length}`);
    }

    // 6. ✅ 카메라 설정 적용 (있는 경우)
    if (scene.camera) {
      try {
        manager.setCamera(
          scene.camera.position,
          scene.camera.target,
          scene.camera.fov
        );
      } catch (error) {
        console.error('[ThreeSceneAdapter] Failed to set camera', error);
      }
    }

    return result;
  }

  /**
   * Scene에서 사용하는 모든 Mesh 이름 추출
   * Asset 로드 전에 필요한 Mesh 목록을 파악하는 용도
   *
   * @param scene - Scene
   * @returns 고유한 Mesh 이름 배열
   */
  static extractMeshNames(scene: SceneFrontend): string[] {
    const meshNames = new Set<string>();

    // Room mesh
    meshNames.add(scene.room.meshName);

    // Asset meshes
    for (const asset of scene.assets) {
      if (asset.type === 'object' && asset.meshName) {
        meshNames.add(asset.meshName);
      }
    }

    return Array.from(meshNames);
  }

  /**
   * Scene에서 카메라 설정 추출
   *
   * @param scene - Scene
   * @returns 카메라 설정 또는 기본값
   */
  static getCameraSettings(scene: SceneFrontend) {
    return scene.camera || {
      position: [5, 3, 5] as [number, number, number],
      target: [0, 0, 0] as [number, number, number],
      fov: 60,
    };
  }
}
