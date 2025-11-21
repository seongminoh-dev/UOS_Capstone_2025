import * as THREE from 'three';

import type { Quat, Vec4, Vec3, Mat4 }  from 'wgpu-matrix';
import      { quat, vec4, vec3, mat4 }  from 'wgpu-matrix';

import      { GLTFLoader }                      from 'three/examples/jsm/loaders/GLTFLoader.js';
import      { mergeGeometries }                 from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import      { computeBoundsTree, MeshBVH, SAH } from 'three-mesh-bvh';

import      { Light, DirectionalLight, PointLight, RectLight } from './Structs.ts';

/**
 * Converts Euler angles in degrees to a quaternion
 * Uses ZYX rotation order (Yaw-Pitch-Roll)
 * @param eulerDegrees - Euler angles in degrees [x, y, z]
 * @returns Quaternion [x, y, z, w]
 */
function eulerDegreesToQuat(eulerDegrees: [number, number, number]): Quat
{
    const DEG_TO_RAD = Math.PI / 180.0;

    // Convert degrees to radians
    const x = eulerDegrees[0] * DEG_TO_RAD;
    const y = eulerDegrees[1] * DEG_TO_RAD;
    const z = eulerDegrees[2] * DEG_TO_RAD;

    // Create quaternions for each axis rotation
    const qx = quat.fromAxisAngle(vec3.fromValues(1, 0, 0), x);
    const qy = quat.fromAxisAngle(vec3.fromValues(0, 1, 0), y);
    const qz = quat.fromAxisAngle(vec3.fromValues(0, 0, 1), z);

    // Combine rotations: Z * Y * X (applied in reverse order)
    let result = quat.multiply(qy, qx);
    result = quat.multiply(qz, result);

    return result;
}

function MergeArrays(InArrays : Uint32Array[]) : [Uint32Array, Uint32Array]
{
    if (InArrays.length === 0) return [new Uint32Array(), new Uint32Array()];

    const Offset : Uint32Array = new Uint32Array(InArrays.length); Offset[0] = 0;
    for (let iter = 0; iter < InArrays.length - 1; iter++)
    {
        Offset[iter+1] = Offset[iter] + InArrays[iter].length;
    }

    const ArrayLength = Offset[InArrays.length - 1] + InArrays[InArrays.length - 1].length;
    const MergedArray : Uint32Array = new Uint32Array(ArrayLength);
    for (let iter = 0; iter < InArrays.length; iter++)
    {
        MergedArray.set(InArrays[iter], Offset[iter]);
    }

    return [MergedArray, Offset];
}


const STRIDE =
{
    Instance        : 33,
    Material        : 15,
    MeshDescriptor  : 6,
} as const;

const EDataOffsetIndex =
{
    MeshDescriptor      : 0,
    MaterialID          : 1,
    Material            : 2,
    Light               : 3,
    LightsCDF           : 4,
    Index               : 5,
    SubBlasRootArray    : 6,
    Blas                : 7,
    SIZE                : 8
} as const;

interface Instance
{
    ModelMatrix         : Mat4;
    ModelMatrix_Inverse : Mat4;
    MeshID              : number;
}

interface Mesh
{
    BlasTree            : ArrayBuffer[];
    VertexPositions     : Float32Array;
    VertexNormals       : Float32Array;
    VertexUVs           : Float32Array;
    IndexArray          : Uint32Array;
    MaterialIDs         : Int32Array;

    VertexCount         : number;
    IndexCount          : number;
    SubMeshCount        : number;
}

interface SerializedMesh
{
    BlasArray           : Uint32Array;
    SubBlasRootArray    : Uint32Array;
    VertexArray         : Uint32Array;
    IndexArray          : Uint32Array;
    MaterialIDArray     : Uint32Array;
}

interface MeshDescriptor
{
    Offset_Vertex       : number,
    Offset_Index        : number,
    Offset_MaterialID   : number,
    Offset_SubBlasRoot  : number,
    Offset_Blas         : number,
    Count_SubMesh       : number,
}

interface Material
{
    Albedo              : Vec4;
    EmissiveColor       : Vec3;
    EmissiveIntensity   : number;

    Metalness           : number;
    Roughness           : number;
    Transmission        : number;
    IOR                 : number;

