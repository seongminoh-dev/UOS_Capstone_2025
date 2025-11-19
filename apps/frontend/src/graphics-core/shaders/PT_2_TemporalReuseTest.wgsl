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
    RcVertex    : vec4<f32>,   // reconnection vertex( x_k = y_k )

    k           : u32,         // reconnection index
    Lobe_k_1    : u32,
    Lobe_k      : u32,
    length      : u32,

    Padding     : vec3<u32>,
    J           : f32,         // base path 쪽에서 저장한 Jacobian 조각(여기서는 보존만)
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
    UCW     : f32,    // unbiased contribution weight (대략 L/p)
    C       : u32,    // total candidate count

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

const MIN_PATH_LENGTH : u32 = 2u; 
const MAX_PATH_LENGTH : u32 = 5u;

//==========================================================================
// GPU Bindings
//==========================================================================

@group(0) @binding(0) var<uniform>          UniformBuffer       : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer         : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer      : array<u32>;
@group(0) @binding(3) var<storage, read>    AccelBuffer         : array<u32>;
@group(0) @binding(4) var<storage, read>    PrevReservoirBuffer : array<Reservoir>;

@group(0) @binding(10) var G_Buffer         : texture_2d<f32>;

@group(1) @binding(0) var<storage, read_write> ReservoirBuffer  : array<Reservoir>;

//==========================================================================
// Parsers
//==========================================================================

fn TransformVec3WithMat4x4(InVector3 : vec3<f32>, TransformMatrix : mat4x4<f32>) -> vec3<f32>
{
    let TransformedVector : vec4<f32> = TransformMatrix * vec4<f32>(InVector3, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
}

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
    OutMeshDescriptor.Offset_Material       = SceneBuffer[Offset + 2u];
    OutMeshDescriptor.Offset_SubBlasRoot    = SceneBuffer[Offset + 3u];
    OutMeshDescriptor.Offset_Blas           = SceneBuffer[Offset + 4u];
    OutMeshDescriptor.Count_SubMesh         = SceneBuffer[Offset + 5u];

    return OutMeshDescriptor;
}

fn GetMaterial(InMeshDescriptor : MeshDescriptor, MaterialID : u32) -> Material
{
    let Offset      : u32           = UniformBuffer.Offset_MaterialBuffer + InMeshDescriptor.Offset_Material + (STRIDE_MATERIAL * MaterialID);
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

    let YELLOW : vec4<f32> = vec4<f32>(1.0, 1.0, 0.0, OutMaterial.Albedo.a);
    OutMaterial.Albedo      = select(OutMaterial.Albedo, YELLOW, OutMaterial.Transmission > 0.0 );
    OutMaterial.Roughness   = max(OutMaterial.Roughness, 0.01);

    return OutMaterial;
}

fn GetMaterialFromHit(HitInfo : HitResult) -> Material
{
    let HitInstance         : Instance          = GetInstance(HitInfo.SurfaceInfo.InstanceID);
    let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
    
    return GetMaterial(HitMeshDescriptor, HitInfo.SurfaceInfo.MaterialID);
}

