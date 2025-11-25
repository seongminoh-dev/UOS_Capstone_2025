/**
 * SceneSerializer - Scene 직렬화/역직렬화
 * 프론트엔드 SceneFrontend ↔ 백엔드 Scene 변환
 *
 * 백엔드 호환성:
 * - sunSettings, defaultRoom을 특별한 asset으로 인코딩
 * - 백엔드 API는 기존 Scene 형식 그대로 사용
 * - 나중에 백엔드 스키마 업데이트 시 제거 예정
 */

import type { Scene, SceneFrontend, SceneAsset } from '../graphics-core/service/Scene';

// 메타데이터를 숨기는 특별한 asset ID
const METADATA_ASSET_ID = '__scene_metadata__';
const METADATA_MESH_NAME = '__metadata__';

/**
 * 프론트엔드 Scene → 백엔드 Scene 변환
 * sunSettings와 defaultRoom을 assets 배열에 숨겨서 저장
 */
export function serializeSceneForBackend(scene: SceneFrontend): Scene {
  const assets: SceneAsset[] = [...scene.assets];

  // 메타데이터를 특별한 asset으로 인코딩
  const metadataAsset: any = {
    id: METADATA_ASSET_ID,
    type: 'object',
    meshName: METADATA_MESH_NAME,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [0, 0, 0],
    },
    // 실제 메타데이터는 여기에 저장 (백엔드는 무시)
    _metadata: {
      defaultRoom: scene.defaultRoom,
      sunSettings: scene.sunSettings,
    },
  };

  assets.push(metadataAsset);

  // SceneFrontend의 추가 필드 제거
  const { defaultRoom, sunSettings, ...baseScene } = scene;

  return {
    ...baseScene,
    assets,
  };
}

/**
 * 백엔드 Scene → 프론트엔드 SceneFrontend 변환
 * assets 배열에서 메타데이터 추출
 */
export function deserializeSceneFromBackend(scene: Scene): SceneFrontend {
  // 메타데이터 asset 찾기
  const metadataAsset = scene.assets.find(
    (a) => a.id === METADATA_ASSET_ID || a.meshName === METADATA_MESH_NAME
  ) as any;

  // 메타데이터 추출
  const defaultRoom = metadataAsset?._metadata?.defaultRoom || 'TestScene';
  const sunSettings = metadataAsset?._metadata?.sunSettings || getDefaultSunSettings();

  // 메타데이터 asset 제거
  const assets = scene.assets.filter(
    (a) => a.id !== METADATA_ASSET_ID && a.meshName !== METADATA_MESH_NAME
  );

  return {
    ...scene,
    defaultRoom,
    sunSettings,
    assets,
  };
}

/**
 * 기본 태양광 설정
 */
export function getDefaultSunSettings() {
  return {
    timeOfDay: 50,          // 정오
    isDaytime: true,        // 낮
    season: 'summer' as const,
    roomOrientation: 'south' as const,
  };
}

/**
 * Scene이 SceneFrontend인지 확인
 */
export function isSceneFrontend(scene: Scene | SceneFrontend): scene is SceneFrontend {
  return 'defaultRoom' in scene && 'sunSettings' in scene;
}

/**
 * Scene을 SceneFrontend로 변환 (필요 시)
 */
export function ensureSceneFrontend(scene: Scene | SceneFrontend): SceneFrontend {
  if (isSceneFrontend(scene)) {
    return scene;
  }
  return deserializeSceneFromBackend(scene);
}
