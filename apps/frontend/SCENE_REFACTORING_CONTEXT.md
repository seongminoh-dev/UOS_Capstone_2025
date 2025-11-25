# Scene Pipeline Refactoring - 전체 맥락 문서

> 이 문서는 Scene Pipeline Refactoring 작업의 모든 맥락, 결정사항, 구현 계획을 담고 있습니다.
> 새로운 Claude 세션에서 이 문서만 읽고 작업을 이어갈 수 있도록 작성되었습니다.

---

## 1. 프로젝트 개요

### 1.1 서비스 설명
- **조명 시뮬레이터**: 실내 공간에 가구/조명을 배치하고 ReSTIR PathTracing으로 사실적인 렌더링을 제공
- **주요 페이지**:
  - `/` (MainPage): WebGPU ReSTIR PathTracing 렌더러 (정적 Scene 뷰어)
  - `/edit` (EditPage): Three.js 기반 실시간 Interactive Scene Editor

### 1.2 기술 스택
- **Frontend**: React + TypeScript + Vite + Zustand
- **Backend**: Spring Boot + JPA + PostgreSQL
- **Graphics**: WebGPU (PathTracing), Three.js (편집용 프리뷰)

---

## 2. 현재 문제점 (리팩토링 이유)

### 2.1 스파게티 코드 상태
Bottom-up 방식 개발로 인해 Scene 관련 모듈들이 파편화됨:

```
현재 상태:
- EditPage: scene 객체 전체를 useState로 관리
- WebGPURenderer: props로 scene 객체를 받음
- ThreeRenderer: props로 scene 객체를 받음
- sceneStore (Zustand): scenes 배열 관리
- API: sceneId로 통신
- SceneAdapter: scene 객체를 World에 변환
- 어떤 곳은 깊은 복사, 어떤 곳은 얕은 복사
- 어디서 뭘 수정하면 어디까지 영향가는지 추적 불가
```

### 2.2 구체적 문제들
1. **단일 진실 공급원(SSOT) 부재**: Scene 데이터가 여러 곳에 복사됨
2. **ID vs 객체 혼재**: sceneId를 쓸지, 전체 객체를 넘길지 불명확
3. **타입 불일치**: `Scene` vs `SceneFrontend`, `defaultRoom` vs `room` 혼재
4. **Serialization Hack**: `__scene_metadata__`로 room/sunSettings 우회 저장 중
5. **출처 관리 부재**: Dummy/Local/Server Scene 통합 관리 로직 없음
6. **Backend 스키마 불일치**: room, sunSettings, camera가 Backend에 없음

---

## 3. 확정된 설계 결정

### 3.1 타입 구조 (이미 Scene.ts에 정의됨)

```typescript
// Graphics Core용 (렌더링 전용)
interface Scene {
  id: string | number;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  assets: SceneAsset[];
  username?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Frontend/Backend 공용 (전체 Scene 정보)
interface SceneFrontend extends Scene {
  room: RoomSettings;         // 필수
  sunSettings: SunSettings;   // 필수
  camera?: CameraSettings;    // 선택
}
```

**결정**:
- `Scene`은 Graphics Core가 렌더링에 사용하는 구조체
- `SceneFrontend`는 Frontend와 Backend가 저장/전송에 사용하는 전체 정보
- Backend도 `SceneFrontend` 구조를 그대로 사용

### 3.2 AssetType 정책

```typescript
// 내부용 (Graphics Core에서 사용)
type AssetType = 'object' | 'directional-light' | 'point-light' | 'rect-light';

// 사용자 UI에 노출되는 타입
type UserAssetType = 'object' | 'point-light' | 'rect-light';
```

**결정**:
- `directional-light`는 유지 (개발 모드에서 수동 추가 가능)
- 일반 사용자 UI에서는 숨김
- `sunSettings` → `DirectionalLight` 자동 변환은 SceneAdapter가 담당

### 3.3 ID 체계

```typescript
type SceneId = string | number;

// ID로 출처 구분:
// - "dummy_xxx" → DummyScene (읽기 전용, 수정 시 새 Scene으로 분기)
// - "local_xxx" → LocalScene (비회원, localStorage 저장)
// - 숫자 (1, 2, 3...) → ServerScene (회원, Backend API)
```

**결정**:
- `typeof id === 'number'`로 ServerScene 판별 가능
- LocalScene ID 형식: `local_${Date.now()}` (타임스탬프 기반)
- DummyScene ID 형식: `dummy_bedroom`, `dummy_living_room` 등