fn GetBlasNode(InMeshDescriptor : MeshDescriptor, SubMeshID : u32, BlasID : u32) -> BlasNode
{
    let SubBlasRootOffset   : u32       = GeometryBuffer[ UniformBuffer.Offset_SubBlasRootArrayBuffer + InMeshDescriptor.Offset_SubBlasRoot + SubMeshID];
    let Offset              : u32       = UniformBuffer.Offset_BlasBuffer + InMeshDescriptor.Offset_Blas + SubBlasRootOffset + (STRIDE_BLAS * BlasID);
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

fn GetRcVertex(X : CompactSurface) -> vec4<f32>
{
    var OutRcVertex : vec4<f32>;
    let ValidFlag   : u32 = u32(X.IsValidSurface) << 31u;
    let InstanceID  : u32 = X.InstanceID << 16u;
    let MaterialID  : u32 = X.MaterialID;

    OutRcVertex.r = bitcast<f32>(ValidFlag | InstanceID | MaterialID);
    OutRcVertex.g = bitcast<f32>(X.PrimitiveID);
    OutRcVertex.b = X.Barycentric.x;
    OutRcVertex.a = X.Barycentric.y;

    return OutRcVertex;
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

fn GetSurface(X : CompactSurface) -> Surface
{
    var OutSurface : Surface = Surface();

    let SurfaceInstance         : Instance          = GetInstance( X.InstanceID );
    let SurfaceMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor( SurfaceInstance.MeshID );
    let SurfaceMaterial         : Material          = GetMaterial( SurfaceMeshDescriptor, X.MaterialID );
    let SurfaceTriangleLocal    : Triangle          = GetTriangle( SurfaceMeshDescriptor, X.PrimitiveID );
    let SurfaceTriangle         : Triangle          = GetTriangleWorldSpace( SurfaceInstance, SurfaceTriangleLocal );

    let U   : f32 = X.Barycentric.x;
    let V   : f32 = X.Barycentric.y;
    let W   : f32 = 1.0 - U - V;

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
    OutSurface.Material = SurfaceMaterial;

    return OutSurface;
}

//==========================================================================
// Maths / Intersection
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

    if (abs(det) < EPS) { return INF; }

    let invDet = 1.0 / det;
    let tvec   = InRay.Start - P0;

    let u = dot(tvec, pvec) * invDet;
    if (u < 0.0 || u > 1.0) { return INF; }

    let qvec = cross(tvec, Edge_1);
    let v = dot(InRay.Direction, qvec) * invDet;
    if (v < 0.0 || (u + v) > 1.0) { return INF; }

    let t = dot(Edge_2, qvec) * invDet;

    if (t <= EPS) { return INF; }

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

    return vec3<f32>(w, u, v);
}

fn TraceRay(InRay : Ray) -> HitResult
{
    var BestHitResult : HitResult = HitResult();
    var RayValidRange : vec2<f32> = vec2<f32>(EPS, INF);
    
    BestHitResult.IsValidHit = false;

    for (var InstanceID : u32 = 0u; InstanceID < UniformBuffer.InstanceCount; InstanceID++)
    {
        let CurrentInstance         : Instance          = GetInstance(InstanceID);
        let CurrentMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(CurrentInstance.MeshID);
        let LocalRay                : Ray               = TransformRayWithMat4x4(InRay, CurrentInstance.ModelMatrix_Inverse, false);

        for (var SubMeshID : u32 = 0u; SubMeshID < CurrentMeshDescriptor.Count_SubMesh; SubMeshID++)
        {
            let IntersectionRange : vec2<f32> = GetRayAABBIntersectionRange(LocalRay, GetBlasNode(CurrentMeshDescriptor, SubMeshID, 0u));
            if (!DoRangesOverlap(RayValidRange, IntersectionRange)) { continue; }

            var Stack           : array<u32, 64>;
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
                    
                    RayValidRange.y = PrimitiveHitDistance;

                    BestHitResult.IsValidHit                    = true;
                    BestHitResult.SurfaceInfo.IsValidSurface    = true;
                    BestHitResult.SurfaceInfo.InstanceID        = InstanceID;
                    BestHitResult.SurfaceInfo.MaterialID        = SubMeshID;
                    BestHitResult.SurfaceInfo.PrimitiveID       = PrimitiveID;
                }
            }
        }
    }

    if (BestHitResult.IsValidHit)
    {
        BestHitResult.HitDistance = RayValidRange.y;

        let HitInstance         : Instance          = GetInstance(BestHitResult.SurfaceInfo.InstanceID);
        let HitMeshDescriptor   : MeshDescriptor    = GetMeshDescriptor(HitInstance.MeshID);
        let HitPrimitiveLocal   : Triangle          = GetTriangle(HitMeshDescriptor, BestHitResult.SurfaceInfo.PrimitiveID);
        let HitPrimitive        : Triangle          = GetTriangleWorldSpace(HitInstance, HitPrimitiveLocal);
        let HitPoint            : vec3<f32>         = InRay.Start + (BestHitResult.HitDistance * InRay.Direction);

        BestHitResult.SurfaceInfo.Barycentric = GetBaryCentricWeights(HitPoint, HitPrimitive).xy;
    }
    
    return BestHitResult;
}

//==========================================================================
// Random
//==========================================================================

