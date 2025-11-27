import { vec3 } from 'wgpu-matrix';
import type { Vec3 } from 'wgpu-matrix';
import { World } from '../World';
import { InputController } from '../InputController';
import { calculateSunLightParams } from '../../utils/SunCalculator';
import type { SunSettings } from './Scene';

// Renderer Renderer_TEST
import { Renderer } from '../Renderer_TEST';

// 태양 강도 배수 (SceneAdapter와 동일)
const SUN_INTENSITY_MULTIPLIER = 15;



/**
 * WebGPUEngine - WebGPU 초기화, 렌더 루프, 입력 처리를 통합 관리합니다.
 */
export class WebGPUEngine {
    private canvas: HTMLCanvasElement;
    private adapter: GPUAdapter | null = null;
    private device: GPUDevice | null = null;
    private renderer: Renderer | null = null;
    private world: World;
    private inputController: InputController;

    // Render loop
    private animationFrameId: number | null = null;
    private lastFrameTime: number = performance.now();
    private isRunning: boolean = false;

    // Frame time averaging
    private frameTimeSamples: number[] = [];
    private readonly FRAME_TIME_SAMPLE_COUNT = 60; // 최근 60 프레임 평균

    // Callbacks
    public onFrameTimeUpdate: ((frameTime: number) => void) | null = null;
    public onCameraUpdate: ((position: { x: number; y: number; z: number }) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.world = new World();
        this.inputController = new InputController(canvas);

        // Setup camera move callback
        this.inputController.onCameraMove = () => {
            if (this.renderer) {
                this.renderer.ResetFrameCount();
            }
        };
    }

    /**
     * WebGPU를 초기화합니다.
     * @param width - Canvas width
     * @param height - Canvas height
     */
    public async initialize(width: number, height: number): Promise<void> {
        // Check WebGPU support
        if (!navigator.gpu) {
            throw new Error('WebGPU is not supported in this browser');
        }

        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;

        // Create GPU resources
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw new Error('Failed to get GPU adapter');
        }

        this.device = await this.adapter.requestDevice();
        if (!this.device) {
            throw new Error('Failed to get GPU device');
        }

        // Create Renderer
        this.renderer = new Renderer(this.adapter, this.device, this.canvas);

        // Note: Scene loading is now handled externally by WebGPURenderer
        // Renderer.Initialize()는 Scene 로드 후에 호출됨

