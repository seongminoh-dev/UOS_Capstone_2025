/**
 * Icons - 공통 SVG 아이콘 컴포넌트
 *
 * 모든 아이콘은 currentColor를 사용하여 부모의 color 상속
 * 기본 크기 20x20, size prop으로 조절 가능
 */

import { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

const defaultProps = {
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function SearchIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <circle cx="9" cy="9" r="6" />
      <path d="M13.5 13.5L17 17" />
    </svg>
  );
}

export function GridIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}

export function ListIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M3 5h14" />
      <path d="M3 10h14" />
      <path d="M3 15h14" />
    </svg>
  );
}

export function PlusIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  );
}

export function TrashIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M4 6h12" />
      <path d="M6 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M5 6v10a2 2 0 002 2h6a2 2 0 002-2V6" />
      <path d="M8 9v5" />
      <path d="M12 9v5" />
    </svg>
  );
}

export function CloseIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M5 5l10 10" />
      <path d="M15 5L5 15" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M5 7l5 5 5-5" />
    </svg>
  );
}

export function ClockIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2.5" />
    </svg>
  );
}

export function HomeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M3 10l7-7 7 7" />
      <path d="M5 8v8a1 1 0 001 1h8a1 1 0 001-1V8" />
    </svg>
  );
}

export function FolderIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M3 5a2 2 0 012-2h3l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
    </svg>
  );
}

export function CubeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M10 2l7 4v8l-7 4-7-4V6l7-4z" />
      <path d="M10 10v8" />
      <path d="M10 10L3 6" />
      <path d="M10 10l7-4" />
    </svg>
  );
}

export function LightbulbIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M10 2a5 5 0 015 5c0 2-1.5 3-2 4v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2c-.5-1-2-2-2-4a5 5 0 015-5z" />
      <path d="M8 16h4" />
      <path d="M9 18h2" />
    </svg>
  );
}

export function FilterIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M3 4h14" />
      <path d="M5 8h10" />
      <path d="M7 12h6" />
      <path d="M9 16h2" />
    </svg>
  );
}

export function SortIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M4 6h8" />
      <path d="M4 10h6" />
      <path d="M4 14h4" />
      <path d="M14 5v10" />
      <path d="M11 12l3 3 3-3" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M4 10h12" />
      <path d="M11 5l5 5-5 5" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M11 3h6v6" />
      <path d="M17 3L9 11" />
      <path d="M14 11v5a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h5" />
    </svg>
  );
}

export function RefreshIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M14.5 4.5A7 7 0 1017 10" />
      <path d="M17 4v4h-4" />
    </svg>
  );
}

export function EyeIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M10 4C5 4 1.5 10 1.5 10S5 16 10 16s8.5-6 8.5-6S15 4 10 4z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg {...defaultProps} width={size} height={size} viewBox="0 0 20 20" {...props}>
      <path d="M3 3l14 14" />
      <path d="M10 4c-1.5 0-2.9.4-4.1 1M16.8 7.5C18 8.8 18.5 10 18.5 10s-3.5 6-8.5 6c-1 0-2-.2-2.8-.5" />
      <path d="M7.3 7.3A3 3 0 0012.7 12.7" />
    </svg>
  );
}
