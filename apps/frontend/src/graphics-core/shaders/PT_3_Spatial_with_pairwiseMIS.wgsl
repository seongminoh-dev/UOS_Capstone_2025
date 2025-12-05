//==========================================================================
// Data Structures
//==========================================================================
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
    Offset_MaterialID   : u32,
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

    TextureID_Albedo    : i32,
    TextureID_ORM       : i32,
    TextureID_Emissive  : i32,
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
    Vertex_0 : Vertex,
    Vertex_1 : Vertex,
    Vertex_2 : Vertex,
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
    Position        : vec3<f32>,
    Normal          : vec3<f32>,

    Albedo          : vec3<f32>,
    Emission        : vec3<f32>,

    Metalness       : f32,
    Roughness       : f32,
    Transmission    : f32,
    IOR             : f32,
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
    J           : f32,
};

struct Path
{
    Surface    : array<Surface, 8u>,
    Lobe       : array<u32, 8u>,
    rSeed      : array<u32, 8u>,

    XL         : LightSample,
    length     : u32,
};

struct Reservoir
{
    Sample  : CompactPath,
    UCW     : f32,
    C       : u32,

    Padding : vec2<f32>,
};

struct PathReservoir
{
    Sample  : Path,
    C       : u32,
    P_hat   : f32,
    w_sum   : f32,
};

struct Candidate
{
    path : Path,

    // f(y)의 대리 값: PathContribution 의 휘도
    L : f32,

    // 이웃 픽셀 i 가 현재 픽셀에서 이 path y 를 낼 때의
    // 추정 PDF  p_hat<-i(y) ≈ 1/UCW_i * (J_y / J_x)
    p_from_i : f32,

    confidence : u32,
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

const MIN_J      : f32 = 1e-4;
const MAX_J      : f32 = 1e+4;
const MAX_RIS    : f32 = 1e+4;   // 너무 큰 weight 방지용
const MAX_X1_GAP : f32 = 0.05;   // prev / base x1 위치 허용 오차

const RECONNECTION_DISTANCE  : f32 = 0.01;
const RECONNECTION_ROUGHNESS : f32 = 0.05;
//==========================================================================
// GPU Bindings
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer           : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer             : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer          : array<u32>;
@group(0) @binding(3) var<storage, read>    AccelBuffer             : array<u32>;
@group(0) @binding(4) var<storage, read>    ReservoirBuffer_Read    : array<Reservoir>;

@group(0) @binding(10) var TexturePool      : texture_2d_array<f32>;
@group(0) @binding(11) var G_Buffer         : texture_2d<f32>;

@group(0) @binding(20) var TextureSampler   : sampler;

@group(1) @binding(0) var<storage, read_write> ReservoirBuffer_Write : array<Reservoir>;



//==========================================================================
// Small utils / Random
//==========================================================================

fn isFinite(x : f32) -> bool {
    let isNan    = x != x;
    return !(isNan);
}

fn GetHashValue(Seed : u32) -> u32
{
    let state = Seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn Random(pSeed : ptr<function, u32>) -> f32
{
    let Hash = GetHashValue(*pSeed);
    *pSeed = *pSeed + 1u;
    return f32(Hash) / 4294967295.0;
}


//==========================================================================
// Parsers / Scene access
//==========================================================================

fn GetInstance(InstanceID : u32) -> Instance
{
    let Offset      : u32       = STRIDE_INSTANCE * InstanceID;
    var OutInstance : Instance  = Instance();

    OutInstance.ModelMatrix = mat4x4<f32>
    (
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  0u], SceneBuffer[Offset +  1u], SceneBuffer[Offset +  2u], SceneBuffer[Offset +  3u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  4u], SceneBuffer[Offset +  5u], SceneBuffer[Offset +  6u], SceneBuffer[Offset +  7u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset +  8u], SceneBuffer[Offset +  9u], SceneBuffer[Offset + 10u], SceneBuffer[Offset + 11u])),
        bitcast<vec4<f32>>(vec4<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u], SceneBuffer[Offset + 15u]))
    );

    OutInstance.ModelMatrix_Inverse = mat4x4<f32>
    (
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

    OutMeshDescriptor.Offset_Vertex         = SceneBuffer[Offset + 0u];
    OutMeshDescriptor.Offset_Index          = SceneBuffer[Offset + 1u];
    OutMeshDescriptor.Offset_MaterialID     = SceneBuffer[Offset + 2u];
    OutMeshDescriptor.Offset_SubBlasRoot    = SceneBuffer[Offset + 3u];
    OutMeshDescriptor.Offset_Blas           = SceneBuffer[Offset + 4u];
    OutMeshDescriptor.Count_SubMesh         = SceneBuffer[Offset + 5u];

    return OutMeshDescriptor;
}

fn TransformVec3WithMat4x4(InVector3 : vec3<f32>, TransformMatrix : mat4x4<f32>) -> vec3<f32>
{
    let TransformedVector : vec4<f32> = TransformMatrix * vec4<f32>(InVector3, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
}

fn GetMaterialID(InMeshDescriptor : MeshDescriptor, SubMeshID : u32) -> u32
{
    let Offset : u32 = UniformBuffer.Offset_MaterialIDBuffer + InMeshDescriptor.Offset_MaterialID + SubMeshID;
    return SceneBuffer[ Offset ];
}

fn GetMaterial(MaterialID : u32) -> Material
{
    let Offset      : u32           = UniformBuffer.Offset_MaterialBuffer + (STRIDE_MATERIAL * MaterialID);
    var OutMaterial : Material      = Material();

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

    OutMaterial.TextureID_Albedo    = bitcast<i32>(SceneBuffer[Offset + 12u]);
    OutMaterial.TextureID_ORM       = bitcast<i32>(SceneBuffer[Offset + 13u]);
    OutMaterial.TextureID_Emissive  = bitcast<i32>(SceneBuffer[Offset + 14u]);


    // ===================
    OutMaterial.Roughness = max(OutMaterial.Roughness, 0.01);

    return OutMaterial;
}

fn GetAlbedo(InMaterial : Material, UV : vec2<f32>) -> vec4<f32>
{
    if ( InMaterial.TextureID_Albedo < 0 ) { return InMaterial.Albedo; }

    let SampledColor    : vec4<f32> = textureSampleLevel( TexturePool, TextureSampler, UV, InMaterial.TextureID_Albedo, 0.0 );
    let LinearRGB       : vec3<f32> = pow(SampledColor.rgb, vec3<f32>(2.2));

    return vec4<f32>(LinearRGB, SampledColor.a);
}

fn GetEmission(InMaterial : Material, UV : vec2<f32>) -> vec3<f32>
{
    return InMaterial.EmissiveIntensity * InMaterial.EmissiveColor;
}

fn GetMetalness(InMaterial : Material, UV : vec2<f32>) -> f32
{
    if ( InMaterial.TextureID_ORM < 0 ) { return InMaterial.Metalness; }

    let TextureORM : vec4<f32> = textureSampleLevel( TexturePool, TextureSampler, UV, InMaterial.TextureID_ORM, 0.0 );
    return TextureORM.b;
}

fn GetRoughness(InMaterial : Material, UV : vec2<f32>) -> f32
{
    if ( InMaterial.TextureID_ORM < 0 ) { return InMaterial.Roughness; }

    let TextureORM : vec4<f32> = textureSampleLevel( TexturePool, TextureSampler, UV, InMaterial.TextureID_ORM, 0.0 );
    return TextureORM.g;

}

fn GetBlasNode(InMeshDescriptor : MeshDescriptor, SubMeshID : u32, BlasID : u32) -> BlasNode
{
    let SubBlasRootOffset   : u32       =
        GeometryBuffer[UniformBuffer.Offset_SubBlasRootArrayBuffer +
                       InMeshDescriptor.Offset_SubBlasRoot + SubMeshID];

    let Offset              : u32       =
        UniformBuffer.Offset_BlasBuffer + InMeshDescriptor.Offset_Blas +
        SubBlasRootOffset + (STRIDE_BLAS * BlasID);

    var OutBVHNode          : BlasNode  = BlasNode();

    OutBVHNode.Boundary_Min = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 0u], AccelBuffer[Offset + 1u], AccelBuffer[Offset + 2u]));
    OutBVHNode.Boundary_Max = bitcast<vec3<f32>>(vec3<u32>(AccelBuffer[Offset + 3u], AccelBuffer[Offset + 4u], AccelBuffer[Offset + 5u]));
    OutBVHNode.Offset       = AccelBuffer[Offset + 6u];
    OutBVHNode.Count        = AccelBuffer[Offset + 7u];

    return OutBVHNode;
}

