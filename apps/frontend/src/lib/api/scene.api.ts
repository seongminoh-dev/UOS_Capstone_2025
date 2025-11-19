/**
 * Scene API
 * - Scene CRUD 작업
 * - 회원: 서버 API 호출
 * - 게스트: 로컬 메모리 사용
 */

import apiClient from './client';
import type { Scene, SceneAsset } from '../../graphics-core/service/Scene';

// API 요청/응답 타입 (백엔드 DTO와 일치)
export interface SceneRequest {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  assets: string; // JSON string of SceneAsset[]
  username: string;
}

export interface SceneResponse {
  id: number;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  assets: string; // JSON string
  username: string;
  createdAt: string;
  updatedAt: string;
}

// Scene <-> SceneResponse 변환 헬퍼
export function sceneToRequest(scene: Scene, username: string): SceneRequest {
  return {
    name: scene.name,
    description: scene.description,
    thumbnailUrl: scene.thumbnailUrl,
    assets: JSON.stringify(scene.assets),
    username,
  };
}

export function responseToScene(response: SceneResponse): Scene {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    thumbnailUrl: response.thumbnailUrl,
    assets: JSON.parse(response.assets) as SceneAsset[],
    username: response.username,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

// API 함수들

/**
 * Scene 생성
 * POST /scenes
 */
export async function createScene(scene: Scene, username: string): Promise<Scene> {
  const request = sceneToRequest(scene, username);
  const response = await apiClient.post<SceneResponse>('/scenes', request);
  return responseToScene(response.data);
}

/**
 * Scene 조회 (ID)
 * GET /scenes/:id
 */
export async function getSceneById(id: number): Promise<Scene> {
  const response = await apiClient.get<SceneResponse>(`/scenes/${id}`);
  return responseToScene(response.data);
}

/**
 * 모든 Scene 조회
 * GET /scenes
 */
export async function getAllScenes(): Promise<Scene[]> {
  const response = await apiClient.get<SceneResponse[]>('/scenes');
  return response.data.map(responseToScene);
}

/**
 * 사용자별 Scene 조회
 * GET /scenes/user/:username
 */
export async function getScenesByUsername(username: string): Promise<Scene[]> {
  const response = await apiClient.get<SceneResponse[]>(`/scenes/user/${username}`);
  return response.data.map(responseToScene);
}

/**
 * Scene 수정
 * PUT /scenes/:id
 */
export async function updateScene(id: number, scene: Scene, username: string): Promise<Scene> {
  const request = sceneToRequest(scene, username);
  const response = await apiClient.put<SceneResponse>(`/scenes/${id}`, request);
  return responseToScene(response.data);
}

/**
 * Scene 삭제
 * DELETE /scenes/:id?username=xxx
 */
export async function deleteScene(id: number, username: string): Promise<void> {
  await apiClient.delete(`/scenes/${id}`, {
    params: { username },
  });
}