### 3.4 Scene 출처별 처리

```
┌─────────────────────────────────────────────────────────────┐
│ 비회원 상태                                                  │
│ - 접근 가능: DummyScenes + LocalScenes                       │
│ - 저장 위치: localStorage                                    │
│ - DummyScene 수정 시 → 새 LocalScene으로 저장 (이름 유지, ID만 변경) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 회원 상태                                                    │
│ - 접근 가능: DummyScenes + ServerScenes                      │
│ - 저장 위치: Server (API)                                    │
│ - DummyScene 수정 시 → 새 ServerScene으로 저장               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 비회원 → 로그인 전환 시                                       │
│ - LocalScenes → Server에 자동 업로드                         │
│ - 새 Server ID 발급받아 교체                                  │
│ - localStorage에서 해당 Scene 삭제                            │
│ - 토스트: "N개의 Scene이 계정에 동기화되었습니다"              │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 편집 흐름

```
SceneRepository (단일 진실 공급원)
        │
        │ cloneForEdit(id) → 깊은 복사본 생성
        ▼
EditPage (편집 세션)
        │
        │ editingScene: SceneFrontend (복사본)
        │ 수정 작업들... (Repository에 영향 없음)
        │
        ├─── [취소] → Repository에서 원본 다시 조회
        │
        └─── [저장] → Repository.saveScene(editingScene)
                      - DummyScene이었으면 → 새 Scene 생성 (ID 변경)
                      - LocalScene이었으면 → localStorage 업데이트
                      - ServerScene이었으면 → API PUT 호출
```

### 3.6 /scenes 페이지

**결정**: 별도 /scenes 페이지 불필요
- `/` (MainPage)와 `/edit` (EditPage)에서 각각 Scene 선택 UI 제공
- SceneRepository를 통해 통합 관리

---

## 4. 목표 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SceneRepository                                 │
│                    (단일 진실 공급원 - SSOT)                          │
│                                                                     │
│  Sources:                                                           │
│  ├── DummyScenes (하드코딩, 읽기 전용)                                │
│  ├── LocalScenes (localStorage, 비회원)                              │
│  └── ServerScenes (API, 회원)                                        │
│                                                                     │
│  State:                                                             │
│  ├── scenes: SceneFrontend[]  (통합 목록)                            │
│  ├── isLoggedIn: boolean                                            │
│  └── isLoading: boolean                                             │
│                                                                     │
│  Methods:                                                           │
│  ├── getScenes(): SceneFrontend[]                                   │
│  ├── getSceneById(id: SceneId): SceneFrontend | null                │
│  ├── cloneForEdit(id: SceneId): SceneFrontend  ← 깊은 복사          │
│  ├── saveScene(scene: SceneFrontend): Promise<SceneFrontend>        │
│  ├── deleteScene(id: SceneId): Promise<void>                        │
│  └── syncLocalToServer(): Promise<void>  ← 로그인 시 호출           │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       / (MainPage)                    /edit (EditPage)
              │                               │
              │ sceneId                       │ cloneForEdit(id)
              ▼                               ▼
       SceneAdapter                    editingScene (복사본)
              │                               │
              ▼                               │ 수정 작업
       Graphics Core                          │
       (World)                                ▼
                                       [저장] → saveScene()
                                       [취소] → getSceneById()
                                              │
                                              ▼
                                       ThreeSceneAdapter
                                              │
                                              ▼
                                       Three.js Renderer
```

---

## 5. 구현 작업 목록

### Phase 1: Backend 스키마 변경

#### 1.1 Scene Entity 수정
**파일**: `/apps/backend/src/main/java/com/capstone/backend/entity/Scene.java`

현재 상태:
```java
@Entity
public class Scene {
    private Long id;
    private String name;
    private String description;
    private String thumbnailUrl;
    private String assets;  // JSONB - SceneAsset[] only
    private User user;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

변경 후:
```java
@Entity
public class Scene {
    private Long id;
    private String name;
    private String description;
    private String thumbnailUrl;

    // 새로 추가
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String room;           // RoomSettings JSON

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String sunSettings;    // SunSettings JSON

    @JdbcTypeCode(SqlTypes.JSON)
    private String camera;         // CameraSettings JSON (nullable)

    // 기존 유지
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String assets;         // SceneAsset[] JSON