fn GetVertex(InMeshDescriptor : MeshDescriptor, VertexID : u32) -> Vertex
{
    let Offset      : u32       = InMeshDescriptor.Offset_Vertex + (STRIDE_VERTEX * VertexID);
    var OutVertex   : Vertex    = Vertex();

    OutVertex.Position  = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 0u], GeometryBuffer[Offset + 1u], GeometryBuffer[Offset + 2u]));
    OutVertex.Normal    = bitcast<vec3<f32>>(vec3<u32>(GeometryBuffer[Offset + 3u], GeometryBuffer[Offset + 4u], GeometryBuffer[Offset + 5u]));
    OutVertex.UV        = bitcast<vec2<f32>>(vec2<u32>(GeometryBuffer[Offset + 6u], GeometryBuffer[Offset + 7u]));

    return OutVertex;
}

fn GetTriangle(InMeshDescriptor : MeshDescriptor, PrimitiveID : u32) -> Triangle
{
    let Offset      : u32       = UniformBuffer.Offset_IndexBuffer + InMeshDescriptor.Offset_Index;
    var OutTriangle : Triangle  = Triangle();

    let VertexID_0 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 0u];
    let VertexID_1 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 1u];
    let VertexID_2 : u32 = GeometryBuffer[Offset + (3u * PrimitiveID) + 2u];

    OutTriangle.Vertex_0 = GetVertex(InMeshDescriptor, VertexID_0);
    OutTriangle.Vertex_1 = GetVertex(InMeshDescriptor, VertexID_1);
    OutTriangle.Vertex_2 = GetVertex(InMeshDescriptor, VertexID_2);

    return OutTriangle;
}

