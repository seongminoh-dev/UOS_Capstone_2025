import { ResourceManager } from './ResourceManager';
import { World } from './World';
import { DUMMY_SCENE_1, AVAILABLE_SCENES } from './test/DummyScenes';
import type { Scene } from './service/Scene';
import { useSceneStore } from '../stores/sceneStore';

/**
 * SceneManager - Scene 로딩 및 전환을 관리합니다.
 */
export class SceneManager {
    private world: World;
    private currentScene: Scene | null = null;

    constructor(world: World) {
        this.world = world;
    }

    /**
     * Scene ID로 Scene을 찾습니다 (sceneStore 우선, 없으면 AVAILABLE_SCENES)
     * @param sceneId - Scene ID
     * @returns Scene 또는 null
     */
    private findScene(sceneId: string | number): Scene | null {
        // 1. sceneStore에서 먼저 찾기 (사용자가 편집한 Scene)
        const sceneFromStore = useSceneStore.getState().getSceneById(sceneId);
        if (sceneFromStore) {
            return sceneFromStore;
        }

        // 2. AVAILABLE_SCENES에서 찾기 (더미 Scene - 문자열 ID만 해당)
        if (typeof sceneId === 'string') {
            const dummyScene = AVAILABLE_SCENES.find((s) => s.id === sceneId);
            if (dummyScene) {
                return dummyScene;
            }
        }

        return null;
    }

    /**
     * Scene ID로 Scene을 로드합니다.
     * @param sceneId - Scene ID (없으면 기본 Scene 사용)
     * @returns 로드된 Scene
     */
    public async loadScene(sceneId?: string | number): Promise<Scene> {
        let scene: Scene = DUMMY_SCENE_1;

        if (sceneId) {
            const foundScene = this.findScene(sceneId);
            if (foundScene) {
                scene = foundScene;
            } else {
                console.warn(`Scene with id "${sceneId}" not found, using default scene`);
            }
        }

        await this.loadSceneAssets(scene);
        this.world.LoadFromScene(scene);
        this.currentScene = scene;

        console.log(`Scene loaded: ${scene.name} (ID: ${scene.id})`);
        return scene;
    }

    /**
     * Scene을 전환합니다.
     * @param sceneId - 전환할 Scene ID
     */
    public async switchScene(sceneId: string | number): Promise<void> {
        const newScene = this.findScene(sceneId);
        if (!newScene) {
            console.warn(`Scene with id "${sceneId}" not found`);
            return;
        }

        console.log(`Switching to scene: ${newScene.name} (ID: ${newScene.id})`);

        await this.loadSceneAssets(newScene);
        this.world.LoadFromScene(newScene);
        this.currentScene = newScene;

        console.log(`Scene switched successfully to: ${newScene.name}`);
    }

    /**
     * Scene에서 사용하는 Asset을 로드합니다.
     * @param scene - 로드할 Scene
     */
    private async loadSceneAssets(scene: Scene): Promise<void> {
        // Scene에서 사용된 모든 Mesh 이름 추출
        const meshNamesToLoad: string[] = [];

        for (const asset of scene.assets) {
            if (asset.type === 'object' && asset.meshName) {
                // 이미 로드된 Mesh는 건너뛰기
                if (
                    !ResourceManager.MeshPool.has(asset.meshName) &&
                    !meshNamesToLoad.includes(asset.meshName)
                ) {
                    meshNamesToLoad.push(asset.meshName);
                }
            }
        }

        // 필요한 Asset 로드 (아직 로드되지 않은 것만)
        if (meshNamesToLoad.length > 0) {
            await ResourceManager.LoadAssets(meshNamesToLoad);
        }
    }

    /**
     * 현재 로드된 Scene을 반환합니다.
     */
    public getCurrentScene(): Scene | null {
        return this.currentScene;
    }
}
