
struct Uniform
{
    Resolution                      : vec2<u32>,
    InstanceCount                   : u32,
    LightSourceCount                : u32,

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
};

struct Instance
{
    ModelMatrix         : mat4x4<f32>,
    ModelMatrix_Inverse : mat4x4<f32>,

    MeshID              : u32,
};

struct MeshDescriptor
{
    Offset_Vertex      : u32,
    Offset_Index       : u32,
    Offset_Material    : u32,
    Offset_SubBlasRoot : u32,
    Offset_Blas        : u32,
    Count_SubMesh      : u32,
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

struct Light
{
    Position    : vec3<f32>,
    Direction   : vec3<f32>,
    Color       : vec3<f32>,
    U           : vec3<f32>,
    V           : vec3<f32>,
    LightType   : u32,
    Intensity   : f32,
    Area        : f32,
};

struct BlasNode
{
    Boundary_Min    : vec3<f32>,
    Boundary_Max    : vec3<f32>,
    Count           : u32,
    Offset          : u32,
};

struct Vertex
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    UV          : vec2<f32>,
};

struct Triangle
{
    Vertex_0 : vec3<f32>,
    Vertex_1 : vec3<f32>,
    Vertex_2 : vec3<f32>,
};

struct Ray
{
    Start       : vec3<f32>,
    Direction   : vec3<f32>,
};

struct CompactSurface
{
    IsValidSurface  : bool,
    InstanceID      : u32,
    MaterialID      : u32,
    PrimitiveID     : u32,
    Barycentric     : vec2<f32>,
};

struct Surface
{
    Position    : vec3<f32>,
    Normal      : vec3<f32>,
    Material    : Material,
};

struct HitResult
{
    IsValidHit  : bool,
    HitDistance : f32,
    SurfaceInfo : CompactSurface,
};

struct BSDFSample
{
    Direction   : vec3<f32>,
    Lobe        : u32,
};

struct LightSample
{
    Direction   : vec3<f32>,
    Type        : u32,

    Position    : vec3<f32>,
    LightID     : i32,

    Emittance   : vec3<f32>,
    PDF         : f32,
};

struct CompactPath
{
    rSeed       : array<u32, 4u>,
    XL          : LightSample,    
    RcVertex    : vec4<f32>,

    k           : u32,
    Lobe_k_1    : u32,
    Lobe_k      : u32,
    length      : u32,

    Padding     : vec3<u32>,
    J           : f32,        // base path에서 온 야코비안 조각
};

struct Path
{
    Surface     : array<Surface, 8u>,
    Lobe        : array<u32, 8u>,
    rSeed       : array<u32, 8u>,

    XL          : LightSample,
    length      : u32,
};

struct Reservoir
{
    Sample  : CompactPath,
    UCW     : f32,
    C       : u32,

    Padding : vec2<f32>,
};

struct MotionVector
{
    MV : vec2<u32>,
};
//==========================================================================
// Constants / Enums
//==========================================================================

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_LIGHT      : u32 = 18u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_MATERIAL   : u32 = 15u;
const STRIDE_VERTEX     : u32 =  8u;
const STRIDE_BLAS       : u32 =  8u;

const INF       : f32       = 1e11;
const EPS       : f32       = 1e-4;
const PI        : f32       = 3.141592;
const ENV_COLOR : vec3<f32> = vec3<f32>(0.5, 0.5, 0.5);

const LIGHT_DIRECTION   : u32 = 0u;
const LIGHT_POINT       : u32 = 1u;
const LIGHT_RECT        : u32 = 2u;
const LIGHT_ENV         : u32 = 3u;

const LOBE_LAMBERT  : u32 = 0u;
const LOBE_GGX      : u32 = 1u;
const LOBE_NEE      : u32 = 2u;
const LOBE_LIGHT    : u32 = 3u;

const MIN_PATH_LENGTH : u32 = 2u; 
const MAX_PATH_LENGTH : u32 = 5u; // rSeed[4] → length-1 <= 4 → length <= 5

