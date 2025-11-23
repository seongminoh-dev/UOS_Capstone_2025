import      { mat4 }            from "wgpu-matrix";
import type { Mat4 }            from "wgpu-matrix";
import      { Camera }          from "./Camera";
import      { ComputePass }     from "./ComputePass";
import      { World }           from "./World";

import ShaderCode_DEBUG             from './shaders/PT_00_DebugPass.wgsl?raw';
import ShaderCode_MCPT              from './shaders/TEST_MCPT.wgsl?raw';

import ShaderCode_GBufferCreation   from './shaders/PT_01_GBufferPass.wgsl?raw';
import ShaderCode_GetMotionVector   from './shaders/PT_02_GetMotionVector.wgsl?raw';

import ShaderCode_Initialize        from './shaders/PT_1_InitPass.wgsl?raw';

import ShaderCode_Temporal          from './shaders/PT_2_TemporalReuse.wgsl?raw';
import ShaderCode_Temporal_Test     from './shaders/PT_2_TemporalReuseTest.wgsl?raw';

import ShaderCode_FinalShading      from './shaders/PT_4_FinalShadingPass.wgsl?raw';
import ShaderCode_PostProcess       from './shaders/PostProcess.wgsl?raw';

import ShaderCode_Vertex            from './shaders/VertexShader.wgsl?raw';
import ShaderCode_Fragment          from './shaders/FragmentShader.wgsl?raw';
import { Utils } from "./Utils";


const EBufferIndex =
{
    Uniform         : 0,
    Scene           : 1,
    Geometry        : 2,
    Accel           : 3,
    Reservoir       : 4,
    PrevReservoir   : 5,
    SIZE            : 6
} as const;

const ETextureIndex =
{
    TexturePool     : 0,
    G_Buffer        : 1,
    MotionVector    : 2,
    Radiance        : 3,
    History_Read    : 4,
    History_Write   : 5,
    SIZE            : 6
} as const;

const ESamplerIndex =
{
    Default : 0,
    SIZE    : 1
} as const;

const EDataOffsetIndex =
{
    MeshDescriptor      : 0,
    MaterialID          : 1,
    Material            : 2,
    Light               : 3,
    LightsCDF           : 4,
    Index               : 5,
    SubBlasRootArray    : 6,
    Blas                : 7,
    SIZE                : 8
} as const;

const EComputePassIndex =
{
    GBufferCreation         : 0,
    MotionVectorCreation    : 1,
    Initialize              : 2,
    //TemporalReuse           : 3,
    //SpatialReuse            : ,
    FinalShading            : 3,
    PostProcess             : 4,
    SIZE                    : 5
} as const;



export class Renderer
{
    // GPU Device Stuff
    private readonly Adapter         : GPUAdapter;
    private readonly Device          : GPUDevice;
    private readonly Canvas          : HTMLCanvasElement;
    private readonly Context         : GPUCanvasContext;
    private readonly PreferredFormat : GPUTextureFormat;

    // Resources
    private GPUBuffers  : GPUBuffer[];
    private GPUTextures : GPUTexture[];
    private GPUSamplers : GPUSampler[];
    private Offsets     : number[];

    // Passes
    private ComputePasses   : ComputePass[];
    private RenderPipeline  : GPURenderPipeline;
    private RenderBindGroup : GPUBindGroup;

    // Scene Data
    private World       : World;
    private Camera      : Camera;
    private FrameCount  : number;
    private Prev_VPMat  : Mat4;


