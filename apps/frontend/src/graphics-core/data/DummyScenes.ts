import type { SceneFrontend, SunSettings } from '../service/Scene';

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
 * Dummy Scene 데이터
 * - 읽기 전용 (수정 시 새 Scene으로 분기)
 * - ID prefix: dummy_
 */

export const DUMMY_SCENE_1: SceneFrontend = {
  id: 'dummy_scene_1',
  name: '안방(기본)',
  description: '침대와, 옷장, 책상의 기본 가구와 조명을 포함한 방입니다.',

  // ✅ Room 설정 (편집 불가능, assets에서 분리)
  room: {
    meshName: 'BedroomEdit',
    locked: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },

  // ✅ 태양광 설정 (DirectionalLight 자동 생성)
  sunSettings: { ...DEFAULT_SUN_SETTINGS },

  // ✅ 기본 카메라 위치
  camera: {
    position: [12.0, 4.0, 0.0],
    target: [13.0, 4.0, 0.0],
    fov: 60,
  },

  // ✅ 사용자 추가 가능한 Asset만 (가구 + Point/Rect Light)
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

    // Note: DirectionalLight는 sunSettings에서 자동 생성됨
  ],

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * 추가 Dummy Scene (의자 포함)
 */
export const DUMMY_SCENE_2: SceneFrontend = {
  id: 'dummy_scene_2',
  name: '작은방(기본)',
  description: '한쪽 벽이 없는 작은 방입니다.',

  // ✅ Room 설정
  room: {
    meshName: 'TestScene',
    locked: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },

  // ✅ 태양광 설정
  sunSettings: { ...DEFAULT_SUN_SETTINGS },

  // ✅ 기본 카메라 위치
  camera: {
    position: [0.06, 2.12, 7.38],
    target: [-0.1, -0.22, 0.06],
    fov: 50,
  },

  // ✅ 사용자 추가 가능한 Asset만
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

    // Note: DirectionalLight는 sunSettings에서 자동 생성됨
  ],

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Dummy Scene 목록 (SceneRepository에서 사용)
 */
export const DUMMY_SCENES: SceneFrontend[] = [DUMMY_SCENE_1, DUMMY_SCENE_2];

/**
 * @deprecated DUMMY_SCENES 사용
 */
export const AVAILABLE_SCENES: SceneFrontend[] = DUMMY_SCENES;
