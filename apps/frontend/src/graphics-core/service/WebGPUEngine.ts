import { vec3 } from 'wgpu-matrix';
import type { Vec3 } from 'wgpu-matrix';
import { World } from '../World';
import { InputController } from '../InputController';
import type { SunSettings } from './Scene';
import { RENDERER_CONFIG } from '../../config';
import type { InitProgress, InitializeOptions, OnProgressCallback } from './types/InitProgress';
import { TOTAL_INIT_STEPS } from './types/InitProgress';
import { WebGPUError } from './types/WebGPUError';
import type { WebGPUErrorCode } from './types/WebGPUError';

// Renderer
import { Renderer } from '../Renderer';

// Lighting Module (새로운 통합 모듈)
import {
  computeLighting,
  sunSettingsToLightingSettings,
  extractDirectionalLightData,
  extractEnvironmentUniformData,
  lightingToDebugString,
} from '../lighting';



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

    // Frame time averaging (sample count from centralized config)
    private frameTimeSamples: number[] = [];
    private readonly FRAME_TIME_SAMPLE_COUNT = RENDERER_CONFIG.FRAME_TIME_SAMPLE_COUNT;

    // Callbacks
    public onFrameTimeUpdate: ((frameTime: number) => void) | null = null;
    public onCameraUpdate: ((position: { x: number; y: number; z: number }) => void) | null = null;

    // ─────────────────────────────────────────────
    // WebGPU 에러 콜백 (런타임 에러 전달용)
    // ─────────────────────────────────────────────
    public onError: ((error: WebGPUError) => void) | null = null;

    // ─────────────────────────────────────────────
    // Pending SunSettings (Renderer 초기화 전 저장)
    // ─────────────────────────────────────────────
    private pendingSunSettings: SunSettings | null = null;

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
     * @param options - 초기화 옵션 (onProgress 콜백 포함)
     * @throws {WebGPUError} WebGPU 관련 초기화 실패 시
     */
    public async initialize(
        width: number,
        height: number,
        options?: InitializeOptions
    ): Promise<void> {
        const onProgress = options?.onProgress;
        const totalSteps = 4; // Engine 초기화 단계 (checkSupport, createAdapter, initDevice, initContext)

        // Helper function to report progress
        const reportProgress = (phase: InitProgress['phase'], step: number, message?: string) => {
            onProgress?.({ phase, step, totalSteps, message });
        };

        // ─────────────────────────────────────────────
        // Step 1: Check WebGPU support
        // ─────────────────────────────────────────────
        reportProgress('checkSupport', 1, 'WebGPU 지원 확인 중...');
        if (!navigator.gpu) {
            throw new WebGPUError(
                'WEBGPU_NOT_SUPPORTED',
                '이 브라우저는 WebGPU를 지원하지 않습니다. Chrome 113 이상 또는 Edge 113 이상을 사용해주세요.'
            );
        }

        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;

        // ─────────────────────────────────────────────
        // Step 2: Create GPU adapter
        // ─────────────────────────────────────────────
        reportProgress('createAdapter', 2, 'GPU 어댑터 생성 중...');
        try {
            this.adapter = await navigator.gpu.requestAdapter();
        } catch (err) {
            throw new WebGPUError(
                'ADAPTER_NOT_FOUND',
                'GPU 어댑터 요청 중 오류가 발생했습니다.',
                err instanceof Error ? err : undefined
            );
        }

        if (!this.adapter) {
            throw new WebGPUError(
                'ADAPTER_NOT_FOUND',
                'GPU 어댑터를 찾을 수 없습니다. 하드웨어 가속이 활성화되어 있는지 확인하거나, 원격 데스크톱/가상 머신이 아닌 로컬 환경에서 시도해주세요.'
            );
        }

        // ─────────────────────────────────────────────
        // Step 3: Create GPU device
        // ─────────────────────────────────────────────
        reportProgress('initDevice', 3, '디바이스 초기화 중...');
        try {
            this.device = await this.adapter.requestDevice();
        } catch (err) {
            // OOM 또는 기타 디바이스 생성 실패
            const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
            const code: WebGPUErrorCode = errorMessage.includes('out of memory') || errorMessage.includes('allocation')
                ? 'OUT_OF_MEMORY'
                : 'DEVICE_REQUEST_FAILED';

            throw new WebGPUError(
                code,
                code === 'OUT_OF_MEMORY'
                    ? 'GPU 메모리가 부족합니다. 다른 탭이나 GPU 사용 프로그램을 종료해주세요.'
                    : 'GPU 디바이스 생성에 실패했습니다. 그래픽 드라이버를 업데이트하거나 브라우저를 재시작해주세요.',
                err instanceof Error ? err : undefined
            );
        }

        if (!this.device) {
            throw new WebGPUError(
                'DEVICE_REQUEST_FAILED',
                'GPU 디바이스를 생성할 수 없습니다.'
            );
        }

        // ─────────────────────────────────────────────
        // Device Lost 핸들러 등록
        // GPU가 리셋되거나 연결이 끊어진 경우 호출됨
        // ─────────────────────────────────────────────
        this.device.lost.then((info) => {
            const reason = info.reason;
            console.error(`[WebGPUEngine] GPU device lost: ${reason}`, info.message);

            // 렌더 루프 중지
            this.stop();

            // 에러 콜백으로 상위에 전달
            if (this.onError) {
                const error = new WebGPUError(
                    'GPU_LOST',
                    `GPU 연결이 끊어졌습니다. (원인: ${reason || 'unknown'}) 페이지를 새로고침해주세요.`
                );
                this.onError(error);
            }
        });

        // ─────────────────────────────────────────────
        // Uncaptured Error 핸들러 등록
        // 셰이더 컴파일/validation 에러 등을 수집
        // ─────────────────────────────────────────────
        this.device.addEventListener('uncapturederror', (event) => {
            const gpuError = event.error;
            console.error('[WebGPUEngine] Uncaptured GPU error:', gpuError);

            // 에러 타입 분류
            let code: WebGPUErrorCode = 'UNKNOWN';
            let message = 'GPU에서 예기치 않은 오류가 발생했습니다.';

            if (gpuError instanceof GPUValidationError) {
                // 셰이더 컴파일 에러 또는 파이프라인 생성 실패
                code = 'SHADER_COMPILE_ERROR';
                message = `GPU 유효성 검사 오류: ${gpuError.message}`;
            } else if (gpuError instanceof GPUOutOfMemoryError) {
                code = 'OUT_OF_MEMORY';
                message = 'GPU 메모리가 부족합니다.';
            }

            // 에러 콜백으로 상위에 전달
            if (this.onError) {
                this.onError(new WebGPUError(code, message));
            }
        });

        // ─────────────────────────────────────────────
        // Step 4: Create Renderer (includes context configuration)
        // ─────────────────────────────────────────────
        reportProgress('initContext', 4, 'Context 구성 중...');
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
        const wasRunning = this.isRunning;
        this.stop(); // 렌더 루프 중지 (GPU 리소스 경쟁 방지)
        await this.renderer.Initialize(this.world);
        if (wasRunning) {
            this.start(); // 이전에 실행 중이었으면 재시작
        }

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
     *
     * 좌표계 규칙:
     * - Three.js와 WebGPU 모두 오른손 좌표계 사용
     * - 기본 forward 방향: -Z
     * - Yaw: Y축 회전 (좌우), Pitch: X축 회전 (상하)
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

        // Yaw: XZ 평면에서의 각도 (Y축 회전)
        // Camera.GetForwardVector()는 BaseForward = (0, 0, -1) 사용
        // 따라서 yaw=0일 때 카메라는 -Z 방향을 바라봄
        // atan2(-dx, -dz)를 사용하여 -Z가 기본 방향이 되도록 함
        const yawRad = Math.atan2(-dx, -dz);
        const yawDeg = (yawRad * 180) / Math.PI;

        // Pitch: 수직 각도 (X축 회전)
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const pitchRad = Math.atan2(dy, horizontalDist);
        const pitchDeg = (pitchRad * 180) / Math.PI;

        camera.SetYaw(yawDeg);
        camera.SetPitch(pitchDeg);

        // FOV 설정 (TODO: Camera에 SetFOV 메서드 필요시 추가)
        // if (fov !== undefined) {
        //     camera.SetFOV(fov);
        // }

        console.log(`[WebGPUEngine] Camera set: position=[${position}], target=[${target}], yaw=${yawDeg.toFixed(1)}, pitch=${pitchDeg.toFixed(1)}`);
    }

    /**
     * Scene 로딩 시 sunSettings를 적용합니다.
     * - Sun → DirectionalLight 변환하여 World에 추가
     * - Environment 파라미터 설정 (Renderer 초기화 후 적용됨)
     *
     * @param sunSettings - 태양 설정
     */
    public applySunSettings(sunSettings: SunSettings): void {
        // 1. SunSettings → LightingSettings 변환
        const lightingSettings = sunSettingsToLightingSettings(sunSettings);

        // 2. 통합 Lighting 계산
        const lighting = computeLighting(lightingSettings);

        // 3. DirectionalLight를 World에 추가 (Renderer 초기화 전에도 동작)
        const sunData = extractDirectionalLightData(lighting);

        if (sunData) {
            const direction: Vec3 = vec3.normalize(
                vec3.fromValues(...sunData.direction)
            );
            const color: Vec3 = vec3.fromValues(...sunData.color);

            this.world.AddDirectionalLight(direction, color, sunData.intensity);
            console.log(`[WebGPUEngine] Sun applied: intensity=${sunData.intensity.toFixed(2)}`);
        } else {
            console.log('[WebGPUEngine] Sun is below horizon (night mode)');
        }

        // 4. 조명이 0개면 dummy light 추가 (렌더러 크래시 방지)
        if (this.world.Lights.length === 0) {
            const dummyDirection: Vec3 = vec3.fromValues(0, -1, 0);
            const dummyColor: Vec3 = vec3.fromValues(0, 0, 0);
            this.world.AddDirectionalLight(dummyDirection, dummyColor, 0.0);
            console.log('[WebGPUEngine] No lights - added dummy light');
        }

        // 5. 환경 파라미터 저장 (Renderer 초기화 시 사용됨)
        this.pendingSunSettings = sunSettings;

        // 6. Renderer가 이미 초기화되어 있으면 Environment도 업데이트
        if (this.renderer) {
            const envData = extractEnvironmentUniformData(lighting);
            this.renderer.UpdateEnvironment(
                envData.skyColor,
                envData.horizonColor,
                envData.groundColor,
                envData.sunDirection,
                envData.sunIntensity,
                envData.envIntensity,
                envData.envMode,
                envData.envIndirectMult
            );
            console.log(lightingToDebugString(lighting));
        }
    }

    /**
     * Renderer 초기화 완료 후, 대기 중인 lighting 파라미터를 적용합니다.
     * - applySunSettings()에서 저장한 pendingSunSettings를 사용
     * - Environment 파라미터(envIndirectMult * ENV_INDIRECT_INTENSITY 등)를 GPU에 전달
     */
    public applyPendingLighting(): void {
        if (!this.renderer) {
            console.warn('[WebGPUEngine] Renderer not initialized');
            return;
        }

        if (!this.pendingSunSettings) {
            console.warn('[WebGPUEngine] No pending sun settings');
            return;
        }

        // pendingSunSettings를 사용하여 Environment 업데이트
        const lightingSettings = sunSettingsToLightingSettings(this.pendingSunSettings);
        const lighting = computeLighting(lightingSettings);
        const envData = extractEnvironmentUniformData(lighting);

        this.renderer.UpdateEnvironment(
            envData.skyColor,
            envData.horizonColor,
            envData.groundColor,
            envData.sunDirection,
            envData.sunIntensity,
            envData.envIntensity,
            envData.envMode,
            envData.envIndirectMult
        );

        console.log('[WebGPUEngine] Pending lighting applied');
        console.log(lightingToDebugString(lighting));

        // 적용 완료 후 초기화
        this.pendingSunSettings = null;
    }

    /**
     * 태양 설정을 즉시 업데이트합니다 (Renderer 초기화 후 사용).
     * @param sunSettings - 새로운 태양 설정
     */
    public updateSunLight(sunSettings: SunSettings): void {
        if (!this.renderer) {
            console.warn('[WebGPUEngine] Renderer not initialized');
            return;
        }

        // 새로운 Lighting 모듈 사용
        this.updateLighting(sunSettings);
    }

    // ─────────────────────────────────────────────
    // 정적 렌더링 지원 메서드
    // ─────────────────────────────────────────────

    /**
     * World를 초기화합니다 (새 Scene 로드 전 호출)
     */
    public clearWorld(): void {
        this.world = new World();
        console.log('[WebGPUEngine] World cleared');
    }

    /**
     * Renderer가 초기화되었는지 확인합니다.
     */
    public isRendererInitialized(): boolean {
        return this.renderer !== null;
    }

    /**
     * 단일 프레임을 렌더링합니다 (정적 렌더링용)
     * - 렌더 루프 없이 한 번만 렌더링
     */
    public renderOnce(): void {
        if (!this.renderer) {
            console.warn('[WebGPUEngine] Renderer not initialized');
            return;
        }

        // 카메라 위치 콜백 업데이트
        if (this.onCameraUpdate) {
            const camera = this.renderer.GetCamera();
            const cameraLocation = camera.GetLocation();
            this.onCameraUpdate({
                x: cameraLocation[0],
                y: cameraLocation[1],
                z: cameraLocation[2],
            });
        }

        // 단일 프레임 렌더링
        this.renderer.Update();
        this.renderer.Render();

        console.log('[WebGPUEngine] Rendered single frame');
    }

    /**
     * 프레임 카운트를 리셋합니다 (Scene 변경 후 호출)
     */
    public resetFrameCount(): void {
        if (this.renderer) {
            this.renderer.ResetFrameCount();
        }
    }

    /**
     * 통합 Lighting 업데이트 (내부 메서드)
     * - Sun + Environment를 한 번에 계산하고 GPU 버퍼 업데이트
     * @param sunSettings - 태양 설정
     */
    private updateLighting(sunSettings: SunSettings): void {
        // 1. SunSettings → LightingSettings 변환
        const lightingSettings = sunSettingsToLightingSettings(sunSettings);

        // 2. 통합 Lighting 계산
        const lighting = computeLighting(lightingSettings);

        // 3. DirectionalLight 업데이트
        const sunData = extractDirectionalLightData(lighting);

        if (sunData) {
            // 낮: DirectionalLight 업데이트
            const direction: Vec3 = vec3.normalize(
                vec3.fromValues(...sunData.direction)
            );
            const color: Vec3 = vec3.fromValues(...sunData.color);

            this.world.UpdateDirectionalLight(direction, color, sunData.intensity);
        } else {
            // 밤: DirectionalLight 제거
            this.world.RemoveDirectionalLights();
        }

        // 4. GPU Light 버퍼 업데이트
        this.renderer!.UpdateLights(this.world);

        // 5. Environment 업데이트
        const envData = extractEnvironmentUniformData(lighting);

        this.renderer!.UpdateEnvironment(
            envData.skyColor,
            envData.horizonColor,
            envData.groundColor,
            envData.sunDirection,
            envData.sunIntensity,
            envData.envIntensity,
            envData.envMode,
            envData.envIndirectMult
        );

        // 6. 디버그 로그
        console.log(lightingToDebugString(lighting));
    }
}
