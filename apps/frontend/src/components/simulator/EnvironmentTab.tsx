/**
 * EnvironmentTab - 환경 설정 탭
 *
 * 계절, 공간 방위, 하늘 품질, 하늘빛 반사 등 환경 관련 설정
 * 실시간 렌더링 반영
 */

import { Slider, Button, Select } from '../common';
import type { SelectOption } from '../common';
import { PanelSection } from './PanelSection';
import './EnvironmentTab.css';

type Direction = 'north' | 'south' | 'east' | 'west';
type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: 'south', label: '남 (S)' },
  { value: 'north', label: '북 (N)' },
  { value: 'east', label: '동 (E)' },
  { value: 'west', label: '서 (W)' },
];

const SEASON_OPTIONS: SelectOption[] = [
  { value: 'spring', label: '봄' },
  { value: 'summer', label: '여름' },
  { value: 'autumn', label: '가을' },
  { value: 'winter', label: '겨울' },
];

interface EnvironmentTabProps {
  skyMode: 0 | 1 | 2;
  onSkyModeChange: (mode: 0 | 1 | 2) => void;
  envIndirectMult: number;
  onEnvIndirectMultChange: (value: number) => void;
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  season: Season;
  onSeasonChange: (season: Season) => void;
}

export function EnvironmentTab({
  skyMode,
  onSkyModeChange,
  envIndirectMult,
  onEnvIndirectMultChange,
  direction,
  onDirectionChange,
  season,
  onSeasonChange,
}: EnvironmentTabProps) {
  return (
    <div className="environment-tab">
      {/* 계절 */}
      <PanelSection title="계절">
        <Select
          options={SEASON_OPTIONS}
          value={season}
          onChange={(v) => onSeasonChange(v as Season)}
          size="sm"
        />
      </PanelSection>

      {/* 공간 방위 */}
      <PanelSection
        title="공간 방위"
        description="이 공간이 어느 방향을 향하고 있나요?"
      >
        <Select
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={(v) => onDirectionChange(v as Direction)}
          size="sm"
        />
      </PanelSection>

      {/* 하늘 품질 */}
      <PanelSection title="하늘 품질">
        <div className="environment-tab__button-group">
          <Button
            variant={skyMode === 2 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onSkyModeChange(2)}
          >
            고품질
          </Button>
          <Button
            variant={skyMode === 1 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onSkyModeChange(1)}
          >
            일반
          </Button>
          <Button
            variant={skyMode === 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onSkyModeChange(0)}
          >
            없음
          </Button>
        </div>
      </PanelSection>

      {/* 하늘빛 반사 */}
      <PanelSection
        title="하늘빛 반사"
        description="실내에 비치는 하늘색 조명의 강도"
      >
        <Slider
          value={envIndirectMult}
          onChange={onEnvIndirectMultChange}
          min={0}
          max={100}
          step={5}
          valueLabel={`${envIndirectMult}%`}
          showLabels
          minLabel="0%"
          maxLabel="100%"
        />
      </PanelSection>
    </div>
  );
}

export default EnvironmentTab;