fn GetTriangleWorldSpace(InInstance : Instance, InTriangle : Triangle) -> Triangle
{
    var OutTriangle : Triangle  = Triangle();

    OutTriangle.Vertex_0.Position    = TransformVec3WithMat4x4(InTriangle.Vertex_0.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_0.Normal      = TransformVec3WithMat4x4(InTriangle.Vertex_0.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_0.UV          = InTriangle.Vertex_0.UV;

    OutTriangle.Vertex_1.Position    = TransformVec3WithMat4x4(InTriangle.Vertex_1.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_1.Normal      = TransformVec3WithMat4x4(InTriangle.Vertex_1.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_1.UV          = InTriangle.Vertex_1.UV;

    OutTriangle.Vertex_2.Position    = TransformVec3WithMat4x4(InTriangle.Vertex_2.Position, InInstance.ModelMatrix);
    OutTriangle.Vertex_2.Normal      = TransformVec3WithMat4x4(InTriangle.Vertex_2.Normal, transpose(InInstance.ModelMatrix_Inverse));
    OutTriangle.Vertex_2.UV          = InTriangle.Vertex_2.UV;

    return OutTriangle;
}

fn GetCompactSurface(RcVertex : vec4<f32>) -> CompactSurface
{
    var OutCompactSurface           : CompactSurface    = CompactSurface();
    let Valid_InstanceID_MaterialID : u32               = bitcast<u32>(RcVertex.r);

    OutCompactSurface.IsValidSurface    = bool( Valid_InstanceID_MaterialID & 0x80000000u );
    OutCompactSurface.InstanceID        = ( Valid_InstanceID_MaterialID & 0x7fff0000u ) >> 16u;
    OutCompactSurface.MaterialID        = ( Valid_InstanceID_MaterialID & 0x0000ffffu );
    OutCompactSurface.PrimitiveID       = bitcast<u32>(RcVertex.g);
    OutCompactSurface.Barycentric       = vec2<f32>( RcVertex.b, RcVertex.a );

    return OutCompactSurface;
}
fn GetSurface(InCompactSurface : CompactSurface) -> Surface
{
    var OutSurface : Surface;

    let SurfaceInstance         : Instance          = GetInstance( InCompactSurface.InstanceID );
    let SurfaceMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor( SurfaceInstance.MeshID );
    let SurfaceTriangleLocal    : Triangle          = GetTriangle( SurfaceMeshDescriptor, InCompactSurface.PrimitiveID );
    let SurfaceTriangle         : Triangle          = GetTriangleWorldSpace( SurfaceInstance, SurfaceTriangleLocal );

    let U   : f32 = InCompactSurface.Barycentric.x;
    let V   : f32 = InCompactSurface.Barycentric.y;
    let W   : f32 = 1.0 - U - V;

    {
        let N0  : vec3<f32> = SurfaceTriangle.Vertex_0.Normal * U;
        let N1  : vec3<f32> = SurfaceTriangle.Vertex_1.Normal * V;
        let N2  : vec3<f32> = SurfaceTriangle.Vertex_2.Normal * W;
        let N   : vec3<f32> = normalize( N0 + N1 + N2 );

        let P0  : vec3<f32> = SurfaceTriangle.Vertex_0.Position * U;
        let P1  : vec3<f32> = SurfaceTriangle.Vertex_1.Position * V;
        let P2  : vec3<f32> = SurfaceTriangle.Vertex_2.Position * W;
        let P   : vec3<f32> = P0 + P1 + P2;

        OutSurface.Position = P;
        OutSurface.Normal   = N;
    }

    let UV0 : vec2<f32> = SurfaceTriangle.Vertex_0.UV * U;
    let UV1 : vec2<f32> = SurfaceTriangle.Vertex_1.UV * V;
    let UV2 : vec2<f32> = SurfaceTriangle.Vertex_2.UV * W;
    let UV  : vec2<f32> = UV0 + UV1 + UV2;

    let SurfaceMaterial : Material = GetMaterial( InCompactSurface.MaterialID );
    {
        OutSurface.Albedo       = GetAlbedo( SurfaceMaterial, UV ).rgb;
        OutSurface.Emission     = GetEmission( SurfaceMaterial, UV );

        OutSurface.Metalness    = GetMetalness( SurfaceMaterial, UV );
        OutSurface.Roughness    = GetRoughness( SurfaceMaterial, UV );
        OutSurface.Transmission = SurfaceMaterial.Transmission;
        OutSurface.IOR          = SurfaceMaterial.IOR;
    }

    return OutSurface;
}


//==========================================================================
// Maths / Ray
//==========================================================================

fn DoRangesOverlap(Range1 : vec2<f32>, Range2 : vec2<f32>) -> bool
{
    return (Range1.x <= Range2.y) && (Range2.x <= Range1.y);
}

fn TransformRayWithMat4x4(InRay : Ray, TransformMatrix : mat4x4<f32>, bNormalize : bool) -> Ray
{
    let Start   : vec3<f32> = TransformVec3WithMat4x4(InRay.Start, TransformMatrix);
    let End     : vec3<f32> = TransformVec3WithMat4x4(InRay.Start + InRay.Direction, TransformMatrix);
    
    let Direction_Unnormalized  : vec3<f32> = End - Start;
    let Direction_Normalized    : vec3<f32> = normalize(Direction_Unnormalized);
    let Direction               : vec3<f32> = select(Direction_Unnormalized, Direction_Normalized, bNormalize);

    return Ray(Start, Direction);
}

fn GetRayAABBIntersectionRange(InRay : Ray, InBlasNode : BlasNode) -> vec2<f32>
{
    let InvDirection = 1.0 / (InRay.Direction);

    let t1 = (InBlasNode.Boundary_Min - InRay.Start) * InvDirection;
    let t2 = (InBlasNode.Boundary_Max - InRay.Start) * InvDirection;

    let t_min_vec = min(t1, t2);
    let t_max_vec = max(t1, t2);

    let t_min = max(t_min_vec.x, max(t_min_vec.y, t_min_vec.z));
    let t_max = min(t_max_vec.x, min(t_max_vec.y, t_max_vec.z));

    if (t_min > t_max) { return vec2<f32>(1.0, 0.0); }

    return vec2<f32>(t_min, t_max);
}

fn GetRayTriangleHitDistance(InRay : Ray, InTriangle : Triangle) -> f32
{
    let P0 = InTriangle.Vertex_0.Position;
    let P1 = InTriangle.Vertex_1.Position;
    let P2 = InTriangle.Vertex_2.Position;

    let Edge_1 = P1 - P0;
    let Edge_2 = P2 - P0;

    let pvec = cross(InRay.Direction, Edge_2);
    let det = dot(Edge_1, pvec);

    if (abs(det) < EPS) { return 1e11; }

    let invDet = 1.0 / det;
    let tvec   = InRay.Start - P0;

    let u = dot(tvec, pvec) * invDet;
    if (u < 0.0 || u > 1.0) { return 1e11; }

    let qvec = cross(tvec, Edge_1);
    let v = dot(InRay.Direction, qvec) * invDet;
    if (v < 0.0 || (u + v) > 1.0) { return 1e11; }

    let t = dot(Edge_2, qvec) * invDet;

    let tMin: f32 = EPS;
    if (t <= tMin) { return 1e11; }

    return t;
}

fn GetBaryCentricWeights(Point : vec3<f32>, InTriangle : Triangle) -> vec3<f32>
{
    let A = InTriangle.Vertex_0.Position;
    let B = InTriangle.Vertex_1.Position;
    let C = InTriangle.Vertex_2.Position;

    let v0 = B - A;
    let v1 = C - A;
    let v2 = Point - A;

    let d00 = dot(v0, v0);
    let d01 = dot(v0, v1);
    let d11 = dot(v1, v1);
    let d20 = dot(v2, v0);
    let d21 = dot(v2, v1);

    let denom = d00 * d11 - d01 * d01;

    if (abs(denom) < 1e-8) { return vec3<f32>(1.0, 0.0, 0.0); }

    let invDenom = 1.0 / denom;
    let u = (d11 * d20 - d01 * d21) * invDenom;
    let v = (d00 * d21 - d01 * d20) * invDenom;
    let w = 1.0 - u - v;

    return vec3f(w, u, v);
}


fn TraceRay(InRay: Ray) -> HitResult
{
    var BestHitResult : HitResult = HitResult();
    var RayValidRange : vec2<f32> = vec2<f32>(1e-4, 1e10);
    
    BestHitResult.IsValidHit = false;

    // Trace Ray
    for (var InstanceID: u32 = 0u; InstanceID < UniformBuffer.InstanceCount; InstanceID++)
    {
        // 현재 Instance 기준으로 정보 가져오기
        let CurrentInstance         : Instance          = GetInstance(InstanceID);
        let CurrentMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(CurrentInstance.MeshID);
        let LocalRay                : Ray               = TransformRayWithMat4x4(InRay, CurrentInstance.ModelMatrix_Inverse, false);

        for (var SubMeshID : u32 = 0u; SubMeshID < CurrentMeshDescriptor.Count_SubMesh; SubMeshID++)
        {
            let IntersectionRange : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, GetBlasNode(CurrentMeshDescriptor, SubMeshID, 0u));
            if (!DoRangesOverlap(RayValidRange, IntersectionRange)) { continue; }

            // Blas Tree 순회
            var Stack           : array<u32, 96>;
            var StackPointer    : i32 = -1;
            StackPointer++; Stack[StackPointer] = 0;
        
            while (StackPointer > -1)
            {
                let BlasID          : u32       = Stack[StackPointer]; StackPointer--;
                let CurrentBlasNode : BlasNode  = GetBlasNode(CurrentMeshDescriptor, SubMeshID, BlasID);
                let bIsLeafNode     : bool      = bool(CurrentBlasNode.Count & 0xffff0000u);

                if (!bIsLeafNode)
                {
                    let LChildBlasID : u32 = BlasID + 1u;
                    let RChildBlasID : u32 = CurrentBlasNode.Offset / 8u;

                    let LChildBlas   : BlasNode = GetBlasNode(CurrentMeshDescriptor, SubMeshID, LChildBlasID);
                    let RChildBlas   : BlasNode = GetBlasNode(CurrentMeshDescriptor, SubMeshID, RChildBlasID);

                    let LIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, LChildBlas);
                    let RIntersectionRange  : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, RChildBlas);

                    let bLDidHit : bool = DoRangesOverlap(RayValidRange, LIntersectionRange);
                    let bRDidHit : bool = DoRangesOverlap(RayValidRange, RIntersectionRange);

                    let HitState : u32 = (u32(bLDidHit) << 1) + u32(bRDidHit);
                    switch (HitState)
                    {
                        case 1u: { StackPointer++; Stack[StackPointer] = RChildBlasID; break; }
                        case 2u: { StackPointer++; Stack[StackPointer] = LChildBlasID; break; }
                        case 3u: 
                        {

                            if (LIntersectionRange.x < RIntersectionRange.x)
                            {
                                StackPointer++; Stack[StackPointer] = RChildBlasID;
                                StackPointer++; Stack[StackPointer] = LChildBlasID;
                            }
                            else
                            {
                                StackPointer++; Stack[StackPointer] = LChildBlasID;
                                StackPointer++; Stack[StackPointer] = RChildBlasID;
                            }

                            break;
                        }

                        default: { break; }
                    }

                    continue;
                }

                let PrimitiveStartID : u32 = CurrentBlasNode.Offset;
                let PrimitiveEndID   : u32 = PrimitiveStartID + (CurrentBlasNode.Count & 0x0000ffffu);

                for (var PrimitiveID : u32 = PrimitiveStartID; PrimitiveID < PrimitiveEndID; PrimitiveID++)
                {
                    let CurrentTriangle : Triangle = GetTriangle(CurrentMeshDescriptor, PrimitiveID);
                    let PrimitiveHitDistance : f32 = GetRayTriangleHitDistance(LocalRay, CurrentTriangle);
                    if (RayValidRange.y < PrimitiveHitDistance) { continue; }
                    
                    // 최종 살아남은 Primitive를 선택
                    RayValidRange.y = PrimitiveHitDistance;

                    BestHitResult.IsValidHit                    = true;
                    BestHitResult.SurfaceInfo.IsValidSurface    = true;
                    BestHitResult.SurfaceInfo.InstanceID        = InstanceID;
                    BestHitResult.SurfaceInfo.PrimitiveID       = PrimitiveID;

                    let HitInstance         : Instance          = GetInstance(BestHitResult.SurfaceInfo.InstanceID);
                    let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
                    BestHitResult.SurfaceInfo.MaterialID        = GetMaterialID(HitMeshDescriptor, SubMeshID);
                }
            }
        }
    }

    // 충돌했다면 충돌 지점의 정보 채워넣기
    if (BestHitResult.IsValidHit)
    {
        BestHitResult.HitDistance = RayValidRange.y;

        let HitInstance         : Instance          = GetInstance(BestHitResult.SurfaceInfo.InstanceID);
        let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
        let HitPrimitiveLocal   : Triangle          = GetTriangle(HitMeshDescriptor, BestHitResult.SurfaceInfo.PrimitiveID);
        let HitPrimitive        : Triangle          = GetTriangleWorldSpace(HitInstance, HitPrimitiveLocal);
        let HitPoint            : vec3<f32>         = InRay.Start + (BestHitResult.HitDistance * InRay.Direction);

        BestHitResult.SurfaceInfo.Barycentric       = GetBaryCentricWeights(HitPoint, HitPrimitive).xy;
    }
    
    return BestHitResult;
}


//==========================================================================
// PBR eval / PDFs
//==========================================================================

fn Luminance(X : vec3<f32>) -> f32
{
    return dot(X, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn GGXDistribution(NdotH : f32, Roughness : f32) -> f32
{
    let Alpha   : f32 = Roughness * Roughness;
    let Alpha2  : f32 = Alpha * Alpha;
    let X       : f32 = NdotH * NdotH * (Alpha2 - 1.0) + 1.0;
    let Denom   : f32 = PI * X * X;

    return Alpha2 / max(Denom, EPS);
}

fn GeometryShadow_Optimized(NdotV : f32, NdotL : f32, Roughness : f32) -> f32
{
    let R : f32 = Roughness + 1.0;
    let K : f32 = R * R / 8.0;

    return 1.0 / ((NdotV * (1.0 - K) + K) * (NdotL * (1.0 - K) + K));
}

fn Frensel(Dot : f32, F0: vec3<f32>) -> vec3<f32>
{
    return F0 + (1.0 - F0) * pow(1.0 - saturate(Dot), 5.0);
}

fn TBNMatrix(N : vec3<f32>) -> mat3x3<f32>
{
    let WorldUp     : vec3<f32> = vec3<f32>(0.0, 1.0, 0.0);
    let WorldRight  : vec3<f32> = vec3<f32>(1.0, 0.0, 0.0);

    let IsNormalWorldUpSame : bool      = abs(dot(N, WorldUp)) > 0.9999;
    let CrossVector         : vec3<f32> = select(WorldUp, WorldRight, IsNormalWorldUpSame);

    let T     : vec3<f32> = normalize(cross(CrossVector, N));
    let B     : vec3<f32> = cross(N, T);

    return mat3x3<f32>(T, B, N);
}

fn BRDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> vec3<f32>
{
    let N : vec3<f32> = X.Normal;
    let H : vec3<f32> = normalize(L + V);

    let NdotV : f32 = max(dot(N, V), 0.0);
    let NdotL : f32 = max(dot(N, L), 0.0);
    let NdotH : f32 = max(dot(N, H), 0.0);
    let VdotH : f32 = max(dot(V, H), 0.0);

    let BaseColor       : vec3<f32> = X.Albedo.rgb;
    let Metalness       : f32       = X.Metalness;
    let Roughness       : f32       = X.Roughness;
    let Transmission    : f32       = X.Transmission;

    let F0  : vec3<f32> = mix(vec3f(0.04), BaseColor, Metalness);
    let D   : f32       = GGXDistribution(NdotH, Roughness);
    let G0  : f32       = GeometryShadow_Optimized(NdotV, NdotL, Roughness);
    let F   : vec3<f32> = Frensel(VdotH, F0);

    let kS  : vec3<f32> = F;
    let kD  : vec3<f32> = (1.0 - kS) * (1.0 - Metalness);

    let BRDF_Diffuse    : vec3<f32> = (kD / PI) * BaseColor;
    let BRDF_Specular   : vec3<f32> = kS * D * G0 * 0.25;

    return BRDF_Diffuse + BRDF_Specular;
}

fn BTDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> vec3<f32>
{
    let Albedo      : vec3<f32> = X.Albedo.rgb;
    let Roughness   : f32       = X.Roughness;

    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in    : f32 = select(1.0, X.IOR, bViewNormalSameHemisphere);
    let n_out   : f32 = select(X.IOR, 1.0, bViewNormalSameHemisphere);
    let H_norm  : f32 = length(n_in * L + n_out * V);

    let N : vec3<f32> = select(-X.Normal, X.Normal, bViewNormalSameHemisphere);
    let H : vec3<f32> = normalize(n_in * L + n_out * V);

    let NdotL : f32 = abs(dot(N,L));
    let NdotV : f32 = abs(dot(N,V));
    let NdotH : f32 = abs(dot(N,H));
    let LdotH : f32 = abs(dot(L,H));
    let VdotH : f32 = abs(dot(V,H));

    let G0  : f32       = GeometryShadow_Optimized(NdotL, NdotV, Roughness);
    let D   : f32       = GGXDistribution(NdotH, Roughness);
    let nr  : f32       = (n_out - n_in) / (n_out + n_in);
    let F0  : vec3<f32> = vec3f(nr * nr);
    let F   : vec3<f32> = Frensel(LdotH, F0);

    let Numerator : vec3<f32> = n_out * n_out * (1.0 - F) * LdotH * VdotH * G0 * D * Albedo;
    let BTDFValue : vec3<f32> = Numerator / max(H_norm * H_norm, EPS);

    return BTDFValue;
}

fn BSDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> vec3<f32>
{
    let T : f32 = X.Transmission;
    let N : vec3<f32> = X.Normal;

    if (dot(L, N) * dot(V, N) > 0.0) { return (1.0 - T) * BRDF(X, V, L); }
    return T * BTDF(X, V, L);
}

//==========================================================================
// PDFs 
//==========================================================================

fn PDF_BRDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> f32
{
    // 1. 정반사 확률 P_specular 계산
    let F0          : vec3<f32> = mix(vec3f(0.04), X.Albedo, X.Metalness);
    let P_specular  : f32       = mix(Luminance(F0), 1.0, X.Metalness);

    // 2. PDF_BRDF 계산
    let N       : vec3<f32> = X.Normal;
    let H       : vec3<f32> = normalize(L + V);
    let LdotN   : f32       = max(dot(L, N), 0.0);
    let NdotH   : f32       = max(dot(N, H), 0.0);
    let VdotH   : f32       = max(dot(V, H), 0.0);

    let PDF_Specular    : f32 = GGXDistribution(NdotH, X.Roughness) / max(4.0 * VdotH, EPS);
    let PDF_Diffuse     : f32 = LdotN / PI;
    let PDF_BRDF        : f32 = mix(PDF_Diffuse, PDF_Specular, P_specular);

    return PDF_BRDF;
}

fn PDF_BTDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> f32
{
    // --- 1. 기본 정보 및 IOR 설정 ---
    let Roughness   : f32      = X.Roughness;

    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in    : f32 = select(1.0, X.IOR, bViewNormalSameHemisphere);
    let n_out   : f32 = select(X.IOR, 1.0, bViewNormalSameHemisphere);
    let IORRatio : f32 = n_in / n_out;
    let N : vec3<f32> = select(-X.Normal, X.Normal, bViewNormalSameHemisphere);

    // --- 2. 프레넬 반사 확률 계산 ---
    var P_reflection : f32;
    {
        let r0 = (1.0 - IORRatio) / (1.0 + IORRatio);
        let R0 = r0 * r0;
        let cosTheta = abs(dot(V, N));
        P_reflection = Frensel(cosTheta, vec3f(R0)).x;

        let sinThetaSq = 1.0 - cosTheta * cosTheta;
        let R2 = IORRatio * IORRatio;
        if (sinThetaSq * R2 > 1.0) { P_reflection = 1.0; } // TIR
    }
    let P_transmission = 1.0 - P_reflection;


    // --- 3. 두 경로의 PDF를 각각 계산 ---
    
    // 3a. 반사(Reflection) 경로 PDF 계산
    var pdf_reflect : f32 = 0.0;
    if (P_reflection > 0.0) {
        // 반사 중간 벡터 H_reflect 계산
        let H_reflect = normalize(V + L);
        let NdotH_r = max(0.0, dot(N, H_reflect));
        let VdotH_r = max(0.0, dot(V, H_reflect));

        // p(L) = D(h_r) * |J_r| = D(h_r) / (4 * V.h_r)
        if (VdotH_r > 0.0) {
            pdf_reflect = GGXDistribution(NdotH_r, Roughness) / (4.0 * VdotH_r);
        }
    }

    // 3b. 굴절(Transmission) 경로 PDF 계산
    var pdf_transmit : f32 = 0.0;
    if (P_transmission > 0.0) {
        // 굴절 중간 벡터 H_refract 계산
        let H_refract = normalize(V * n_out + L * n_in);
        
        let NdotH_t = max(0.0, dot(N, H_refract));
        let VdotH_t = max(0.0, dot(V, H_refract));
        let LdotH_t = max(0.0, dot(L, H_refract));

        let denom = (n_in * LdotH_t + n_out * VdotH_t);
        if (denom > 0.0) {
            let J_transmit = (n_out * n_out * VdotH_t) / (denom * denom);
            pdf_transmit = GGXDistribution(NdotH_t, Roughness) * abs(J_transmit);
        }
    }

    // --- 4. 최종 결합 PDF 반환 ---
    let PDF_BTDF : f32 = P_reflection * pdf_reflect + P_transmission * pdf_transmit;

    return PDF_BTDF;
}

fn PDF_BSDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> f32
{
    let N : vec3<f32> = X.Normal;

    if (dot(L, N) * dot(V, N) > 0.0) { return PDF_BRDF(X, V, L); }
    return PDF_BTDF(X, V, L);
}
fn GetLightsCDF(Idx : u32) -> f32
{
    let Offset : u32 = UniformBuffer.Offset_LightsCDFBuffer;
    return bitcast<f32>(SceneBuffer[Offset + Idx]);
}

fn PDF_LIGHT(X : Surface, V : vec3<f32>, XL : LightSample) -> f32
{

    let bIsEnvLight     : bool = ( XL.Type == LIGHT_ENV );
    let bIsVirtualLight : bool = ( XL.LightID < 0 );

    if ( bIsEnvLight ) { return PDF_BSDF(X, V, DirectionToLight(X, XL)); }

    let LightSource : Light = GetLight(u32(XL.LightID));
    let Pr_Before   : f32   = select(GetLightsCDF(u32(XL.LightID)-1), 0.0, XL.LightID == 0);
    let Pr_Choose   : f32   = GetLightsCDF(u32(XL.LightID)) - Pr_Before;

    var PDF_Point   : f32   = 1.0;

    if ( XL.Type == LIGHT_RECT )
    {
        let r : vec3<f32>   = XL.Position - X.Position;
        let L : vec3<f32>   = normalize(r);
        let N : vec3<f32>   = LightSource.Direction;
        let A : f32         = LightSource.Area;

        PDF_Point = dot(r,r) / max(A * abs(dot(N, L)), EPS);
    }

    return Pr_Choose * PDF_Point;
}

//==========================================================================
// PathContribution / PathPDF
//==========================================================================

fn DirectionToLight(X : Surface, XL : LightSample) -> vec3<f32>
{
    switch (XL.Type)
    {
        case LIGHT_DIRECTION: { return -XL.Direction; }
        case LIGHT_POINT:     { return normalize(XL.Position - X.Position); }
        case LIGHT_RECT:      { return normalize(XL.Position - X.Position); }
        case LIGHT_ENV:       { return -XL.Direction; }
        default:              { return vec3f(0.0); }
    }
}

fn L_emit(XL : LightSample, X : Surface) -> vec3<f32>
{
    let bIsPointLight   : bool      = (XL.Type == LIGHT_POINT);
    let r               : vec3<f32> = XL.Position - X.Position;
    let Attenuation     : f32       = select(1.0, 1.0 / max(dot(r, r), EPS), bIsPointLight);

    return XL.Emittance * Attenuation;
}

fn Visibility(Start : vec3<f32>, End : vec3<f32>) -> f32
{
    var Transmittance   : f32 = 1.0;
    var Distance        : f32       = length(End - Start);
    let Direction       : vec3<f32> = (End - Start) / Distance;

    var CurrentRay      : Ray       = Ray(Start, Direction);
    var RemainDistance  : f32       = Distance;

    for (var iter = 0u; iter < 5u; iter++)
    {
        let ClosestHit : HitResult = TraceRay(CurrentRay);
        if (!ClosestHit.IsValidHit || ClosestHit.HitDistance > RemainDistance) { return Transmittance; }

        let HitMaterial : Material = GetMaterial(ClosestHit.SurfaceInfo.MaterialID);
        if (HitMaterial.Transmission == 0.0) { return 0.0; }

        Transmittance   *= HitMaterial.Transmission;
        RemainDistance  -= ClosestHit.HitDistance;

        let HitSurface : Surface = GetSurface( ClosestHit.SurfaceInfo );
        CurrentRay = Ray(HitSurface.Position, CurrentRay.Direction);
    }

    return 0.0;
}

//==========================================================================
// Path Reconstruction / Contribution / PDF
//==========================================================================
fn PathContribution(InPath : Path) -> vec3<f32>
{
    var f : vec3<f32> = vec3f(1.0);

    for (var i = 1u; i < InPath.length - 1; i++)
    {
        let X_Prev : Surface = InPath.Surface[i - 1];
        let X_Curr : Surface = InPath.Surface[i    ];
        let X_Next : Surface = InPath.Surface[i + 1];

        let V : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );
        let L : vec3<f32> = normalize( X_Next.Position - X_Curr.Position );
        let N : vec3<f32> = X_Curr.Normal;

        f *= BSDF(X_Curr, L, V) * abs( dot(N, L) );
    }

    // 최종 Light hit
    {
        let X_Prev : Surface = InPath.Surface[InPath.length - 2];
        let X_Curr : Surface = InPath.Surface[InPath.length - 1];

        let V : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );
        let L : vec3<f32> = DirectionToLight( X_Curr, InPath.XL );
        let N : vec3<f32> = X_Curr.Normal;

        f *= BSDF(X_Curr, L, V) * abs( dot(N, L) );
        f *= L_emit(InPath.XL, X_Curr) * Visibility(X_Curr.Position, InPath.XL.Position);
    }

    return f;
}


fn PathPDF(InPath : Path) -> f32
{
    if (InPath.length < 2u) {
        return 1.0;
    }

    var pdf : f32 = InPath.XL.PDF;

    for (var i = 1u; i < InPath.length - 1u; i++)
    {
        let X_Prev : Surface = InPath.Surface[i - 1u];
        let X_Curr : Surface = InPath.Surface[i    ];
        let X_Next : Surface = InPath.Surface[i + 1u];

        let V : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );
        let L : vec3<f32> = normalize( X_Next.Position - X_Curr.Position );

        pdf *= PDF_BSDF(X_Curr, V, L);
    }

    return pdf;
}