    TextureID_Albedo    : number;
    TextureID_ORM       : number;
    TextureID_Emissive  : number;
}

function SerializeInstance(InInstance : Instance) : Uint32Array
{
    const InstanceRawData   : ArrayBuffer   = new ArrayBuffer(4 * STRIDE.Instance);

    const Uint32View        : Uint32Array   = new Uint32Array(InstanceRawData);
    const Float32View       : Float32Array  = new Float32Array(InstanceRawData);
    {
        Float32View.set(InInstance.ModelMatrix, 0);
        Float32View.set(InInstance.ModelMatrix_Inverse, 16);

        Uint32View[32] = InInstance.MeshID;
    }

    return Uint32View;
}

function SerializeMesh(InMesh : Mesh) : SerializedMesh
{

    // Serialize Blas Array
    let SerializedBlasArray         : Uint32Array;
    let SerializedSubBlasRootArray  : Uint32Array;
    {
        const SubBlasArrays : Uint32Array[] = [];
        for (const BlasData of InMesh.BlasTree) { SubBlasArrays.push(new Uint32Array(BlasData)); }

        [SerializedBlasArray, SerializedSubBlasRootArray] = MergeArrays(SubBlasArrays);
    }

    // Serialize Vertex Array
    let SerializedVertexArray : Uint32Array;
    {
        const STRIDE_VERTEX = 8;
        const BYTELENGTH_VERTEX = 4 * STRIDE_VERTEX;

        const VertexArray : ArrayBuffer = new ArrayBuffer(BYTELENGTH_VERTEX * InMesh.VertexCount);
        const Float32View : Float32Array = new Float32Array(VertexArray);

        for (let VertexID : number = 0; VertexID < InMesh.VertexCount; VertexID++)
        {
            const Offset = STRIDE_VERTEX * VertexID;

            Float32View[Offset + 0] = InMesh.VertexPositions[3 * VertexID + 0];
            Float32View[Offset + 1] = InMesh.VertexPositions[3 * VertexID + 1];
            Float32View[Offset + 2] = InMesh.VertexPositions[3 * VertexID + 2];

            Float32View[Offset + 3] = InMesh.VertexNormals[3 * VertexID + 0];
            Float32View[Offset + 4] = InMesh.VertexNormals[3 * VertexID + 1];
            Float32View[Offset + 5] = InMesh.VertexNormals[3 * VertexID + 2];

            if (InMesh.VertexUVs.length)
            {
                Float32View[Offset + 6] = InMesh.VertexUVs[2 * VertexID + 0];
                Float32View[Offset + 7] = InMesh.VertexUVs[2 * VertexID + 1];
            }
        }

        SerializedVertexArray = new Uint32Array(VertexArray);
    }

    // Serialize Index Array
    let SerializedIndexArray : Uint32Array;
    {
        SerializedIndexArray = new Uint32Array(InMesh.IndexArray);
    }

    // Serialize Material ID Array
    let MaterialIDArray : Uint32Array;
    {
        MaterialIDArray = new Uint32Array( InMesh.MaterialIDs );
    }



    const MeshSerialized : SerializedMesh =
    {
        BlasArray           : SerializedBlasArray,
        SubBlasRootArray    : SerializedSubBlasRootArray,
        VertexArray         : SerializedVertexArray,
        IndexArray          : SerializedIndexArray,
        MaterialIDArray     : MaterialIDArray,
    }

    return MeshSerialized;
}

function SerializeMeshDescriptor(InMeshDescriptor : MeshDescriptor) : Uint32Array
{
        const MeshDescriptorRawData : ArrayBuffer = new ArrayBuffer(4 * STRIDE.MeshDescriptor);

        const Uint32View : Uint32Array = new Uint32Array(MeshDescriptorRawData);
        {
            Uint32View[0] = InMeshDescriptor.Offset_Vertex;
            Uint32View[1] = InMeshDescriptor.Offset_Index;
            Uint32View[2] = InMeshDescriptor.Offset_MaterialID;
            Uint32View[3] = InMeshDescriptor.Offset_SubBlasRoot;
            Uint32View[4] = InMeshDescriptor.Offset_Blas;
            Uint32View[5] = InMeshDescriptor.Count_SubMesh;
        }

        return Uint32View;
}

