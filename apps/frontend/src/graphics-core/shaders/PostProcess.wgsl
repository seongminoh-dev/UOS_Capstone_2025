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

@group(0) @binding(0) var<uniform>          UniformBuffer   : Uniform;
@group(0) @binding(1) var<storage, read>    SceneBuffer     : array<u32>;
@group(0) @binding(2) var<storage, read>    GeometryBuffer  : array<u32>;

@group(0) @binding(10) var RadianceTexture      : texture_2d<f32>;
@group(0) @binding(11) var HistoryTexture       : texture_2d<f32>;
@group(0) @binding(12) var MotionVectorTexture  : texture_2d<f32>;
@group(0) @binding(13) var G_Buffer             : texture_2d<f32>;

@group(0) @binding(20) var LinearSampler        : sampler;

@group(1) @binding(10) var ResultTexture        : texture_storage_2d<rgba16float, write>;


//==========================================================================
// Parsers
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

fn GetCompactSurface(CompactSurfaceRawData : vec4<f32>) -> CompactSurface
{
    var OutCompactSurface           : CompactSurface    = CompactSurface();
    let Valid_InstanceID_MaterialID : u32               = bitcast<u32>(CompactSurfaceRawData.r);

    OutCompactSurface.IsValidSurface    = bool( Valid_InstanceID_MaterialID & 0x80000000u );
    OutCompactSurface.InstanceID        = ( Valid_InstanceID_MaterialID & 0x7fff0000u ) >> 16u;
    OutCompactSurface.MaterialID        = ( Valid_InstanceID_MaterialID & 0x0000ffffu );
    OutCompactSurface.PrimitiveID       = bitcast<u32>(CompactSurfaceRawData.g);
    OutCompactSurface.Barycentric       = vec2<f32>( CompactSurfaceRawData.b, CompactSurfaceRawData.a );

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

    // let UV0 : vec2<f32> = SurfaceTriangle.Vertex_0.UV * U;
    // let UV1 : vec2<f32> = SurfaceTriangle.Vertex_1.UV * V;
    // let UV2 : vec2<f32> = SurfaceTriangle.Vertex_2.UV * W;
    // let UV  : vec2<f32> = UV0 + UV1 + UV2;

    // let SurfaceMaterial : Material = GetMaterial( InCompactSurface.MaterialID );
    // {
    //     OutSurface.Albedo       = GetAlbedo( SurfaceMaterial, UV ).rgb;
    //     OutSurface.Emission     = GetEmission( SurfaceMaterial, UV );

    //     OutSurface.Metalness    = GetMetalness( SurfaceMaterial, UV );
    //     OutSurface.Roughness    = GetRoughness( SurfaceMaterial, UV );
    //     OutSurface.Transmission = SurfaceMaterial.Transmission;
    //     OutSurface.IOR          = SurfaceMaterial.IOR;
    // }

    return OutSurface;
}


//==========================================================================
// Maths
//==========================================================================

fn TransformVec3WithMat4x4(InVector3 : vec3<f32>, TransformMatrix : mat4x4<f32>) -> vec3<f32>
{
    let TransformedVector : vec4<f32> = TransformMatrix * vec4<f32>(InVector3, 1.0);
    return TransformedVector.xyz / TransformedVector.w;
}

//==========================================================================
// Function
//==========================================================================

fn Encode(color : vec3<f32>) -> vec3<f32> { return color / (1.0 + max(color.r, max(color.g, color.b))); }
fn Decode(color : vec3<f32>) -> vec3<f32> { return color / (1.0 - max(color.r, max(color.g, color.b))); }

