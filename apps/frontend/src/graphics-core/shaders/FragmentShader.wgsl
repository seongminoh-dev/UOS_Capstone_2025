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

fn ACESFilm(x: vec3<f32>) -> vec3<f32> 
{
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

@group(0) @binding(0) var<uniform> UniformBuffer : Uniform;
@group(0) @binding(10) var screenTexture: texture_2d<f32>;

@fragment
fn fs_main(@location(0) PixelUV: vec2<f32>) -> @location(0) vec4<f32> 
{

  var TextureColor_Linear : vec3<f32>;
  {
    let Width   : f32 = f32( UniformBuffer.Resolution_Target.x );
    let Height  : f32 = f32( UniformBuffer.Resolution_Target.y );

    let TexelUV = vec2<i32>(i32(floor(PixelUV.x * Width)), i32(floor(PixelUV.y * Height)));
    TextureColor_Linear = textureLoad(screenTexture, vec2<i32>(TexelUV), 0).rgb;
  }

  let ToneMappedColor     : vec3<f32> = ACESFilm( TextureColor_Linear );
  let TextureColor_sRGB   : vec3<f32> = pow(ToneMappedColor, vec3<f32>(1.0 / 2.2));

  return vec4<f32>(TextureColor_sRGB, 1.0);
}