function SerializeMaterial(InMaterial : Material) : Uint32Array
{
    const MaterialRawData : ArrayBuffer = new ArrayBuffer( 4 * STRIDE.Material );

    const Float32View   : Float32Array  = new Float32Array( MaterialRawData );
    const Int32View     : Int32Array    = new Int32Array( MaterialRawData );
    {
        Float32View.set(InMaterial.Albedo, 0);
        Float32View.set(InMaterial.EmissiveColor, 4);
        Float32View[ 7] = InMaterial.EmissiveIntensity;
        Float32View[ 8] = InMaterial.Metalness;
        Float32View[ 9] = InMaterial.Roughness;
        Float32View[10] = InMaterial.Transmission;
        Float32View[11] = InMaterial.IOR;

        Int32View[12] = InMaterial.TextureID_Albedo;
        Int32View[13] = InMaterial.TextureID_ORM;
        Int32View[14] = InMaterial.TextureID_Emissive;
    }

    return new Uint32Array( MaterialRawData );
}




class ResourcePool<T>
{
    private ResourceMap : Map<string, number>;
    private Pool        : T[];

    constructor()
    {
        this.ResourceMap    = new Map<string, number>();
        this.Pool           = [];
    }

    public Register(key : string, Resource : T) : void
    {
        if ( this.ResourceMap.has(key) ) return;

        this.ResourceMap.set(key, this.Pool.length);
        this.Pool.push(Resource);

        return;
    }

    public GetID(key : string) : number
    {
        return this.ResourceMap.has(key) ? this.ResourceMap.get(key)! : -1;
    }

    public Clear() : void
    {
        this.ResourceMap.clear();
        this.Pool = [];

        return;
    }

    public GetResourceArray() : T[]
    {
        return this.Pool;
    }
}



export class World 
{
    public InstancePool : ResourcePool<Instance>;
    public MeshPool     : ResourcePool<Mesh>;
    public MaterialPool : ResourcePool<Material>;
    public TexturePool  : ResourcePool<ImageBitmap>;

    public Lights       : Array<Light>;
    
    constructor()
    {
        this.InstancePool   = new ResourcePool<Instance>();
        this.MeshPool       = new ResourcePool<Mesh>();
        this.MaterialPool   = new ResourcePool<Material>();
        this.TexturePool    = new ResourcePool<ImageBitmap>();

        this.Lights         = [];
    }

    // 반드시 Mesh 들을 먼저 만들어놓고 호출할 것 
    public AddInstance
    (
        InstanceName    : string, 
        MeshName        : string,
        Translation     : Vec3 = vec3.fromValues(0,0,0),
        Rotation        : Quat = quat.identity(),
        Scale           : Vec3 = vec3.fromValues(1,1,1)
    )                   : void
    {
        let ModelMatrix         : Mat4;
        let ModelMatrix_Inverse : Mat4;
        let MeshID              : number;

        {
            const TranslationMatrix : Mat4 = mat4.translation(Translation);
            const RotationMatrix    : Mat4 = mat4.fromQuat(Rotation);
            const ScaleMatrix       : Mat4 = mat4.scaling(Scale);

            ModelMatrix = mat4.identity();
            ModelMatrix = mat4.mul(ModelMatrix, TranslationMatrix);
            ModelMatrix = mat4.mul(ModelMatrix, RotationMatrix);
            ModelMatrix = mat4.mul(ModelMatrix, ScaleMatrix);

            ModelMatrix_Inverse = mat4.invert(ModelMatrix);
            MeshID              = this.MeshPool.GetID( MeshName );
        }

        const InstanceToRegister : Instance =
        {
            ModelMatrix         : ModelMatrix,
            ModelMatrix_Inverse : ModelMatrix_Inverse,
            MeshID              : MeshID,
        }

        this.InstancePool.Register( InstanceName, InstanceToRegister );

        return;
    }

    public AddDirectionalLight
    (
        Direction   : Vec3,
        Color       : Vec3,
        Intensity   : number,
    )
    {
        const DirectionalLightToAdd : DirectionalLight = new DirectionalLight(Direction, Color, Intensity);
        this.Lights.push(DirectionalLightToAdd);

        return;
    }