fn GetLinearDepthSquared(PixelID : vec2<u32>) -> f32
{
    let bPixelInBoundary_X : bool = (PixelID.x < UniformBuffer.Resolution_Source.x);
    let bPixelInBoundary_Y : bool = (PixelID.y < UniformBuffer.Resolution_Source.y);

    if (!bPixelInBoundary_X || !bPixelInBoundary_Y) { return 1e11; }

    let GBufferData     : vec4<f32> = textureLoad(G_Buffer, PixelID, 0);
    let PixelSurface    : Surface   = GetSurface( GetCompactSurface( GBufferData ) );
    let PositionDelta   : vec3<f32> = PixelSurface.Position - UniformBuffer.CameraWorldPosition;

    return dot( PositionDelta, PositionDelta );
}

fn GetClosestPixelID(PixelID_Center : vec2<u32>) -> vec2<u32>
{
    var PixelID_Closest     : vec2<u32> = PixelID_Center;
    var LinearDepth_Closest : f32       = 1e10;

    for (var dy : i32 = -1; dy <= 1; dy++)
    {
        for (var dx : i32 = -1; dx <= 1; dx++)
        {
            let PixelID     : vec2<u32> = vec2<u32>( vec2<i32>( PixelID_Center ) + vec2<i32>(dx, dy) );
            let LinearDepth : f32 = GetLinearDepthSquared( PixelID );

            if ( LinearDepth > LinearDepth_Closest ) { continue; }

            LinearDepth_Closest = LinearDepth;
            PixelID_Closest     = PixelID;
        }
    }

    return PixelID_Closest;
}

fn GetPrevUV(UV : vec2<f32>) -> vec2<f32>
{
    let PixelID_Center  : vec2<u32> = vec2<u32>( UV * vec2<f32>( UniformBuffer.Resolution_Source ) );
    let PixelID_Closest : vec2<u32> = GetClosestPixelID( PixelID_Center );

    let MotionVectorRaw : vec2<f32> = textureLoad(MotionVectorTexture, PixelID_Closest, 0).xy;
    let MotionVectorUV  : vec2<f32> = (MotionVectorRaw ) / vec2<f32>(UniformBuffer.Resolution_Source);

    return UV - MotionVectorUV;
}

// 동작 X, 미사용
fn ClampHistoryColor(PixelUV_Center : vec2<f32>, HistoryColor : vec3<f32>) -> vec3<f32>
{
    let TexelSize : vec2<f32> = 1.0 / vec2<f32>( UniformBuffer.Resolution_Source );

    var ColorSum            : vec3<f32> = vec3f(0.0);
    var ColorSum_Squared    : vec3<f32> = vec3f(0.0);

    for (var dy : i32 = -1; dy <= 1; dy++)
    {
        for (var dx : i32 = -1; dx <= 1; dx++)
        {
            let PixelUV         : vec2<f32> = PixelUV_Center + vec2<f32>( f32( dx ), f32( dy ) ) * TexelSize;
            let ColorSampled    : vec3<f32> = Encode( textureSampleLevel(RadianceTexture, LinearSampler, PixelUV, 0.0).rgb );

            ColorSum            += ColorSampled;
            ColorSum_Squared    += ColorSampled * ColorSampled;
        }
    }

    let Mean        : vec3<f32> = ColorSum / 9.0;
    let Variance    : vec3<f32> = ColorSum_Squared / 9.0 - ( Mean * Mean );
    let StdDev      : vec3<f32> = sqrt( max( Variance, vec3f(0.0) ) );

    let GammaBase   : f32 = 1.0;
    let GammaFactor : f32 = 1.25;// + ( 0.5 * f32( UniformBuffer.FrameCount ) );
    let Gamma       : f32 = GammaBase * GammaFactor;
    
    let MinColor    : vec3<f32> = Mean - (StdDev * Gamma + vec3f(1e-2));
    let MaxColor    : vec3<f32> = Mean + (StdDev * Gamma + vec3f(1e-2));

    return clamp(HistoryColor, max( MinColor, vec3f(0.0) ), MaxColor);
}

