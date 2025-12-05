/**
 * GizmoModeSelector - Gizmo 모드 선택 버튼
 *
 * Canvas 상단에 표시
 * - Translate (G)
 * - Rotate (R)
 * - Scale: +/- 키로 조절 (버튼 없음)
 */

import './GizmoModeSelector.css';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

interface GizmoModeSelectorProps {
  mode: GizmoMode;
  onModeChange: (mode: GizmoMode) => void;
  hasSelection?: boolean;  // 오브젝트가 선택되었는지 여부 (크기 힌트 활성화 상태)
  className?: string;
}

const MODES: { key: GizmoMode; label: string; icon: string; shortcut: string }[] = [
  { key: 'translate', label: '이동', icon: '↔️', shortcut: 'G' },
  { key: 'rotate', label: '회전', icon: '🔄', shortcut: 'R' },
];

export function GizmoModeSelector({ mode, onModeChange, hasSelection = false, className = '' }: GizmoModeSelectorProps) {
  return (
    <div className={`gizmo-mode-selector ${className}`}>
      {MODES.map((m) => (
        <button
          key={m.key}
          className={`gizmo-mode-selector__btn ${mode === m.key ? 'gizmo-mode-selector__btn--active' : ''}`}
          onClick={() => onModeChange(m.key)}
          title={`${m.label} (${m.shortcut})`}
        >
          <span className="gizmo-mode-selector__icon">{m.icon}</span>
          <span className="gizmo-mode-selector__label">{m.label}</span>
          <span className="gizmo-mode-selector__shortcut">{m.shortcut}</span>
        </button>
      ))}
      {/* Scale hint - 오브젝트 선택 시에만 활성화 표시 */}
      <div
        className={`gizmo-mode-selector__hint ${hasSelection ? 'gizmo-mode-selector__hint--active' : 'gizmo-mode-selector__hint--disabled'}`}
        title={hasSelection ? '+/- 키로 크기 조절' : '오브젝트를 선택하면 +/- 키로 크기 조절 가능'}
      >
        <span className="gizmo-mode-selector__hint-icon">📐</span>
        <span className="gizmo-mode-selector__hint-label">크기</span>
        <span className="gizmo-mode-selector__hint-shortcut">+/-</span>
      </div>
    </div>
  );
}

export default GizmoModeSelector;
