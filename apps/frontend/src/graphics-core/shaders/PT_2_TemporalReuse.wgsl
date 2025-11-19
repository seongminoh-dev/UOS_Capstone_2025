//==========================================================================
// Data Structures
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

struct Vertex
{
    Position : vec3<f32>,
    Normal   : vec3<f32>,
    UV       : vec2<f32>,
};

struct Triangle
{
    Vertex_0 : vec3<f32>,
    Vertex_1 : vec3<f32>,
    Vertex_2 : vec3<f32>,
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
    RcVertex    : vec4<f32>,      // packed CompactSurface at reconnection vertex

    k           : u32,
    Lobe_k_1    : u32,
    Lobe_k      : u32,
    length      : u32,

    Padding     : vec3<u32>,
    J           : f32,            // path tracer 쪽에서 쓰는 Jacobian (temporal에선 안 건드림)
};

struct Reservoir
{
    Sample  : CompactPath,
    UCW     : f32,    // Unbiased Contribution Weight
    C       : u32,    // 총 후보 개수

    Padding : vec2<f32>,
};

//==========================================================================
// Constants
//==========================================================================

const STRIDE_INSTANCE   : u32 = 33u;
const STRIDE_DESCRIPTOR : u32 =  6u;
const STRIDE_VERTEX     : u32 =  8u;

const J_MIN : f32 = 0.25;  // temporal J clamp
const J_MAX : f32 = 20.0;
const UCW_MAX : f32 = 1000.0;   


//==========================================================================
// GPU Bindings
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer       : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer         : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer      : array<u32>;
@group(0) @binding(3) var<storage, read>    PrevReservoirBuffer : array<Reservoir>;

@group(0) @binding(10) var G_Buffer : texture_2d<f32>;

@group(1) @binding(0) var<storage, read_write> ReservoirBuffer  : array<Reservoir>;

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

//==========================================================================
// Minimal CompactSurface & PosNormal (for RcVertex decode)
//==========================================================================

struct CompactSurfaceMin
{
    IsValid     : bool,
    InstanceID  : u32,
    PrimitiveID : u32,
    Barycentric : vec2<f32>,
};

struct PosNormal
{
    Pos   : vec3<f32>,
    N     : vec3<f32>,
    Valid : bool,
};

fn DecodeRcVertex(rc : vec4<f32>) -> CompactSurfaceMin
{
    var outCS : CompactSurfaceMin;

    let packed_r : u32 = bitcast<u32>(rc.x);

    outCS.IsValid     = (packed_r & 0x80000000u) != 0u;
    outCS.InstanceID  = (packed_r & 0x7fff0000u) >> 16u;
    outCS.PrimitiveID = bitcast<u32>(rc.y);
    outCS.Barycentric = vec2<f32>(rc.z, rc.w);

    return outCS;
}

fn GetPosNormalFromRc(rc : vec4<f32>) -> PosNormal
{
    let cs : CompactSurfaceMin = DecodeRcVertex(rc);

    if (!cs.IsValid) {
        return PosNormal(
            vec3<f32>(0.0, 0.0, 0.0),
            vec3<f32>(0.0, 1.0, 0.0),
            false
        );
    }

    let tri : Triangle = GetTriangleFromPrimitive(cs.PrimitiveID, cs.InstanceID);

    let alpha : f32 = cs.Barycentric.x;
    let beta  : f32 = cs.Barycentric.y;
    let gamma : f32 = 1.0 - alpha - beta;

    let p : vec3<f32> =
          tri.Vertex_0 * alpha
        + tri.Vertex_1 * beta
        + tri.Vertex_2 * gamma;

    let e1 : vec3<f32> = tri.Vertex_1 - tri.Vertex_0;
    let e2 : vec3<f32> = tri.Vertex_2 - tri.Vertex_0;
    let n  : vec3<f32> = normalize(cross(e1, e2));

    return PosNormal(p, n, true);
}

// 카메라 → RcVertex 구간에 대한 기하 Jacobian 근사
// G(path) ∝ r^2 / cosθ
fn ComputePrimaryJacobian(rc : vec4<f32>) -> f32
{
    let surf : PosNormal = GetPosNormalFromRc(rc);
    if (!surf.Valid) {
        return 1.0;
    }

    let camPos : vec3<f32> = UniformBuffer.CameraWorldPosition;
    let d      : vec3<f32> = surf.Pos - camPos;
    let r2     : f32       = max(dot(d, d), 1e-8);

    let w_cam  : vec3<f32> = normalize(d);               // 카메라 → 표면
    let cosT   : f32       = max(dot(surf.N, -w_cam), 1e-6);

    let J_geom : f32 = r2 / cosT;
    return J_geom;
}

//==========================================================================
// RNG
//==========================================================================