    constructor
    (
        Adapter : GPUAdapter,
        Device  : GPUDevice,
        Canvas  : HTMLCanvasElement,
    )
    {
        // Get GPU Device Stuffs
        {
            this.Adapter            = Adapter;
            this.Device             = Device;
            this.Canvas             = Canvas;
            this.Context            = Canvas.getContext('webgpu')!;
            this.PreferredFormat    = navigator.gpu.getPreferredCanvasFormat();
        }

        // Configure Context
        {
            const CanvasConfiguration : GPUCanvasConfiguration =
            {
                device : this.Device,
                format : this.PreferredFormat,
                alphaMode : "opaque",
            };

            this.Context.configure(CanvasConfiguration);
        }

        // Declare Resources
        {
            this.GPUBuffers         = new Array(EBufferIndex.SIZE);
            this.GPUTextures        = new Array(ETextureIndex.SIZE);
            this.GPUSamplers        = new Array(ESamplerIndex.SIZE);
            this.Offsets            = new Array(EDataOffsetIndex.SIZE);

            this.ComputePasses      = new Array(EComputePassIndex.SIZE);
            this.RenderPipeline     = GPURenderPipeline.prototype;
            this.RenderBindGroup    = GPUBindGroup.prototype;

            this.World              = World.prototype;
            this.Camera             = Camera.prototype;
            this.FrameCount         = 0;
            this.Prev_VPMat         = mat4.create();
        }

    }


    public GetCamera() : Camera 
    { 
        return this.Camera;
    }

    public ResetFrameCount() : void 
    { 
        this.FrameCount = 0; 
    }



    public async Initialize(InWorld : World) : Promise<void>
    {

        // Prevent VRAM Leak
        this.DestroyGPUResources();

        // Initialize Scene Datas
        {
            this.Camera = new Camera(this.Canvas.width, this.Canvas.height);
            this.Camera.SetLocationFromXYZ(0,0,6);
            this.Camera.SetYaw(0);
            this.Camera.SetPitch(0);

            this.World = InWorld;
            this.ResetFrameCount();
        }

        this.CreateGPUResources();
        this.CreateRenderPass();
        await this.CreateComputePasses();

        return;
    }

    public Update() : void
    {
        this.FrameCount++;

        // Camera Properties
        const CameraLocation            = this.Camera.GetLocation();
        const [ProjectionMatrix_Jittered, Jitter_X, Jitter_Y] = Utils.ProjectionMatrix_Jittered(this.Camera.GetProjectionMatrix(), this.FrameCount, this.Canvas.width / 2, this.Canvas.height / 2);
        const ViewProjection            = mat4.multiply(ProjectionMatrix_Jittered, this.Camera.GetViewMatrix());
        const ViewProjection_Inverse    = mat4.invert(ViewProjection);
        const ViewProjection_Prev       = this.Prev_VPMat ?? ViewProjection;

        const ELEMENT_COUNT = 52;
        const UniformData   = new ArrayBuffer(4 * ELEMENT_COUNT);
        {
            const Float32View   = new Float32Array(UniformData);
            const Uint32View    = new Uint32Array(UniformData);

            Uint32View[0] = this.Canvas.width / 2;
            Uint32View[1] = this.Canvas.height / 2;
            Uint32View[2] = this.Canvas.width;
            Uint32View[3] = this.Canvas.height;
            
            for(let iter=0; iter<16; iter++) Float32View[ 4 + iter] = ViewProjection_Inverse?.[iter]!;
            for(let iter=0; iter<16; iter++) Float32View[20 + iter] = ViewProjection_Prev[iter]!;

            Float32View[36] = CameraLocation[0];
            Float32View[37] = CameraLocation[1];
            Float32View[38] = CameraLocation[2];
            Uint32View [39] = this.FrameCount;

            Uint32View [40] = this.Offsets[EDataOffsetIndex.MeshDescriptor];
            Uint32View [41] = this.Offsets[EDataOffsetIndex.MaterialID];
            Uint32View [42] = this.Offsets[EDataOffsetIndex.Material];
            Uint32View [43] = this.Offsets[EDataOffsetIndex.Light];

            Uint32View [44] = this.Offsets[EDataOffsetIndex.LightsCDF];
            Uint32View [45] = this.Offsets[EDataOffsetIndex.Index];
            Uint32View [46] = this.Offsets[EDataOffsetIndex.SubBlasRootArray];
            Uint32View [47] = this.Offsets[EDataOffsetIndex.Blas];

            Uint32View [48] = this.World.InstancePool.GetResourceArray().length;
            Uint32View [49] = this.World.Lights.length;
            Float32View[50] = Jitter_X;
            Float32View[51] = Jitter_Y;
        }

        this.Device.queue.writeBuffer(this.GPUBuffers[EBufferIndex.Uniform], 0, UniformData);

        this.Prev_VPMat = ViewProjection;

        return;
    }