    public AddPointLight
    (
        Position    : Vec3,
        Color       : Vec3,
        Intensity   : number,
    )
    {
        const PointLightToAdd : PointLight = new PointLight(Position, Color, Intensity);
        this.Lights.push(PointLightToAdd);

        return;
    }

    public AddRectLight
    (
        Position    : Vec3,
        U           : Vec3,
        V           : Vec3,
        Color       : Vec3,
        Intensity   : number
    )
    {
        const RectLightToAdd : RectLight = new RectLight(Position, Color, U, V, Intensity);
        this.Lights.push(RectLightToAdd);

        return;
    }




    public async LoadRawMesh(Name : string) : Promise<THREE.Mesh>
    {
        const LoadPath = "/assets/" + Name + ".glb";

        const ModelLoader   : GLTFLoader                = new GLTFLoader();
        const Model                                     = await ModelLoader.loadAsync(LoadPath);      
        const Meshes        : THREE.Mesh[]              = [];
        const Geometries    : THREE.BufferGeometry[]    = [];
        const Materials     : THREE.Material[]          = [];

        function traverseGLTF(object : THREE.Object3D) : void
        {
            if ((object as THREE.Mesh).isMesh) Meshes.push(object as THREE.Mesh);
            if (!object.children || !(object.children.length > 0)) return;
            for (const child of object.children) traverseGLTF(child);
            return;
        }

        traverseGLTF(Model.scene);

        for (let iter = 0; iter < Meshes.length; iter++)
        {
            const Mesh = Meshes[iter];

            Mesh.geometry.applyMatrix4(Mesh.matrixWorld);
            Geometries.push(Mesh.geometry);

            if (Array.isArray(Mesh.material)) { Materials.push(...Mesh.material); }
            else { Materials.push(Mesh.material); }
        }

        const MergedMesh : THREE.Mesh = new THREE.Mesh(mergeGeometries(Geometries, true), Materials);

        return MergedMesh;
    }

    public CreateMesh(MeshName : string, RawMesh : THREE.Mesh) : number
    {
        let BlasTree        : ArrayBuffer[];
        let VertexPositions : Float32Array;
        let VertexNormals   : Float32Array;
        let VertexUVs       : Float32Array;
        let IndexArray      : Uint32Array;
        let MaterialIDs     : Int32Array;

        let VertexCount     : number;
        let IndexCount      : number;
        let SubMeshCount    : number;

        // Fill Mesh Property
        {
            // Build Blas Tree
            {
                THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
                const BVH : MeshBVH = RawMesh.geometry.computeBoundsTree({strategy: SAH, maxLeafTris: 10})!;

                BlasTree = [];
                for (const BlasData of (BVH as any)._roots) BlasTree.push(BlasData);
            }

            // Vertex Data
            {
                VertexCount        = RawMesh.geometry.attributes["position"].count;
                VertexPositions    = new Float32Array(RawMesh.geometry.attributes["position"].array);
                VertexNormals      = new Float32Array(RawMesh.geometry.attributes["normal"].array);
                VertexUVs          = RawMesh.geometry.attributes["uv"] ? new Float32Array(RawMesh.geometry.attributes["uv"].array) : new Float32Array();
            }

            // Index Data
            {
                IndexArray = new Uint32Array(RawMesh.geometry.index?.array!);
                IndexCount = IndexArray.length;
            }

        }

        // CreateMaterial (returns Global Material ID)
        {
            const MeshStandardMaterials : THREE.MeshStandardMaterial[] = RawMesh.material as THREE.MeshStandardMaterial[];

            SubMeshCount    = MeshStandardMaterials.length;
            MaterialIDs     = new Int32Array(MeshStandardMaterials.length);

            for (let iter = 0; iter < MeshStandardMaterials.length; iter++)
            {
                MaterialIDs[iter] = this.CreateMaterial( MeshStandardMaterials[iter] );
            }
        }

        // Register To ResourcePool<Mesh>
        {
            const MeshToRegister : Mesh =
            {
                BlasTree        : BlasTree,
                VertexPositions : VertexPositions,
                VertexNormals   : VertexNormals,
                VertexUVs       : VertexUVs,
                IndexArray      : IndexArray,
                MaterialIDs     : MaterialIDs,

                VertexCount     : VertexCount,
                IndexCount      : IndexCount,
                SubMeshCount    : SubMeshCount,
            };
            
            this.MeshPool.Register( MeshName, MeshToRegister );
        }

        // Return Global Mesh ID
        return this.MeshPool.GetID( MeshName );
    }

