# 환경 조명 시스템 (Environment Lighting)

> **작성일**: 2025-11-27
> **작업 브랜치**: `feat/envLight`
> **담당**: 프론트엔드 UI/UX, WebGPUEngine 연동

---

## 1. 개요

실내 인테리어 렌더링에서 **시간대/계절에 따른 자연광 변화**를 실시간으로 시뮬레이션하는 기능입니다.

### 주요 기능
- 시간 슬라이더로 0시~24시 태양 위치 조절
- 계절/방향에 따른 태양 고도 및 방위각 계산
- 물리 기반 Procedural Sky (Rayleigh/Mie 산란 근사)
- 하루 애니메이션 재생 (일출~일몰 자동 순환)

---

## 2. 이론적 배경

### 2.1 태양 위치 계산 (SunCalc)

[suncalc](https://github.com/mourner/suncalc) 라이브러리를 사용하여 **천문학적으로 정확한** 태양 위치를 계산합니다.

```typescript
// SunCalculator.ts
import * as SunCalc from 'suncalc';

const sunPos = SunCalc.getPosition(date, latitude, longitude);
// sunPos.altitude: 고도각 (radians) - 지평선 기준 각도
// sunPos.azimuth: 방위각 (radians) - 남쪽 기준 시계방향
```

**좌표 변환 (구면 → 직교):**
```typescript
const x = Math.cos(altitude) * Math.sin(azimuth);
const y = -Math.sin(altitude);  // Y-up 좌표계, 위→아래 방향
const z = Math.cos(altitude) * Math.cos(azimuth);
```

### 2.2 색온도 계산 (Kelvin to RGB)

태양 고도에 따라 색온도가 변화합니다:

| 고도 | 색온도 | 색상 |
|------|--------|------|
| 지평선 (0°) | 1800K | 붉은 노을 |
| 천정 (90°) | 5800K | 태양 표면 온도 (흰색) |

```typescript
const kelvin = 1800 + (5800 - 1800) * Math.sin(altitude);
const [r, g, b] = kelvinToRgb(kelvin);
```

### 2.3 Procedural Sky (물리 기반)

WGSL 셰이더에서 **Rayleigh/Mie 산란을 근사**하여 하늘색을 계산합니다.

#### Rayleigh 산란
- 파장이 짧은 빛(파란색)이 더 많이 산란
- λ^-4 법칙: 낮 하늘이 파란 이유

```wgsl
// 천정(위)에서 깊은 파랑, 지평선에서 옅은 파랑
let heightFactor = pow(cosTheta, 0.4);
var skyResult = mix(horizonColor, skyColor, heightFactor);
```

#### Mie 산란
- 태양 주변의 밝은 광채(aureole) 형성
- Forward scattering 효과

```wgsl
let cosSun = dot(rayDir, -sunDir);
let sunDisk = smoothstep(0.9995, 0.9999, cosSun) * 50.0;
let aureole = pow(max(cosSun, 0.0), 64.0) * 2.0;
```

---

## 3. 아키텍처

### 3.1 데이터 흐름

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ MainRightPanel  │────▶│  WebGPUEngine    │────▶│   Renderer      │
│ (UI 컴포넌트)    │     │  (엔진 API)       │     │  (GPU 렌더링)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   SunSettings            SunCalculator              Uniform Buffer
   (상태 관리)             (물리 계산)                (GPU 전송)
```

### 3.2 주요 파일

| 파일 | 역할 |
|------|------|
| `Scene.ts` | `SunSettings` 인터페이스 정의 |
| `SunCalculator.ts` | 태양 위치/색상 계산 (CPU) |
| `WebGPUEngine.ts` | `updateSunLight()` API |
| `Renderer_TEST.ts` | `UpdateEnvironment()` GPU 버퍼 업데이트 |
| `PT_1_InitPass.wgsl` | Procedural Sky 렌더링 (셰이더) |
| `PT_4_FinalShadingPass.wgsl` | 최종 셰이딩 (환경광 적용) |
| `MainRightPanel.tsx` | UI 컴포넌트 |

### 3.3 SunSettings 인터페이스

```typescript
// Scene.ts
export interface SunSettings {
  timeOfDay: number;              // 0~100 (0=자정, 50=정오)
  isDaytime: boolean;             // 항상 true (시간 슬라이더로 자동 판단)
  season: Season;                 // 'spring' | 'summer' | 'autumn' | 'winter'
  roomOrientation: RoomOrientation; // 'north' | 'south' | 'east' | 'west'
  skyMode: SkyMode;               // 0=없음, 1=일반, 2=고품질
  envIndirectMultiplier: number;  // 0.0~1.0 (하늘빛 반사 강도)
}
```

---

## 4. GPU Uniform 버퍼 레이아웃

셰이더와 CPU 간의 데이터 전송을 위한 Uniform 구조체입니다.

```wgsl
// PT_1_InitPass.wgsl
struct Uniform {
    // ... 기존 필드들 ...

    // === 환경 파라미터 (Procedural Sky) ===
    EnvSkyColor         : vec3<f32>,  // 천정 하늘색
    _padding3           : f32,
    EnvHorizonColor     : vec4<f32>,  // 지평선 색상 (w = padding)
    EnvGroundColor      : vec4<f32>,  // 지면 반사색 (w = padding)
    EnvSunDirection     : vec3<f32>,  // 태양 방향 벡터
    EnvSunIntensity     : f32,        // 태양 강도 (0~1)
    EnvIntensity        : f32,        // 환경광 전체 강도
    EnvIndirectMult     : f32,        // 간접광 배율 (하늘빛 반사)
    _padding5           : f32,
    EnvMode             : u32,        // 0=없음, 1=일반, 2=고품질
};
```

**주의사항 (16바이트 정렬):**
- `vec3<f32>` 뒤에는 `f32` padding 필요
- CPU에서 `Float32Array` 인덱스 계산 시 정렬 고려

---

## 5. UI 구성

### 5.1 태양 설정

```
┌─────────────────────────────────────┐
│ 태양 설정                            │
├─────────────────────────────────────┤
│ 시간: 12시              [▶ 재생] [1x]│
│ ├──────────○──────────┤             │
│ 0시                    24시          │
│                                      │
│ 계절: [봄 ▼]                         │
│ 방 방향: [남향 ▼]                    │
└─────────────────────────────────────┘
```

### 5.2 하늘 설정

```
┌─────────────────────────────────────┐
│ 하늘 설정                            │
├─────────────────────────────────────┤
│ 품질: [고품질] [일반] [없음]          │
│                                      │
│ 하늘빛 반사: 50%                     │
│ 실내에 비치는 하늘색 조명의 강도      │
│ ├──────────○──────────┤             │
│ 0%                    100%           │
└─────────────────────────────────────┘
```

### 5.3 하루 애니메이션

- **▶ 재생**: 시간이 0시→24시로 자동 순환
- **속도 조절**: 0.5x / 1x / 2x / 4x
- **수동 조작**: 슬라이더 드래그 시 자동 정지

---

## 6. 리팩토링 히스토리

### 6.1 낮/밤 토글 제거

**문제점:**
- 시간 슬라이더와 낮/밤 토글이 중복 기능
- "정오인데 밤 토글" 같은 혼란스러운 조합 가능

**해결:**
- `isDaytime` 토글 UI 제거
- `isDaytime`은 항상 `true`로 고정
- SunCalc가 시간에 따라 자동으로 낮/밤 판단

```typescript
// 변경 전
isDaytime: timeOfDay === 'day',  // 토글 상태 사용

// 변경 후
isDaytime: true,  // 항상 true - 시간 슬라이더로 자동 판단
```

### 6.2 용어 개선

| 변경 전 | 변경 후 | 이유 |
|---------|---------|------|
| 환경 설정 | 하늘 설정 | 더 직관적 |
| 하늘 설정 | 품질 | 중복 제거 |
| 환경 간접광 | 하늘빛 반사 | 비전문가도 이해 가능 |
| 물리 기반 | 자연스러움 | 친숙한 표현 |

### 6.3 Uniform 버퍼 정렬 수정

**문제:** 환경이 검정색으로만 렌더링됨

**원인:** CPU 버퍼 레이아웃과 WGSL 구조체 정렬 불일치

**해결:**
```typescript
// Renderer_TEST.ts
// [69-71] padding (vec3 뒤에 f32 padding 필요)
Float32View[69] = 0;
Float32View[70] = 0;
Float32View[71] = 0;

// [72-74] EnvSkyColor (정렬된 위치)
Float32View[72] = this.EnvSkyColor[0];
// ...
```

---

## 7. 셰이더 담당자를 위한 참고사항

### 7.1 환경색 가져오기

```wgsl
// 직접 환경광 (카메라 → 하늘)
let envColor = GetEnvironmentColor(rayDir);

// 간접 환경광 (반사광, EnvIndirectMult 적용)
let indirectEnv = GetEnvironmentColorIndirect(rayDir);
```

### 7.2 EnvMode 분기

```wgsl
fn GetEnvironmentColor(rayDir: vec3<f32>) -> vec3<f32> {
    if (UniformBuffer.EnvMode == 0u) {
        return DEFAULT_ENV_COLOR;  // 회색 (없음)
    }
    if (UniformBuffer.EnvMode == 1u) {
        return UniformBuffer.EnvSkyColor * UniformBuffer.EnvIntensity;  // 일반
    }
    return SampleProceduralSky(rayDir);  // 고품질
}
```

### 7.3 추가 가능한 기능

현재 Uniform에 여유 공간이 있어 다음 기능 확장 가능:

- **별/달 렌더링**: `StarDensity`, `MoonBrightness` 필드 추가
- **HDRI 환경맵**: 텍스처 바인딩 추가
- **안개 효과**: `FogDensity`, `FogColor` 필드 추가

---

## 8. 참고 자료

- [SunCalc 라이브러리](https://github.com/mourner/suncalc)
- [Kelvin to RGB 변환](https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html)
- [Rayleigh Scattering (Wikipedia)](https://en.wikipedia.org/wiki/Rayleigh_scattering)
- [Mie Scattering (Wikipedia)](https://en.wikipedia.org/wiki/Mie_scattering)
