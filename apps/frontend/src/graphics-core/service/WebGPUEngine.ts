import { World } from '../World';
import { InputController } from '../InputController';

// Renderer Renderer_TEST
import { Renderer } from '../Renderer_TEST';



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
}