fn GetHashValue(Seed : u32) -> u32
{
    let state = Seed * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn Random(pSeed : ptr<function, u32>) -> f32
{
    let Hash = GetHashValue(*pSeed);
    *pSeed = Hash;
    return f32(Hash) / 4294967295.0;
}

//==========================================================================
// PBR Evaluations
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
    return F0 + (1.0 - F0) * pow(1.0 - clamp(Dot, 0.0, 1.0), 5.0);
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

    let BaseColor       : vec3<f32> = X.Material.Albedo.rgb;
    let Metalness       : f32       = X.Material.Metalness;
    let Roughness       : f32       = X.Material.Roughness;

    let F0  : vec3<f32> = mix(vec3<f32>(0.04,0.04,0.04), BaseColor, Metalness);
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
    let Albedo      : vec3<f32> = X.Material.Albedo.rgb;
    let Roughness   : f32       = X.Material.Roughness;

    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in    : f32 = select(1.0, X.Material.IOR, bViewNormalSameHemisphere);
    let n_out   : f32 = select(X.Material.IOR, 1.0, bViewNormalSameHemisphere);
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
    let F0  : vec3<f32> = vec3<f32>(nr * nr);
    let F   : vec3<f32> = Frensel(LdotH, F0);

    let Numerator : vec3<f32> = n_out * n_out * (1.0 - F) * LdotH * VdotH * G0 * D * Albedo;
    let BTDFValue : vec3<f32> = Numerator / max(H_norm * H_norm, EPS);

    return BTDFValue;
}

fn BSDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> vec3<f32>
{
    let T : f32 = X.Material.Transmission;
    let N : vec3<f32> = X.Normal;

    if (dot(L, N) * dot(V, N) > 0.0) { return (1.0 - T) * BRDF(X, V, L); }
    return T * BTDF(X, V, L);
}

//==========================================================================
// Sampling
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
    let Albedo          : vec3<f32> = X.Material.Albedo.rgb;
    let Metalness       : f32       = X.Material.Metalness;
    let Roughness       : f32       = X.Material.Roughness;
 
    let F0          : vec3<f32> = mix(vec3<f32>(0.04,0.04,0.04), Albedo, Metalness);
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
    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in        : f32       = select(X.Material.IOR, 1.0, bViewNormalSameHemisphere);
    let n_out       : f32       = select(1.0, X.Material.IOR, bViewNormalSameHemisphere);
    let N           : vec3<f32> = select(-X.Normal, X.Normal, bViewNormalSameHemisphere);
    let IORRatio    : f32       = n_in / n_out;

    var P_reflection : f32;
    {
        let r   : f32 = (1.0 - IORRatio) / (1.0 + IORRatio);
        let r2  : f32 = r * r;

        let cosTheta : f32 = abs(dot(V, N));
        P_reflection = Frensel(cosTheta, vec3<f32>(r2,r2,r2)).x;

        let cos2 = cosTheta * cosTheta;
        let R2  = IORRatio * IORRatio;
        if ( cos2 < (R2 - 1.0)/R2 ) { P_reflection = 1.0; }
    }

    let bTreatAsReflection : bool = (Random(pRandomSeed) < P_reflection);

    let TBN : mat3x3<f32>   = TBNMatrix(N);
    let H   : vec3<f32>     = TBN * SampleGGX(pRandomSeed, X.Material.Roughness);
    let L   : vec3<f32>     = normalize(select(refract(-V, H, IORRatio), reflect(-V, H), bTreatAsReflection));
    
    var OutBSDFSample : BSDFSample = BSDFSample();

    OutBSDFSample.Direction = L;
    OutBSDFSample.Lobe      = LOBE_GGX;

    return OutBSDFSample;
}

fn SampleBSDF(pRandomSeed : ptr<function, u32>, X : Surface, V : vec3<f32>) -> BSDFSample
{
    let bTreatAsTransparent : bool = Random(pRandomSeed) < X.Material.Transmission;

    if (bTreatAsTransparent) { return SampleBTDF(pRandomSeed, X, V); }
    return SampleBRDF(pRandomSeed, X, V);
}

//==========================================================================
// PDFs  (여기 BTDF 안에 전파 야코비안이 들어감)
//==========================================================================

