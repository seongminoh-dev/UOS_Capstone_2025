import * as THREE from 'three';
import type { Vec3, Vec4, Mat4, Quat }          from 'wgpu-matrix';
import      { vec3, quat, mat4, vec4 }          from 'wgpu-matrix';
import      { GLTFLoader }                      from 'three/addons/loaders/GLTFLoader.js';
import      { mergeGeometries }                 from 'three/addons/utils/BufferGeometryUtils.js';
import      { computeBoundsTree, MeshBVH, SAH } from 'three-mesh-bvh';

export class Light
{
    public static readonly Stride : number = 18;

    private readonly Position   : Vec3;
    private readonly Direction  : Vec3;
    private readonly Color      : Vec3;
    private readonly U          : Vec3;
    private readonly V          : Vec3;

    private readonly LightType  : number;
    private readonly Intensity  : number;
    private readonly Area       : number;

    protected constructor
    (
        Position    : Vec3,
        Direction   : Vec3,
        Color       : Vec3,
        U           : Vec3,
        V           : Vec3,
        LightType   : number,
        Intensity   : number,
        Area        : number,
    )
    {
        this.Position   = Position;
        this.Direction  = Direction;
        this.Color      = Color;
        this.U          = U;
        this.V          = V;
        this.LightType  = LightType;
        this.Intensity  = Intensity;
        this.Area       = Area;
    }

    public GetLuminance() : number
    {
        const LightColor : Vec3 = vec3.scale(this.Color, this.Intensity);
        return vec3.dot(LightColor, vec3.fromValues(0.2126, 0.7152, 0.0722));
    }

    public Serialize() : Uint32Array
    {
        const LightRawData  : ArrayBuffer   = new ArrayBuffer(4 * Light.Stride);

        const Float32View   : Float32Array  = new Float32Array(LightRawData);
        const Uint32View    : Uint32Array   = new Uint32Array(LightRawData);
        {
            Float32View.set(this.Position, 0);
            Float32View.set(this.Direction, 3);
            Float32View.set(this.Color, 6);
            Float32View.set(this.U, 9);
            Float32View.set(this.V, 12);

            Uint32View[15]  = this.LightType;
            Float32View[16] = this.Intensity;
            Float32View[17] = this.Area;
        }

        return Uint32View;
    }
};

export class DirectionalLight extends Light
{
    constructor
    (
        Direction   : Vec3,
        Color       : Vec3,
        Intensity   : number
    )
    {
        super
        (
            vec3.create(),
            Direction,
            Color,
            vec3.create(),
            vec3.create(),
            0,
            Intensity,
            0.0
        );
    }
};

export class PointLight extends Light
{
    constructor
    (
        Position    : Vec3,
        Color       : Vec3,
        Intensity   : number
    )
    {
        super
        (
            Position,
            vec3.create(),
            Color,
            vec3.create(),
            vec3.create(),
            1,
            Intensity,
            0.0
        );
    }
};

export class RectLight extends Light
{
    constructor
    (
        Position    : Vec3,
        Color       : Vec3,
        U           : Vec3,
        V           : Vec3,
        Intensity   : number
    )
    {

        const Direction : Vec3      = vec3.normalize( vec3.cross(U, V) );
        const Area      : number    = 4.0 * vec3.len(U) * vec3.len(V);

        super
        (
            Position,
            Direction,
            Color,
            U,
            V,
            2,
            Intensity,
            Area
        );
    }
};