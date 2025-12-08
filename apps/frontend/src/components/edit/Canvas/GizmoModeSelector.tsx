/**
 * GizmoModeSelector - Gizmo 모드 선택 버튼
 *
 * Canvas 상단에 표시
 * - Translate (G)
 * - Rotate (R)
 * - Scale (S)
 */

import './GizmoModeSelector.css';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

interface GizmoModeSelectorProps {
  mode: GizmoMode;
  onModeChange: (mode: GizmoMode) => void;
  className?: string;
}

const MODES: { key: GizmoMode; label: string; icon: string; shortcut: string }[] = [
  { key: 'translate', label: '이동', icon: '↔️', shortcut: 'G' },
  { key: 'rotate', label: '회전', icon: '🔄', shortcut: 'R' },
  { key: 'scale', label: '크기', icon: '⬛', shortcut: 'S' },
];

export function GizmoModeSelector({ mode, onModeChange, className = '' }: GizmoModeSelectorProps) {
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
    </div>
  );
}

export default GizmoModeSelector;