//==========================================================================
// GPU Bindings
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer       : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer         : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer      : array<u32>;

@group(0) @binding(10) var G_Buffer         : texture_2d<f32>;

@group(1) @binding(0) var<storage, read_write> MotionVectorBuffer  : array<MotionVector>;


//==========================================================================
// Helpers: Scene / Mesh
//==========================================================================

fn GetInstance(InstanceID : u32) -> Instance
{
    let offset      : u32      = STRIDE_INSTANCE * InstanceID;
    var inst        : Instance = Instance();

    inst.ModelMatrix = mat4x4<f32>(
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset +  0u], SceneBuffer[offset +  1u], SceneBuffer[offset +  2u], SceneBuffer[offset +  3u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset +  4u], SceneBuffer[offset +  5u], SceneBuffer[offset +  6u], SceneBuffer[offset +  7u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset +  8u], SceneBuffer[offset +  9u], SceneBuffer[offset + 10u], SceneBuffer[offset + 11u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[offset + 12u], SceneBuffer[offset + 13u], SceneBuffer[offset + 14u], SceneBuffer[offset + 15u]))
    );

    inst.MeshID = SceneBuffer[offset + 32u];

    return inst;
}

fn GetOffset_Vertex(meshID : u32) -> u32 {
    let offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (STRIDE_DESCRIPTOR * meshID);
    return SceneBuffer[offset + 0u];
}

fn GetOffset_Index(meshID : u32) -> u32 {
    let offset : u32 = UniformBuffer.Offset_MeshDescriptorBuffer + (STRIDE_DESCRIPTOR * meshID);
    return SceneBuffer[offset + 1u];
}

fn GetVertex(offsetVertex : u32, vertexID : u32) -> vec3<f32>
{
    let offset : u32 = offsetVertex + (STRIDE_VERTEX * vertexID);
    let pos    : vec3<f32> = bitcast<vec3<f32>>(
        vec3<u32>(
            GeometryBuffer[offset + 0u],
            GeometryBuffer[offset + 1u],
            GeometryBuffer[offset + 2u]
        )
    );
    return pos;
}

fn GetTriangle(offsetIndex : u32, offsetVertex : u32, primitiveID : u32) -> Triangle
{
    let base   : u32 = UniformBuffer.Offset_IndexBuffer + offsetIndex;
    var tri    : Triangle;

    let v0 : u32 = GeometryBuffer[base + (3u * primitiveID) + 0u];
    let v1 : u32 = GeometryBuffer[base + (3u * primitiveID) + 1u];
    let v2 : u32 = GeometryBuffer[base + (3u * primitiveID) + 2u];

    tri.Vertex_0 = GetVertex(offsetVertex, v0);
    tri.Vertex_1 = GetVertex(offsetVertex, v1);
    tri.Vertex_2 = GetVertex(offsetVertex, v2);

    return tri;
}

fn TransformVec3WithMat4x4(v: vec3<f32>, m: mat4x4<f32>) -> vec3<f32>
{
    let t : vec4<f32> = m * vec4<f32>(v, 1.0);
    return t.xyz / t.w;
}

fn GetTriangleWorldSpace(modelMatrix : mat4x4<f32>, triLocal : Triangle) -> Triangle
{
    var tri : Triangle;
    tri.Vertex_0 = TransformVec3WithMat4x4(triLocal.Vertex_0, modelMatrix);
    tri.Vertex_1 = TransformVec3WithMat4x4(triLocal.Vertex_1, modelMatrix);
    tri.Vertex_2 = TransformVec3WithMat4x4(triLocal.Vertex_2, modelMatrix);
    return tri;
}

fn GetTriangleFromPrimitive(primitiveID : u32, instanceID : u32) -> Triangle
{
    let inst          : Instance = GetInstance(instanceID);
    let offsetVertex  : u32     = GetOffset_Vertex(inst.MeshID);
    let offsetIndex   : u32     = GetOffset_Index(inst.MeshID);

    let triLocal      : Triangle = GetTriangle(offsetIndex, offsetVertex, primitiveID);
    let triWorld      : Triangle = GetTriangleWorldSpace(inst.ModelMatrix, triLocal);
    return triWorld;
}