    public Render() : void
    {
        const WorkgroupCount_HighResolution : number[] = [Math.ceil(this.Canvas.width/8), Math.ceil(this.Canvas.height/8), 1];
        const WorkgroupCount_LowResolution  : number[] = [Math.ceil(this.Canvas.width/16), Math.ceil(this.Canvas.height/16), 1];

        const CommandEncoder : GPUCommandEncoder = this.Device.createCommandEncoder();

        // Dispatch Compute Passes
        {
            const ComputePassEncoder : GPUComputePassEncoder = CommandEncoder.beginComputePass();

            this.ComputePasses[EComputePassIndex.GBufferCreation].Dispatch(ComputePassEncoder, WorkgroupCount_LowResolution);
            this.ComputePasses[EComputePassIndex.MotionVectorCreation].Dispatch(ComputePassEncoder, WorkgroupCount_LowResolution);
            this.ComputePasses[EComputePassIndex.Initialize].Dispatch(ComputePassEncoder, WorkgroupCount_LowResolution);
            this.ComputePasses[EComputePassIndex.FinalShading].Dispatch(ComputePassEncoder, WorkgroupCount_LowResolution);

            this.ComputePasses[EComputePassIndex.PostProcess].Dispatch(ComputePassEncoder, WorkgroupCount_HighResolution);

            ComputePassEncoder.end();
        }

        // RenderPass (Draw ResultTexture)
        {
            const RenderPassDescriptor : GPURenderPassDescriptor =
            {
                colorAttachments :
                [
                    {
                        view : this.Context.getCurrentTexture().createView(),
                        loadOp : "clear",
                        storeOp : "store",
                        clearValue : { r:0, g:0, b:0, a:1 }
                    }
                ]
            };

            const RenderPass : GPURenderPassEncoder = CommandEncoder.beginRenderPass(RenderPassDescriptor);

            RenderPass.setPipeline(this.RenderPipeline);
            RenderPass.setBindGroup(0, this.RenderBindGroup);
            RenderPass.draw(6);

            RenderPass.end();
        }

        // Copy GPU Resources
        {

            CommandEncoder.copyTextureToTexture
            ( 
                { texture : this.GPUTextures[ETextureIndex.History_Write] },
                { texture : this.GPUTextures[ETextureIndex.History_Read] },
                { width : this.Canvas.width, height : this.Canvas.height }
            );

            CommandEncoder.copyBufferToBuffer
            (
                this.GPUBuffers[EBufferIndex.Reservoir], 0,
                this.GPUBuffers[EBufferIndex.PrevReservoir], 0,
                4 * 32 * this.Canvas.width * this.Canvas.height
            );

        }

        // Submit Encoder
        this.Device.queue.submit( [ CommandEncoder.finish() ] );

        return;
    }


    private CreateGPUStorageBuffer(InArrayBuffer : ArrayBuffer) : GPUBuffer
    {
        const StorageBufferUsageFlags   : GPUBufferUsageFlags   = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        const BufferDescriptor          : GPUBufferDescriptor   = { size : InArrayBuffer.byteLength, usage : StorageBufferUsageFlags };
        const GPUBufferCreated          : GPUBuffer             = this.Device.createBuffer(BufferDescriptor);

        this.Device.queue.writeBuffer(GPUBufferCreated, 0, InArrayBuffer);

        return GPUBufferCreated;
    }

    private CreateGPUTexture(width : number, height : number) : GPUTexture
    {
        const TextureDescriptor : GPUTextureDescriptor =
        {
            size    : { width : width, height : height },
            format  : "rgba32float",
            usage   : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
        };

        return this.Device.createTexture(TextureDescriptor);
    }

