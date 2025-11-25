import type { SceneFrontend } from '../service/Scene';
import { getDefaultSunSettings } from '../../utils/SceneSerializer';

/**
 * Dummy Scene 데이터
 * TODO: 차후 Backend API에서 Scene 데이터를 가져오도록 수정 필요
 * TODO: Scene 편집 UI 구현 후 사용자가 Scene을 생성/수정할 수 있도록 구현
 */

/**
 * 현재 하드코딩된 정적 Scene을 Dummy Object로 변환
 * 기존 World.Initialize()의 내용을 Scene 형식으로 표현
 */
export const DUMMY_SCENE_1: SceneFrontend = {
  id: 'dummy_scene_1',
  name: 'Test Room Scene',
  description: 'Default test scene with Bedroom, Window, and Point Lights',

  // ✅ Room 설정 (편집 불가능, assets에서 분리)
  room: {
    meshName: 'Bedroom',
    locked: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },

  // ✅ 태양광 설정 (DirectionalLight 자동 생성)
  sunSettings: getDefaultSunSettings(),

  // ✅ 기본 카메라 위치
  camera: {
    position: [5, 5, 5],
    target: [0, 1, 0],
    fov: 45,
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
  name: 'Room with Chair',
  description: 'Test scene with furniture and rect light',

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
  sunSettings: getDefaultSunSettings(),

  // ✅ 기본 카메라 위치
  camera: {
    position: [4, 3, 4],
    target: [0, 0.5, 0],
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
 * 사용 가능한 Dummy Scene 목록
 * TODO: 차후 Backend API로 대체
 */
export const AVAILABLE_SCENES: SceneFrontend[] = [DUMMY_SCENE_1, DUMMY_SCENE_2];