fn PDF_BRDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> f32
{
    let Albedo      : vec3<f32> = X.Material.Albedo.rgb;
    let Metalness   : f32       = X.Material.Metalness;
    let Roughness   : f32       = X.Material.Roughness;

    let F0          : vec3<f32> = mix(vec3<f32>(0.04,0.04,0.04), Albedo, Metalness);
    let P_specular  : f32       = mix(Luminance(F0), 1.0, Metalness);

    let N       : vec3<f32> = X.Normal;
    let H       : vec3<f32> = normalize(L + V);
    let LdotN   : f32       = max(dot(L, N), 0.0);
    let NdotH   : f32       = max(dot(N, H), 0.0);
    let VdotH   : f32       = max(dot(V, H), 0.0);

    let PDF_Specular    : f32 = GGXDistribution(NdotH, Roughness) / max(4.0 * VdotH, EPS);
    let PDF_Diffuse     : f32 = LdotN / PI;
    let PDF_BRDF_val    : f32 = mix(PDF_Diffuse, PDF_Specular, P_specular);

    return PDF_BRDF_val;
}

fn PDF_BTDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> f32
{
    let Roughness   : f32      = X.Material.Roughness;

    let bViewNormalSameHemisphere : bool = (dot(V, X.Normal) > 0.0);
    let n_in   : f32 = select(X.Material.IOR, 1.0, bViewNormalSameHemisphere);
    let n_out  : f32 = select(1.0, X.Material.IOR, bViewNormalSameHemisphere);
    let IORRatio : f32 = n_in / n_out;
    let N : vec3<f32> = select(-X.Normal, X.Normal, bViewNormalSameHemisphere);

    var P_reflection : f32;
    {
        let r0 = (1.0 - IORRatio) / (1.0 + IORRatio);
        let R0 = r0 * r0;
        let cosTheta = abs(dot(V, N));
        P_reflection = Frensel(cosTheta, vec3<f32>(R0,R0,R0)).x;

        let sinThetaSq = 1.0 - cosTheta * cosTheta;
        let R2 = IORRatio * IORRatio;
        if (sinThetaSq * R2 > 1.0) { P_reflection = 1.0; }
    }
    let P_transmission = 1.0 - P_reflection;

    var pdf_reflect : f32 = 0.0;
    if (P_reflection > 0.0) {
        let H_reflect = normalize(V + L);
        let NdotH_r = max(0.0, dot(N, H_reflect));
        let VdotH_r = max(0.0, dot(V, H_reflect));
        if (VdotH_r > 0.0) {
            pdf_reflect = GGXDistribution(NdotH_r, Roughness) / (4.0 * VdotH_r);
        }
    }

    var pdf_transmit : f32 = 0.0;
    if (P_transmission > 0.0) {
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

    let PDF_BTDF_val : f32 = P_reflection * pdf_reflect + P_transmission * pdf_transmit;
    return PDF_BTDF_val;
}

fn PDF_BSDF(X : Surface, V : vec3<f32>, L : vec3<f32>) -> f32
{
    let N : vec3<f32> = X.Normal;

    if (dot(L, N) * dot(V, N) > 0.0) { return PDF_BRDF(X, V, L); }
    return PDF_BTDF(X, V, L);
}

//==========================================================================
// Lighting Helpers
//==========================================================================

fn DirectionToLight(X : Surface, XL : LightSample) -> vec3<f32>
{
    switch ( XL.Type )
    {
        case LIGHT_DIRECTION : 
        {
            return -XL.Direction;
        }
        case LIGHT_POINT :
        {
            return normalize( XL.Position - X.Position );
        }
        case LIGHT_RECT :
        {
            return normalize( XL.Position - X.Position );
        }
        case LIGHT_ENV :
        {
            return -XL.Direction;
        }
        default : { return vec3<f32>(0.0,0.0,0.0); }
    }
}

fn L_emit(XL : LightSample, X : Surface) -> vec3<f32>
{ 
    let bIsPointLight   : bool      = ( XL.Type == LIGHT_POINT );
    let r               : vec3<f32> = XL.Position - X.Position;
    let Attenuation     : f32       = select(1.0, 1.0 / dot(r, r), bIsPointLight);

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

        let HitMaterial : Material = GetMaterialFromHit(ClosestHit);
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

fn Get_X0(ThreadID : vec2<u32>) -> vec3<f32>
{
    let PixelUV     : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution);
    let PixelNDC    : vec3<f32> = vec3<f32>(2.0 * PixelUV - 1.0, 0.0);

    return TransformVec3WithMat4x4(PixelNDC, UniformBuffer.ViewProjectionMatrix_Inverse);
}

fn Get_X1(ThreadID : vec2<u32>) -> CompactSurface
{
    let GBufferData : vec4<f32> = textureLoad(G_Buffer, vec2<i32>(ThreadID), 0);
    return GetCompactSurface(GBufferData);
}

fn PathContribution(InPath : Path) -> vec3<f32>
{
    var f : vec3<f32> = vec3<f32>(1.0,1.0,1.0);

    for (var i = 1u; i < InPath.length - 1u; i++)
    {
        let X_Prev : Surface = InPath.Surface[i - 1u];
        let X_Curr : Surface = InPath.Surface[i    ];
        let X_Next : Surface = InPath.Surface[i + 1u];

        let V : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );
        let L : vec3<f32> = normalize( X_Next.Position - X_Curr.Position );
        let N : vec3<f32> = X_Curr.Normal;

        f *= BSDF(X_Curr, V, L) * abs( dot(N, L) );
    }

    {
        let X_Prev : Surface = InPath.Surface[InPath.length - 2u];
        let X_Curr : Surface = InPath.Surface[InPath.length - 1u];

        let V : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );
        let L : vec3<f32> = DirectionToLight( X_Curr, InPath.XL );
        let N : vec3<f32> = X_Curr.Normal;

        f *= BSDF(X_Curr, V, L) * abs( dot(N, L) );
        f *= L_emit(InPath.XL, X_Curr) * Visibility(X_Curr.Position, InPath.XL.Position);
    }

    return f;
}

