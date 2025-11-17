//==========================================================================
// Data Structures =========================================================
//==========================================================================

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

    PrevViewProjectionMatrix        : mat4x4<f32>,
};

struct Light
{
    Position    : vec3<f32>,
    LightType   : u32,

    Direction   : vec3<f32>,
    Intensity   : f32,

    Color       : vec3<f32>,
    Area        : f32,

    U           : vec3<f32>,
    V           : vec3<f32>,
};

struct Reservoir
{
    SampleID    : u32,
    w_sum       : f32,
    Confidence  : u32,
};

// G_Buffer에서 읽어올 Compact한 hit 정보
struct CompactSurface
{
    IsValid     : bool,
    InstanceID  : u32,
    MaterialID  : u32,
    PrimitiveID : u32,
    Barycentric : vec2<f32>,
};

// 인스턴스/메쉬/머티리얼/기하 정보들
struct Instance
{
    ModelMatrix         : mat4x4<f32>,
    ModelMatrix_Inverse : mat4x4<f32>,

    MeshID              : u32,
};

struct MeshDescriptor
{
    Offset_Vertex       : u32,
    Offset_Index        : u32,
    Offset_Material     : u32,
    Offset_SubBlasRoot  : u32,
    Offset_Blas         : u32,
    Count_SubMesh       : u32,
};

struct Material
{
    Albedo              : vec4<f32>,
    EmissiveColor       : vec3<f32>,
    EmissiveIntensity   : f32,

    Metalness           : f32,
    Roughness           : f32,
    Transmission        : f32,
    IOR                 : f32,

    BaseColorTextureID  : u32,
    ORMTextureID        : u32,
    EmissiveTextureID   : u32,
};

struct Vertex
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    UV          : vec2<f32>,
};

struct Triangle
{
    Vertex_0    : Vertex,
    Vertex_1    : Vertex,
    Vertex_2    : Vertex,
};

struct Surface
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    Material    : Material,
};


//==========================================================================
// Constants ===============================================================
//==========================================================================

const STRIDE_LIGHT      : u32 = 18u;
const LIGHT_SAMPLE      : u32 = 16u;

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_MATERIAL   : u32 = 15u;
const STRIDE_VERTEX     : u32 =  8u;

const PI : f32 = 3.141592;


//==========================================================================
// GPU Bindings ============================================================
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer   : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer     : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer  : array<u32>;

// G-buffer 하나만 사용 (bit-packed hit 정보)
@group(0) @binding(10) var G_Buffer         : texture_2d<f32>;

@group(1) @binding(10) var ReservoirTexture : texture_storage_2d<rgba32float, write>;


//==========================================================================
// Helpers : Scene / Geometry / Material ===================================
//==========================================================================

fn GetLight(LightID : u32) -> Light
{
    let Offset      : u32   = UniformBuffer.Offset_LightBuffer + (STRIDE_LIGHT * LightID);
    var OutLight    : Light = Light();

    OutLight.Position       = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 0u], SceneBuffer[Offset + 1u], SceneBuffer[Offset + 2u]));
    OutLight.LightType      = SceneBuffer[Offset + 3u];

    OutLight.Direction      = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 4u], SceneBuffer[Offset + 5u], SceneBuffer[Offset + 6u]));
    OutLight.Intensity      = bitcast<f32>(SceneBuffer[Offset + 7u]);

    OutLight.Color          = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 8u], SceneBuffer[Offset + 9u], SceneBuffer[Offset + 10u]));
    OutLight.Area           = bitcast<f32>(SceneBuffer[Offset + 11u]);

    OutLight.U              = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u]));
    OutLight.V              = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 15u], SceneBuffer[Offset + 16u], SceneBuffer[Offset + 17u]));

    return OutLight;
}

fn SampleLight(Value : f32) -> u32
{
    var L : u32 = 0u;
    var R : u32 = UniformBuffer.LightSourceCount - 1u;
    var M : u32 = (L + R) >> 1u;

    let LightCDFOffset : u32 = UniformBuffer.Offset_LightsCDFBuffer + M;

    while (L < R) {
        M = (L + R) >> 1u;

        let cdfIndex = UniformBuffer.Offset_LightsCDFBuffer + M;
        let cdfValue = bitcast<f32>(SceneBuffer[cdfIndex]);

        if (Value < cdfValue) {
            R = M;
        } else {
            L = M + 1u;
        }
    }

    return L;
}

