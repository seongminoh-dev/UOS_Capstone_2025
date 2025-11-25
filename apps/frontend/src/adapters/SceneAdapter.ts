/**
 * SceneAdapter - SceneFrontend를 Graphics Core 명령으로 변환
 *
 * 역할:
 * - Frontend 타입 (SceneFrontend)과 Graphics Core (World) 사이의 변환 계층
 * - Room, Sun, Assets를 Graphics 명령으로 변환
 * - WebGPU와 Three.js 모두 사용 가능
 *
 * 장점:
 * - graphics-core가 Frontend 타입에 독립적
 * - npm 모듈화 가능
 * - 명확한 책임 분리
 */

import type { SceneFrontend, PointLightParams, RectLightParams } from '../graphics-core/service/Scene';
import type { World } from '../graphics-core/World';
import type { Vec3, Quat } from 'wgpu-matrix';
import { vec3, quat } from 'wgpu-matrix';
import { calculateSunLightParams } from '../utils/SunCalculator';

/**
 * Euler angles (degrees) → Quaternion 변환
 */
function eulerDegreesToQuat(eulerDegrees: [number, number, number]): Quat {
  const DEG_TO_RAD = Math.PI / 180.0;
  const [x, y, z] = eulerDegrees;
  return quat.fromEuler(x * DEG_TO_RAD, y * DEG_TO_RAD, z * DEG_TO_RAD, 'xyz');
}

export class SceneAdapter {
  /**
   * SceneFrontend → World 명령으로 변환 (WebGPU용)
   *
   * @param scene - 변환할 Scene
   * @param world - World 인스턴스
   */
  static loadSceneToWorld(scene: SceneFrontend, world: World): void {
    // 1. Clear existing scene
    world.InstancePool.Clear();

    // 2. ✅ Room 로드 (편집 불가능한 기본 Object)
    const roomMeshId = world.MeshPool.GetID(scene.room.meshName);
    if (roomMeshId !== -1) {
      const position: Vec3 = vec3.fromValues(...scene.room.transform.position);
      const rotation: Quat = eulerDegreesToQuat(scene.room.transform.rotation);
      const scale: Vec3 = vec3.fromValues(...scene.room.transform.scale);

      world.AddInstance('room', scene.room.meshName, position, rotation, scale);
      console.log(`Room loaded: ${scene.room.meshName}`);
    } else {
      console.warn(`Room mesh not found: ${scene.room.meshName}`);
    }

    // 3. ✅ Sun → DirectionalLight 자동 변환
    const sunParams = calculateSunLightParams(
      scene.sunSettings.timeOfDay,
      scene.sunSettings.isDaytime,
      scene.sunSettings.season,
      scene.sunSettings.roomOrientation
    );

    if (sunParams) {
      const direction: Vec3 = vec3.normalize(vec3.fromValues(...sunParams.direction));
      const color: Vec3 = vec3.fromValues(...sunParams.color);
      const intensity: number = sunParams.intensity;

      world.AddDirectionalLight(direction, color, intensity);
      console.log(`Sun loaded: timeOfDay=${scene.sunSettings.timeOfDay}, isDaytime=${scene.sunSettings.isDaytime}`);
    } else {
      console.log('Sun is below horizon (night mode)');
    }

    // 4. ✅ Assets 로드 (Objects + Point/Rect Lights만)
    let objectCount = 0;
    let lightCount = 0;

    for (const asset of scene.assets) {
      if (asset.type === 'object') {
        // Object Asset 처리
        if (!asset.meshName || !asset.transform) {
          console.warn(`Object asset ${asset.id} is missing meshName or transform`);
          continue;
        }

        const meshId = world.MeshPool.GetID(asset.meshName);
        if (meshId === -1) {
          console.warn(`Mesh not found: ${asset.meshName}`);
          continue;
        }

        const position: Vec3 = vec3.fromValues(...asset.transform.position);
        const rotation: Quat = eulerDegreesToQuat(asset.transform.rotation);
        const scale: Vec3 = vec3.fromValues(...asset.transform.scale);

        world.AddInstance(asset.id, asset.meshName, position, rotation, scale);
        objectCount++;
      } else if (asset.type === 'point-light') {
        // Point Light 처리
        if (!asset.lightParams) {
          console.warn(`Point light ${asset.id} is missing lightParams`);
          continue;
        }

        const params = asset.lightParams as PointLightParams;
        const position: Vec3 = vec3.fromValues(...params.position);
        const color: Vec3 = vec3.fromValues(...params.color);
        const intensity: number = params.intensity;

        world.AddPointLight(position, color, intensity);
        lightCount++;
      } else if (asset.type === 'rect-light') {
        // Rect Light 처리
        if (!asset.lightParams) {
          console.warn(`Rect light ${asset.id} is missing lightParams`);
          continue;
        }

        const params = asset.lightParams as RectLightParams;
        const position: Vec3 = vec3.fromValues(...params.position);
        const u: Vec3 = vec3.fromValues(...params.u);
        const v: Vec3 = vec3.fromValues(...params.v);
        const color: Vec3 = vec3.fromValues(...params.color);
        const intensity: number = params.intensity;

        world.AddRectLight(position, u, v, color, intensity);
        lightCount++;
      }
      // Note: directional-light는 sunSettings에서 자동 생성되므로 여기서 제외
    }

    console.log(`Scene loaded: ${scene.name}`);
    console.log(`- Room: 1`);
    console.log(`- Sun: ${sunParams ? '1 (DirectionalLight)' : '0 (night)'}`);
    console.log(`- Objects: ${objectCount}`);
    console.log(`- Lights: ${lightCount}`);
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
      position: [5, 5, 5] as [number, number, number],
      target: [0, 1, 0] as [number, number, number],
      fov: 45,
    };
  }
}
