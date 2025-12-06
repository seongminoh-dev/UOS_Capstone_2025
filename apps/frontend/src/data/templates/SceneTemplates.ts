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
  timeOfDay: 50, // 정오
  isDaytime: true, // 낮
  season: 'summer',
  roomOrientation: 'south',
};

/**
 * 템플릿 Scene 1: 안방
 */
export const TEMPLATE_SCENE_1: SceneFrontend = {
  id: 'template_scene_1',
  name: '안방(기본)',
  description: '침대와, 옷장, 책상의 기본 가구와 조명을 포함한 방입니다.',

  room: {
    meshName: 'BedroomEdit',
    locked: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },

  sunSettings: { ...DEFAULT_SUN_SETTINGS },

  camera: {
    position: [12.0, 4.0, 0.0],
    target: [13.0, 4.0, 0.0],
    fov: 60,
  },


  
  assets: [
    // Window Object
    {
      id: 'window_instance_0',
      type: 'object',
      meshName: 'WhiteWindow',
      transform: {
        position: [0, 2, 0],
        rotation: [0, 3.14 / 2, 0],
        scale: [1, 1, 1],
      },
    },

    // Point Lights
    {
      id: 'bulb',
      type: 'point-light',
      lightParams: {
        position: [-2.33, 0, -3.77],
        color: [1, 1, 1],
        intensity: 1.0,
      },
    },
    {
      id: 'bulb1',
      type: 'point-light',
      lightParams: {
        position: [-2.33, 7, -3.77],
        color: [1, 1, 1],
        intensity: 15.0,
      },
    },
    {
      id: 'bulb2',
      type: 'point-light',
      lightParams: {
        position: [4.10, 7.5, -3.77],
        color: [1, 1, 1],
        intensity: 15.0,
      },
    },
    {
      id: 'bulb3',
      type: 'point-light',
      lightParams: {
        position: [9.80, 7.5, -3.77],
        color: [1, 1, 1],
        intensity: 15.0,
      },
    },
    {
      id: 'bulb4',
      type: 'point-light',
      lightParams: {
        position: [-2.33, 7, 3.77],
        color: [1, 1, 1],
        intensity: 15.0,
      },
    },
    {
      id: 'bulb5',
      type: 'point-light',
      lightParams: {
        position: [4.10, 7.5, 3.77],
        color: [1, 1, 1],
        intensity: 15.0,
      },
    },
    {
      id: 'bulb6',
      type: 'point-light',
      lightParams: {
        position: [9.80, 7.5, 3.77],
        color: [1, 1, 1],
        intensity: 15.0,
      },
    },
  ],

  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * 템플릿 Scene 2: 작은방
 */
export const TEMPLATE_SCENE_2: SceneFrontend = {
  id: 'template_scene_2',
  name: '작은방(기본)',
  description: '한쪽 벽이 없는 작은 방입니다.',

  room: {
    meshName: 'TestScene',
    locked: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },

  sunSettings: { ...DEFAULT_SUN_SETTINGS },

  camera: {
    position: [0.06, 2.12, 7.38],
    target: [-0.1, -0.22, 0.06],
    fov: 50,
  },

  assets: [
    // Chair Object
    {
      id: 'chair_instance_0',
      type: 'object',
      meshName: 'Chair',
      transform: {
        position: [0, -90, 0],
        rotation: [0, 0, 0],
        scale: [0.02, 0.02, 0.02],
      },
    },

    // Rect Light
    {
      id: 'rect_light_0',
      type: 'rect-light',
      lightParams: {
        position: [0, 1, 0],
        u: [0.4, 0, 0],
        v: [0, 0, 0.4],
        color: [1, 1, 1],
        intensity: 50,
      },
    },
  ],

  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * 전체 템플릿 목록
 */
export const SCENE_TEMPLATES: SceneFrontend[] = [TEMPLATE_SCENE_1, TEMPLATE_SCENE_2];

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