fn GetHashValue(Seed : u32) -> u32
{
    let state = Seed * 747796405u + 2891336453u;
    let word  = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn Random(pSeed : ptr<function, u32>) -> f32
{
    let hash = GetHashValue(*pSeed);
    *pSeed = hash;
    return f32(hash) / 4294967295.0;
}

//---------------- G-Buffer decoding ----------------

fn LoadCompactSurfaceFromGBuffer(pixel : vec2<u32>) -> CompactSurface
{
    let g : vec4<f32> = textureLoad(G_Buffer, vec2<i32>(pixel), 0);

    let packed      : u32 = bitcast<u32>(g.r);
    let validBit    : u32 = packed & 0x80000000u;
    let instanceBits: u32 = (packed & 0x7fff0000u) >> 16u;
    let materialBits: u32 =  packed & 0x0000ffffu;

    var s : CompactSurface;
    s.IsValid     = (validBit != 0u);
    s.InstanceID  = instanceBits;
    s.MaterialID  = materialBits;
    s.PrimitiveID = bitcast<u32>(g.g);
    s.Barycentric = vec2<f32>(g.b, g.a);

    return s;
}

//---------------- Geometry & Material ----------------

fn GetInstance(InstanceID : u32) -> Instance
{
    let Offset      : u32       = STRIDE_INSTANCE * InstanceID;
    var OutInstance : Instance  = Instance();

    OutInstance.ModelMatrix = mat4x4<f32>(
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  0u], SceneBuffer[Offset +  1u], SceneBuffer[Offset +  2u], SceneBuffer[Offset +  3u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  4u], SceneBuffer[Offset +  5u], SceneBuffer[Offset +  6u], SceneBuffer[Offset +  7u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  8u], SceneBuffer[Offset +  9u], SceneBuffer[Offset + 10u], SceneBuffer[Offset + 11u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u], SceneBuffer[Offset + 15u]))
    );

    OutInstance.ModelMatrix_Inverse = mat4x4<f32>(
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 16u], SceneBuffer[Offset + 17u], SceneBuffer[Offset + 18u], SceneBuffer[Offset + 19u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 20u], SceneBuffer[Offset + 21u], SceneBuffer[Offset + 22u], SceneBuffer[Offset + 23u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 24u], SceneBuffer[Offset + 25u], SceneBuffer[Offset + 26u], SceneBuffer[Offset + 27u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 28u], SceneBuffer[Offset + 29u], SceneBuffer[Offset + 30u], SceneBuffer[Offset + 31u]))
    );

    OutInstance.MeshID = SceneBuffer[Offset + 32u];

    return OutInstance;
}

fn GetMeshDescriptor(MeshID : u32) -> MeshDescriptor
{
    let Offset              : u32               = UniformBuffer.Offset_MeshDescriptorBuffer + (STRIDE_DESCRIPTOR * MeshID);
    var OutMeshDescriptor   : MeshDescriptor    = MeshDescriptor();

    OutMeshDescriptor.Offset_Vertex      = SceneBuffer[Offset + 0u];
    OutMeshDescriptor.Offset_Index       = SceneBuffer[Offset + 1u];
    OutMeshDescriptor.Offset_Material    = SceneBuffer[Offset + 2u];
    OutMeshDescriptor.Offset_SubBlasRoot = SceneBuffer[Offset + 3u];
    OutMeshDescriptor.Offset_Blas        = SceneBuffer[Offset + 4u];
    OutMeshDescriptor.Count_SubMesh      = SceneBuffer[Offset + 5u];

    return OutMeshDescriptor;
}