fn PathPDF(InPath : Path) -> f32
{
    var PDF : f32 = InPath.XL.PDF;

    for (var i = 1u; i < InPath.length - 1u; i++)
    {
        let X_Prev : Surface = InPath.Surface[i - 1u];
        let X_Curr : Surface = InPath.Surface[i    ];
        let X_Next : Surface = InPath.Surface[i + 1u];

        let V : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );
        let L : vec3<f32> = normalize( X_Next.Position - X_Curr.Position );

        PDF *= PDF_BSDF(X_Curr, V, L);
    }

    return PDF;
}

//==========================================================================
// Hybrid Shift Path Reconstruction (base + offset + RcVertex)
//==========================================================================
//
// cp.k      : reconnection index
// cp.RcVertex : 재접속 버텍스 x_k = y_k
//
// prefix   i = 1 .. k-2 : BSDF + TraceRay (random replay)
// recon    i = k-1      : out.Surface[k] = RcVertex
// suffix   i = k .. L-2 : BSDF + TraceRay
//==========================================================================

fn RegeneratePathHybrid(pixel : vec2<u32>, cp : CompactPath) -> Path
{
    var OutPath : Path;

    // 0번: 카메라 레이 시작점 (가상 vertex)
    OutPath.Surface[0].Position = Get_X0(pixel);
    OutPath.Surface[1]          = GetSurface( Get_X1(pixel) );
    OutPath.length              = cp.length;
    OutPath.XL                  = cp.XL;

    // k 가 2 미만이거나 length <= 2 이면 그냥 옛날 방식으로 처리
    if (cp.length <= 2u || cp.k < 2u) {
        for (var i = 1u; i < cp.length - 1u; i++)
        {
            let X_Prev  : Surface = OutPath.Surface[i - 1u];
            let X_Curr  : Surface = OutPath.Surface[i    ];
            let V       : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );

            var rSeed   : u32 = cp.rSeed[i - 1u];
            let W       : BSDFSample = SampleBSDF(&rSeed, X_Curr, V);

            OutPath.Lobe[i] = W.Lobe;
            let HitInfo : HitResult = TraceRay( Ray(X_Curr.Position, W.Direction) );
            OutPath.Surface[i + 1u] = GetSurface( HitInfo.SurfaceInfo );
        }
        return OutPath;
    }

    var k : u32 = cp.k;
    k = max(k, 2u);
    k = min(k, cp.length - 1u);

    // prefix: i = 1 .. k-2
    for (var i = 1u; i < k - 1u; i++)
    {
        let X_Prev  : Surface = OutPath.Surface[i - 1u];
        let X_Curr  : Surface = OutPath.Surface[i    ];
        let V       : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );

        var rSeed   : u32 = cp.rSeed[i - 1u];
        let W       : BSDFSample = SampleBSDF(&rSeed, X_Curr, V);

        OutPath.Lobe[i] = W.Lobe;

        let HitInfo : HitResult = TraceRay( Ray(X_Curr.Position, W.Direction) );
        OutPath.Surface[i + 1u] = GetSurface( HitInfo.SurfaceInfo );
    }

    // reconnection: i = k-1
    {
        let i = k - 1u;

        let X_Prev  : Surface = OutPath.Surface[i - 1u];
        let X_Curr  : Surface = OutPath.Surface[i    ];
        let V       : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );

        var rSeed : u32 = cp.rSeed[i - 1u];
        let W     : BSDFSample = SampleBSDF(&rSeed, X_Curr, V);
        OutPath.Lobe[i] = W.Lobe;

        let RcCS : CompactSurface = GetCompactSurface(cp.RcVertex);
        OutPath.Surface[i + 1u]   = GetSurface(RcCS);
    }

    // suffix: i = k .. length-2
    for (var i = k; i < cp.length - 1u; i++)
    {
        let X_Prev  : Surface = OutPath.Surface[i - 1u];
        let X_Curr  : Surface = OutPath.Surface[i    ];
        let V       : vec3<f32> = normalize( X_Prev.Position - X_Curr.Position );

        var rSeed   : u32 = cp.rSeed[i - 1u];
        let W       : BSDFSample = SampleBSDF(&rSeed, X_Curr, V);

        OutPath.Lobe[i] = W.Lobe;

        let HitInfo : HitResult = TraceRay( Ray(X_Curr.Position, W.Direction) );
        OutPath.Surface[i + 1u] = GetSurface( HitInfo.SurfaceInfo );
    }

    return OutPath;
}