    private CreateGPUSampler() : GPUSampler
    {

        const SamplerDescriptor : GPUSamplerDescriptor = 
        {
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            addressModeW: 'repeat',
            maxAnisotropy: 8, 
        };

        return this.Device.createSampler(SamplerDescriptor);
    }

    private CreateGPUResources() : void
    {
        const [SceneBufferData, GeometryBufferData, AccelBufferData, ImageBitmaps, Offsets] = this.World.Serialize();

        this.Offsets = Offsets;

        this.GPUBuffers[EBufferIndex.Uniform]       = this.Device.createBuffer( { size : 256, usage : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST } );
        this.GPUBuffers[EBufferIndex.Scene]         = this.CreateGPUStorageBuffer(SceneBufferData);
        this.GPUBuffers[EBufferIndex.Geometry]      = this.CreateGPUStorageBuffer(GeometryBufferData);
        this.GPUBuffers[EBufferIndex.Accel]         = this.CreateGPUStorageBuffer(AccelBufferData);
        this.GPUBuffers[EBufferIndex.Reservoir]     = this.CreateGPUStorageBuffer(new ArrayBuffer(4 * 32 * this.Canvas.width * this.Canvas.height));
        this.GPUBuffers[EBufferIndex.PrevReservoir] = this.CreateGPUStorageBuffer(new ArrayBuffer(4 * 32 * this.Canvas.width * this.Canvas.height));

        this.GPUTextures[ETextureIndex.TexturePool]     = this.CreateTextureArray2048(ImageBitmaps);
        this.GPUTextures[ETextureIndex.G_Buffer]        = this.CreateGPUTexture(this.Canvas.width / 2, this.Canvas.height / 2);
        this.GPUTextures[ETextureIndex.MotionVector]    = this.CreateGPUTexture(this.Canvas.width / 2, this.Canvas.height / 2);
        this.GPUTextures[ETextureIndex.Radiance]        = this.CreateGPUTexture(this.Canvas.width / 2, this.Canvas.height / 2);
        this.GPUTextures[ETextureIndex.History_Read]    = this.CreateGPUTexture(this.Canvas.width, this.Canvas.height);
        this.GPUTextures[ETextureIndex.History_Write]   = this.CreateGPUTexture(this.Canvas.width, this.Canvas.height);

        this.GPUSamplers[ESamplerIndex.Default] = this.CreateGPUSampler();

        return;
    }

    private DestroyGPUResources() : void
    {

        for (let iter = 0; iter < EBufferIndex.SIZE; iter++)
        {
            this.GPUBuffers[iter]?.destroy();
        }

        for (let iter = 0; iter < ETextureIndex.SIZE; iter++)
        {
            this.GPUTextures[iter]?.destroy();
        }

        return;
    }

