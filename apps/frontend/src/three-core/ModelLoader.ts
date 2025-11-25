/**
 * ModelLoader - GLB 모델 로딩 및 캐싱
 * - GLTFLoader를 사용한 비동기 로딩
 * - 모델 캐싱으로 중복 로딩 방지
 * - Asset Registry와 통합
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getAssetPath, getAllAvailableMeshNames } from '../assets/AssetRegistry';

export class ModelLoader {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group>;
  private loadingPromises: Map<string, Promise<THREE.Group>>;

  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * GLB 모델 로드 (캐싱 지원)
   * @param meshName 모델 이름 (예: "Chair", "TestScene")
   * @returns THREE.Group (복제된 인스턴스)
   */
  async loadModel(meshName: string): Promise<THREE.Group> {
    // 캐시에 있으면 복제해서 반환
    if (this.cache.has(meshName)) {
      const cached = this.cache.get(meshName)!;
      return this.cloneModel(cached);
    }

    // 이미 로딩 중이면 같은 Promise 반환
    if (this.loadingPromises.has(meshName)) {
      const loadingPromise = this.loadingPromises.get(meshName)!;
      const model = await loadingPromise;
      return this.cloneModel(model);
    }

    // Asset Registry에서 경로 생성
    const path = getAssetPath(meshName);

    // 새로 로딩
    const loadPromise = this.loadFromFile(path, meshName);
    this.loadingPromises.set(meshName, loadPromise);

    try {
      const model = await loadPromise;
      this.cache.set(meshName, model);
      this.loadingPromises.delete(meshName);
      return this.cloneModel(model);
    } catch (error) {
      this.loadingPromises.delete(meshName);
      throw error;
    }
  }

  /**
   * 파일에서 GLB 로드
   */
  private async loadFromFile(path: string, meshName: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.name = meshName;

          // 그림자 설정
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          resolve(model);
        },
        undefined,
        (error) => {
          console.error(`Failed to load model ${meshName} from ${path}:`, error);
          reject(new Error(`Failed to load model: ${meshName}`));
        }
      );
    });
  }

  /**
   * 모델 복제 (인스턴스 생성)
   * Geometry와 Material은 공유하고 Transform만 독립적으로
   */
  private cloneModel(model: THREE.Group): THREE.Group {
    const cloned = model.clone(true);

    // Material은 공유하지 않고 복제 (독립적으로 색상 변경 가능하게)
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat) => mat.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });

    return cloned;
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.forEach((model) => {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    });
    this.cache.clear();
  }

  /**
   * 사용 가능한 모델 목록 반환
   */
  getAvailableModels(): string[] {
    return getAllAvailableMeshNames();
  }

  /**
   * 모델 경로 확인
   */
  hasModel(meshName: string): boolean {
    return getAllAvailableMeshNames().includes(meshName);
  }
}

// Singleton instance
export const modelLoader = new ModelLoader();