fn GetMaterial(InMeshDescriptor : MeshDescriptor, MaterialID : u32) -> Material
{
    let Offset      : u32      = UniformBuffer.Offset_MaterialBuffer + InMeshDescriptor.Offset_Material + (STRIDE_MATERIAL * MaterialID);
    var OutMaterial : Material = Material();

    OutMaterial.Albedo.r            = bitcast<f32>(SceneBuffer[Offset + 0u]);
    OutMaterial.Albedo.g            = bitcast<f32>(SceneBuffer[Offset + 1u]);
    OutMaterial.Albedo.b            = bitcast<f32>(SceneBuffer[Offset + 2u]);
    OutMaterial.Albedo.a            = bitcast<f32>(SceneBuffer[Offset + 3u]);

    OutMaterial.EmissiveColor.r     = bitcast<f32>(SceneBuffer[Offset + 4u]);
    OutMaterial.EmissiveColor.g     = bitcast<f32>(SceneBuffer[Offset + 5u]);
    OutMaterial.EmissiveColor.b     = bitcast<f32>(SceneBuffer[Offset + 6u]);
    OutMaterial.EmissiveIntensity   = bitcast<f32>(SceneBuffer[Offset + 7u]);

    OutMaterial.Metalness           = bitcast<f32>(SceneBuffer[Offset + 8u]);
    OutMaterial.Roughness           = bitcast<f32>(SceneBuffer[Offset + 9u]);
    OutMaterial.Transmission        = bitcast<f32>(SceneBuffer[Offset + 10u]);
    OutMaterial.IOR                 = bitcast<f32>(SceneBuffer[Offset + 11u]);

    OutMaterial.BaseColorTextureID  = SceneBuffer[Offset + 12u];
    OutMaterial.ORMTextureID        = SceneBuffer[Offset + 13u];
    OutMaterial.EmissiveTextureID   = SceneBuffer[Offset + 14u];

    // 필요시 약간의 정규화
    OutMaterial.Roughness = max(OutMaterial.Roughness, 0.01);

    return OutMaterial;
}

fn GetVertex(InMeshDescriptor : MeshDescriptor, VertexID : u32) -> Vertex
{
    let Offset      : u32    = InMeshDescriptor.Offset_Vertex + (STRIDE_VERTEX * VertexID);
    var OutVertex   : Vertex = Vertex();

    OutVertex.Position = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 0u], GeometryBuffer[Offset + 1u], GeometryBuffer[Offset + 2u]));
    OutVertex.Normal   = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 3u], GeometryBuffer[Offset + 4u], GeometryBuffer[Offset + 5u]));
    OutVertex.UV       = bitcast<vec2<f32>>(vec2<u32>(GeometryBuffer[Offset + 6u], GeometryBuffer[Offset + 7u]));

    return OutVertex;
}

fn GetTriangle(InMeshDescriptor : MeshDescriptor, PrimitiveID : u32) -> Triangle
{
    let Offset      : u32      = UniformBuffer.Offset_IndexBuffer + InMeshDescriptor.Offset_Index;
    var OutTriangle : Triangle = Triangle();

    let VertexID_0 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 0u];
    let VertexID_1 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 1u];
    let VertexID_2 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 2u];

    OutTriangle.Vertex_0 = GetVertex(InMeshDescriptor, VertexID_0);
    OutTriangle.Vertex_1 = GetVertex(InMeshDescriptor, VertexID_1);
    OutTriangle.Vertex_2 = GetVertex(InMeshDescriptor, VertexID_2);

    return OutTriangle;
}

