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

@group(0) @binding(0) var<uniform>          UniformBuffer       : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer         : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer      : array<u32>;
@group(0) @binding(3) var<storage, read>    AccelBuffer         : array<u32>;
@group(0) @binding(4) var<storage, read>    PrevReservoirBuffer : array<Reservoir>;

@group(0) @binding(10) var TexturePool : texture_2d_array<f32>;
@group(0) @binding(11) var G_Buffer : texture_2d<f32>;
@group(0) @binding(12) var MotionVectorTex : texture_storage_2d<rgba16float, read>;

@group(0) @binding(20) var TextureSampler : sampler;

@group(1) @binding(0) var<storage, read_write> ReservoirBuffer  : array<Reservoir>;

//==========================================================================
// Small utils / Random
//==========================================================================

fn isFinite(x : f32) -> bool {
    let isNan    = x != x;
    let isTooBig = abs(x) > 1e20;
    return !(isNan || isTooBig);
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
    var contribution : vec3<f32> = vec3f(1.0);

    var f       : vec3<f32> = vec3f(1.0);
    var p       : f32       = 1.0;


    for (var i = 1u; i < 4u; i++)
    {
        let X : Surface     = InPath.Surface[i];
        let V : vec3<f32>   = normalize( InPath.Surface[i - 1].Position - X.Position );
        var L : vec3<f32>;

        L = DirectionToLight(X, InPath.XL);

        contribution = f * L_emit(InPath.XL, X) * 
        BSDF(X, V, L) * abs(dot(X.Normal, L)) * Visibility(X.Position, InPath.XL.Position);

        let P_hat : f32 = Luminance( contribution );

        var PathPDF : f32 = p * InPath.XL.PDF;

        let RIS : f32 = P_hat / PathPDF;

        f *= BSDF(X, V, L) * abs(dot(X.Normal, L));
        p *= PDF_BSDF(X, V, L);
    }


    return contribution;
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
        if (OutPath.length >= 8u) {
            // 더 이상 저장할 곳이 없으니 안전하게 종료
            return OutPath;
        }
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
 
// 커널 반경 (1 = 3x3, 2 = 5x5 ...)
// 커널 반경 (1 = 3x3, 2 = 5x5 ...)
const KERNEL_RADIUS : i32 = 2;

@compute @workgroup_size(8, 8, 1)
fn cs_main(@builtin(global_invocation_id) ThreadID : vec3<u32>)
{
    /* Base Path */
    // 현재 픽셀 인덱스 계산 & 유효성 체크
    let curPixel : vec2<u32> = ThreadID.xy;

    if (curPixel.x >= UniformBuffer.Resolution_Source.x ||
        curPixel.y >= UniformBuffer.Resolution_Source.y) {
        //return;
    }

    let curIdx : u32 =
        curPixel.y * UniformBuffer.Resolution_Source.x +
        curPixel.x;

    // base path 재생성 & 유효성 체크
    var baseRes : Reservoir = ReservoirBuffer[curIdx]; // base path
    let basePath : Path = RegeneratePath(curPixel, baseRes.Sample);

    if (basePath.length < 2u) {
        //ReservoirBuffer[curIdx] = baseRes;
        //return;
    }

    let contribBase : vec3<f32> = PathContribution(basePath);
    let P_hat_Base  : f32       = Luminance(contribBase);

    if (!(P_hat_Base > 0.0) || !isFinite(P_hat_Base)) {
        //ReservoirBuffer[curIdx] = baseRes;
        //return;
    }

    let p_base_raw : f32 = PathPDF(basePath);
    if (!(p_base_raw > 0.0) || !isFinite(p_base_raw)) {
        //ReservoirBuffer[curIdx] = baseRes;
        //return;
    }
    let p_base : f32 = max(p_base_raw, EPS);

    var w_base : f32 = P_hat_Base / p_base;
    w_base = clamp(w_base, 0.0, MAX_RIS);

    // ------------------------------------------------------------
    // Streaming merge 초기 상태
    // ------------------------------------------------------------
    var outRes        : Reservoir;
    var chosen_P_hat  : f32 = P_hat_Base;
    var chosen_weight : f32 = w_base;
    var W_total       : f32 = w_base;
    var totalC        : u32 = baseRes.C;
    var M : u32 = 0;
    var m1 : f32 = 0.0;
    

    // RNG
    var rng : u32 = GetHashValue(
        curPixel.x * 1973u +
        curPixel.y * 9277u +
        UniformBuffer.FrameIndex * 26699u
    );

    // ------------------------------------------------------------
    // 1. spatial reuse loop
    // ------------------------------------------------------------
    for (var dy : i32 = -KERNEL_RADIUS; dy <= KERNEL_RADIUS; dy = dy + 1) {
        for (var dx : i32 = -KERNEL_RADIUS; dx <= KERNEL_RADIUS; dx = dx + 1) {


            
            if (dx == 0 && dy == 0) {
                continue;
            }
            M = M+1;
            

            let nx_i : i32 = i32(curPixel.x) + dx;
            let ny_i : i32 = i32(curPixel.y) + dy;
            if (nx_i < 0 || ny_i < 0 ||
                nx_i >= i32(UniformBuffer.Resolution_Source.x) ||
                ny_i >= i32(UniformBuffer.Resolution_Source.y)) {
                //continue;
            }

            let nx : u32 = u32(nx_i);
            let ny : u32 = u32(ny_i);
            let nIdx : u32 = ny * UniformBuffer.Resolution_Source.x + nx;

            // neighbour reservoir
            let neiRes : Reservoir = ReservoirBuffer[nIdx];
            if (neiRes.C == 0u || neiRes.Sample.length < 2u) {
                //continue;
            }

            // neighbour path 생성
            var neiPath : Path = RegeneratePath(vec2<u32>(nx, ny), neiRes.Sample);
            if (neiPath.length < 2u) {
                //continue;
            }

            // hybrid shift
            var shiftCompact : CompactPath = DoHybridShift(baseRes.Sample, neiRes.Sample);
            if !(shiftCompact.length > 0u) {
                //continue;
            }

            var offsetPath : Path = RegeneratePath(curPixel, shiftCompact);
            if (!(offsetPath.length >= 2u && shiftCompact.k < offsetPath.length)) {
                //continue;
            }

            // Jacobian J
            var J_val : f32 = calculate_J(offsetPath, shiftCompact.k);
            if (!(J_val > 0.0) || !isFinite(J_val)) {
                //continue;
            }
            shiftCompact.J = J_val;

            let base_k = baseRes.Sample.k;
            if !(IsSafeToReconnect(
                neiPath.Surface[base_k - 1u], neiPath.Lobe[base_k - 1u],
                basePath.Surface[base_k],    basePath.Lobe[base_k]
            )) {
                //continue;
            }

            // detJ
            let det_J : f32 = baseRes.Sample.J / J_val;
            if (!isFinite(det_J) || det_J > 100.0 || det_J < 0.01) {
                //continue;
            }

            // ------------------------------------------------------------
            // contribution / pdf / pairwise MIS weight
            // ------------------------------------------------------------
            let contribOff : vec3<f32> = PathContribution(offsetPath);
            let P_hat_Off  : f32       = Luminance(contribOff);
            if (!(P_hat_Off > 0.0) || !isFinite(P_hat_Off)) {
                //continue;
            }

            // 1) canonical sampler pdf: offsetPath를 직접 샘플링했을 때의 pdf
            let p_off_raw : f32 = PathPDF(offsetPath);
            if (!(p_off_raw > 0.0) || !isFinite(p_off_raw)) {
                //continue;
            }
            let p_off : f32 = max(p_off_raw, EPS);

            // 2) prev path pdf: neiPath 의 pdf (shift 이전)
            let p_prev_raw : f32 = PathPDF(neiPath);
            if (!(p_prev_raw > 0.0) || !isFinite(p_prev_raw) ){
                //continue;
            }
            let p_prev : f32 = max(p_prev_raw, EPS);

            // 3) shift sampler pdf: p_shift = p_prev * det_J
            let p_shift : f32 = p_prev * det_J;
            if (!isFinite(p_shift) || p_shift <= 0.0) {
                continue;
            }

            // 4) pairwise MIS: p_mix = p_off + p_shift
            let p_mix : f32 = max(p_off + p_shift, EPS);

            // 최종 weight: w_off = L(x) / (p_off + p_shift)
            var w_off_noP : f32 = P_hat_Off / p_mix;
            var w_off : f32 = p_prev / (chosen_weight + f32(M-1)*(p_prev));
            w_off = clamp(w_off, 0.0, MAX_RIS);

            if (!isFinite(w_off) || w_off <= 0.0) {
                //continue;
            }

            let W_sum : f32 = w_base + w_off;
            if (!(W_sum > 0.0) || !isFinite(W_sum)) {
                //continue;
            }

            // reservoir streaming update
            let p_choose_off : f32 = 1000.0;
            let r : f32 = Random(&rng);
            totalC  = min(totalC + neiRes.C, 1000000u);

            if (r < p_choose_off) {
                outRes.Sample = shiftCompact;
                chosen_P_hat  = P_hat_Off;
                outRes.UCW    = baseRes.UCW / det_J;
                outRes.C = totalC;
                chosen_weight = w_off;
            }

            let pair_M = f32((KERNEL_RADIUS+2)*(KERNEL_RADIUS+2)-1);
            m1 = m1 + (1/f32(M-1))*(p_base/(p_base+(f32(M-1)+p_off)));

            W_total = min(W_total + w_off/f32(M-1), 1e12);
        }
    }
    outRes.Padding  = vec2<f32>(1.0,0.0);
    ReservoirBuffer[curIdx] = outRes;

    var rng2 : u32 = GetHashValue(
        UniformBuffer.FrameIndex * 26699u
    );
    let r : f32 = Random(&rng2);
    if (r < m1){
        //ReservoirBuffer[curIdx] = baseRes;
    }
     //ReservoirBuffer[curIdx].C = totalC;


    // ------------------------------------------------------------
    // 2. finalize
    // ------------------------------------------------------------
    if !(W_total > 0.0) || !isFinite(W_total) ||
       !(chosen_P_hat > 0.0) || !isFinite(chosen_P_hat) {
        //ReservoirBuffer[curIdx] = baseRes;
        return;
    } else {
        //ReservoirBuffer[curIdx] = outRes;
        
    }
}