//==========================================================================
// Path weight (for ReSTIR)
//   - 새 path y 를 재구성해서 L(y)/p(y)를 다시 평가
//   - Jacobian 은 PDF_BRDF/PDF_BTDF/geometry term 안에 포함된 걸로 본다
//==========================================================================

fn PathWeight(pixel : vec2<u32>, cp : CompactPath) -> f32
{
    let path : Path = RegeneratePathHybrid(pixel, cp);
    let Li   : vec3<f32> = PathContribution(path);
    let pdf  : f32       = PathPDF(path);

    if (pdf <= 0.0) {
        return 0.0;
    }

    let w : f32 = Luminance(Li) / pdf;
    return max(w, 0.0);
}

//==========================================================================
// Reservoir helpers
//==========================================================================

fn IsValidReservoir(res : Reservoir) -> bool 
{ 
    if (res.C == 0u) { return false; } 
    
    let len : u32 = res.Sample.length; 
    if (len < MIN_PATH_LENGTH || len > MAX_PATH_LENGTH) { return false; } 

    return true; 
}

//==========================================================================
// Hybrid Shift on CompactPath
//   - base (prevCP) 의 suffix 와 메타데이터를 유지
//   - prefix (0..k-1) 의 rSeed 는 current (curCP) 의 값을 사용
//   - k, RcVertex, Lobe_k_1, Lobe_k, length, J 는 base 기준으로 유지
//==========================================================================

fn HybridShiftCompactPath(curCP : CompactPath, prevCP : CompactPath) -> CompactPath
{
    // base path 를 기본으로 두고
    var outCP : CompactPath = prevCP;

    // prefix 부분만 offset path (curCP) 의 seed 를 사용
    var k : u32 = prevCP.k;
    k = min(k, 4u);    // rSeed 배열 길이: 4

    for (var i = 0u; i < k; i++) {
        outCP.rSeed[i] = curCP.rSeed[i];
    }

    // reconnection 관련 정보는 base 쪽 그대로 사용
    outCP.k        = prevCP.k;
    outCP.Lobe_k_1 = prevCP.Lobe_k_1;
    outCP.Lobe_k   = prevCP.Lobe_k;
    outCP.length   = prevCP.length;
    outCP.RcVertex = prevCP.RcVertex;
    outCP.J        = prevCP.J;   // base 에서 계산한 Jacobian 조각 (현재는 보존만)

    return outCP;
}

//==========================================================================
// Reprojection: current pixel → previous frame pixel
//==========================================================================

