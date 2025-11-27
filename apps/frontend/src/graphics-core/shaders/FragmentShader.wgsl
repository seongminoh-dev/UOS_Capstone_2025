struct Uniform
{
  Resolution_Source                       : vec2<u32>,
  Resolution_Target                       : vec2<u32>,

  ViewProjectionMatrix_Jittered_Inverse   : mat4x4<f32>,
  ViewProjectionMatrix                    : mat4x4<f32>,
  ViewProjectionMatrix_Inverse            : mat4x4<f32>,
  ViewProjectionMatrix_Prev               : mat4x4<f32>,

  CameraWorldPosition                     : vec3<f32>,
  FrameIndex                              : u32,

  Offset_MeshDescriptorBuffer             : u32,
  Offset_MaterialIDBuffer                 : u32,
  Offset_MaterialBuffer                   : u32,
  Offset_LightBuffer                      : u32,

  Offset_LightsCDFBuffer                  : u32,
  Offset_IndexBuffer                      : u32,
  Offset_SubBlasRootArrayBuffer           : u32,
  Offset_BlasBuffer                       : u32,

  InstanceCount                           : u32,
  LightSourceCount                        : u32,
  Jitter                                  : vec2<f32>,

  Padding_0                               : vec3<u32>,
  FrameCount                              : u32,

  EnvSkyColor                             : vec3<f32>,
  EnvMode                                 : u32,

  EnvHorizonColor                         : vec3<f32>,
  EnvSunIntensity                         : f32,

  EnvGroundColor                          : vec3<f32>,
  EnvIntensity                            : f32,

  EnvSunDirection                         : vec3<f32>,
  EnvIndirectMult                         : f32,
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

// TEMP CODE : Gemini 가 작성
// Sharpness: 0.0(샤프닝 없음) ~ 1.0(최대 샤프닝)
// 보통 0.2 ~ 0.5 정도가 자연스럽습니다.
fn RCAS(UV : vec2<f32>, InputTex : texture_2d<f32>, Samp : sampler, Sharpness : f32) -> vec3<f32>
{
    // 1. 텍셀 크기 (High Resolution 기준)
    let TexelSize = 1.0 / vec2<f32>(textureDimensions(InputTex));

    // 2. 5-Tap 샘플링 (십자가)
    // (Bilinear Sampler를 써도 되지만, 텍셀 중심을 정확히 찍는 게 좋음)
    let ColorC = textureSampleLevel(InputTex, Samp, UV, 0.0).rgb; // Center
    let ColorU = textureSampleLevel(InputTex, Samp, UV + vec2<f32>(0.0, -TexelSize.y), 0.0).rgb; // Up
    let ColorD = textureSampleLevel(InputTex, Samp, UV + vec2<f32>(0.0,  TexelSize.y), 0.0).rgb; // Down
    let ColorL = textureSampleLevel(InputTex, Samp, UV + vec2<f32>(-TexelSize.x, 0.0), 0.0).rgb; // Left
    let ColorR = textureSampleLevel(InputTex, Samp, UV + vec2<f32>( TexelSize.x, 0.0), 0.0).rgb; // Right

    // 3. 휘도(Luma) 변환 (녹색 채널만 써도 됨, 빠르니까)
    // 더 정확하게 하려면: dot(Color, vec3(0.2126, 0.7152, 0.0722))
    let LumaC = ColorC.g;
    let LumaU = ColorU.g;
    let LumaD = ColorD.g;
    let LumaL = ColorL.g;
    let LumaR = ColorR.g;

    // 4. 로컬 대비(Contrast) 분석
    let MinLuma = min(LumaC, min(min(LumaU, LumaD), min(LumaL, LumaR)));
    let MaxLuma = max(LumaC, max(max(LumaU, LumaD), max(LumaL, LumaR)));

    // 5. 클리핑 한계 계산 (Ringing 방지 핵심 로직)
    // "지금 픽셀이 얼마나 더 밝아지거나 어두워질 수 있는가?" (Headroom)
    // AMD의 최적화된 수식:
    // Noise를 피하기 위해 Min/Max 범위 밖으로 나가는 것을 억제함.
    
    // ScaleFactor 계산 (Sharpness가 높을수록 강함)
    // FSR 원본 코드는 복잡하지만, 여기서는 이해하기 쉬운 근사식을 씁니다.
    
    // 0~1 사이로 정규화된 Sharpness를 AMD 방식의 'StopW'로 변환
    // Sharpness 1.0 -> -1/16, Sharpness 0.0 -> 0.0 등으로 매핑 필요하지만,
    // 간단하게 직선 보간으로 가중치(w)를 구합니다.
    
    // 심플 버전: "주변 4개 평균과 내 차이를 증폭시킨다"
    let Average = (ColorU + ColorD + ColorL + ColorR) * 0.25;
    
    // Ringing 억제: 내 색상이 Min/Max 밖으로 튀어나가지 않도록 제한
    // (여기가 'Robust'한 부분입니다. 복잡한 수식 대신 Clamp로 대체 가능)
    
    // --- [실전용 간소화 RCAS] ---
    // 원본은 너무 복잡하므로, 효과는 비슷하고 가벼운 CAS(Contrast Adaptive Sharpening) 로직
    
    let w = Sharpness * -1.0; // 음수 가중치 (High Pass Filter 역할)
    
    // 주변 픽셀 합
    let Lobes = ColorU + ColorD + ColorL + ColorR;    
    let Sharpened = ColorC + (ColorC - Average) * Sharpness;
    
    // 6. Robust Clamp (튀는 값 방지)
    let MinRGB = min(ColorC, min(min(ColorU, ColorD), min(ColorL, ColorR)));
    let MaxRGB = max(ColorC, max(max(ColorU, ColorD), max(ColorL, ColorR)));
    
    return clamp(Sharpened, MinRGB, MaxRGB);
}


@group(0) @binding(0) var<uniform> UniformBuffer : Uniform;
@group(0) @binding(10) var screenTexture : texture_2d<f32>;
@group(0) @binding(20) var LinearSampler : sampler;

@fragment
fn fs_main(@location(0) PixelUV: vec2<f32>) -> @location(0) vec4<f32> 
{

  var TextureColor_Linear : vec3<f32>;
  if (true)
  {
    let Width   : f32 = f32( UniformBuffer.Resolution_Target.x );
    let Height  : f32 = f32( UniformBuffer.Resolution_Target.y );

    let TexelUV = vec2<i32>(i32(floor(PixelUV.x * Width)), i32(floor(PixelUV.y * Height)));
    TextureColor_Linear = textureLoad(screenTexture, vec2<i32>(TexelUV), 0).rgb;
  }
  else { TextureColor_Linear = RCAS( PixelUV, screenTexture, LinearSampler, 1.0 ); }
  
  let ToneMappedColor     : vec3<f32> = ACESFilm( TextureColor_Linear );
  let TextureColor_sRGB   : vec3<f32> = pow(ToneMappedColor, vec3<f32>(1.0 / 2.2));

  return vec4<f32>(TextureColor_sRGB, 1.0);
}