//==========================================================================
// GBuffer / Reprojection / Path 재구성
//==========================================================================

fn Get_X0(ThreadID : vec2<u32>) -> vec3<f32>
{
    let PixelUV     : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution_Source);
    let PixelNDC    : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);
    return TransformVec3WithMat4x4(PixelNDC, UniformBuffer.ViewProjectionMatrix_Inverse);
}

fn Get_X1(ThreadID : vec2<u32>) -> CompactSurface
{
    let GBufferData : vec4<f32> = textureLoad(G_Buffer, ThreadID, 0);
    return GetCompactSurface(GBufferData);
}

fn GetTriangleFromPrimitive(primitiveID : u32, instanceID : u32) -> Triangle
{
    let inst          : Instance = GetInstance(instanceID);
    let triLocal      : Triangle = GetTriangle(GetMeshDescriptor(inst.MeshID), primitiveID);
    let triWorld      : Triangle = GetTriangleWorldSpace(inst, triLocal);
    return triWorld;
}

fn GetPrevScreenPx(curPixel : vec2<u32>) -> vec2<i32>
{
    let gbuf : vec4<f32> = textureLoad(G_Buffer, vec2<i32>(curPixel), 0);

    let packed_r  : u32 = bitcast<u32>(gbuf.r);
    if (!((packed_r & 0x80000000u) != 0u)) {
        return vec2<i32>(-1, -1);
    }


    let alpha : f32 = gbuf.b;
    let beta  : f32 = gbuf.a;
    let gamma : f32 = 1.0 - alpha - beta;

    let primitiveID : u32 = bitcast<u32>(gbuf.g);
    let instanceID  : u32 = (packed_r >> 16u) & 0x7FFFu;

    let tri        : Triangle = GetTriangleFromPrimitive(primitiveID, instanceID);
    let hitPos     : vec3<f32> =
          tri.Vertex_0.Position * alpha
        + tri.Vertex_1.Position * beta
        + tri.Vertex_2.Position * gamma;

    let prevClip   : vec4<f32> = UniformBuffer.ViewProjectionMatrix_Prev * vec4<f32>(hitPos, 1.0);

    if (prevClip.w <= 0.0) {
        return vec2<i32>(-1, -1);
    }

    let prevNdc : vec3<f32> = prevClip.xyz / prevClip.w;

    if (any(prevNdc.xy < vec2<f32>(-1.0, -1.0)) ||
        any(prevNdc.xy > vec2<f32>( 1.0,  1.0))) {
        return vec2<i32>(-1, -1);
    }

    let prevScreen01 : vec2<f32> = prevNdc.xy * 0.5 + vec2<f32>(0.5, 0.5);
    let prevScreenPx : vec2<f32> = prevScreen01 * vec2<f32>(UniformBuffer.Resolution_Source);

    var pi : vec2<i32> = vec2<i32>(prevScreenPx);
    let resi : vec2<i32> = vec2<i32>(UniformBuffer.Resolution_Source);
    pi = clamp(pi, vec2<i32>(0, 0), resi - vec2<i32>(1, 1));

    return pi;
}

