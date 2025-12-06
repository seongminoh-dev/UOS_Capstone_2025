import      { mat4, vec3 } from "wgpu-matrix"
import type { Mat4 } from "wgpu-matrix";
import type { Vec3 } from "./lighting";

function Halton(index : number, base : number) : number
{
    let result = 0;
    let f = 1 / base;
    let i = index;
    while (i > 0) {
        result = result + f * (i % base);
        i = Math.floor(i / base);
        f = f / base;
    }
    return result;
}

export class Utils
{

    public static MergeArrays(InArrays : Uint32Array[]) : [Uint32Array, Uint32Array]
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

    public static ProjectionMatrix_Jittered
    (
        ProjectionMatrix    : Mat4, 
        FrameID             : number,
        Resolution_X        : number,
        Resolution_Y        : number
    )                       : [Mat4, number, number]
    {
        const PERIOD    : number = 16;
        const index     : number = FrameID % PERIOD + 1;

        const Jitter_X  : number = Halton(index, 2) - 0.5;
        const Jitter_Y  : number = Halton(index, 3) - 0.5;

        const ProjectionMatrix_Jittered : Mat4 = mat4.clone(ProjectionMatrix);

        const NDCOffset_X : number = (Jitter_X * 2.0) / Resolution_X;
        const NDCOffset_Y : number = (Jitter_Y * 2.0) / Resolution_Y;

        ProjectionMatrix_Jittered[8] += NDCOffset_X;
        ProjectionMatrix_Jittered[9] += NDCOffset_Y;

        return [ ProjectionMatrix_Jittered , Jitter_X, Jitter_Y ];
    }

    public static CreateRandomPointLight(idx : number, MinPos : Vec3, MaxPos : Vec3, MinIntensity : number, MaxIntensity : number)
    {
        // 1. 위치 랜덤 생성 (Min ~ Max 사이)
        const randX = MinPos[0] + Math.random() * (MaxPos[0] - MinPos[0]);
        const randY = MinPos[1] + Math.random() * (MaxPos[1] - MinPos[1]);
        const randZ = MinPos[2] + Math.random() * (MaxPos[2] - MinPos[2]);

        // 2. 강도 랜덤 생성
        const randIntensity = MinIntensity + Math.random() * (MaxIntensity - MinIntensity);

        // 3. 객체 반환
        return {
            id: `random-light-${idx}`,
            type: 'point-light',
            lightParams: {
                position: [
                    Number(randX.toFixed(2)), 
                    Number(randY.toFixed(2)), 
                    Number(randZ.toFixed(2))
                ],
                color: [1, 1, 1],
                intensity: Number(randIntensity.toFixed(1))
            }
        };
    }
}