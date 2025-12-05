/**
 * ThreeSceneManager - Three.js 씬 관리 클래스
 * - 기본 씬, 카메라, 렌더러, 컨트롤 설정
 * - WebGPURenderer와 별도로 동작하는 편집 전용 렌더러
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { modelLoader } from './ModelLoader';
import type { Scene, SceneAsset, Transform, PointLightParams, RectLightParams, DirectionalLightParams } from '../graphics-core/service/Scene';

export class ThreeSceneManager {
  // Core Three.js objects
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public transformControls: TransformControls;

  // Helpers
  private gridHelper: THREE.GridHelper;
  private axesHelper: THREE.AxesHelper;

  // Animation
  private animationId: number | null = null;
  private isRunning: boolean = false;

  // Scene assets tracking
  private loadedObjects: Map<string | number, THREE.Object3D> = new Map();
  private loadedLights: Map<string | number, THREE.Light> = new Map();
  private lightHelpers: Map<string | number, THREE.Object3D> = new Map();
  private currentDefaultRoom: string | null = null; // 현재 Scene의 defaultRoom (선택 불가)
  private currentSceneId: string | null = null; // 현재 로드된 Scene의 ID (카메라 리셋 방지용)

  // Selection and interaction
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectableObjects: THREE.Object3D[] = [];
  private selectedObject: THREE.Object3D | null = null;

  // Scale key repeat handling
  private scaleIntervalId: number | null = null;
  private currentScaleDirection: 'up' | 'down' | null = null;

  // WASDQE camera movement (FPS style)
  private pressedKeys: Set<string> = new Set();
  private moveSpeed: number = 5.0; // units per second
  private lastFrameTime: number = 0;

  // Callbacks for React integration
  private onSelectionChange?: (assetId: string | number | null) => void;
  private onTransformChange?: (assetId: string | number, transform: Transform) => void;
  private onLightParamsChange?: (assetId: string | number, lightParams: PointLightParams | RectLightParams | DirectionalLightParams) => void;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a2a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(5, 3, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // 바닥 아래로 못 가게

    // TransformControls (오브젝트 이동/회전/스케일)
    // Note: v0.180.0에서는 TransformControls의 내부 구조가 변경되어
    // _root 프로퍼티를 통해 scene에 추가해야 합니다
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setMode('translate'); // 기본 모드: 이동
    this.transformControls.setSpace('world'); // 월드 좌표계 사용
    this.transformControls.setSize(1); // Gizmo 크기 설정
    this.transformControls.enabled = true; // 명시적으로 활성화

    // TransformControls의 내부 root를 scene에 추가 (v0.180.0+)
    // @ts-ignore - _root는 private이지만 scene에 추가하기 위해 접근 필요
    if (this.transformControls._root) {
      // @ts-ignore
      this.scene.add(this.transformControls._root);
      console.log('[ThreeSceneManager] TransformControls._root added to scene');
    } else {
      console.error('[ThreeSceneManager] TransformControls._root is undefined!');
    }

    // Grid Helper (10x10 grid, 1m spacing)
    this.gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    this.scene.add(this.gridHelper);

    // Axes Helper (X: red, Y: green, Z: blue)
    this.axesHelper = new THREE.AxesHelper(2);
    this.scene.add(this.axesHelper);

    // Raycaster (오브젝트 선택용)
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Ambient Light (전체 밝기)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional Light (그림자용)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // TransformControls 이벤트: OrbitControls 비활성화/활성화
    this.transformControls.addEventListener('dragging-changed', (event: any) => {
      this.controls.enabled = !event.value;
    });

    // TransformControls 이벤트: Transform 변경 시 React state 동기화
    this.transformControls.addEventListener('mouseUp', () => {
      if (this.selectedObject) {
        this.syncObjectToState(this.selectedObject);
      }
    });

    // Canvas 클릭 이벤트: 오브젝트 선택
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);

    // 키보드 단축키
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * Canvas 클릭 핸들러 (오브젝트 선택)
   */
  private onCanvasClick = (event: MouseEvent): void => {
    // TransformControls를 드래그 중이면 선택 무시
    if (this.transformControls.dragging) return;

    // 마우스 좌표 정규화 (-1 to +1)
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycasting (recursive: true로 자식 메쉬도 검사)
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, true);

    if (intersects.length > 0) {
      // 클릭된 오브젝트 (또는 그 부모)에서 assetId를 가진 객체 찾기
      let targetObject = intersects[0].object;

      // userData.assetId를 가진 부모를 찾을 때까지 올라가기
      while (targetObject && !targetObject.userData.assetId) {
        targetObject = targetObject.parent as THREE.Object3D;
      }

      if (targetObject && targetObject.userData.assetId) {
        this.selectObject(targetObject);
      } else {
        this.deselectObject();
      }
    } else {
      this.deselectObject();
    }
  };

  /**
   * 키보드 단축키 핸들러
   */
  private onKeyDown = (event: KeyboardEvent): void => {
    // Input/Textarea/Select 등에서 키보드 입력 중일 때는 단축키 무시
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    const key = event.key.toLowerCase();

    // WASDQE 카메라 이동 키 처리
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
      this.pressedKeys.add(key);
      return; // 카메라 이동 키는 여기서 처리 완료
    }

    // Gizmo 모드 전환, 삭제 등은 EditPage에서 처리
    // ThreeSceneManager는 setGizmoMode() 메서드를 통해 외부에서 호출됨
    if (this.selectedObject && key === 'escape') {
      this.deselectObject();
    }

    // 스케일 조정 (+/- 키) - 키를 누르고 있으면 연속 스케일 조정
    if (this.selectedObject) {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();

        // 이미 interval이 실행 중이면 무시 (키 repeat 방지)
        if (this.scaleIntervalId === null) {
          // 즉시 한 번 실행
          this.scaleSelectedObject(1.05);

          // interval 시작 (50ms마다 스케일 조정)
          this.currentScaleDirection = 'up';
          this.scaleIntervalId = window.setInterval(() => {
            this.scaleSelectedObject(1.05);
          }, 50);
        }
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();

        // 이미 interval이 실행 중이면 무시
        if (this.scaleIntervalId === null) {
          // 즉시 한 번 실행
          this.scaleSelectedObject(0.95);

          // interval 시작
          this.currentScaleDirection = 'down';
          this.scaleIntervalId = window.setInterval(() => {
            this.scaleSelectedObject(0.95);
          }, 50);
        }
      }
    }
  };

  /**
   * 키보드 keyup 핸들러 (스케일 interval 정지 + WASDQE 해제)
   */
  private onKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    // WASDQE 카메라 이동 키 해제
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
      this.pressedKeys.delete(key);
    }

    // +/- 키를 떼면 interval 정지
    if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '_') {
      if (this.scaleIntervalId !== null) {
        clearInterval(this.scaleIntervalId);
        this.scaleIntervalId = null;
        this.currentScaleDirection = null;
      }
    }
  };

  /**
   * 선택된 오브젝트 스케일 조정
   * @param scaleChange 스케일 배율 (1.05 = 5% 증가, 0.95 = 5% 감소)
   */
  private scaleSelectedObject(scaleChange: number): void {
    if (!this.selectedObject) return;

    // 균등 스케일 적용 (X, Y, Z 동시에)
    this.selectedObject.scale.multiplyScalar(scaleChange);

    // 최소/최대 스케일 제한 (0.1 ~ 10배)
    const minScale = 0.1;
    const maxScale = 10;
    this.selectedObject.scale.clampScalar(minScale, maxScale);

    // Transform 변경 알림
    this.syncObjectToState(this.selectedObject);
  }

  /**
   * 오브젝트 선택
   */
  private selectObject(object: THREE.Object3D): void {
    this.selectedObject = object;
    this.transformControls.attach(object);

    // 디버깅: TransformControls 상태 확인
    console.log('[ThreeSceneManager] TransformControls attached to:', object.userData.assetId);
    console.log('[ThreeSceneManager] TransformControls visible:', this.transformControls.visible);
    console.log('[ThreeSceneManager] TransformControls enabled:', this.transformControls.enabled);
    // @ts-ignore
    console.log('[ThreeSceneManager] TransformControls _root in scene:', this.scene.children.includes(this.transformControls._root));

    const assetId = object.userData.assetId;
    if (assetId !== undefined) {
      this.onSelectionChange?.(assetId);
    }
  }

  /**
   * 오브젝트 선택 해제
   */
  private deselectObject(): void {
    this.transformControls.detach();
    this.selectedObject = null;
    this.onSelectionChange?.(null);
  }

  /**
   * Three.js 오브젝트 transform을 React state로 동기화
   */
  private syncObjectToState(object: THREE.Object3D): void {
    const assetId = object.userData.assetId;
    if (assetId === undefined) return;

    // Light Helper인 경우 lightParams 업데이트
    if (object.userData.isLightHelper) {
      this.syncLightHelperToState(object);
      return;
    }

    // Object인 경우 transform 업데이트
    const transform: Transform = {
      position: [object.position.x, object.position.y, object.position.z],
      rotation: [
        THREE.MathUtils.radToDeg(object.rotation.x),
        THREE.MathUtils.radToDeg(object.rotation.y),
        THREE.MathUtils.radToDeg(object.rotation.z),
      ],
      scale: [object.scale.x, object.scale.y, object.scale.z],
    };

    this.onTransformChange?.(assetId, transform);
  }

  /**
   * Light Helper transform을 lightParams로 동기화
   */
  private syncLightHelperToState(helper: THREE.Object3D): void {
    const assetId = helper.userData.assetId;
    const assetType = helper.userData.assetType;
    if (assetId === undefined || !assetType) return;

    const light = this.loadedLights.get(assetId);
    if (!light) return;

    switch (assetType) {
      case 'point-light': {
        if (light instanceof THREE.PointLight) {
          const params: PointLightParams = {
            position: [light.position.x, light.position.y, light.position.z],
            color: [light.color.r, light.color.g, light.color.b],
            intensity: light.intensity,
          };
          this.onLightParamsChange?.(assetId, params);
        }
        break;
      }

      case 'rect-light': {
        if (light instanceof THREE.RectAreaLight) {
          // rotation으로부터 u, v 벡터 계산
          const width = light.width;
          const height = light.height;

          // Light의 local coordinate system 사용
          const u = new THREE.Vector3(width, 0, 0).applyQuaternion(light.quaternion);
          const v = new THREE.Vector3(0, height, 0).applyQuaternion(light.quaternion);

          const params: RectLightParams = {
            position: [light.position.x, light.position.y, light.position.z],
            u: [u.x, u.y, u.z],
            v: [v.x, v.y, v.z],
            color: [light.color.r, light.color.g, light.color.b],
            intensity: light.intensity,
          };
          this.onLightParamsChange?.(assetId, params);
        }
        break;
      }

      case 'directional-light': {
        if (light instanceof THREE.DirectionalLight) {
          // target 위치로부터 direction 계산
          const direction = new THREE.Vector3()
            .subVectors(light.target.position, light.position)
            .normalize();

          const params: DirectionalLightParams = {
            direction: [direction.x, direction.y, direction.z],
            color: [light.color.r, light.color.g, light.color.b],
            intensity: light.intensity,
          };
          this.onLightParamsChange?.(assetId, params);
        }
        break;
      }
    }
  }

  /**
   * 애니메이션 루프 시작
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  /**
   * 애니메이션 루프 중지
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 애니메이션 루프
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    // Calculate delta time for frame-rate independent movement
    const currentTime = performance.now();
    const deltaTime = this.lastFrameTime > 0 ? (currentTime - this.lastFrameTime) / 1000 : 0.016;
    this.lastFrameTime = currentTime;

    // WASDQE camera movement (FPS style)
    this.updateCameraMovement(deltaTime);

    // Update controls
    this.controls.update();

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * WASDQE 카메라 이동 업데이트
   */
  private updateCameraMovement(deltaTime: number): void {
    if (this.pressedKeys.size === 0) return;

    // 카메라의 forward/right 벡터 계산 (OrbitControls의 target 기준)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; // Y축 무시 (수평 이동)
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const up = new THREE.Vector3(0, 1, 0);

    const moveOffset = new THREE.Vector3();
    const frameSpeed = this.moveSpeed * deltaTime;

    if (this.pressedKeys.has('w')) {
      moveOffset.addScaledVector(forward, frameSpeed);
    }
    if (this.pressedKeys.has('s')) {
      moveOffset.addScaledVector(forward, -frameSpeed);
    }
    if (this.pressedKeys.has('a')) {
      moveOffset.addScaledVector(right, -frameSpeed);
    }
    if (this.pressedKeys.has('d')) {
      moveOffset.addScaledVector(right, frameSpeed);
    }
    if (this.pressedKeys.has('q')) {
      moveOffset.addScaledVector(up, -frameSpeed);
    }
    if (this.pressedKeys.has('e')) {
      moveOffset.addScaledVector(up, frameSpeed);
    }

    if (moveOffset.lengthSq() > 0) {
      // 카메라와 OrbitControls target 동시에 이동 (상대 위치 유지)
      this.camera.position.add(moveOffset);
      this.controls.target.add(moveOffset);
    }
  }

  /**
   * 리사이즈 핸들러
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * 카메라 설정 적용
   */
  setCamera(
    position: [number, number, number],
    target: [number, number, number],
    fov?: number
  ): void {
    this.camera.position.set(position[0], position[1], position[2]);

    if (fov !== undefined) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    // OrbitControls target 설정
    this.controls.target.set(target[0], target[1], target[2]);
    this.controls.update();

    console.log(`[ThreeSceneManager] Camera set: position=[${position}], target=[${target}], fov=${fov || this.camera.fov}`);
  }

  /**
   * 헬퍼 표시/숨김
   */
  setHelpersVisible(visible: boolean): void {
    this.gridHelper.visible = visible;
    this.axesHelper.visible = visible;
  }

  /**
   * 씬에 오브젝트 추가
   */
  addObject(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * 씬에서 오브젝트 제거
   */
  removeObject(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * 씬 클리어 (헬퍼와 라이트 제외)
   */
  clearScene(): void {
    const objectsToRemove: THREE.Object3D[] = [];

    this.scene.traverse((obj) => {
      // 헬퍼와 라이트, TransformControls._root는 유지
      // @ts-ignore
      const isTransformControlsRoot = this.transformControls._root && obj === this.transformControls._root;

      if (
        obj !== this.gridHelper &&
        obj !== this.axesHelper &&
        obj !== this.transformControls &&
        !isTransformControlsRoot &&
        !(obj instanceof THREE.Light) &&
        obj !== this.scene
      ) {
        objectsToRemove.push(obj);
      }
    });

    objectsToRemove.forEach((obj) => {
      this.scene.remove(obj);
      // Dispose geometry and material
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    // Light와 Helper 제거
    this.loadedLights.forEach((light) => {
      this.scene.remove(light);
      // DirectionalLight의 target 제거
      if (light instanceof THREE.DirectionalLight) {
        this.scene.remove(light.target);
      }
    });
    this.lightHelpers.forEach((helper) => {
      this.scene.remove(helper);
    });

    this.loadedObjects.clear();
    this.loadedLights.clear();
    this.lightHelpers.clear();
    this.selectableObjects = [];
    this.currentDefaultRoom = null;
    this.deselectObject();
  }

  /**
   * Scene 데이터로부터 오브젝트 로드
   */
  async loadScene(scene: Scene): Promise<void> {
    // Scene ID가 변경되었는지 확인 (새로운 Scene인지 체크)
    const isNewScene = this.currentSceneId !== scene.id;

    // 선택된 오브젝트 ID 저장 (clearScene 후 다시 선택하기 위해)
    const previouslySelectedAssetId = this.selectedObject?.userData.assetId;

    // 기존 오브젝트 클리어
    this.clearScene();

    // Scene ID 저장
    this.currentSceneId = scene.id;

    // defaultRoom 저장 (선택 불가능하게 만들기 위해)
    this.currentDefaultRoom = scene.defaultRoom || null;

    // Object 타입 에셋 로드
    const objectAssets = scene.assets.filter((asset) => asset.type === 'object');
    for (const asset of objectAssets) {
      try {
        await this.loadAsset(asset);
      } catch (error) {
        console.error(`Failed to load asset ${asset.id}:`, error);
      }
    }

    // Light 타입 에셋 로드
    const lightAssets = scene.assets.filter((asset) =>
      ['directional-light', 'point-light', 'rect-light'].includes(asset.type)
    );
    for (const asset of lightAssets) {
      try {
        this.loadLightAsset(asset);
      } catch (error) {
        console.error(`Failed to load light ${asset.id}:`, error);
      }
    }

    // 새로운 Scene일 때만 카메라와 Grid 자동 조정 (같은 Scene 편집 중에는 카메라 유지)
    if (isNewScene) {
      this.adjustCameraAndGrid();
    }

    // 이전에 선택되어 있던 오브젝트가 있으면 다시 선택
    if (previouslySelectedAssetId !== undefined) {
      const objectToReselect = this.loadedObjects.get(previouslySelectedAssetId);
      if (objectToReselect) {
        this.selectObject(objectToReselect);
      }
    }
  }

  /**
   * BoundingBox 기반으로 카메라와 Grid 자동 조정
   * 메인 오브젝트(TestScene 등 삭제 불가 객체)를 기준으로 조정
   */
  private adjustCameraAndGrid(): void {
    if (this.loadedObjects.size === 0) return;

    // 메인 오브젝트(TestScene) 찾기
    let mainObject: THREE.Object3D | null = null;
    this.loadedObjects.forEach((obj) => {
      if (obj.userData.meshName === 'TestScene') {
        mainObject = obj;
      }
    });

    // TestScene이 없으면 전체 BoundingBox 사용 (fallback)
    if (!mainObject) {
      console.warn('TestScene not found, using all objects for camera adjustment');
      mainObject = this.scene; // 전체 씬 사용
    }

    // BoundingBox 계산
    const box = new THREE.Box3();
    if (mainObject === this.scene) {
      this.loadedObjects.forEach((obj) => {
        box.expandByObject(obj);
      });
    } else {
      box.expandByObject(mainObject);
    }

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Grid를 바닥 높이로 이동
    this.gridHelper.position.y = box.min.y;

    // Grid 크기를 방 크기에 맞게 조정 (약간 크게)
    const maxSize = Math.max(size.x, size.z);
    const gridSize = Math.ceil(maxSize * 1.5);
    this.scene.remove(this.gridHelper);
    this.gridHelper = new THREE.GridHelper(gridSize, Math.max(10, gridSize), 0x888888, 0x444444);
    this.gridHelper.position.y = box.min.y;
    this.scene.add(this.gridHelper);

    // 카메라를 방 안쪽으로 배치
    // 바닥에서 사람 눈높이로 (사람 시점)
    const cameraHeight = box.min.y + size.y * 0.4; // 바닥에서 높이의 40% 위 (사람 눈높이)

    this.camera.position.set(
      center.x,
      cameraHeight,
      center.z // 방 중심
    );

    // OrbitControls의 target을 카메라와 비슷한 높이로 설정 (시선 수평)
    this.controls.target.set(
      center.x,
      cameraHeight - size.y * 0.05, // 카메라보다 살짝 아래 (자연스러운 시선)
      center.z - size.z * 0.3 // 앞쪽을 바라보도록
    );
    this.controls.update();

    // 카메라가 바닥 아래로 가지 않도록 제한
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
  }

  /**
   * 개별 Asset 로드
   */
  async loadAsset(asset: SceneAsset): Promise<THREE.Object3D | null> {
    if (asset.type !== 'object' || !asset.meshName) {
      return null;
    }

    try {
      const model = await modelLoader.loadModel(asset.meshName);

      // Transform 적용
      if (asset.transform) {
        model.position.set(...asset.transform.position);
        model.rotation.set(
          THREE.MathUtils.degToRad(asset.transform.rotation[0]),
          THREE.MathUtils.degToRad(asset.transform.rotation[1]),
          THREE.MathUtils.degToRad(asset.transform.rotation[2])
        );
        model.scale.set(...asset.transform.scale);
      }

      // userData에 asset ID 저장 (나중에 선택할 때 사용)
      model.userData.assetId = asset.id;
      model.userData.meshName = asset.meshName;

      this.scene.add(model);
      this.loadedObjects.set(asset.id, model);

      // 선택 가능한 오브젝트로 등록 (defaultRoom은 제외)
      const isDefaultRoom = this.currentDefaultRoom && asset.meshName === this.currentDefaultRoom;
      if (!isDefaultRoom) {
        this.selectableObjects.push(model);
      }

      return model;
    } catch (error) {
      console.error(`Failed to load model ${asset.meshName}:`, error);
      return null;
    }
  }

  /**
   * Light Asset 로드 (Three.js Light + Helper 생성)
   */
  loadLightAsset(asset: SceneAsset): void {
    if (asset.type === 'object' || !asset.lightParams) {
      return;
    }

    let light: THREE.Light | null = null;
    let helper: THREE.Object3D | null = null;

    switch (asset.type) {
      case 'point-light': {
        const params = asset.lightParams as PointLightParams;
        const pointLight = new THREE.PointLight(
          new THREE.Color(...params.color),
          params.intensity,
          0, // distance (0 = infinite)
          2  // decay
        );
        pointLight.position.set(...params.position);

        // Helper 생성
        const pointHelper = new THREE.PointLightHelper(pointLight, 0.3);

        light = pointLight;
        helper = pointHelper;
        break;
      }

      case 'rect-light': {
        const params = asset.lightParams as RectLightParams;

        // u, v 벡터로부터 width, height 계산
        const u = new THREE.Vector3(...params.u);
        const v = new THREE.Vector3(...params.v);
        const width = u.length();
        const height = v.length();

        const rectLight = new THREE.RectAreaLight(
          new THREE.Color(...params.color),
          params.intensity,
          width,
          height
        );
        rectLight.position.set(...params.position);

        // u, v 벡터로부터 rotation 계산
        const normal = new THREE.Vector3().crossVectors(u.normalize(), v.normalize());
        rectLight.lookAt(
          rectLight.position.x + normal.x,
          rectLight.position.y + normal.y,
          rectLight.position.z + normal.z
        );

        // Helper 생성
        const rectHelper = new RectAreaLightHelper(rectLight);

        light = rectLight;
        helper = rectHelper;
        break;
      }

      case 'directional-light': {
        const params = asset.lightParams as DirectionalLightParams;
        const dirLight = new THREE.DirectionalLight(
          new THREE.Color(...params.color),
          params.intensity
        );

        // direction 벡터를 target 위치로 변환
        const dir = new THREE.Vector3(...params.direction).normalize();
        dirLight.position.set(0, 0, 0);
        dirLight.target.position.set(dir.x, dir.y, dir.z);

        // Helper 생성 (화살표 크기)
        const dirHelper = new THREE.DirectionalLightHelper(dirLight, 1);

        light = dirLight;
        helper = dirHelper;

        // DirectionalLight의 target도 scene에 추가해야 함
        this.scene.add(dirLight.target);
        break;
      }
    }

    if (light && helper) {
      // userData에 asset ID 저장
      light.userData.assetId = asset.id;
      light.userData.assetType = asset.type;
      helper.userData.assetId = asset.id;
      helper.userData.assetType = asset.type;
      helper.userData.isLightHelper = true;

      // Scene에 추가
      this.scene.add(light);
      this.scene.add(helper);

      // Map에 저장
      this.loadedLights.set(asset.id, light);
      this.lightHelpers.set(asset.id, helper);

      // Helper를 선택 가능한 객체로 등록
      this.selectableObjects.push(helper);

      console.log(`[ThreeSceneManager] Loaded light: ${asset.type} (${asset.id})`);
    }
  }

  /**
   * Asset ID로 오브젝트 찾기
   */
  getObjectByAssetId(assetId: string | number): THREE.Object3D | undefined {
    return this.loadedObjects.get(assetId);
  }

  /**
   * Asset 제거 (Object 또는 Light)
   */
  removeAsset(assetId: string | number): void {
    // Object 제거
    const obj = this.loadedObjects.get(assetId);
    if (obj) {
      // 선택 해제 (선택된 오브젝트라면)
      if (this.selectedObject === obj) {
        this.deselectObject();
      }

      this.scene.remove(obj);
      this.loadedObjects.delete(assetId);

      // selectableObjects에서도 제거
      const index = this.selectableObjects.indexOf(obj);
      if (index > -1) {
        this.selectableObjects.splice(index, 1);
      }

      // Dispose
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }

    // Light 제거
    const light = this.loadedLights.get(assetId);
    const helper = this.lightHelpers.get(assetId);
    if (light && helper) {
      // 선택 해제 (선택된 helper라면)
      if (this.selectedObject === helper) {
        this.deselectObject();
      }

      this.scene.remove(light);
      this.scene.remove(helper);

      // DirectionalLight의 target 제거
      if (light instanceof THREE.DirectionalLight) {
        this.scene.remove(light.target);
      }

      this.loadedLights.delete(assetId);
      this.lightHelpers.delete(assetId);

      // selectableObjects에서도 제거
      const helperIndex = this.selectableObjects.indexOf(helper);
      if (helperIndex > -1) {
        this.selectableObjects.splice(helperIndex, 1);
      }
    }
  }

  /**
   * React 콜백 설정 - 오브젝트 선택 변경 시
   */
  setSelectionChangeCallback(callback: (assetId: string | number | null) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * React 콜백 설정 - Transform 변경 시
   */
  setTransformChangeCallback(callback: (assetId: string | number, transform: Transform) => void): void {
    this.onTransformChange = callback;
  }

  /**
   * React 콜백 설정 - Light Params 변경 시
   */
  setLightParamsChangeCallback(callback: (assetId: string | number, lightParams: PointLightParams | RectLightParams | DirectionalLightParams) => void): void {
    this.onLightParamsChange = callback;
  }

  /**
   * Asset Transform 업데이트 (React → Three.js 동기화)
   */
  updateAssetTransform(assetId: string | number, transform: Transform): void {
    const obj = this.loadedObjects.get(assetId);
    if (obj) {
      obj.position.set(...transform.position);
      obj.rotation.set(
        THREE.MathUtils.degToRad(transform.rotation[0]),
        THREE.MathUtils.degToRad(transform.rotation[1]),
        THREE.MathUtils.degToRad(transform.rotation[2])
      );
      obj.scale.set(...transform.scale);
    }
  }

  /**
   * Light 파라미터 업데이트 (React → Three.js 동기화)
   */
  updateLightParams(assetId: string | number, lightParams: PointLightParams | RectLightParams): void {
    const light = this.loadedLights.get(assetId);
    const helper = this.lightHelpers.get(assetId);
    if (!light || !helper) return;

    if (light instanceof THREE.PointLight) {
      const params = lightParams as PointLightParams;
      light.position.set(...params.position);
      light.color.setRGB(...params.color);
      light.intensity = params.intensity;
      helper.position.set(...params.position);
    } else if (light instanceof THREE.RectAreaLight) {
      const params = lightParams as RectLightParams;
      light.position.set(...params.position);
      light.color.setRGB(...params.color);
      light.intensity = params.intensity;
      // RectAreaLight는 u/v로 크기 결정
      const width = Math.sqrt(params.u[0] ** 2 + params.u[1] ** 2 + params.u[2] ** 2) * 2;
      const height = Math.sqrt(params.v[0] ** 2 + params.v[1] ** 2 + params.v[2] ** 2) * 2;
      light.width = width;
      light.height = height;
      helper.position.set(...params.position);
    }
  }

  /**
   * Gizmo 모드 설정 (React → Three.js 동기화)
   */
  setGizmoMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.transformControls.setMode(mode);
  }

  /**
   * 선택된 오브젝트의 Transform 가져오기
   */
  getSelectedObjectTransform(): Transform | null {
    if (!this.selectedObject) return null;

    return {
      position: [
        this.selectedObject.position.x,
        this.selectedObject.position.y,
        this.selectedObject.position.z,
      ],
      rotation: [
        THREE.MathUtils.radToDeg(this.selectedObject.rotation.x),
        THREE.MathUtils.radToDeg(this.selectedObject.rotation.y),
        THREE.MathUtils.radToDeg(this.selectedObject.rotation.z),
      ],
      scale: [
        this.selectedObject.scale.x,
        this.selectedObject.scale.y,
        this.selectedObject.scale.z,
      ],
    };
  }

  /**
   * 현재 카메라 설정 가져오기 (저장용)
   */
  getCameraSettings(): { position: [number, number, number]; target: [number, number, number]; fov: number } {
    return {
      position: [
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
      ],
      target: [
        this.controls.target.x,
        this.controls.target.y,
        this.controls.target.z,
      ],
      fov: this.camera.fov,
    };
  }

  /**
   * 프로그래매틱하게 오브젝트 또는 Light 선택
   */
  selectObjectByAssetId(assetId: string | number | null): void {
    if (assetId === null) {
      this.deselectObject();
      return;
    }

    // Object 먼저 확인
    const obj = this.loadedObjects.get(assetId);
    if (obj) {
      this.selectObject(obj);
      return;
    }

    // Light Helper 확인
    const helper = this.lightHelpers.get(assetId);
    if (helper) {
      this.selectObject(helper);
    }
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.stop();

    // Clear scale interval if running
    if (this.scaleIntervalId !== null) {
      clearInterval(this.scaleIntervalId);
      this.scaleIntervalId = null;
    }

    // Remove event listeners
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('click', this.onCanvasClick);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    // Dispose all objects
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    // Dispose controls
    // TransformControls의 _root를 scene에서 제거 (v0.180.0+)
    // @ts-ignore
    if (this.transformControls._root) {
      // @ts-ignore
      this.scene.remove(this.transformControls._root);
    }
    this.transformControls.dispose();
    this.controls.dispose();

    // Dispose renderer
    this.renderer.dispose();

    // Clear references
    this.loadedObjects.clear();
    this.selectableObjects = [];
    this.selectedObject = null;
  }
}