fn GetLight(LightID : u32) -> Light
{
    let Offset      : u32   = UniformBuffer.Offset_LightBuffer + (STRIDE_LIGHT * LightID);
    var OutLight    : Light = Light();

    OutLight.Position   = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  0u], SceneBuffer[Offset +  1u], SceneBuffer[Offset +  2u]));
    OutLight.Direction  = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  3u], SceneBuffer[Offset +  4u], SceneBuffer[Offset +  5u]));
    OutLight.Color      = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  6u], SceneBuffer[Offset +  7u], SceneBuffer[Offset +  8u]));
    OutLight.U          = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset +  9u], SceneBuffer[Offset + 10u], SceneBuffer[Offset + 11u]));
    OutLight.V          = bitcast<vec3<f32>>(vec3<u32>(SceneBuffer[Offset + 12u], SceneBuffer[Offset + 13u], SceneBuffer[Offset + 14u]));

    OutLight.LightType  = SceneBuffer[Offset +  15u];
    OutLight.Intensity  = bitcast<f32>(SceneBuffer[Offset + 16u]);
    OutLight.Area       = bitcast<f32>(SceneBuffer[Offset + 17u]);

    return OutLight;
}

//==========================================================================
// BSDF Sampling (for RegeneratePath)
//==========================================================================