    public CreateMaterial(RawMaterial : THREE.MeshStandardMaterial) : number
    {
        let Albedo              : Vec4;
        let EmissiveColor       : Vec3;
        let EmissiveIntensity   : number;

        let Metalness           : number;
        let Roughness           : number;
        let Transmission        : number;
        let IOR                 : number;

        let TextureID_Albedo    : number;
        let TextureID_ORM       : number;
        let TextureID_Emissive  : number;


        // Fill Material Property
        {
            Albedo             = vec4.create(RawMaterial.color.r, RawMaterial.color.g, RawMaterial.color.b, 1.0);
            EmissiveColor      = vec3.create(RawMaterial.emissive.r, RawMaterial.emissive.g, RawMaterial.emissive.b);
            EmissiveIntensity  = RawMaterial.emissiveIntensity;

            Metalness          = RawMaterial.metalness;
            Roughness          = RawMaterial.roughness;
            Transmission       = RawMaterial.transparent ? 1.0 : 0.0;
            IOR                = 1.5;
        }

        // Create Textures (returns Global Texture ID)
        {
            const UUID_Albedo   : string = RawMaterial.map?.uuid!;
            const UUID_ORM      : string = (RawMaterial.aoMap || RawMaterial.metalnessMap || RawMaterial.roughnessMap)?.uuid!;
            const UUID_Emissive : string = RawMaterial.emissiveMap?.uuid!;

            const ImageBitmap_Albedo    : ImageBitmap = RawMaterial.map?.image as ImageBitmap;
            const ImageBitmap_ORM       : ImageBitmap = (RawMaterial.aoMap || RawMaterial.metalnessMap || RawMaterial.roughnessMap)?.image as ImageBitmap
            const ImageBitmap_Emissive  : ImageBitmap = RawMaterial.emissiveMap?.image as ImageBitmap;

            TextureID_Albedo    = this.CreateTexture( UUID_Albedo, ImageBitmap_Albedo );
            TextureID_ORM       = this.CreateTexture( UUID_ORM, ImageBitmap_ORM );
            TextureID_Emissive  = this.CreateTexture( UUID_Emissive, ImageBitmap_Emissive );
        }

        // Register To ResourcePool<Material>
        {
            const MaterialToRegister : Material =
            {
                Albedo              : Albedo,
                EmissiveColor       : EmissiveColor,
                EmissiveIntensity   : EmissiveIntensity,

                Metalness           : Metalness,
                Roughness           : Roughness,
                Transmission        : Transmission,
                IOR                 : IOR,

                TextureID_Albedo    : TextureID_Albedo,
                TextureID_ORM       : TextureID_ORM,
                TextureID_Emissive  : TextureID_Emissive,
            };

            this.MaterialPool.Register( RawMaterial.uuid, MaterialToRegister );
        }

        // Return Global Material ID
        return this.MaterialPool.GetID( RawMaterial.uuid );
    }

    public CreateTexture(UUID : string, RawTexture : ImageBitmap) : number
    {
        if ( !UUID || !RawTexture ) { return -1; }

        this.TexturePool.Register( UUID, RawTexture );

        return this.TexturePool.GetID( UUID );
    }