    private User user;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

#### 1.2 DTO 수정
**파일**: `/apps/backend/src/main/java/com/capstone/backend/dto/SceneRequest.java`
**파일**: `/apps/backend/src/main/java/com/capstone/backend/dto/SceneResponse.java`

추가할 필드:
- `room: String` (JSON)
- `sunSettings: String` (JSON)
- `camera: String` (JSON, nullable)

#### 1.3 Service 수정
**파일**: `/apps/backend/src/main/java/com/capstone/backend/service/SceneService.java`

- `createScene()`, `updateScene()`, `convertToResponse()` 메서드에 새 필드 처리 추가

---

### Phase 2: Frontend API 클라이언트 수정

**파일**: `/apps/frontend/src/lib/api/scene.api.ts`

```typescript
// 현재 - assets만 JSON string으로 전송
interface SceneRequest {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  assets: string;  // JSON.stringify(SceneAsset[])
  username: string;
}

// 변경 후 - room, sunSettings, camera도 포함
interface SceneRequest {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  room: string;        // JSON.stringify(RoomSettings)
  sunSettings: string; // JSON.stringify(SunSettings)
  camera?: string;     // JSON.stringify(CameraSettings)
  assets: string;      // JSON.stringify(SceneAsset[])
  username: string;
}
```

---

### Phase 3: SceneRepository 구현

#### 3.1 파일 구조
```
/apps/frontend/src/
├── repositories/
│   └── SceneRepository.ts      # 인터페이스 정의
├── stores/
│   └── sceneRepository.ts      # Zustand 구현
├── utils/
│   └── sceneId.ts              # ID 유틸리티
└── graphics-core/
    └── test/
        └── DummyScenes.ts      # 기존 유지, ID만 수정
```

#### 3.2 SceneRepository 인터페이스
```typescript
// /apps/frontend/src/repositories/SceneRepository.ts

import type { SceneFrontend } from '../graphics-core/service/Scene';

export type SceneId = string | number;

export interface SceneRepository {
  // 상태
  scenes: SceneFrontend[];
  isLoading: boolean;
  error: string | null;

  // 조회
  getScenes(): SceneFrontend[];
  getSceneById(id: SceneId): SceneFrontend | null;

  // 편집용 깊은 복사
  cloneForEdit(id: SceneId): SceneFrontend;

  // 저장/삭제
  saveScene(scene: SceneFrontend): Promise<SceneFrontend>;
  deleteScene(id: SceneId): Promise<void>;

  // 초기화/동기화
  loadScenes(): Promise<void>;
  syncLocalToServer(): Promise<void>;
}
```

#### 3.3 ID 유틸리티
```typescript
// /apps/frontend/src/utils/sceneId.ts

export type SceneId = string | number;

export function isDummyScene(id: SceneId): boolean {
  return typeof id === 'string' && id.startsWith('dummy_');
}

export function isLocalScene(id: SceneId): boolean {
  return typeof id === 'string' && id.startsWith('local_');
}

export function isServerScene(id: SceneId): boolean {
  return typeof id === 'number';
}

export function generateLocalId(): string {
  return `local_${Date.now()}`;
}
```

#### 3.4 Zustand Store 구현
```typescript
// /apps/frontend/src/stores/sceneRepository.ts

import { create } from 'zustand';
import { DUMMY_SCENES } from '../graphics-core/test/DummyScenes';
import { sceneApi } from '../lib/api/scene.api';
import { isDummyScene, isLocalScene, isServerScene, generateLocalId } from '../utils/sceneId';
import type { SceneFrontend } from '../graphics-core/service/Scene';
import type { SceneId, SceneRepository } from '../repositories/SceneRepository';

const LOCAL_STORAGE_KEY = 'local_scenes';

export const useSceneRepository = create<SceneRepository>((set, get) => ({
  scenes: [],
  isLoading: false,
  error: null,

  getScenes: () => get().scenes,

  getSceneById: (id: SceneId) => {
    return get().scenes.find(s => s.id === id) || null;
  },

  cloneForEdit: (id: SceneId) => {
    const scene = get().getSceneById(id);
    if (!scene) throw new Error(`Scene not found: ${id}`);
    // 깊은 복사
    return JSON.parse(JSON.stringify(scene));
  },

  saveScene: async (scene: SceneFrontend) => {
    const isLoggedIn = /* TODO: AuthContext에서 가져오기 */ false;

    // DummyScene 수정 시 새 Scene으로 분기
    if (isDummyScene(scene.id)) {
      const newId = isLoggedIn ? undefined : generateLocalId();
      scene = { ...scene, id: newId as any };
    }

    if (isLoggedIn && !isLocalScene(scene.id)) {
      // Server 저장
      if (isServerScene(scene.id)) {
        // 기존 Scene 업데이트
        const updated = await sceneApi.updateScene(scene.id as number, scene);
        // store 업데이트
        set(state => ({
          scenes: state.scenes.map(s => s.id === updated.id ? updated : s)
        }));
        return updated;
      } else {
        // 새 Scene 생성
        const created = await sceneApi.createScene(scene);
        set(state => ({ scenes: [...state.scenes, created] }));
        return created;
      }
    } else {
      // Local 저장
      const localScenes = get().scenes.filter(s => isLocalScene(s.id));
      const existing = localScenes.find(s => s.id === scene.id);

      let updatedLocals: SceneFrontend[];
      if (existing) {
        updatedLocals = localScenes.map(s => s.id === scene.id ? scene : s);
      } else {
        if (!scene.id || isDummyScene(scene.id)) {
          scene = { ...scene, id: generateLocalId() };
        }
        updatedLocals = [...localScenes, scene];
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocals));

      // store 업데이트
      set(state => ({
        scenes: [
          ...DUMMY_SCENES,
          ...updatedLocals
        ]
      }));

      return scene;
    }
  },

  deleteScene: async (id: SceneId) => {
    if (isDummyScene(id)) {
      throw new Error('DummyScene은 삭제할 수 없습니다');
    }

    if (isServerScene(id)) {
      await sceneApi.deleteScene(id as number);
    } else if (isLocalScene(id)) {
      const localScenes = get().scenes.filter(s => isLocalScene(s.id) && s.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localScenes));
    }

    set(state => ({
      scenes: state.scenes.filter(s => s.id !== id)
    }));
  },

  loadScenes: async () => {
    set({ isLoading: true, error: null });

    try {
      const isLoggedIn = /* TODO: AuthContext에서 가져오기 */ false;

      // DummyScenes는 항상 포함
      let allScenes: SceneFrontend[] = [...DUMMY_SCENES];

      if (isLoggedIn) {
        // 서버에서 Scene 로드
        const serverScenes = await sceneApi.getScenesByUsername(/* username */);
        allScenes = [...allScenes, ...serverScenes];
      } else {
        // localStorage에서 Scene 로드
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const localScenes: SceneFrontend[] = JSON.parse(stored);
          allScenes = [...allScenes, ...localScenes];
        }
      }

      set({ scenes: allScenes, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  syncLocalToServer: async () => {
    const localScenes = get().scenes.filter(s => isLocalScene(s.id));

    if (localScenes.length === 0) return;

    const uploaded: SceneFrontend[] = [];

    for (const scene of localScenes) {
      try {
        // 서버에 업로드 (새 ID 발급됨)
        const created = await sceneApi.createScene(scene);
        uploaded.push(created);
      } catch (error) {
        console.error(`Failed to sync scene: ${scene.name}`, error);
      }
    }

    // localStorage 비우기
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    // store 업데이트: local scenes 제거, server scenes 추가
    set(state => ({
      scenes: [
        ...state.scenes.filter(s => !isLocalScene(s.id)),
        ...uploaded
      ]
    }));

    // TODO: 토스트 알림 "N개의 Scene이 동기화되었습니다"
  }
}));
```

---

### Phase 4: DummyScenes ID 수정

**파일**: `/apps/frontend/src/graphics-core/test/DummyScenes.ts`

```typescript
// 기존
export const DUMMY_SCENE_1: SceneFrontend = {
  id: 'dummy_scene_1',  // ← 이미 dummy_ prefix 사용 중 (OK)
  ...
};

// ID 형식 확인/수정
export const DUMMY_SCENES: SceneFrontend[] = [
  { ...DUMMY_SCENE_1, id: 'dummy_bedroom' },
  { ...DUMMY_SCENE_2, id: 'dummy_test_room' },
];
```

---

### Phase 5: 기존 코드 정리

#### 5.1 제거할 파일
- `/apps/frontend/src/stores/sceneStore.ts` → SceneRepository로 대체
- `/apps/frontend/src/utils/SceneSerializer.ts` → Backend 스키마 변경으로 불필요

#### 5.2 수정할 파일
- `/apps/frontend/src/adapters/SceneAdapter.ts` → import 정리
- `/apps/frontend/src/adapters/ThreeSceneAdapter.ts` → import 정리
- `/apps/frontend/src/components/WebGPURenderer.tsx` → SceneRepository 사용
- `/apps/frontend/src/components/ThreeRenderer.tsx` → SceneRepository 사용

---

### Phase 6: 페이지 리팩토링

#### 6.1 EditPage 수정
**파일**: `/apps/frontend/src/pages/EditPage.tsx`

```typescript
function EditPage() {
  const { scenes, getSceneById, cloneForEdit, saveScene, deleteScene } = useSceneRepository();

  const [currentSceneId, setCurrentSceneId] = useState<SceneId | null>(null);
  const [editingScene, setEditingScene] = useState<SceneFrontend | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Scene 선택
  const handleSelectScene = (id: SceneId) => {
    if (isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?')) {
      return;
    }
    setCurrentSceneId(id);
    setEditingScene(cloneForEdit(id));
    setIsDirty(false);
  };

  // 수정
  const handleUpdateScene = (updates: Partial<SceneFrontend>) => {
    if (!editingScene) return;
    setEditingScene({ ...editingScene, ...updates });
    setIsDirty(true);
  };

  // 저장
  const handleSave = async () => {
    if (!editingScene) return;
    const saved = await saveScene(editingScene);
    setCurrentSceneId(saved.id);
    setEditingScene(cloneForEdit(saved.id));
    setIsDirty(false);
  };

  // 취소
  const handleCancel = () => {
    if (!currentSceneId) return;
    setEditingScene(cloneForEdit(currentSceneId));
    setIsDirty(false);
  };

  // 브라우저 닫기 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '저장하지 않은 변경사항이 있습니다.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    // ... JSX
  );
}
```

#### 6.2 MainPage (LightingSimulator.tsx) 수정

```typescript
function LightingSimulator() {
  const { scenes, getSceneById } = useSceneRepository();
  const [currentSceneId, setCurrentSceneId] = useState<SceneId | null>(null);

  const currentScene = currentSceneId ? getSceneById(currentSceneId) : null;

  return (
    <>
      <SceneSelector scenes={scenes} onSelect={setCurrentSceneId} />
      {currentScene && <WebGPURenderer scene={currentScene} />}
    </>
  );
}
```

---

### Phase 7: 로그인 동기화 연동

로그인 성공 후 콜백에서:

```typescript
// AuthContext 또는 로그인 핸들러에서
const { syncLocalToServer } = useSceneRepository();

async function onLoginSuccess() {
  await syncLocalToServer();
  // 토스트: "N개의 Scene이 계정에 동기화되었습니다"
}
```

---

## 6. 작업 순서 (체크리스트)

```
Phase 1: Backend
[ ] 1.1 Scene.java Entity 수정 (room, sunSettings, camera 추가)
[ ] 1.2 SceneRequest.java DTO 수정
[ ] 1.3 SceneResponse.java DTO 수정
[ ] 1.4 SceneService.java 수정
[ ] 1.5 SceneController.java 수정 (필요시)
[ ] 1.6 Backend 테스트

Phase 2: Frontend API
[ ] 2.1 scene.api.ts 수정 (새 스키마 반영)

Phase 3: SceneRepository
[ ] 3.1 /repositories/SceneRepository.ts 생성 (인터페이스)
[ ] 3.2 /utils/sceneId.ts 생성 (ID 유틸리티)
[ ] 3.3 /stores/sceneRepository.ts 생성 (Zustand 구현)

Phase 4: DummyScenes
[ ] 4.1 DummyScenes.ts ID 수정 (dummy_ prefix 확인)

Phase 5: 정리
[ ] 5.1 sceneStore.ts 제거
[ ] 5.2 SceneSerializer.ts 제거
[ ] 5.3 불필요한 import 정리

Phase 6: 페이지 리팩토링
[ ] 6.1 EditPage.tsx 수정
[ ] 6.2 LightingSimulator.tsx (MainPage) 수정
[ ] 6.3 WebGPURenderer.tsx 정리
[ ] 6.4 ThreeRenderer.tsx 정리

Phase 7: 통합
[ ] 7.1 로그인 동기화 연동
[ ] 7.2 전체 플로우 테스트
```

---

## 7. 영향 받는 파일 목록

### Backend (수정)
```
/apps/backend/src/main/java/com/capstone/backend/
├── entity/Scene.java
├── dto/SceneRequest.java
├── dto/SceneResponse.java
├── service/SceneService.java
└── controller/SceneController.java (minor)
```

### Frontend (신규)
```
/apps/frontend/src/
├── repositories/
│   └── SceneRepository.ts
├── stores/
│   └── sceneRepository.ts
└── utils/
    └── sceneId.ts
```

### Frontend (수정)
```
/apps/frontend/src/
├── lib/api/scene.api.ts
├── pages/EditPage.tsx
├── components/WebGPURenderer.tsx
├── components/ThreeRenderer.tsx
├── LightingSimulator.tsx
└── graphics-core/test/DummyScenes.ts
```

### Frontend (제거)
```
/apps/frontend/src/
├── stores/sceneStore.ts
└── utils/SceneSerializer.ts
```

### Frontend (유지, 변경 없음)
```
/apps/frontend/src/
├── graphics-core/
│   ├── service/Scene.ts (타입 정의 - 이미 확정됨)
│   ├── World.ts
│   └── service/WebGPUEngine.ts
├── adapters/
│   ├── SceneAdapter.ts
│   └── ThreeSceneAdapter.ts
└── three-core/
    └── ThreeSceneManager.ts
```

---

## 8. 주의사항

### 8.1 깊은 복사 필수
`cloneForEdit()`에서 반드시 깊은 복사 사용:
```typescript
// ✅ 올바른 방법
return JSON.parse(JSON.stringify(scene));

// ❌ 잘못된 방법 (얕은 복사)
return { ...scene };
return Object.assign({}, scene);
```

### 8.2 DummyScene 불변성
- DummyScene은 절대 직접 수정하지 않음
- 수정 시 항상 새 ID로 새 Scene 생성

### 8.3 ID 타입 주의
```typescript
// ServerScene ID는 number
// LocalScene, DummyScene ID는 string
// 비교 시 주의 필요
scene.id === id  // 타입 일치 확인
```

### 8.4 AuthContext 연동
현재 코드에서 `isLoggedIn` 상태를 어디서 가져오는지 확인 필요.
SceneRepository가 AuthContext를 참조해야 함.

---

## 9. 테스트 시나리오

### 9.1 비회원 플로우
1. 앱 접속 → DummyScenes만 표시
2. DummyScene 선택 → 편집 → 저장 → 새 LocalScene 생성
3. LocalScene 편집 → 저장 → localStorage 업데이트
4. 브라우저 새로고침 → LocalScene 유지됨
5. LocalScene 삭제 → localStorage에서 제거

### 9.2 회원 플로우
1. 로그인 → ServerScenes 로드
2. DummyScene 선택 → 편집 → 저장 → 새 ServerScene 생성 (API POST)
3. ServerScene 편집 → 저장 → API PUT
4. ServerScene 삭제 → API DELETE

### 9.3 비회원 → 회원 전환
1. 비회원으로 LocalScene 2개 생성
2. 로그인
3. syncLocalToServer() 호출
4. 2개 Scene이 Server에 업로드됨
5. localStorage 비워짐
6. Scene 목록에 ServerScene으로 표시됨

### 9.4 편집 취소/저장
1. Scene 선택 → 편집 시작
2. 수정 작업 수행 → isDirty = true
3. [취소] 클릭 → 원본으로 복구
4. 다시 수정 → [저장] 클릭 → Repository 업데이트

### 9.5 브라우저 닫기 경고
1. Scene 편집 중 (isDirty = true)
2. 브라우저 탭 닫기 시도
3. "저장하지 않은 변경사항이 있습니다" 경고 표시

---

## 10. 추후 개선 가능 사항 (현재 범위 외)

1. Scene 목록 정렬 (최근 수정순, 이름순)
2. Scene 검색 기능
3. Scene 썸네일 자동 생성
4. Scene 복제 기능
5. Scene 공유 기능 (public/private)
6. 오프라인 지원 (Service Worker)
7. 실시간 협업 편집

---

## 11. 질문 있을 시

이 문서에서 불명확한 부분이 있으면 사용자에게 질문하세요.
특히:
- AuthContext 연동 방식
- 기존 코드에서 놓친 의존성
- 테스트 방법

---

*문서 작성: 2024년 11월 26일*
*마지막 업데이트: 논의 완료 후 작업 시작 전*