fn SampleCosineHemisphere(pRandomSeed : ptr<function, u32>) -> vec3<f32>
{
    let Random_1 : f32 = Random(pRandomSeed);
    let Random_2 : f32 = Random(pRandomSeed);

    let R       : f32 = sqrt(Random_1);
    let Phi     : f32 = 2.0 * PI * Random_2;

    let X   : f32 = R * cos(Phi);
    let Y   : f32 = R * sin(Phi);
    let Z   : f32 = sqrt(1.0 - Random_1);

    return vec3<f32>(X, Y, Z);
}

fn SampleGGX(pRandomSeed : ptr<function, u32>, Roughness: f32) -> vec3<f32>
{
    let Random_1 : f32 = Random(pRandomSeed);
    let Random_2 : f32 = Random(pRandomSeed);

    let Alpha   : f32 = Roughness * Roughness;
    let Phi     : f32 = 2.0 * PI * Random_1;

    let CosTheta : f32 = sqrt((1.0 - Random_2) / (1.0 + (Alpha * Alpha - 1.0) * Random_2));
    let SinTheta : f32 = sqrt(1.0 - CosTheta * CosTheta);

    let H_X : f32 = SinTheta * cos(Phi);
    let H_Y : f32 = SinTheta * sin(Phi);
    let H_Z : f32 = CosTheta;

    return normalize(vec3<f32>(H_X, H_Y, H_Z));
}

fn SampleBRDF(pRandomSeed : ptr<function, u32>, X : Surface, V : vec3<f32>) -> BSDFSample
{
    let Albedo          : vec3<f32> = X.Albedo.rgb;
    let Metalness       : f32       = X.Metalness;
    let Roughness       : f32       = X.Roughness;
 
    // 정반사 확률
    let F0          : vec3<f32> = mix(vec3f(0.04), Albedo, Metalness);
    let P_specular  : f32       = mix(Luminance(F0), 1.0, Metalness);

    let N   : vec3<f32>     = X.Normal;
    let TBN : mat3x3<f32>   = TBNMatrix(N);
    var L   : vec3<f32>;

    let bTreatAsSpecular : bool = Random(pRandomSeed) < P_specular;
    if (bTreatAsSpecular)
    {
        let H = TBN * SampleGGX(pRandomSeed, Roughness);
        L = reflect(-V, H);
    }
    else
    {
        L = TBN * SampleCosineHemisphere(pRandomSeed);
    }

    var OutBSDFSample : BSDFSample = BSDFSample();
    OutBSDFSample.Direction = L;
    OutBSDFSample.Lobe      = select(LOBE_LAMBERT, LOBE_GGX, bTreatAsSpecular);

    return OutBSDFSample;
}

fn SampleBTDF(pRandomSeed : ptr<function, u32>, X : Surface, V : vec3<f32>) -> BSDFSample
{
    let same : bool = (dot(V, X.Normal) > 0.0);
    let n_in    : f32 = select(1.0, X.IOR, same);
    let n_out   : f32 = select(X.IOR, 1.0, same);
    let N           : vec3<f32> = select(-X.Normal, X.Normal, same);
    let eta         : f32 = n_in / n_out;

    var P_reflection : f32;
    var tir : bool;
    {
        let r   : f32 = (1.0 - eta) / (1.0 + eta);
        let cosTheta : f32 = abs(dot(V, N));
        let r2  : f32 = r * r;
        let R2  : f32 = eta * eta;

        P_reflection = Frensel(cosTheta, vec3f(r2)).x;

        tir = (cosTheta * cosTheta < (R2 - 1.0)/R2);
        if (tir) {
            P_reflection = 1.0;
        }
    }

    let TBN : mat3x3<f32>   = TBNMatrix(N);
    let H   : vec3<f32>     = TBN * SampleGGX(pRandomSeed, X.Roughness);

    var L : vec3<f32>;

    if (tir) {
        L = reflect(-V, H);
    } else {
        let bTreatAsReflection : bool = (Random(pRandomSeed) < P_reflection);

        if (bTreatAsReflection) {
            L = reflect(-V, H);
        } else {
            let T = refract(-V, H, eta);
            let lenT = length(T);
            if (lenT > 1e-6) {
                L = T / lenT;
            } else {
                L = reflect(-V, H);
            }
        }
    }

    var OutBSDFSample : BSDFSample;
    OutBSDFSample.Direction = L;
    OutBSDFSample.Lobe      = LOBE_GGX;

    return OutBSDFSample;
}


fn SampleBSDF(pRandomSeed : ptr<function, u32>, X : Surface, V : vec3<f32>) -> BSDFSample
{
    let bTreatAsTransparent : bool = Random(pRandomSeed) < X.Transmission;

    if (bTreatAsTransparent) { return SampleBTDF(pRandomSeed, X, V); }
    return SampleBRDF(pRandomSeed, X, V);
}


//==========================================================================
// CompactPath + 현재 프레임 G-buffer 를 이용해서 Path 재구성
//==========================================================================

fn CreateEnvLight(X : Surface, V : vec3<f32>, L : vec3<f32>) -> LightSample
{
    var OutLightSample : LightSample = LightSample();

    OutLightSample.Position     = X.Position + L * INF;
    OutLightSample.Type         = LIGHT_ENV;
    OutLightSample.Direction    = -L;
    OutLightSample.LightID      = -1;
    OutLightSample.Emittance    = ENV_COLOR;

    OutLightSample.PDF          = PDF_BSDF(X, V, L);

    return OutLightSample;
}

fn RegeneratePath(ThreadID : vec2<u32>, InCompactPath : CompactPath) -> Path
{
    var OutPath : Path;

    if (InCompactPath.length < 2u) {
        OutPath.length = 0u;
        return OutPath;
    }

    // 카메라/1번째 서페이스 세팅
    OutPath.Surface[0].Position = Get_X0(ThreadID);
    OutPath.Surface[1]          = GetSurface( Get_X1(ThreadID) );
    OutPath.XL                  = InCompactPath.XL;

    // 최소 길이: x0, x1
    OutPath.length = 2u;

    // 나머지 버텍스 재생성
    for (var i = 1u; i < InCompactPath.length - 1u; i++)
    {
        let X_Prev  : Surface       = OutPath.Surface[i - 1u];
        let X_Curr  : Surface       = OutPath.Surface[i    ];

        let V       : vec3<f32>     = normalize( X_Prev.Position - X_Curr.Position );

        var rSeed   : u32           = InCompactPath.rSeed[i - 1u];
        let W       : BSDFSample    = SampleBSDF(&rSeed, X_Curr, V);

        OutPath.Lobe[i]             = W.Lobe;

        let HitInfo : HitResult     = TraceRay( Ray(X_Curr.Position, W.Direction) );

        // 히트 못하면 더 이상 유효한 surface 없음 → 여기서 path 종료
        if (!HitInfo.IsValidHit)
        {
            // 현재까지의 길이 = i+1 (0..i 인덱스까지 존재)
            OutPath.length = i + 1u;
            return OutPath;
        }

        // 히트했다면 다음 surface 채우고 길이 갱신
        OutPath.Surface[i + 1u] = GetSurface( HitInfo.SurfaceInfo );
        OutPath.length = i + 2u;

        // Path array 최대 길이 방어 (8개로 제한되어 있으므로)

        if (i + 1u >= 8u) { break; }

    }

    return OutPath;
}

fn IsSafeToReconnect(A : Surface, Lobe_A : u32, B : Surface, Lobe_B : u32) -> bool
{
    let Roughness_A     : f32   = select(A.Roughness, 1.0, Lobe_A == LOBE_LAMBERT);
    let Roughness_B     : f32   = select(B.Roughness, 1.0, Lobe_B == LOBE_LAMBERT);
    let bRoughEnough    : bool  = ( min(Roughness_A, Roughness_B) >= RECONNECTION_ROUGHNESS );

    let bFarEnough      : bool  = ( length(A.Position - B.Position) >= RECONNECTION_DISTANCE );

    return bFarEnough && bRoughEnough;
}