    public Serialize() : [ArrayBuffer, ArrayBuffer, ArrayBuffer, ImageBitmap[], number[]]
    {



        // 0. ResourcePool 로부터 데이터 배열 추출하기
        const InstanceArray : Instance[]    = this.InstancePool.GetResourceArray();
        const MeshArray     : Mesh[]        = this.MeshPool.GetResourceArray();
        const MaterialArray : Material[]    = this.MaterialPool.GetResourceArray();
        const TextureArray  : ImageBitmap[] = this.TexturePool.GetResourceArray();

        const SerializedMeshArray : SerializedMesh[] = [];
        for (let iter = 0; iter < MeshArray.length; iter++)
        {
            SerializedMeshArray.push( SerializeMesh( MeshArray[iter] ) );
        }



        // 1. 모든 정보를 모으기
        let InstanceRawData : Uint32Array;
        {
            const SerializedInstanceArray   : Uint32Array[] = [];

            for ( let iter = 0; iter < InstanceArray.length; iter++ )
            {
                SerializedInstanceArray.push( SerializeInstance( InstanceArray[iter] ) );
            }

            InstanceRawData = MergeArrays( SerializedInstanceArray )[0];
        }

        let LightRawData : Uint32Array;
        {
            const SerializedLightArray : Uint32Array[] = [];
            for (const LightToSerialize of this.Lights)
            {
                const LightSerialized : Uint32Array = LightToSerialize.Serialize();
                SerializedLightArray.push(LightSerialized);
            }

            LightRawData = MergeArrays(SerializedLightArray)[0];
        }

        let LightsCDFRawData : Uint32Array;
        {
            const LightsCDFArrayBuffer : ArrayBuffer = this.GetLightCDFBuffer();
            LightsCDFRawData = new Uint32Array(LightsCDFArrayBuffer);
        }

        let VertexRawData       : Uint32Array;
        let VertexOffsetData    : Uint32Array;
        {
            const SerializedVertexArray : Uint32Array[] = [];
            for (let iter = 0; iter < SerializedMeshArray.length; iter++) { SerializedVertexArray.push( SerializedMeshArray[iter].VertexArray ); }

            [VertexRawData, VertexOffsetData] = MergeArrays(SerializedVertexArray);
        }

        let IndexRawData    : Uint32Array;
        let IndexOffsetData : Uint32Array;
        {
            const SerializedIndexArray : Uint32Array[] = [];
            for (let iter = 0; iter < SerializedMeshArray.length; iter++) { SerializedIndexArray.push( SerializedMeshArray[iter].IndexArray ); }

            [IndexRawData, IndexOffsetData] = MergeArrays(SerializedIndexArray);
        }

        let SubBlasRootRawData      : Uint32Array;
        let SubBlasRootOffsetData   : Uint32Array;
        {
            const SerializedSubBlasRootArray : Uint32Array[] = [];
            for (const SerializedMesh of SerializedMeshArray) { SerializedSubBlasRootArray.push( SerializedMesh.SubBlasRootArray ); }

            [SubBlasRootRawData, SubBlasRootOffsetData] = MergeArrays(SerializedSubBlasRootArray);
        }

        let BlasRawData     : Uint32Array;
        let BlasOffsetData  : Uint32Array;
        {
            const SerializedBlasArray : Uint32Array[] = [];
            for (const SerializedMesh of SerializedMeshArray) { SerializedBlasArray.push( SerializedMesh.BlasArray ); }

            [BlasRawData, BlasOffsetData] = MergeArrays(SerializedBlasArray);
        }

        let TlasRawData : Uint32Array; // TODO
        {
            TlasRawData = new Uint32Array();
        }



        let MaterialIDRawData       : Uint32Array;
        let MaterialIDOffsetData    : Uint32Array;
        {
            const MaterialIDsArray : Uint32Array[] = [];
            for (let iter = 0; iter < SerializedMeshArray.length; iter++) { MaterialIDsArray.push( SerializedMeshArray[iter].MaterialIDArray ); }

            [MaterialIDRawData, MaterialIDOffsetData] = MergeArrays(MaterialIDsArray);
        }

        let MaterialRawData : Uint32Array;
        {
            const SerializedMaterialArray : Uint32Array[] = [];
            for (let iter = 0; iter < MaterialArray.length; iter++) { SerializedMaterialArray.push( SerializeMaterial( MaterialArray[iter] ) ); }

            MaterialRawData = MergeArrays(SerializedMaterialArray)[0];
        }

        let MeshDescriptorRawData : Uint32Array;
        {
            const SerializedMeshDescriptorArray : Uint32Array[] = [];

            for (let iter = 0; iter < MeshArray.length; iter++)
            {
                const CurrentMeshDescriptor : MeshDescriptor =
                {
                    Offset_Vertex       : VertexOffsetData[iter],
                    Offset_Index        : IndexOffsetData[iter],
                    Offset_MaterialID   : MaterialIDOffsetData[iter],
                    Offset_SubBlasRoot  : SubBlasRootOffsetData[iter],
                    Offset_Blas         : BlasOffsetData[iter],
                    Count_SubMesh       : SerializedMeshArray[iter].SubBlasRootArray.length,
                };
                
                SerializedMeshDescriptorArray.push( SerializeMeshDescriptor( CurrentMeshDescriptor ) );
            }

            MeshDescriptorRawData = MergeArrays(SerializedMeshDescriptorArray)[0];
        }





        // 2. 정보들을 조합해 각 GPUBuffer 에 쓸 데이터끼리 묶기
        const Offsets : number[] = new Array(EDataOffsetIndex.SIZE);

        // Scene Buffer에 들어갈 데이터 채우기 | Instance + MeshDescriptor + MaterialID + Material + Light + LightsCDF
        const ArraysInSceneBuffer  = [InstanceRawData, MeshDescriptorRawData, MaterialIDRawData, MaterialRawData, LightRawData, LightsCDFRawData];
        const [SceneBufferData, SceneBufferOffsets] = MergeArrays(ArraysInSceneBuffer);
        {
            Offsets[EDataOffsetIndex.MeshDescriptor]    = SceneBufferOffsets[1];
            Offsets[EDataOffsetIndex.MaterialID]        = SceneBufferOffsets[2];    
            Offsets[EDataOffsetIndex.Material]          = SceneBufferOffsets[3];
            Offsets[EDataOffsetIndex.Light]             = SceneBufferOffsets[4];
            Offsets[EDataOffsetIndex.LightsCDF]         = SceneBufferOffsets[5];
        }

        // Geometry Buffer에 들어갈 데이터 채우기 | Vertex + Index + PrimitiveToMaterial
        const ArraysInGeometryBuffer = [VertexRawData, IndexRawData, SubBlasRootRawData];
        const [GeometryBufferData, GeometryBufferOffsets] = MergeArrays(ArraysInGeometryBuffer);
        {
            Offsets[EDataOffsetIndex.Index]            = GeometryBufferOffsets[1];
            Offsets[EDataOffsetIndex.SubBlasRootArray] = GeometryBufferOffsets[2];
        }

        // Accel Buffer에 들어갈 데이터 채우기 | Tlas + Blas
        const ArraysInAccelBuffer = [TlasRawData, BlasRawData];
        const [AccelBufferData, AccelBufferOffsets] = MergeArrays(ArraysInAccelBuffer);
        {
            Offsets[EDataOffsetIndex.Blas] = AccelBufferOffsets[1];
        }


        // 3. 묶은 ArrayBuffer 들을 Return
        const SceneBufferRawData : ArrayBuffer = new ArrayBuffer(4 * SceneBufferData.length);
        {
            const Uint32View : Uint32Array = new Uint32Array(SceneBufferRawData);
            Uint32View.set(SceneBufferData);
        }

        const GeometryBufferRawData : ArrayBuffer = new ArrayBuffer(4 * GeometryBufferData.length);
        {
            const Uint32View : Uint32Array = new Uint32Array(GeometryBufferRawData);
            Uint32View.set(GeometryBufferData);
        }

        const AccelBufferRawData : ArrayBuffer = new ArrayBuffer(4 * AccelBufferData.length);
        {
            const Uint32View : Uint32Array = new Uint32Array(AccelBufferRawData);
            Uint32View.set(AccelBufferData);
        }

        return [SceneBufferRawData, GeometryBufferRawData, AccelBufferRawData, TextureArray, Offsets];
    }