fn TransformVec3WithMat4x4(InVector3: vec3<f32>, TransformMatrix: mat4x4<f32>) -> vec3<f32>
{
    let TransformedVector: vec4<f32> = TransformMatrix * vec4<f32>(InVector3, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
}

fn GetTriangleWorldSpace(InInstance : Instance, InTriangle : Triangle) -> Triangle
{
    var OutTriangle : Triangle = Triangle();

    OutTriangle.Vertex_0.Position = TransformVec3WithMat4x4(InTriangle.Vertex_0.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_0.Normal   = TransformVec3WithMat4x4(InTriangle.Vertex_0.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_0.UV       = InTriangle.Vertex_0.UV;

    OutTriangle.Vertex_1.Position = TransformVec3WithMat4x4(InTriangle.Vertex_1.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_1.Normal   = TransformVec3WithMat4x4(InTriangle.Vertex_1.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_1.UV       = InTriangle.Vertex_1.UV;

    OutTriangle.Vertex_2.Position = TransformVec3WithMat4x4(InTriangle.Vertex_2.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_2.Normal   = TransformVec3WithMat4x4(InTriangle.Vertex_2.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_2.UV       = InTriangle.Vertex_2.UV;

    return OutTriangle;
}

fn GetSurface(inCompact : CompactSurface) -> Surface
{
    var outSurface : Surface = Surface();

    let inst      : Instance       = GetInstance(inCompact.InstanceID);
    let meshDesc  : MeshDescriptor = GetMeshDescriptor(inst.MeshID);
    let material  : Material       = GetMaterial(meshDesc, inCompact.MaterialID);
    let triLocal  : Triangle       = GetTriangle(meshDesc, inCompact.PrimitiveID);
    let triWorld  : Triangle       = GetTriangleWorldSpace(inst, triLocal);

    let U : f32 = inCompact.Barycentric.x;
    let V : f32 = inCompact.Barycentric.y;
    let W : f32 = 1.0 - U - V;

    let N0  : vec3<f32> = triWorld.Vertex_0.Normal * U;
    let N1  : vec3<f32> = triWorld.Vertex_1.Normal * V;
    let N2  : vec3<f32> = triWorld.Vertex_2.Normal * W;
    let N   : vec3<f32> = normalize(N0 + N1 + N2);

    let P0  : vec3<f32> = triWorld.Vertex_0.Position * U;
    let P1  : vec3<f32> = triWorld.Vertex_1.Position * V;
    let P2  : vec3<f32> = triWorld.Vertex_2.Position * W;
    let P   : vec3<f32> = P0 + P1 + P2;

    outSurface.Position = P;
    outSurface.Normal   = N;
    outSurface.Material = material;

    return outSurface;
}


//==========================================================================
// BRDF / BSDF (G_Buffer 기반) =============================================
//==========================================================================

fn GGXDistribution(NdotH : f32, Roughness : f32) -> f32
{
    let Alpha   : f32 = Roughness * Roughness;
    let Alpha2  : f32 = Alpha * Alpha;
    let X       : f32 = NdotH * NdotH * (Alpha2 - 1.0) + 1.0;
    let Denom   : f32 = PI * X * X;

    return Alpha2 / max(Denom, 1e-4);
}

fn GeometryShadow_Optimized(NdotV : f32, NdotL : f32, Roughness : f32) -> f32
{
    let R : f32 = Roughness + 1.0;
    let K : f32 = R * R / 8.0;

    return 1.0 / ((NdotV * (1.0 - K) + K) * (NdotL * (1.0 - K) + K));
}

fn Frensel(Dot : f32, F0: vec3<f32>) -> vec3<f32>
{
    let d = clamp(Dot, 0.0, 1.0);
    return F0 + (1.0 - F0) * pow(1.0 - d, 5.0);
}

fn BRDF(
    N         : vec3<f32>,
    L         : vec3<f32>,
    V         : vec3<f32>,
    BaseColor : vec3<f32>,
    Metalness : f32,
    Roughness : f32
) -> vec3<f32>
{
    let H : vec3<f32> = normalize(L + V);

    let NdotV : f32 = max(dot(N, V), 0.0);
    let NdotL : f32 = max(dot(N, L), 0.0);
    let NdotH : f32 = max(dot(N, H), 0.0);
    let VdotH : f32 = max(dot(V, H), 0.0);

    let F0  : vec3<f32> = mix(vec3f(0.04), BaseColor, Metalness);
    let D   : f32       = GGXDistribution(NdotH, Roughness);
    let G0  : f32       = GeometryShadow_Optimized(NdotV, NdotL, Roughness);
    let F   : vec3<f32> = Frensel(VdotH, F0);

    let kS  : vec3<f32> = F;
    let kD  : vec3<f32> = (1.0 - kS) * (1.0 - Metalness);

    let BRDF_Diffuse  : vec3<f32> = (kD / PI) * BaseColor;
    let BRDF_Specular : vec3<f32> = kS * D * G0 * 0.25;

    return BRDF_Diffuse + BRDF_Specular;
}

fn BTDF(
    N       : vec3<f32>,
    L       : vec3<f32>,
    V       : vec3<f32>,
    Albedo  : vec3<f32>,
    Roughness : f32
) -> vec3<f32>
{
    let bViewNormalSameHemisphere : bool = (dot(V, N) > 0.0);
    let n_in    : f32 = 1.0;
    let n_out   : f32 = 1.0;
    let H_norm  : f32 = length(n_in * L + n_out * V);

    let BTDF_N  = select(-N, N, bViewNormalSameHemisphere);
    let H       : vec3<f32> = (n_in * L + n_out * V) / H_norm;

    let NdotL : f32 = abs(dot(BTDF_N, L));
    let NdotV : f32 = abs(dot(BTDF_N, V));
    let NdotH : f32 = abs(dot(BTDF_N, H));
    let LdotH : f32 = abs(dot(L, H));
    let VdotH : f32 = abs(dot(V, H));

    let G0  : f32       = GeometryShadow_Optimized(NdotL, NdotV, Roughness);
    let D   : f32       = GGXDistribution(NdotH, Roughness);
    let nr  : f32       = (n_out - n_in) / (n_out + n_in);
    let F0  : vec3<f32> = vec3f(nr * nr);
    let F   : vec3<f32> = Frensel(LdotH, F0);

    let Numerator : vec3<f32> = n_out * n_out * (1.0 - F) * LdotH * VdotH * G0 * D * Albedo;
    let BTDFValue : vec3<f32> = Numerator / max(H_norm * H_norm, 1e-4);

    return BTDFValue;
}

fn calculate_x0(ThreadID : vec2<u32>) -> vec3<f32>
{
    let PixelUV             : vec2<f32> = (vec2<f32>(ThreadID) + 0.5) / vec2<f32>(UniformBuffer.Resolution);
    let PixelNDC            : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);
    let PixelClip_NearPlane : vec3<f32> = vec3<f32>(PixelNDC.xy, 0.0);

    let TransformedVector: vec4<f32> = UniformBuffer.ViewProjectionMatrix_Inverse *
                                       vec4<f32>(PixelClip_NearPlane, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
}

fn BSDF(
    x0      : vec3<f32>,
    surf    : Surface,
    x2      : vec3<f32>   // 라이트 쪽 포인트
) -> vec3<f32>
{
    let L : vec3<f32> = normalize(x2 - surf.Position);
    let V : vec3<f32> = normalize(x0 - surf.Position);
    let T : f32       = surf.Material.Transmission;
    let N : vec3<f32> = normalize(surf.Normal);

    let baseColor : vec3<f32> = surf.Material.Albedo.xyz;
    let metalness : f32       = surf.Material.Metalness;
    let roughness : f32       = surf.Material.Roughness;

    if (dot(L, N) * dot(V, N) > 0.0) {
        return (1.0 - T) * BRDF(N, L, V, baseColor, metalness, roughness);
    }
    return T * BTDF(N, L, V, baseColor, roughness);
}

fn CalculateP_hat(
    ThreadID      : vec3<u32>,
    sampledLightID: u32
) -> vec3<f32>
{
    let pixel      : vec2<u32>   = ThreadID.xy;
    let cs         : CompactSurface = LoadCompactSurfaceFromGBuffer(pixel);
    if (!cs.IsValid) {
        return vec3<f32>(0.0, 0.0, 0.0);
    }

    let surf       : Surface = GetSurface(cs);
    let x0         : vec3<f32> =  UniformBuffer.CameraWorldPosition;
    let x1         : vec3<f32> = surf.Position;
    let N          : vec3<f32> = surf.Normal;

    var p_hat      : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var randomSeed : u32       = GetHashValue(ThreadID.x * 1342u + ThreadID.y * 4233u + sampledLightID * 911u);

    let lightSource   : Light     = GetLight(sampledLightID);
    let lightRadiance : vec3<f32> = lightSource.Intensity * lightSource.Color;

    var bsdfValue     : vec3<f32>;
    var visibility    : vec3<f32>;
    var geometry      : f32;
    var invPDF        : f32;

    if (lightSource.LightType == 0u)
    {
        let L   : vec3<f32> = normalize(-lightSource.Direction);
        let x2  : vec3<f32> = x1 + L * 1e11;
        bsdfValue = BSDF(x0, surf, x2);
        visibility = vec3<f32>(1.0);
        geometry   = max(dot(N, L), 0.0);
        invPDF     = 1.0;
    }
    else if (lightSource.LightType == 1u)
    {
       // Point light
        let toLight : vec3<f32> = lightSource.Position - x1;
        let D       : f32       = length(toLight);
        if (D <= 0.0) {
            return vec3<f32>(0.0);
        }
        let L       : vec3<f32> = toLight / D;
        let x2      : vec3<f32> = lightSource.Position;

        bsdfValue = BSDF(x0, surf, x2);
        geometry  = max(dot(N, L), 0.0) / (D * D);

        invPDF    = 1.0; // 점광에서 위치 pdf는 delta → 1
    }
    else
    {
        // Rect light (area light)
        let randomU : f32 = (Random(&randomSeed) * 2.0) - 1.0;
        let randomV : f32 = (Random(&randomSeed) * 2.0) - 1.0;
        let x2 : vec3<f32> =
            lightSource.Position +
            randomU * lightSource.U +
            randomV * lightSource.V;

        let toLight : vec3<f32> = x2 - x1;
        let D       : f32       = length(toLight);
        if (D <= 0.0) {
            return vec3<f32>(0.0);
        }
        let L       : vec3<f32> = toLight / D;

        bsdfValue = BSDF(x0, surf, x2);

        // lightSource.Direction 은 "라이트의 앞면 노멀" 이라고 가정
        let Nl = normalize(lightSource.Direction);

        let cosSurf  : f32 = max(dot(N,  L),  0.0);
        let cosLight : f32 = max(dot(Nl, -L), 0.0);

        geometry = (cosSurf * cosLight) / (D * D);

        // 샘플링이 light의 area 에 대해 uniform 이라면 pdf = 1 / Area → invPDF = Area
        invPDF  = lightSource.Area;
    }

    p_hat += bsdfValue * visibility * geometry * invPDF * lightRadiance;
    return p_hat;
}


//==========================================================================
// Reservoir Update (with Confidence) ======================================
//==========================================================================

fn UpdateReservoir(
    curReservoir : Reservoir,
    lightSampleID: u32,
    RIS_Weight   : f32,
    pRandomSeed  : ptr<function, u32>,
) -> Reservoir
{
    var sampleID  : u32 = curReservoir.SampleID;
    var new_w_sum : f32 = curReservoir.w_sum + RIS_Weight;
    var conf      : u32 = curReservoir.Confidence;

    let p_change = RIS_Weight / (new_w_sum);
    let r        = Random(pRandomSeed);

    if (r < p_change) {
        sampleID = lightSampleID;
    }

    conf      = conf + 1u;

    return Reservoir(sampleID, new_w_sum, conf);
}


//==========================================================================
// Shader Main =============================================================
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    if (ThreadID.x >= UniformBuffer.Resolution.x ||
        ThreadID.y >= UniformBuffer.Resolution.y) {
        return;
    }

    // G_Buffer에서 히트 안 한 픽셀은 바로 리턴
    let cs = LoadCompactSurfaceFromGBuffer(ThreadID.xy);
    if (!cs.IsValid) {
        textureStore(
            ReservoirTexture,
            vec2<i32>(ThreadID.xy),
            vec4<f32>(0.0, 0.0, 0.0, 0.0)
        );
        return;
    }

    let MIS_Weight : f32 = 1.0 / f32(LIGHT_SAMPLE);

    var reservoir : Reservoir;
    reservoir.SampleID   = 0u;
    reservoir.w_sum      = 0.0;
    reservoir.Confidence = 0u;

    var randomSeed : u32 = GetHashValue(
        ThreadID.x * 1342u +
        ThreadID.y * 4233u +
        UniformBuffer.FrameIndex * 21337u
    );

    for (var iter : u32 = 0u; iter < LIGHT_SAMPLE; iter = iter + 1u)
    {
        let sampledLightID : u32   = SampleLight(Random(&randomSeed));
        

        let cdfIndex = UniformBuffer.Offset_LightsCDFBuffer + sampledLightID;
        let cdfValue = bitcast<f32>(SceneBuffer[cdfIndex]);

        var prev : f32 = 0.0;
        if (sampledLightID > 0u) {
            prev = bitcast<f32>(SceneBuffer[cdfIndex - 1u]);
        }
        let P_Light : f32 = bitcast<f32>(SceneBuffer[cdfIndex]) - prev;

        let P_hat          : vec3<f32> = CalculateP_hat(ThreadID, sampledLightID);
        let P_hat_luminance: f32      = dot(P_hat, vec3<f32>(0.2126, 0.7152, 0.0722));

        // P_Light가 0이면 폭발 방지
        if (P_Light <= 0.0 || P_hat_luminance <= 0.0) {
            continue;
        }

        let RIS_Weight     : f32      = MIS_Weight * P_hat_luminance / P_Light;


        reservoir = UpdateReservoir(
            reservoir,
            sampledLightID,
            RIS_Weight,
            &randomSeed
        );
    }

    
    textureStore(
        ReservoirTexture,
        vec2<i32>(ThreadID.xy),
        vec4<f32>(
            f32(reservoir.SampleID),
            reservoir.w_sum,
            f32(reservoir.Confidence),
            0.0
        )
    ); 

    //let ResultColor = vec3<f32>(((f32(reservoir.SampleID)+1.0)/3.0));
    //textureStore(ReservoirTexture, ThreadID.xy, vec4<f32>(ResultColor, 1.0));
    
}
