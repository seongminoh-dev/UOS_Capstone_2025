//==========================================================================
// Data Structures
//==========================================================================

struct Uniform
{
    Resolution_Source               : vec2<u32>,
    Resolution_Target               : vec2<u32>,

    ViewProjectionMatrix_Inverse    : mat4x4<f32>,
    ViewProjectionMatrix_Prev       : mat4x4<f32>,

    CameraWorldPosition             : vec3<f32>,
    FrameIndex                      : u32,

    Offset_MeshDescriptorBuffer     : u32,
    Offset_MaterialIDBuffer         : u32,
    Offset_MaterialBuffer           : u32,
    Offset_LightBuffer              : u32,

    Offset_LightsCDFBuffer          : u32,
    Offset_IndexBuffer              : u32,
    Offset_SubBlasRootArrayBuffer   : u32,
    Offset_BlasBuffer               : u32,

    InstanceCount                   : u32,
    LightSourceCount                : u32,
    Jitter                          : vec2<f32>
};

//==========================================================================
// Constants ===============================================================
//==========================================================================

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_LIGHT      : u32 = 18u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_MATERIAL   : u32 = 15u;
const STRIDE_VERTEX     : u32 =  8u;
const STRIDE_BLAS       : u32 =  8u;

const PI : f32 = 3.141592;

//==========================================================================
// GPU Bindings
//==========================================================================

@group(0) @binding(0) var<uniform> UniformBuffer : Uniform;

@group(0) @binding(10) var RadianceTexture  : texture_2d<f32>;
@group(0) @binding(11) var HistoryTexture   : texture_2d<f32>;

@group(1) @binding(10) var ResultTexture    : texture_storage_2d<rgba32float, write>;

//==========================================================================
// Main
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID : vec3<u32>)
{
    // 0. 범위 밖 스레드는 계산 X
    {
        let bPixelInBoundary_X : bool = (ThreadID.x < UniformBuffer.Resolution_Target.x);
        let bPixelInBoundary_Y : bool = (ThreadID.y < UniformBuffer.Resolution_Target.y);

        if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return; }
    }

    {
        let FrameColor : vec4<f32> = textureLoad(RadianceTexture, ThreadID.xy, 0);
        let SceneColor : vec4<f32> = textureLoad(HistoryTexture, ThreadID.xy, 0);
        let WriteColor : vec4<f32> = mix(SceneColor, FrameColor, 1.0 / f32(UniformBuffer.FrameIndex + 1));

        textureStore(ResultTexture, ThreadID.xy, vec4<f32>(WriteColor.rgb, 1.0));
    }

    return;
}