    private async CreateComputePasses() : Promise<void>
    {
        // Define All Compute Passes (Orders Respect To EComputePassIndex)
        const ComputePassesToCreate : Promise<ComputePass>[] =
        [

            ComputePass.Create // GBuffer Creation
            (
                this.Device, 
                ShaderCode_GBufferCreation, 
                [   // Read GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                    this.GPUBuffers[EBufferIndex.Scene],
                    this.GPUBuffers[EBufferIndex.Geometry],
                    this.GPUBuffers[EBufferIndex.Accel],
                ],
                [   // Read GPUTextureView
                ],
                [   // Read GPUSampler
                ],
                [   // Write GPUBuffer
                ],
                [   // Write GPUTextureView
                    this.GPUTextures[ETextureIndex.G_Buffer].createView(),
                ]
            ),

            ComputePass.Create // Motion Vector Creation
            (
                this.Device, 
                ShaderCode_GetMotionVector,
                [   // Read GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                    this.GPUBuffers[EBufferIndex.Scene],
                    this.GPUBuffers[EBufferIndex.Geometry],
                ],
                [   // Read GPUTextureView
                    this.GPUTextures[ETextureIndex.G_Buffer].createView(),
                ],
                [   // Read GPUSampler
                ],
                [   // Write GPUBuffer
                ],
                [   // Write GPUTextureView
                    this.GPUTextures[ETextureIndex.MotionVector].createView(),
                ]
            ),

            ComputePass.Create // Initialize
            (
                this.Device, 
                ShaderCode_Initialize, 
                [   // Read GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                    this.GPUBuffers[EBufferIndex.Scene],
                    this.GPUBuffers[EBufferIndex.Geometry],
                    this.GPUBuffers[EBufferIndex.Accel],
                ],
                [   // Read GPUTextureView
                    this.GPUTextures[ETextureIndex.TexturePool].createView({dimension: '2d-array', baseArrayLayer: 0, arrayLayerCount: this.GPUTextures[ETextureIndex.TexturePool].depthOrArrayLayers}),
                    this.GPUTextures[ETextureIndex.G_Buffer].createView(),
                ],
                [   // Read GPUSampler
                    this.GPUSamplers[ESamplerIndex.Default],
                ],
                [   // Write GPUBuffer
                    this.GPUBuffers[EBufferIndex.Reservoir],
                ],
                [   // Write GPUTextureView
                ]
            ),

            ComputePass.Create // Final Shading
            (
                this.Device, 
                ShaderCode_FinalShading, 
                [   // Read GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                    this.GPUBuffers[EBufferIndex.Scene],
                    this.GPUBuffers[EBufferIndex.Geometry],
                    this.GPUBuffers[EBufferIndex.Accel],
                    this.GPUBuffers[EBufferIndex.Reservoir],
                ],
                [   // Read GPUTextureView
                    this.GPUTextures[ETextureIndex.TexturePool].createView({dimension: '2d-array', baseArrayLayer: 0, arrayLayerCount: this.GPUTextures[ETextureIndex.TexturePool].depthOrArrayLayers}),
                    this.GPUTextures[ETextureIndex.G_Buffer].createView(),
                ],
                [   // Read GPUSampler
                    this.GPUSamplers[ESamplerIndex.Default],
                ],
                [   // Write GPUBuffer
                ],
                [   // Write GPUTextureView
                    this.GPUTextures[ETextureIndex.Radiance].createView(),
                ]
            ),

            ComputePass.Create // Post Processing
            (
                this.Device, 
                ShaderCode_PostProcess, 
                [   // Read GPUBuffer
                    this.GPUBuffers[EBufferIndex.Uniform],
                ],
                [   // Read GPUTextureView
                    this.GPUTextures[ETextureIndex.Radiance].createView(),
                    this.GPUTextures[ETextureIndex.History_Read].createView(),
                ],
                [   // Read GPUSampler
                ],
                [   // Write GPUBuffer
                ],
                [   // Write GPUTextureView
                    this.GPUTextures[ETextureIndex.History_Write].createView(),
                ]
            ),

        ];

        this.ComputePasses = await Promise.all(ComputePassesToCreate);

        return;
    }

    private CreateRenderPass() : void
    {

        // Create Render Pipeline
        {
            const ShaderModuleDescriptor_Vertex   : GPUShaderModuleDescriptor = { code : ShaderCode_Vertex };
            const ShaderModuleDescriptor_Fragment : GPUShaderModuleDescriptor = { code : ShaderCode_Fragment };

            const ShaderModule_Vertex    : GPUShaderModule = this.Device.createShaderModule(ShaderModuleDescriptor_Vertex);
            const ShaderModule_Fragment  : GPUShaderModule = this.Device.createShaderModule(ShaderModuleDescriptor_Fragment);

            const RenderPipelineDescriptor : GPURenderPipelineDescriptor =
            {
                layout      : "auto",
                vertex      : { module: ShaderModule_Vertex,    entryPoint: "vs_main" },
                fragment    : { module: ShaderModule_Fragment,  entryPoint: "fs_main", targets : [{ format: this.PreferredFormat }] },
                primitive   : { topology: "triangle-list" },
            };

            this.RenderPipeline = this.Device.createRenderPipeline(RenderPipelineDescriptor);
        }

        // Create Render BindGroup
        {
            const RenderBindGroupDescriptor: GPUBindGroupDescriptor =
            {
                layout  : this.RenderPipeline.getBindGroupLayout(0),
                entries : 
                [
                    { binding :  0, resource : this.GPUBuffers[EBufferIndex.Uniform] },
                    { binding : 10, resource : this.GPUTextures[ETextureIndex.History_Write].createView() }
                ],
            };

            this.RenderBindGroup = this.Device.createBindGroup(RenderBindGroupDescriptor);
        }

        return;
    }