fn GetPrevScreenPx(curPixel : vec2<u32>) -> vec2<i32>
{
    let gbuf : vec4<f32> = textureLoad(G_Buffer, vec2<i32>(curPixel), 0);

    let cs : CompactSurface = GetCompactSurface(gbuf);
    if (!cs.IsValidSurface) {
        return vec2<i32>(-1, -1);
    }

    let surf : Surface = GetSurface(cs);
    let hitPos : vec3<f32> = surf.Position;

    let prevClip   : vec4<f32> = UniformBuffer.PrevViewProjectionMatrix * vec4<f32>(hitPos, 1.0);

    if (prevClip.w <= 0.0) {
        return vec2<i32>(-1, -1);
    }

    let prevNdc : vec3<f32> = prevClip.xyz / prevClip.w;

    if (any(prevNdc.xy < vec2<f32>(-1.0, -1.0)) ||
        any(prevNdc.xy > vec2<f32>( 1.0,  1.0))) {
        return vec2<i32>(-1, -1);
    }

    let prevScreen01 : vec2<f32> = prevNdc.xy * 0.5 + vec2<f32>(0.5, 0.5);
    let prevScreenPx : vec2<f32> = prevScreen01 * vec2<f32>(UniformBuffer.Resolution);

    var pi : vec2<i32> = vec2<i32>(prevScreenPx);
    let resi : vec2<i32> = vec2<i32>(UniformBuffer.Resolution);

    pi = clamp(pi, vec2<i32>(0, 0), resi - vec2<i32>(1, 1));

    return pi;
}

//==========================================================================
// Temporal Reservoir Update (Hybrid Shift + ReSTIR)
//==========================================================================

fn UpdateReservoirTemporalHybrid(
    curPixel : vec2<u32>,
    prevRes  : Reservoir
) {
    let curIdx : u32 =
        curPixel.y * UniformBuffer.Resolution.x +
        curPixel.x;

    var curRes : Reservoir = ReservoirBuffer[curIdx];

    // 1. 유효성 체크
    if (!IsValidReservoir(prevRes)) {
        return;
    }
    if (!IsValidReservoir(curRes)) {
        // 현재가 비어있으면 그냥 이전 거 채택
        ReservoirBuffer[curIdx] = prevRes;
        return;
    }

    let curCP  : CompactPath = curRes.Sample;
    let prevCP : CompactPath = prevRes.Sample;

    // 2. base(prevCP) → current(curCP) 도메인으로 하이브리드 시프트
    let prevShiftedCP : CompactPath = HybridShiftCompactPath(curCP, prevCP);

    // 3. 두 후보에 대해 각각 L/p 재평가
    let w_cur  : f32 = PathWeight(curPixel, curCP);
    let w_prev : f32 = PathWeight(curPixel, prevShiftedCP);

    if (w_cur <= 0.0 && w_prev <= 0.0) {
        ReservoirBuffer[curIdx] = curRes;
        return;
    }

    let C_cur  : u32 = curRes.C;
    let C_prev : u32 = prevRes.C;
    let C_new  : u32 = C_cur + C_prev;

    let w_cur_eff  : f32 = w_cur  * f32(C_cur);
    let w_prev_eff : f32 = w_prev * f32(C_prev);
    let w_sum      : f32 = w_cur_eff + w_prev_eff;

    var outRes : Reservoir = curRes;

    // 4. 2-candidate ReSTIR reservoir 업데이트
    var seed : u32 = GetHashValue(
        curPixel.x * 1973u +
        curPixel.y * 9277u +
        UniformBuffer.FrameIndex * 26699u + 1u
    );
    let r : f32 = Random(&seed);

    let p_select_prev : f32 = w_prev_eff / max(w_sum, 1e-8);

    if (r < p_select_prev) {
        outRes.Sample = prevShiftedCP;
        outRes.UCW    = w_prev;
    } else {
        outRes.Sample = curCP;
        outRes.UCW    = w_cur;
    }

    outRes.C = C_new;

    ReservoirBuffer[curIdx] = outRes;
}

//==========================================================================
// Shader Main
//==========================================================================

@compute @workgroup_size(8,8,1)
fn cs_main(@builtin(global_invocation_id) ThreadID: vec3<u32>)
{
    let curPixel : vec2<u32> = ThreadID.xy;

    if (curPixel.x >= UniformBuffer.Resolution.x ||
        curPixel.y >= UniformBuffer.Resolution.y) {
        return;
    }

    // 1. 현재 픽셀 → 이전 프레임 reprojection
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

    // 3. 하이브리드 시프트 기반 temporal 업데이트
    UpdateReservoirTemporalHybrid(curPixel, prevRes);
}
