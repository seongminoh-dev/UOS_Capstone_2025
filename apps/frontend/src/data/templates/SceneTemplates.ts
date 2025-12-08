/**
 * SceneTemplates - 기본 제공 템플릿 Scene 데이터
 *
 * 템플릿은 읽기 전용이며, 사용자가 선택하면 복사되어 workspace에 추가됩니다.
 * ID prefix: template_
 */

import type { SceneFrontend, SunSettings } from '../../graphics-core/service/Scene';

/**
 * 기본 태양광 설정
 */
const DEFAULT_SUN_SETTINGS: SunSettings = {
  timeOfDay: 50,
  isDaytime: true,
  season: 'summer',
  roomOrientation: 'south',
};

/**
 * 템플릿 Scene 1: 창문이 있는 침실
 */
export const TEMPLATE_SCENE_1: SceneFrontend = {
  id: 'template_scene_1',
  name: '창문이 있는 침실',
  description: '창문과 조명이 배치된 침실입니다.',

  room: {
    meshName: 'BedroomAndWindow',
    locked: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },

  sunSettings: {
    timeOfDay: 48.61,
    isDaytime: true,
    season: 'summer',
    roomOrientation: 'south',
  },

  camera: {
    position: [-3.69, 4.65, 6.75],
    target: [-2.57, 4.35, 5.96],
    fov: 50,
  },

  assets: [
    // Point Lights (천장)
    {
      id: 'ceiling_light_1',
      type: 'point-light',
      lightParams: {
        position: [-2.35, 7.64, -3.85],
        color: [1, 1, 1],
        intensity: 10,
      },
    },
    {
      id: 'ceiling_light_2',
      type: 'point-light',
      lightParams: {
        position: [-2.45, 7.74, 4.04],
        color: [1, 1, 1],
        intensity: 10,
      },
    },
    {
      id: 'ceiling_light_3',
      type: 'point-light',
      lightParams: {
        position: [4.15, 7.73, -3.84],
        color: [1, 1, 1],
        intensity: 10,
      },
    },
    {
      id: 'ceiling_light_4',
      type: 'point-light',
      lightParams: {
        position: [4.17, 7.75, 4.01],
        color: [1, 1, 1],
        intensity: 10,
      },
    },
    // Rect Light (천장 중앙)
    {
      id: 'rect_light_ceiling',
      type: 'rect-light',
      lightParams: {
        position: [1.63, 8.47, 0],
        u: [0.7, 0, 0],
        v: [0.5, 0, -0.5],
        color: [1, 1, 1],
        intensity: 40,
      },
    },
    // Lamp Object
    {
      id: 'lamp_1',
      type: 'object',
      meshName: 'Lamp',
      transform: {
        position: [-3.40, 2.21, -4.12],
        rotation: [0, 0, 0],
        scale: [1.71, 1.71, 1.71],
      },
    },
    // Lamp Light (따뜻한 색상)
    {
      id: 'lamp_light_1',
      type: 'point-light',
      lightParams: {
        position: [-3.39, 2.43, -4.11],
        color: [0.59, 0.53, 0.21],
        intensity: 5,
      },
    },
  ],

  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * 전체 템플릿 목록
 */
export const SCENE_TEMPLATES: SceneFrontend[] = [TEMPLATE_SCENE_1];

/**
 * 템플릿 ID로 템플릿 조회
 */
export function getTemplateById(id: string): SceneFrontend | null {
  return SCENE_TEMPLATES.find((t) => t.id === id) || null;
}

/**
 * 기본 템플릿 반환 (새 Scene 생성 시 기본값)
 */
export function getDefaultTemplate(): SceneFrontend {
  return TEMPLATE_SCENE_1;
}
