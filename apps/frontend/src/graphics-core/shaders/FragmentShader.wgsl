struct Uniform
{
    Resolution                      : vec2<u32>,
    MAX_BOUNCE                      : u32,
    SAMPLE_PER_PIXEL                : u32,

    ViewProjectionMatrix_Inverse    : mat4x4<f32>,

    CameraWorldPosition             : vec3<f32>,
    FrameIndex                      : u32,

    Offset_MeshDescriptorBuffer     : u32,
    Offset_MaterialBuffer           : u32,
    Offset_LightBuffer              : u32,
    Offset_LightsCDFBuffer          : u32,

    Offset_IndexBuffer              : u32,
    Offset_SubBlasRootArrayBuffer   : u32,
    Offset_BlasBuffer               : u32,
    InstanceCount                   : u32,

    LightSourceCount                : u32,
};


@group(0) @binding(0) var<uniform> UniformBuffer : Uniform;
@group(0) @binding(10) var screenTexture : texture_2d<f32>;

@fragment
fn fs_main(@location(0) PixelUV : vec2<f32>) -> @location(0) vec4<f32> 
{

  let Width   : f32 = f32(UniformBuffer.Resolution.x);
  let Height  : f32 = f32(UniformBuffer.Resolution.y);

  let TexelUV : vec2<i32> = vec2<i32>(i32(floor(PixelUV.x * Width)), i32(floor(PixelUV.y * Height)));
  let color   : vec3<f32> = textureLoad(screenTexture, vec2<i32>(TexelUV), 0).rgb;

  return vec4<f32>(color, 1.0);
}
