/**
 * QuickControls - 빠른 조작 컨트롤
 *
 * 시간 슬라이더, 재생 버튼, 계절/방향 선택
 * 항상 패널 상단에 표시되어 빠른 접근 가능
 */

import { Slider, Select, Button } from '../common';
import type { SelectOption } from '../common';
import './QuickControls.css';

const SEASON_OPTIONS: SelectOption[] = [
  { value: 'spring', label: '봄' },
  { value: 'summer', label: '여름' },
  { value: 'autumn', label: '가을' },
  { value: 'winter', label: '겨울' },
];

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: 'east', label: '동향' },
  { value: 'west', label: '서향' },
  { value: 'south', label: '남향' },
  { value: 'north', label: '북향' },
];

const SPEED_OPTIONS: SelectOption[] = [
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '4', label: '4x' },
];

interface QuickControlsProps {
  // 시간
  sunTime: number;
  onSunTimeChange: (time: number) => void;
  timeString: string;

  // 애니메이션
  isAnimating: boolean;
  onToggleAnimation: () => void;
  animationSpeed: number;
  onAnimationSpeedChange: (speed: number) => void;

  // 계절/방향
  season: string;
  onSeasonChange: (season: 'spring' | 'summer' | 'autumn' | 'winter') => void;
  roomDirection: string;
  onRoomDirectionChange: (direction: 'north' | 'south' | 'east' | 'west') => void;
}

export function QuickControls({
  sunTime,
  onSunTimeChange,
  timeString,
  isAnimating,
  onToggleAnimation,
  animationSpeed,
  onAnimationSpeedChange,
  season,
  onSeasonChange,
  roomDirection,
  onRoomDirectionChange,
}: QuickControlsProps) {
  // 시간 슬라이더 값 변환 (0-100 → 0-1440분)
  const sliderValue = Math.round((sunTime / 100) * 1440);
  const handleSliderChange = (value: number) => {
    onSunTimeChange((value / 1440) * 100);
  };

  return (
    <div className="quick-controls">
      {/* 시간 컨트롤 */}
      <div className="quick-controls__time">
        <div className="quick-controls__time-header">
          <span className="quick-controls__time-icon">☀️</span>
          <span className="quick-controls__time-value">{timeString}</span>
          <div className="quick-controls__time-actions">
            <Button
              variant={isAnimating ? 'primary' : 'secondary'}
              size="sm"
              onClick={onToggleAnimation}
              title={isAnimating ? '정지' : '하루 재생'}
            >
              {isAnimating ? '⏹' : '▶'}
            </Button>
            {isAnimating && (
              <Select
                options={SPEED_OPTIONS}
                value={String(animationSpeed)}
                onChange={(v) => onAnimationSpeedChange(Number(v))}
                size="sm"
              />
            )}
          </div>
        </div>
        <Slider
          value={sliderValue}
          onChange={handleSliderChange}
          min={0}
          max={1440}
          step={20}
          showLabels
          minLabel="0시"
          maxLabel="24시"
        />
      </div>

      {/* 계절/방향 컨트롤 */}
      <div className="quick-controls__selects">
        <Select
          options={SEASON_OPTIONS}
          value={season}
          onChange={(v) => onSeasonChange(v as 'spring' | 'summer' | 'autumn' | 'winter')}
          size="sm"
        />
        <Select
          options={DIRECTION_OPTIONS}
          value={roomDirection}
          onChange={(v) => onRoomDirectionChange(v as 'north' | 'south' | 'east' | 'west')}
          size="sm"
        />
      </div>
    </div>
  );
}

export default QuickControls;