fn IsSafeToReconnect_Light(X : Surface, XL : LightSample) -> bool
{
    let bRoughEnough        : bool  = ( X.Roughness >= RECONNECTION_ROUGHNESS );

    let bIsDirectionalLight : bool  = ( XL.Type == LIGHT_DIRECTION ) || ( XL.Type == LIGHT_ENV );
    let bFarEnough          : bool  = bIsDirectionalLight || ( length(X.Position - XL.Position) >= RECONNECTION_DISTANCE );

    return bFarEnough && bRoughEnough;
}

fn SafeReconnectionIndex(InPath : Path) -> u32
{
    for (var k = 2u; k < InPath.length; k++)
    {
        if ( IsSafeToReconnect(
            InPath.Surface[k - 1], InPath.Lobe[k - 1], 
            InPath.Surface[k    ], InPath.Lobe[k    ]
        ) ) { return k; }
    }

    // 마지막 버텍스를 라이트로 재연결할 수 있는지
    if ( IsSafeToReconnect_Light( InPath.Surface[InPath.length - 1], InPath.XL ) ) { 
        return InPath.length; 
    }

    return 0u;
}

fn CompressPath(InPath : Path) -> CompactPath
{
    var OutCompactPath : CompactPath;
    {
        OutCompactPath.k        = SafeReconnectionIndex(InPath);
        OutCompactPath.length   = InPath.length;
        OutCompactPath.RcVertex = vec4<f32>(0.0, 0.0, 0.0, 0.0);
        OutCompactPath.XL       = InPath.XL;
        OutCompactPath.J        = 0.0;

        OutCompactPath.rSeed[0] = InPath.rSeed[2];
        OutCompactPath.rSeed[1] = InPath.rSeed[3];
        OutCompactPath.rSeed[2] = InPath.rSeed[4];
        OutCompactPath.rSeed[3] = InPath.rSeed[5];
    }

    // Unshiftable Path
    if ( OutCompactPath.k == 0u ) { return OutCompactPath; }

    let bIsLight_Xk : bool  = ( OutCompactPath.k == InPath.length );
    OutCompactPath.Lobe_k   = select(InPath.Lobe[OutCompactPath.k], LOBE_LIGHT, bIsLight_Xk);
    OutCompactPath.Lobe_k_1 = InPath.Lobe[OutCompactPath.k - 1u];

    // --- 여기부터 J 저장 부분 수정 ---

    let k : u32 = OutCompactPath.k;

    // x_k 이 라이트 버텍스인 경우(=k == length) : 수식 6.16의 두번째 항이 사라진 케이스
    if (bIsLight_Xk)
    {
        // k == length 이므로, k-2, k-1 은 존재
        if (k >= 2u && k <= InPath.length)
        {
            let Xkm2 : Surface = InPath.Surface[k - 2u]; // x_{k-2}
            let Xkm1 : Surface = InPath.Surface[k - 1u]; // x_{k-1}

            // x_{k-1} 기준 in/out 방향
            let V_in  : vec3<f32> = normalize(Xkm2.Position - Xkm1.Position);
            // out 방향은 light 쪽 : XL.Direction 을 이용
            let L_dir : vec3<f32> = DirectionToLight(Xkm1, InPath.XL);
            let pdf_in : f32      = PDF_BSDF(Xkm1, V_in, L_dir);

            // 기하학 항 |cos θ_k^x| / ||x_k - x_{k-1}||^2
            let L_vec : vec3<f32> = normalize(InPath.XL.Position - Xkm1.Position);
            let XkN   : vec3<f32> = Xkm1.Normal; // 마지막 서피스의 노멀
            let cos_k : f32       = abs(dot(XkN, L_vec));
            let d     : vec3<f32> = InPath.XL.Position - Xkm1.Position;
            let dist2 : f32       = max(dot(d, d), EPS);

            var J_light : f32 = pdf_in * (cos_k / dist2);
            if (!isFinite(J_light) || J_light < MIN_J || J_light > MAX_J) {
                J_light = 0.0;
            }

            OutCompactPath.J = J_light;
        }
        else
        {
            OutCompactPath.J = 0.0;
        }
    }
    else
    {
        // 일반 surface 재연결 : calculate_J 로 베이스 J_x 계산
        let J_base : f32 = calculate_J(InPath, k);
        OutCompactPath.J = J_base;
    }

    return OutCompactPath;
}


//==========================================================================
// 하이브리드 시프트 (prefix = prev, suffix = base)
//==========================================================================

fn DoHybridShift(
    baseRes : CompactPath,
    prevRes : CompactPath
) -> CompactPath {
    var result : CompactPath = baseRes;

    let k : u32 = baseRes.k;

    // k 범위 체크
    if (k < 2u || k >= baseRes.length || prevRes.length <= k) {
        result.length = 0;
        return result;
    }
    // prefix 부분의 rSeed는 이전 프레임 걸 사용
    for (var i : u32 = 0u; i < k; i++) {
        result.rSeed[i] = prevRes.rSeed[i];
    }

    result.length  = baseRes.length;
    result.RcVertex = prevRes.RcVertex;
    result.Lobe_k_1 = prevRes.Lobe_k_1;

    return result;
}

fn calculate_J(InPath : Path, k : u32) -> f32
{
    // k 가 너무 작거나, 이후 버텍스가 없으면 재연결 불가 → 0 리턴
    if (k < 2u || (k + 1u) >= InPath.length) {
        return 0.0;
    }

    // --- 주변 버텍스들 가져오기 ---
    let Xkm2 : Surface = InPath.Surface[k - 2u];
    let Xkm1 : Surface = InPath.Surface[k - 1u];
    let Xk   : Surface = InPath.Surface[k];
    let Xkp1 : Surface = InPath.Surface[k + 1u];

    // --- 1) p_{ω,ℓ}^{x_{k-1}}(x_k) ---
    let V_in  : vec3<f32> = normalize(Xkm2.Position - Xkm1.Position);
    let L_in  : vec3<f32> = normalize(Xk.Position   - Xkm1.Position);
    let pdf_in: f32       = PDF_BSDF(Xkm1, V_in, L_in);

    // --- 2) |cos θ_k^x| / ||x_k - x_{k-1}||^2 ---
    let dir_k : vec3<f32> = normalize(Xkm1.Position - Xk.Position); // x_k 기준에서 x_{k-1} 방향
    let cos_k : f32       = abs(dot(Xk.Normal, dir_k));
    let d     : vec3<f32> = Xk.Position - Xkm1.Position;
    let dist2 : f32       = max(dot(d, d), EPS);

    // --- 3) p_ω^{x_k}(x_{k+1}) ---
    let V_k   : vec3<f32> = normalize(Xkm1.Position - Xk.Position);
    let L_k   : vec3<f32> = normalize(Xkp1.Position - Xk.Position);
    let pdf_out           = PDF_BSDF(Xk, V_k, L_k);

    var J : f32 = pdf_in * (cos_k / dist2) * pdf_out;

    if (!isFinite(J) || J < MIN_J || J > MAX_J) {
        return 0.0;
    }

    return J;
}

fn UpdateReservoir(
    pRandomSeed : ptr<function, u32>, 
    pReservoir  : ptr<function, PathReservoir>, 
    Sample      : Path, 
    RIS         : f32,
    P_hat       : f32,
    Confidence  : u32
)
{
    (*pReservoir).C     += Confidence;
    (*pReservoir).w_sum += RIS;

    let Pr_Change     : f32  = RIS / ((*pReservoir).w_sum);
    let bChangeSample : bool = Random(pRandomSeed) < Pr_Change;

    if (!bChangeSample) { return; }

    (*pReservoir).Sample = Sample;
    (*pReservoir).P_hat  = P_hat;
}

fn StoreReservoir(ThreadID : vec2<u32>, pReservoir : ptr<function, Reservoir>)
{
    let idx : u32 = ThreadID.y * UniformBuffer.Resolution_Source.x + ThreadID.x;
    ReservoirBuffer_Write[idx] = (*pReservoir);

    return;
}