fn GetHashValue(seed : u32) -> u32
{
    let state = seed * 747796405u + 2891336453u;
    let word  = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn Random(pSeed : ptr<function, u32>) -> f32
{
    let hash = GetHashValue(*pSeed);
    *pSeed = hash;
    return f32(hash) / 4294967295.0;
}

//==========================================================================
// Reprojection: 현재 픽셀 → 이전 프레임 스크린 좌표
//  - 실패 시 vec2<i32>(-1, -1) 리턴
//==========================================================================

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
    let prevClip   : vec4<f32> = UniformBuffer.PrevViewProjectionMatrix * vec4<f32>(hitPos, 1.0);

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


fn RegeneratePrevPath(curResCP : CompactPath, prevResCP : CompactPath) -> CompactPath
{
    var outCP : CompactPath = prevResCP;

    // prefix 구간(0..k-1)은 현재 경로 seed를 복사
    let k : u32 = min(curResCP.k, 4u);   // 혹은 min(prevResCP.k, 4u) 등 의도에 따라
    for (var i = 0u; i < k; i++) {
        outCP.rSeed[i] = curResCP.rSeed[i];
    }

    outCP.Lobe_k_1 = curResCP.Lobe_k_1;  // 이건 의도대로일 수 있음

    return outCP;
}


//==========================================================================
// Temporal Reservoir Update (Hybrid Shift + Temporal Reuse)
//==========================================================================

fn UpdateReservoirTemporal(
    curPixel : vec2<u32>,
    prevRes  : Reservoir
) {
    // 현재 리저버 로드
    let curIdx : u32 =
        curPixel.y * UniformBuffer.Resolution.x +
        curPixel.x;

    var curRes : Reservoir = ReservoirBuffer[curIdx];

    // --- 0. history 유효성 체크 ---

    // prev 가 비어있으면 (C==0, UCW<=0) → temporal 후보 없음
    if (prevRes.C == 0u || prevRes.UCW <= 0.0) {
        return;
    }

    // cur 가 비어있으면 → 이전 프레임 것만 쓰자 (초기 프레임 / 디소클루전)
    if (curRes.C == 0u || curRes.UCW <= 0.0) {
        var outRes : Reservoir = prevRes;

        // 안전 차원에서 RcVertex 가 유효한지 확인 (아니면 그냥 버림)
        let pn : PosNormal = GetPosNormalFromRc(prevRes.Sample.RcVertex);
        if (!pn.Valid) {
            return;
        }

        ReservoirBuffer[curIdx] = outRes;
        return;
    }

    // --- 1. 이전 샘플을 현재 픽셀 도메인에 맞게 다시 사용할 수 있도록 조정 ---
    let prevShiftedCP : CompactPath =
        RegeneratePrevPath(curRes.Sample, prevRes.Sample);

    // RcVertex 가 유효한지 확인 (둘 다)
    let pn_prev : PosNormal = GetPosNormalFromRc(prevShiftedCP.RcVertex);
    let pn_cur  : PosNormal = GetPosNormalFromRc(curRes.Sample.RcVertex);
    if (!pn_prev.Valid || !pn_cur.Valid) {
        return;
    }

    // --- 2. primary Jacobian (카메라→RcVertex) 기반 temporal J 비율 계산 ---

    let J_prev_primary : f32 = ComputePrimaryJacobian(prevShiftedCP.RcVertex);
    let J_cur_primary  : f32 = ComputePrimaryJacobian(curRes.Sample.RcVertex);

    if (J_prev_primary <= 0.0 || J_cur_primary <= 0.0) {
        return;
    }

    //var J_shift : f32 = J_prev_primary / J_cur_primary;
    var J_shift = curRes.Sample.J / J_prev_primary;
    //J_shift = clamp(J_shift, J_MIN, J_MAX);

    // --- 3. 각 후보의 effective weight (UCW 클램핑 포함) ---

    let w_cur_raw  : f32 = min(curRes.UCW * f32(curRes.C) ,  UCW_MAX);
    let w_prev_raw : f32 = min(prevRes.UCW * f32(prevRes.C) , UCW_MAX) * J_shift;

    let w_cur  : f32 = max(w_cur_raw,  0.0);
    let w_prev : f32 = max(w_prev_raw, 0.0);

    let W_new  = w_cur + w_prev;
    let C_new  = curRes.C + prevRes.C;

    if (w_cur <= 0.0 && w_prev <= 0.0) {
        // 둘 다 쓸 수 있는 weight 없음 → 그냥 현재 유지
        ReservoirBuffer[curIdx] = curRes;
        return;
    }

    let w_sum : f32 = max(w_cur + w_prev, 1e-8);

    // --- 4. 2-후보 ReSTIR reservoir 업데이트 ---

    var outRes : Reservoir = curRes;

    // temporal RNG
    var seed : u32 = GetHashValue(
        curPixel.x * 1973u +
        curPixel.y * 9277u +
        UniformBuffer.FrameIndex * 26699u + 1u
    );

    let p_select_prev : f32 = w_prev / w_sum;
    let r : f32 = Random(&seed);

    if (r < p_select_prev) {
        // temporal candidate 채택
        outRes.Sample = prevShiftedCP;
    } else {
        // 현재 candidate 유지
        outRes.Sample = curRes.Sample;
    }

    outRes.UCW = min(W_new / f32(C_new), UCW_MAX);
    outRes.C   = C_new;

    ReservoirBuffer[curIdx] = outRes;
}

//==========================================================================
// Shader Main
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    let curPixel : vec2<u32> = ThreadID.xy;

    // 화면 밖 스레드 무시
    if (curPixel.x >= UniformBuffer.Resolution.x ||
        curPixel.y >= UniformBuffer.Resolution.y) {
        return;
    }

    // 1. 현재 픽셀의 히트를 이전 프레임 스크린 좌표로 reprojection
    let prevPixel : vec2<i32> = GetPrevScreenPx(curPixel);
    let resi      : vec2<i32> = vec2<i32>(UniformBuffer.Resolution);

    if (!(all(prevPixel >= vec2<i32>(0, 0)) &&
          all(prevPixel <  resi))) {
        // reprojection 실패 → temporal reuse 없음
        return;
    }

    // 2. 이전 프레임 리저버 읽기
    let prevIdx : u32 =
        u32(prevPixel.y) * UniformBuffer.Resolution.x +
        u32(prevPixel.x);

    let prevRes : Reservoir = PrevReservoirBuffer[prevIdx];
    UpdateReservoirTemporal(curPixel, prevRes);
}