    private CreateTextureArray2048(bitmaps: ImageBitmap[]) : GPUTexture
    {
        const WIDTH = 2048;
        const HEIGHT = 2048;
        const layerCount = bitmaps.length;

        // 1. 텍스처가 1장도 없으면 에러 처리 혹은 1x1 더미 텍스처 반환
        if (layerCount === 0) {
            // 1x1 크기, 1개 레이어 텍스처 생성
            const dummyTexture = this.Device.createTexture({
                size: [1, 1, 1], 
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
                dimension: '2d',
                label: 'Dummy_White_1x1'
            });

            // 흰색 픽셀 데이터 (R, G, B, A) = (255, 255, 255, 255)
            const whitePixel = new Uint8Array([255, 255, 255, 255]);

            // 텍스처에 데이터 쓰기 (writeTexture 사용)
            this.Device.queue.writeTexture(
                { texture: dummyTexture },
                whitePixel,
                { bytesPerRow: 4, rowsPerImage: 1 },
                [1, 1, 1]
            );

            return dummyTexture;
        }

        // 2. GPUTexture 생성 (2D Array)
        const textureDescriptor: GPUTextureDescriptor = {
            size: [WIDTH, HEIGHT, layerCount], // [Width, Height, LayerCount]
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | 
                GPUTextureUsage.COPY_DST | 
                GPUTextureUsage.RENDER_ATTACHMENT,
            dimension: '2d',
            label: 'Global_Material_TextureArray_2048'
        };
        
        const textureArray = this.Device.createTexture(textureDescriptor);

        // 3. 리사이징을 위한 임시 캔버스 (재사용)
        // OffscreenCanvas가 지원되지 않는 환경을 대비해 분기 처리 가능하나, WebGPU 환경이면 보통 지원됨
        let resizeContext: OffscreenCanvasRenderingContext2D | null = null;
        let resizeCanvas: OffscreenCanvas | null = null;

        // 4. 순회 및 업로드
        for (let i = 0; i < layerCount; i++) {
            const bitmap = bitmaps[i];
            
            // 업로드 소스 (기본은 원본 비트맵)
            let source: ImageBitmap | OffscreenCanvas = bitmap;

            // A. 크기가 2048x2048이 아닌 경우 -> 캔버스를 거쳐서 리사이징
            if (bitmap.width !== WIDTH || bitmap.height !== HEIGHT) {
                
                // 캔버스는 필요할 때 한 번만 생성 (Lazy Init)
                if (!resizeCanvas || !resizeContext) {
                    resizeCanvas = new OffscreenCanvas(WIDTH, HEIGHT);
                    resizeContext = resizeCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
                    
                    if (!resizeContext) {
                        throw new Error("OffscreenCanvas Context 생성 실패");
                    }
                    // 이미지 보간 품질 설정 (취향에 따라 'low', 'medium', 'high')
                    resizeContext.imageSmoothingQuality = 'high'; 
                }

                // 캔버스 초기화 및 그리기 (Stretch)
                resizeContext.clearRect(0, 0, WIDTH, HEIGHT);
                resizeContext.drawImage(bitmap, 0, 0, WIDTH, HEIGHT);
                
                // 소스를 캔버스로 교체
                source = resizeCanvas;
            }

            // B. GPU 업로드
            this.Device.queue.copyExternalImageToTexture(
                { source: source },
                { 
                    texture: textureArray, 
                    origin: [0, 0, i], // z축이 곧 배열의 인덱스(Layer)입니다.
                },
                [WIDTH, HEIGHT]
            );
        }

        return textureArray;
    }
};