const KERNEL_RADIUS : i32 = 2; 
const KERNEL_DIAM : i32 = 2 * KERNEL_RADIUS + 1;
const MAX_NEIGHBOR : i32 = KERNEL_DIAM * KERNEL_DIAM - 1;
// 후보 최대 개수 (커널 전체 - 자기 자신)
const MAX_CANDIDATE : u32 = u32(MAX_NEIGHBOR);

// 후보 정보를 간단히 모아둘 구조


@compute @workgroup_size(8, 8, 1)
fn cs_main(@builtin(global_invocation_id) ThreadID : vec3<u32>)
{

    let curPixel : vec2<u32> = ThreadID.xy;
    

    let curIdx : u32 = curPixel.y * UniformBuffer.Resolution_Source.x + curPixel.x;



    // --- 1. canonical(base) reservoir 가져오기 ---
    var baseRes : Reservoir = ReservoirBuffer_Read[curIdx];

    if (curPixel.x >= UniformBuffer.Resolution_Source.x ||
        curPixel.y >= UniformBuffer.Resolution_Source.y ) {
            //ReservoirBuffer_Write[curIdx] = baseRes;
        return;
    }

    if (baseRes.C == 0u || baseRes.Sample.length < 2u) {
        ReservoirBuffer_Write[curIdx] = baseRes;
        return;
    }


    // base path 재구성
    let basePath : Path = RegeneratePath(curPixel, baseRes.Sample);
    if (basePath.length < 2u) {
        //ReservoirBuffer_Write[curIdx] = baseRes;
        return;
    }

    // base reconnection index
    let k_base : u32 = baseRes.Sample.k;
    if (k_base < 2u || (k_base + 1u) >= basePath.length) {
        ReservoirBuffer_Write[curIdx] = baseRes;
        return;
    }

    // base contribution / proxy pdf
    let contribBase : vec3<f32> = PathContribution(basePath);
    var P_hat_Base  : f32       = Luminance(contribBase);
    if (!(P_hat_Base > 0.0) || !isFinite(P_hat_Base)) {
        ReservoirBuffer_Write[curIdx] = baseRes;
        return;
    }

    // --- 2. neighbor 후보들을 hybrid shift + 경로 재생성으로 모으기 ---
    var rng : u32 = GetHashValue(curPixel.x * 1973u + curPixel.y * 9277u + UniformBuffer.FrameIndex * 26699u);
    var candidates : array<Candidate, MAX_CANDIDATE>;
    var candCount  : u32 = 0u;

    for (var dy : i32 = -KERNEL_RADIUS; dy <= KERNEL_RADIUS; dy = dy + 1)
    {
        for (var dx : i32 = -KERNEL_RADIUS; dx <= KERNEL_RADIUS; dx = dx + 1)
        {
            if (dx == 0 && dy == 0) { continue; }

            let nx_i : i32 = i32(curPixel.x) + dx;
            let ny_i : i32 = i32(curPixel.y) + dy;

            if (nx_i < 0 || ny_i < 0 ||
                nx_i >= i32(UniformBuffer.Resolution_Source.x) ||
                ny_i >= i32(UniformBuffer.Resolution_Source.y)) {
                continue;
            }

            if (candCount >= MAX_CANDIDATE) { break; }

            let nx   : u32 = u32(nx_i);
            let ny   : u32 = u32(ny_i);
            let nIdx : u32 = ny * UniformBuffer.Resolution_Source.x + nx;

            let neiRes : Reservoir = ReservoirBuffer_Read[nIdx];
            if (neiRes.C == 0u || neiRes.Sample.length < 2u) {
                continue;
            }

            // base path 재구성 (이웃 픽셀 기준)
            let neiPath : Path = RegeneratePath(vec2<u32>(nx, ny), neiRes.Sample);
            if (neiPath.length < 2u) {
                continue;
            }

            // 하이브리드 시프트: neighbor sample -> 현재 픽셀 도메인
            var shifted : CompactPath = DoHybridShift(baseRes.Sample, neiRes.Sample);
            if (!(shifted.length > 0u) || shifted.k != k_base) {
                continue;
            }

            // 현재 픽셀에서 offset path 재구성
            let offsetPath : Path = RegeneratePath(curPixel, shifted);
            if (!(offsetPath.length >= 2u && shifted.k < offsetPath.length)) {
                continue;
            }

            // 재연결 안전성 검사
            if (!IsSafeToReconnect(
                    offsetPath.Surface[k_base - 1u], offsetPath.Lobe[k_base - 1u],
                    offsetPath.Surface[k_base    ], offsetPath.Lobe[k_base    ])) {
                continue;
            }

            // Jacobian J_y 계산
            let J_y : f32 = calculate_J(offsetPath, shifted.k);
            if (!(J_y > 0.0)) {
                continue;
            }

            shifted.J = J_y;

            // 이웃(base) 쪽의 J_x, PDF p_i(x) 복원
            let J_x    : f32 = max(neiRes.Sample.J, EPS);
            let UCW_i  : f32 = neiRes.UCW;

            if (!(UCW_i > 0.0)) {
                continue;
            }

            let p_base : f32 = 1.0 / UCW_i;                 // ≈ p_i(x)
            var p_from_i : f32 = p_base * (J_y / J_x);      // ≈ p_i(y)

            if (!(p_from_i > 0.0)) {
                continue;
            }

            // path contribution (target function 값 f(y))
            let contribOff : vec3<f32> = PathContribution(offsetPath);
            let L_i        : f32       = Luminance(contribOff);
            if (!(L_i > 0.0)) {
                continue;
            }

            // 후보 저장
            candidates[candCount].path      = offsetPath;
            candidates[candCount].L         = L_i;
            candidates[candCount].p_from_i  = p_from_i;
            candidates[candCount].confidence= max(neiRes.C, 1u);

            candCount++;
        }
    }

    // --- 3. pairwise MIS with J-based p_hat<-i -------------------------

    // 후보가 없으면 기존 리저버 유지
    if (candCount == 0u) {
        ReservoirBuffer_Write[curIdx] = baseRes;
        return;
    }

    let M : f32 = f32(candCount + 1u); // canonical + neighbors

    var outRes : PathReservoir;
    outRes.C     = 0u;
    outRes.w_sum = 0.0;
    outRes.P_hat = 0.0;

    // canonical 샘플(base path)의 기여와 PDF
    let L_c         : f32       = Luminance(contribBase);
    let p_c_base    : f32       = PathPDF(basePath);

    var sum_c_term : f32 = 0.0;

    // 3a. 이웃 후보들
    for (var i : u32 = 0u; i < candCount; i++)
    {
        let p_i : f32 = candidates[i].p_from_i;     // 이웃 기술 i 의 p_hat<-i(y)
        let p_c : f32 = PathPDF(candidates[i].path); // canonical 기술의 p_c(y)

        if (!(p_i > 0.0 && p_c > 0.0)) {
            continue;
        }

        let denom : f32 = p_i + p_c;
        if (denom <= 0.0) { continue; }

        // pairwise MIS weight m_i(y) = (1/M) * p_i / (p_i + p_c)
        let m_i : f32 = (1.0 / M) * (p_i / denom);

        // 최종 weight w_i = m_i * f(y)  (여기서 f(y) ≈ L_i)
        let w_i : f32 = m_i * candidates[i].L;

        UpdateReservoir(
            &rng,
            &outRes,
            candidates[i].path,
            w_i,
            candidates[i].L,
            candidates[i].confidence
        );

        // canonical 쪽 pairwise term 누적
        sum_c_term += p_c / denom;
    }

    // 3b. canonical 샘플(base path)에 대한 weight
    if (L_c > 0.0 && p_c_base > 0.0)
    {
        let m_c : f32 = (1.0 / M) * (1.0 + sum_c_term);
        let w_c : f32 = m_c * L_c;

        UpdateReservoir(
            &rng,
            &outRes,
            basePath,
            w_c,
            L_c,
            max(baseRes.C, 1u)
        );
    }

    // --- 4. 리저버 압축 & 저장 ---
    {
        var ResultReservoir : Reservoir;
        ResultReservoir.Sample  = CompressPath(outRes.Sample);
        ResultReservoir.UCW     = outRes.w_sum / max(outRes.P_hat, EPS);
        ResultReservoir.C       = outRes.C;

        StoreReservoir(ThreadID.xy, &ResultReservoir);
        //ReservoirBuffer_Write[curIdx] = baseRes;
        
    }
}