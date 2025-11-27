/**
 * TimeOfDayCard - 시간/계절/방향 컨트롤 카드
 *
 * 구조:
 * ┌─────────────────────────────────────────┐
 * │  ☀️  12:00                    [▶] [1x]  │  ← 상단: 아이콘 + 시간 + 재생/속도
 * ├─────────────────────────────────────────┤
 * │  ○━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━○    │  ← 중단: 시간 슬라이더
 * │  0시                              24시   │
 * ├─────────────────────────────────────────┤
 * │  [  여름  ▼]         [  남향  ▼]        │  ← 하단: 계절 + 방향 Select
 * └─────────────────────────────────────────┘
 */

import { Slider, Select, Button } from '../common';
import type { SelectOption } from '../common';
import './TimeOfDayCard.css';

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

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type Direction = 'north' | 'south' | 'east' | 'west';

interface TimeOfDayCardProps {
  // 시간
  timeOfDay: number; // 0-100 (하루 중 시간 비율)
  onTimeChange: (time: number) => void;
  timeString: string; // 표시용 시간 문자열 (예: "12:00")

  // 애니메이션
  isAnimating: boolean;
  onToggleAnimation: () => void;
  animationSpeed: number;
  onAnimationSpeedChange: (speed: number) => void;

  // 계절
  season: Season;
  onSeasonChange: (season: Season) => void;

  // 방향
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
}

export function TimeOfDayCard({
  timeOfDay,
  onTimeChange,
  timeString,
  isAnimating,
  onToggleAnimation,
  animationSpeed,
  onAnimationSpeedChange,
  season,
  onSeasonChange,
  direction,
  onDirectionChange,
}: TimeOfDayCardProps) {
  // 시간 슬라이더 값 변환 (0-100 → 0-1440분)
  const sliderValue = Math.round((timeOfDay / 100) * 1440);
  const handleSliderChange = (value: number) => {
    onTimeChange((value / 1440) * 100);
  };

  return (
    <div className="time-of-day-card">
      {/* 상단: 시간 표시 + 재생 컨트롤 */}
      <div className="time-of-day-card__header">
        <div className="time-of-day-card__time-display">
          <span className="time-of-day-card__time-icon">☀️</span>
          <span className="time-of-day-card__time-value">{timeString}</span>
        </div>
        <div className="time-of-day-card__actions">
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

      {/* 중단: 시간 슬라이더 */}
      <div className="time-of-day-card__slider">
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

      {/* 하단: 계절/방향 Select */}
      <div className="time-of-day-card__options">
        <Select
          options={SEASON_OPTIONS}
          value={season}
          onChange={(v) => onSeasonChange(v as Season)}
          size="sm"
        />
        <Select
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={(v) => onDirectionChange(v as Direction)}
          size="sm"
        />
      </div>
    </div>
  );
}

export default TimeOfDayCard;