    /**
     * World의 모든 데이터를 초기화
     * Scene을 전환할 때 사용
     */
    public Clear(): void
    {
        this.InstancePool.Clear();
        this.MeshPool.Clear();
        this.MaterialPool.Clear();
        this.TexturePool.Clear();

        this.Lights = [];
    }

    /**
     * Scene 객체로부터 World를 구성
     * TODO: 차후 Backend API에서 받은 Scene 데이터를 이용하여 동적으로 Scene을 로드
     * @param scene - Scene 객체 (Backend CRUD 호환 구조)
     */
    public LoadFromScene(scene : any) : void
    {
        // 기존 데이터 초기화
        this.InstancePool.Clear();
        //this.Clear();

        // Scene의 모든 Asset을 순회하며 World에 추가
        for (const asset of scene.assets)
        {
            if (asset.type === 'object')
            {
                // Object Asset 처리
                if (!asset.meshName || !asset.transform)
                {
                    console.warn(`Object asset ${asset.id} is missing meshName or transform`);
                    continue;
                }

                const position  : Vec3 = vec3.fromValues(...asset.transform.position);
                const rotation  : Quat = eulerDegreesToQuat(asset.transform.rotation);
                const scale     : Vec3 = vec3.fromValues(...asset.transform.scale);

                this.AddInstance(asset.id, asset.meshName, position, rotation, scale);
            }
            else if (asset.type === 'directional-light')
            {
                // Directional Light 처리
                if (!asset.lightParams) continue;
                const params = asset.lightParams as any;

                const direction : Vec3 = vec3.normalize(vec3.fromValues(...params.direction));
                const color     : Vec3 = vec3.fromValues(...params.color);
                const intensity : number = params.intensity;

                this.AddDirectionalLight(direction, color, intensity);
            }
            else if (asset.type === 'point-light')
            {
                // Point Light 처리
                if (!asset.lightParams) continue;
                const params = asset.lightParams as any;

                const position  : Vec3 = vec3.fromValues(...params.position);
                const color     : Vec3 = vec3.fromValues(...params.color);
                const intensity : number = params.intensity;

                this.AddPointLight(position, color, intensity);
            }
            else if (asset.type === 'rect-light')
            {
                // Rect Light 처리
                if (!asset.lightParams) continue;
                const params = asset.lightParams as any;

                const position  : Vec3 = vec3.fromValues(...params.position);
                const u         : Vec3 = vec3.fromValues(...params.u);
                const v         : Vec3 = vec3.fromValues(...params.v);
                const color     : Vec3 = vec3.fromValues(...params.color);
                const intensity : number = params.intensity;

                this.AddRectLight(position, u, v, color, intensity);
            }
        }

        console.log(`Loaded scene "${scene.name}" with ${scene.assets.length} assets`);
    }