fn SampleTextureCatmullRom(tex: texture_2d<f32>, uv: vec2<f32>, texSize: vec2<f32>) -> vec3<f32> {
    // We're sampling unjittered UV in source resolution
    let samplePos = uv * texSize;
    let texPos1 = floor(samplePos - 0.5) + 0.5;
    let f = samplePos - texPos1;

    let w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
    let w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
    let w2 = f * (0.5 + f * (2.0 - 1.5 * f));
    let w3 = f * f * (-0.5 + 0.5 * f);

    let w12 = w1 + w2;
    let offset12 = w2 / (w1 + w2);

    let texPos0 = texPos1 - 1.0;
    let texPos3 = texPos1 + 2.0;
    let texPos12 = texPos1 + offset12;

    let result = 
        textureSampleLevel(tex, LinearSampler, vec2<f32>(texPos12.x, texPos0.y) / texSize, 0.0).rgb * w12.x * w0.y +
        textureSampleLevel(tex, LinearSampler, vec2<f32>(texPos0.x, texPos12.y) / texSize, 0.0).rgb * w0.x * w12.y +
        textureSampleLevel(tex, LinearSampler, vec2<f32>(texPos12.x, texPos12.y) / texSize, 0.0).rgb * w12.x * w12.y +
        textureSampleLevel(tex, LinearSampler, vec2<f32>(texPos3.x, texPos12.y) / texSize, 0.0).rgb * w3.x * w12.y +
        textureSampleLevel(tex, LinearSampler, vec2<f32>(texPos12.x, texPos3.y) / texSize, 0.0).rgb * w12.x * w3.y;

    return result * (1.0 / ((w0.x + w12.x + w3.x) * (w0.y + w12.y + w3.y)));
}

fn IsNan_f32(A : f32) -> bool
{
    return (A != A);
}

fn IsNan_vec3(A : vec3<f32>) -> bool
{
    return IsNan_f32(A.r) || IsNan_f32(A.g) || IsNan_f32(A.b);
}

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

    // TEST : Just Use CurrentColor, No Jittering
    if (false)
    {
        let UV : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution_Target);
        let CurrentColor : vec3<f32> = Encode( SampleTextureCatmullRom(RadianceTexture, UV, vec2<f32>(UniformBuffer.Resolution_Target)).rgb );
        var WriteColor = Decode( CurrentColor );
        textureStore(ResultTexture, ThreadID.xy, vec4<f32>(select(WriteColor, CurrentColor, IsNan_vec3(WriteColor)), 1.0));
        return;
    }

    let UV              : vec2<f32> = (vec2<f32>(ThreadID.xy) + 0.5) / vec2<f32>(UniformBuffer.Resolution_Target);
    let UV_Unjitter     : vec2<f32> = UV - UniformBuffer.Jitter;
    let UV_Prev         : vec2<f32> = GetPrevUV(UV);

    let bHistoryValid   : bool  = ( (0.0 < UV_Prev.x && UV_Prev.x < 1.0) && (0.0 < UV_Prev.y && UV_Prev.y < 1.0) );
    let N               : f32   = f32( min( UniformBuffer.FrameCount, 512u ) );
    let Alpha           : f32   = select(0.0, N / (N+1), bHistoryValid);
    
    let CurrentColor    : vec3<f32> = Encode( SampleTextureCatmullRom(RadianceTexture, UV_Unjitter, vec2<f32>(UniformBuffer.Resolution_Target)).rgb );
    let HistoryColor    : vec3<f32> = Encode( textureSampleLevel(HistoryTexture, LinearSampler, UV_Prev, 0.0).rgb );
    var WriteColor      : vec3<f32> = Decode( mix(CurrentColor, HistoryColor, Alpha) );
    //WriteColor = Decode( CurrentColor );
    
    textureStore(ResultTexture, ThreadID.xy, vec4<f32>(select(WriteColor, CurrentColor, IsNan_vec3(WriteColor)), 1.0));

    return;
}