        console.log('WebGPU Engine initialized successfully');
    }

    /**
     * 렌더 루프를 시작합니다.
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Engine is already running');
            return;
        }

        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.renderLoop();
    }

    /**
     * 렌더 루프를 중지합니다.
     */
    public stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 캔버스 크기를 변경합니다.
     * @param width - New width
     * @param height - New height
     */
    public async resize(width: number, height: number): Promise<void> {
        if (!this.renderer) {
            throw new Error('Engine not initialized');
        }

        // 1. 현재 카메라 상태 저장
        const currentCamera = this.renderer.GetCamera();
        const savedLocation = currentCamera.GetLocation();
        const savedPitch = currentCamera.GetPitch();
        const savedYaw = currentCamera.GetYaw();

        // 2. 캔버스 크기 변경
        this.canvas.width = width;
        this.canvas.height = height;

        // 3. Renderer 재초기화 (새 카메라 생성됨)
        await this.renderer.Initialize(this.world);

        // 4. 새 카메라에 저장된 상태 복원
        const newCamera = this.renderer.GetCamera();
        newCamera.SetLocation(savedLocation);
        newCamera.SetPitch(savedPitch);
        newCamera.SetYaw(savedYaw);

        // 5. InputController에 새 카메라 참조 전달
        this.inputController.setCamera(newCamera);
    }

    /**
     * 리소스를 정리합니다.
     */
    public dispose(): void {
        this.stop();
        this.inputController.dispose();
        this.renderer = null;
        this.device = null;
        this.adapter = null;
    }

    /**
     * 렌더 루프 (private)
     */
    private renderLoop = (): void => {
        if (!this.isRunning || !this.renderer) return;

        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;

        // Update frame time with moving average
        const frameTimeMs = deltaTime * 1000; // Convert to milliseconds
        this.frameTimeSamples.push(frameTimeMs);

        // Keep only the most recent N samples
        if (this.frameTimeSamples.length > this.FRAME_TIME_SAMPLE_COUNT) {
            this.frameTimeSamples.shift();
        }

        // Calculate average frame time
        if (this.onFrameTimeUpdate && this.frameTimeSamples.length > 0) {
            const avgFrameTime = this.frameTimeSamples.reduce((sum, val) => sum + val, 0) / this.frameTimeSamples.length;
            this.onFrameTimeUpdate(avgFrameTime);
        }

        // Handle input and update camera
        const cameraMoved = this.inputController.update(deltaTime);
        if (cameraMoved) {
            this.renderer.ResetFrameCount();
        }

        // Update camera position callback
        if (this.onCameraUpdate) {
            const camera = this.renderer.GetCamera();
            const cameraLocation = camera.GetLocation();
            this.onCameraUpdate({
                x: cameraLocation[0],
                y: cameraLocation[1],
                z: cameraLocation[2],
            });
        }

        // Render
        this.renderer.Update();
        this.renderer.Render();

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
    };

    /**
     * Renderer를 반환합니다 (디버깅용)
     */
    public getRenderer(): Renderer | null {
        return this.renderer;
    }

    /**
     * World를 반환합니다 (디버깅용)
     */
    public getWorld(): World {
        return this.world;
    }

    /**
     * InputController에 카메라를 설정합니다.
     * Renderer.Initialize() 이후 호출해야 합니다.
     */
    public setupInputController(): void {
        if (this.renderer) {
            this.inputController.setCamera(this.renderer.GetCamera());
        }
    }

    /**
     * 카메라 위치 설정
     */
    public setCamera(
        position: [number, number, number],
        target: [number, number, number],
        fov?: number
    ): void {
        if (!this.renderer) return;

        const camera = this.renderer.GetCamera();

        // 카메라 위치 설정
        camera.SetLocationFromXYZ(position[0], position[1], position[2]);

        // target을 향해 카메라 방향 설정 (yaw, pitch 계산)
        const dx = target[0] - position[0];
        const dy = target[1] - position[1];
        const dz = target[2] - position[2];

        // Yaw: XZ 평면에서의 각도 (Y축 회전) - radian to degree
        const yawRad = Math.atan2(dx, dz);
        const yawDeg = (yawRad * 180) / Math.PI;

        // Pitch: 수직 각도 - radian to degree
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const pitchRad = Math.atan2(dy, horizontalDist);
        const pitchDeg = (pitchRad * 180) / Math.PI;

        camera.SetYaw(yawDeg);
        camera.SetPitch(pitchDeg);

        // FOV 설정 (TODO: Camera에 SetFOV 메서드 필요시 추가)
        // if (fov !== undefined) {
        //     camera.SetFOV(fov);
        // }

        console.log(`[WebGPUEngine] Camera set: position=[${position}], target=[${target}]`);
    }

    /**
     * 태양 설정을 즉시 업데이트합니다 (재렌더링 없이).
     * @param sunSettings - 새로운 태양 설정
     */
    public updateSunLight(sunSettings: SunSettings): void {
        if (!this.renderer) {
            console.warn('[WebGPUEngine] Renderer not initialized');
            return;
        }

        // 태양 파라미터 계산
        const sunParams = calculateSunLightParams(
            sunSettings.timeOfDay,
            sunSettings.isDaytime,
            sunSettings.season,
            sunSettings.roomOrientation
        );

        if (sunParams) {
            // 낮: DirectionalLight 업데이트
            const direction: Vec3 = vec3.normalize(
                vec3.fromValues(...sunParams.direction)
            );
            const color: Vec3 = vec3.fromValues(...sunParams.color);
            const intensity: number = sunParams.intensity * SUN_INTENSITY_MULTIPLIER;

            this.world.UpdateDirectionalLight(direction, color, intensity);
            console.log(`[WebGPUEngine] Sun updated: direction=[${sunParams.direction}], intensity=${intensity.toFixed(2)}`);
        } else {
            // 밤: DirectionalLight 제거
            this.world.RemoveDirectionalLights();
            console.log('[WebGPUEngine] Sun removed (night mode)');
        }

        // GPU 버퍼 업데이트
        this.renderer.UpdateLights(this.world);
    }
}