fn GetPrevScreenPx(curPixel : vec2<u32>) -> vec2<i32>
{
    let gbuf : vec4<f32> = textureLoad(G_Buffer, vec2<i32>(curPixel), 0);

    // bit-packed valid/instance/material
    let packed_r  : u32 = bitcast<u32>(gbuf.r);
    let valid     : bool = (packed_r & 0x80000000u) != 0u;
    if (!valid) {
        return vec2<i32>(-1, -1);
    }

    // barycentric
    let alpha : f32 = gbuf.b;
    let beta  : f32 = gbuf.a;
    let gamma : f32 = 1.0 - alpha - beta;

    // primitive ID (Pass1에서 bitcast<f32>(PrimitiveID)로 저장)
    let primitiveID : u32 = bitcast<u32>(gbuf.g);

    // instance ID (bit 16~30)
    let instanceID : u32 = (packed_r >> 16u) & 0x7FFFu;

    // 히트 포인트 월드 위치 복원
    let tri        : Triangle = GetTriangleFromPrimitive(primitiveID, instanceID);
    let hitPos     : vec3<f32> =
          tri.Vertex_0 * alpha
        + tri.Vertex_1 * beta
        + tri.Vertex_2 * gamma;

    // 이전 프레임 VP로 투영
    let prevClip   : vec4<f32> = UniformBuffer.ViewProjectionMatrix_Prev * vec4<f32>(hitPos, 1.0);

    // 카메라 뒤쪽이면 무효
    if (prevClip.w <= 0.0) {
        return vec2<i32>(-1, -1);
    }

    let prevNdc : vec3<f32> = prevClip.xyz / prevClip.w;

    // NDC가 [-1, 1] 범위 밖이면 무효
    if (any(prevNdc.xy < vec2<f32>(-1.0, -1.0)) ||
        any(prevNdc.xy > vec2<f32>( 1.0,  1.0))) {
        return vec2<i32>(-1, -1);
    }

    // NDC [-1,1] → [0,1] → 픽셀 좌표
    let prevScreen01 : vec2<f32> = prevNdc.xy * 0.5 + vec2<f32>(0.5, 0.5);
    let prevScreenPx : vec2<f32> = prevScreen01 * vec2<f32>(UniformBuffer.Resolution);

    var pi : vec2<i32> = vec2<i32>(prevScreenPx);
    let resi : vec2<i32> = vec2<i32>(UniformBuffer.Resolution);

    // 혹시 1.0에 걸려서 width/height가 나오는 경우를 대비해 clamp
    pi = clamp(pi, vec2<i32>(0, 0), resi - vec2<i32>(1, 1));

    return pi;
}



@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>) {

    let curPixel : vec2<u32> = ThreadID.xy;

    // 필요하면 해상도 가드
    if (curPixel.x >= UniformBuffer.Resolution.x ||
        curPixel.y >= UniformBuffer.Resolution.y) {
        return;
    }

    let Idx : u32 =
        curPixel.y * UniformBuffer.Resolution.x +
        curPixel.x;

    let prevPixel : vec2<i32> = GetPrevScreenPx(curPixel);

    var mv_i : vec2<i32> = vec2<i32>(0, 0);

    // prevPixel이 유효할 때만 모션 계산
    if (all(prevPixel >= vec2<i32>(0))) {
        let cur_i = vec2<i32>(curPixel);

        // 원하는 convention에 맞게 선택:
        // prev - cur  또는  cur - prev
        mv_i = prevPixel - cur_i;      // 여기서 방향 결정
        // mv_i = cur_i - prevPixel;
    }

    // 부호 있는 i32 결과를 그대로 u32에 비트패턴만 옮김
    MotionVectorBuffer[Idx].MV = bitcast<vec2<u32>>(mv_i);
}

    