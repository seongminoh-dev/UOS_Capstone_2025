//==========================================================================
// Data Structures
//==========================================================================

struct Uniform
{
    Resolution_Source               : vec2<u32>,
    Resolution_Target               : vec2<u32>,

    ViewProjectionMatrix_Inverse    : mat4x4<f32>,
    ViewProjectionMatrix_Clean      : mat4x4<f32>,
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

@group(0) @binding(10) var RadianceTexture      : texture_2d<f32>;
@group(0) @binding(11) var HistoryTexture       : texture_2d<f32>;
@group(0) @binding(12) var MotionVectorTexture  : texture_2d<f32>;

@group(0) @binding(20) var LinearSampler        : sampler;

@group(1) @binding(10) var ResultTexture        : texture_storage_2d<rgba16float, write>;

//==========================================================================
// Function
//==========================================================================

fn GetPrevUV(UV : vec2<f32>) -> vec2<f32>
{
    let MotionVectorRaw : vec2<f32> = textureSampleLevel(MotionVectorTexture, LinearSampler, UV, 0.0).xy;
    let MotionVectorUV  : vec2<f32> = MotionVectorRaw / vec2<f32>(UniformBuffer.Resolution_Source);

    return UV - MotionVectorUV;
}

fn ClampHistoryColor(UV : vec2<f32>, HistoryColor : vec3<f32>) -> vec3<f32>
{
    let TexelSize : vec2<f32> = 1.0 / vec2<f32>( UniformBuffer.Resolution_Source );

    var Color_Min : vec3<f32> = vec3<f32>( 10000.0);
    var Color_Max : vec3<f32> = vec3<f32>(-10000.0);

    for(var y : i32 = -1; y <= 1; y++)
    {
        for(var x : i32 = -1; x <= 1; x++)
        {
            let NeighborUV      : vec2<f32> = UV + vec2<f32>(f32(x), f32(y)) * TexelSize;
            let NeighborColor   : vec3<f32> = textureSampleLevel(RadianceTexture, LinearSampler, NeighborUV, 0.0).rgb;

            Color_Min = min(Color_Min, NeighborColor);
            Color_Max = max(Color_Max, NeighborColor);
        }
    }

    return clamp(HistoryColor.rgb, Color_Min, Color_Max);
}

fn Encode(color : vec3<f32>) -> vec3<f32> { return color / (1.0 + max(color.r, max(color.g, color.b))); }
fn Decode(color : vec3<f32>) -> vec3<f32> { return color / (1.0 - max(color.r, max(color.g, color.b))); }

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

    // if (false)
    // {
    //     let FrameColor : vec4<f32> = textureLoad(RadianceTexture, ThreadID.xy, 0);
    //     let SceneColor : vec4<f32> = textureLoad(HistoryTexture, ThreadID.xy, 0);
    //     let WriteColor : vec4<f32> = mix(SceneColor, FrameColor, 1.0 / f32(UniformBuffer.FrameIndex + 1));

    //     textureStore(ResultTexture, ThreadID.xy, vec4<f32>(WriteColor.rgb, 1.0));

    //     return;
    // }

    let UV          : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution_Target);
    let UV_Unjitter : vec2<f32> = UV -  UniformBuffer.Jitter;
    let UV_Prev     : vec2<f32> = GetPrevUV(UV);

    let bHistoryValid   : bool  = ( (0.0 < UV_Prev.x && UV_Prev.x < 1.0) && (0.0 < UV_Prev.y && UV_Prev.y < 1.0) );
    let Alpha           : f32   = select(0.0, 0.95, bHistoryValid);

    let CurrentColor    : vec3<f32> = Encode( textureSampleLevel(RadianceTexture, LinearSampler, UV_Unjitter, 0.0).rgb );
    let HistoryColor    : vec3<f32> = Encode( textureSampleLevel(HistoryTexture, LinearSampler, UV_Prev, 0.0).rgb );
    let WriteColor      : vec3<f32> = Decode( mix(CurrentColor, HistoryColor, Alpha) );
    
    textureStore(ResultTexture, ThreadID.xy, vec4<f32>(WriteColor, 1.0));


    return;
}