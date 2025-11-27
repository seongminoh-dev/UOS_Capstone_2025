/**
 * EnvironmentTab - 환경 설정 탭
 *
 * 하늘 품질, 하늘빛 반사 등 환경 관련 설정
 * 추후 확장 가능 (안개, 대기 효과 등)
 */

import { Slider, Button } from '../common';
import './EnvironmentTab.css';

interface EnvironmentTabProps {
  skyMode: 0 | 1 | 2;
  onSkyModeChange: (mode: 0 | 1 | 2) => void;
  envIndirectMult: number;
  onEnvIndirectMultChange: (value: number) => void;
}

export function EnvironmentTab({
  skyMode,
  onSkyModeChange,
  envIndirectMult,
  onEnvIndirectMultChange,
}: EnvironmentTabProps) {
  return (
    <div className="environment-tab">
      {/* 하늘 품질 */}
      <div className="environment-tab__section">
        <h4 className="environment-tab__section-title">하늘 품질</h4>
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
      </div>

      {/* 하늘빛 반사 */}
      <div className="environment-tab__section">
        <h4 className="environment-tab__section-title">하늘빛 반사</h4>
        <p className="environment-tab__description">
          실내에 비치는 하늘색 조명의 강도
        </p>
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
      </div>
    </div>
  );
}

export default EnvironmentTab;