    // public PackWorldData() : [Array<Instance>, Array<SerializedMesh>, Map<string, number>]
    // {
    //     function convertMapToArray<T>(InMap: Map<string, T>): [T[], Map<string, number>]
    //     {
    //         const ArrayData: T[] = [...InMap.values()];

    //         const IDToIndexMap: Map<string, number> = new Map<string, number>();
    //         {
    //             const IDData: string[] = [...InMap.keys()];

    //             for (let iter=0; iter<IDData.length; iter++)
    //                 IDToIndexMap.set(IDData[iter], iter);
    //         }

    //         return [ArrayData, IDToIndexMap];
    //     }
        
    //     const InstanceArray = convertMapToArray<Instance>(this.InstancesPool)[0];

    //     const UsedMeshesSerialized : Map<string, SerializedMesh> = new Map<string, SerializedMesh>();
    //     for (const InstanceUsing of InstanceArray) 
    //     {
    //         const MeshToSerialize : Mesh = ResourceManager.MeshPool.get(InstanceUsing.MeshID)!;
    //         UsedMeshesSerialized.set(InstanceUsing.MeshID, MeshToSerialize.Serialize());
    //     }
                
    //     const [SerializedMeshArray, MeshIDToIndexMap] = convertMapToArray(UsedMeshesSerialized);
    //     return [InstanceArray, SerializedMeshArray, MeshIDToIndexMap];
    // }

    public GetLightCDFBuffer() : ArrayBuffer
    {
        const LuminanceArray    : Float32Array  = new Float32Array(this.Lights.length);
        let LuminanceSum        : number        = 0.0;
        for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] = this.Lights[i].GetLuminance(); }
        //for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] = 1.0; }
        for (let i = 0; i < this.Lights.length; i++) { LuminanceSum += LuminanceArray[i]; }
        for (let i = 0; i < this.Lights.length; i++) { LuminanceArray[i] /= LuminanceSum; }
        for (let i = 1; i < this.Lights.length; i++) { LuminanceArray[i] += LuminanceArray[i-1]; }

        LuminanceArray[this.Lights.length - 1] = 1.0;

        const LightCDFArrayBuffer : ArrayBuffer = new ArrayBuffer(4 * LuminanceArray.length);
        const Float32View : Float32Array = new Float32Array(LightCDFArrayBuffer);
        Float32View.set(LuminanceArray, 0);

        return LightCDFArrayBuffer;
    }
}
