/**
 * useSunSettings - 태양/하늘 설정 관리 훅
 *
 * 태양 시간, 계절, 방향, 하늘 품질 등을 관리
 * 애니메이션(하루 재생) 기능 포함
 */

import { useState, useEffect, useCallback } from 'react';
import type { SunSettings } from '../graphics-core/service/Scene';

export interface UseSunSettingsOptions {
  initialSettings: SunSettings;
  onSettingsChange?: (settings: SunSettings) => void;
}

export interface UseSunSettingsReturn {
  // 현재 설정값
  sunTime: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  roomDirection: 'north' | 'south' | 'east' | 'west';
  skyMode: 0 | 1 | 2;
  envIndirectMult: number;

  // 설정 변경 함수
  setSunTime: (time: number) => void;
  setSeason: (season: 'spring' | 'summer' | 'autumn' | 'winter') => void;
  setRoomDirection: (direction: 'north' | 'south' | 'east' | 'west') => void;
  setSkyMode: (mode: 0 | 1 | 2) => void;
  setEnvIndirectMult: (value: number) => void;

  // 애니메이션
  isAnimating: boolean;
  animationSpeed: number;
  toggleAnimation: () => void;
  setAnimationSpeed: (speed: number) => void;

  // 유틸
  getTimeString: () => string;
  getSunSettings: () => SunSettings;
  resetToInitial: () => void;
  hasChanges: boolean;
}

export function useSunSettings({
  initialSettings,
  onSettingsChange,
}: UseSunSettingsOptions): UseSunSettingsReturn {
  // 상태
  const [sunTime, setSunTimeState] = useState(initialSettings.timeOfDay);
  const [season, setSeasonState] = useState(initialSettings.season);
  const [roomDirection, setRoomDirectionState] = useState(initialSettings.roomOrientation);
  const [skyMode, setSkyModeState] = useState<0 | 1 | 2>(initialSettings.skyMode ?? 2);
  const [envIndirectMult, setEnvIndirectMultState] = useState(
    Math.round((initialSettings.envIndirectMultiplier ?? 0.5) * 100)
  );

  // 애니메이션 상태
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);

  // 변경 여부 추적
  const [hasChanges, setHasChanges] = useState(false);

  // 설정 변경 핸들러
  const setSunTime = useCallback((time: number) => {
    setSunTimeState(time);
    setHasChanges(true);
  }, []);

  const setSeason = useCallback((s: 'spring' | 'summer' | 'autumn' | 'winter') => {
    setSeasonState(s);
    setHasChanges(true);
  }, []);

  const setRoomDirection = useCallback((d: 'north' | 'south' | 'east' | 'west') => {
    setRoomDirectionState(d);
    setHasChanges(true);
  }, []);

  const setSkyMode = useCallback((mode: 0 | 1 | 2) => {
    setSkyModeState(mode);
    setHasChanges(true);
  }, []);

  const setEnvIndirectMult = useCallback((value: number) => {
    setEnvIndirectMultState(value);
    setHasChanges(true);
  }, []);

  // 애니메이션 토글
  const toggleAnimation = useCallback(() => {
    setIsAnimating((prev) => !prev);
  }, []);

  // 시간 문자열 변환
  const getTimeString = useCallback(() => {
    const totalMinutes = Math.floor((sunTime / 100) * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, [sunTime]);

  // SunSettings 객체 반환
  const getSunSettings = useCallback((): SunSettings => {
    return {
      timeOfDay: sunTime,
      isDaytime: true,
      season,
      roomOrientation: roomDirection,
      skyMode,
      envIndirectMultiplier: envIndirectMult / 100,
    };
  }, [sunTime, season, roomDirection, skyMode, envIndirectMult]);

  // 초기값으로 리셋
  const resetToInitial = useCallback(() => {
    setSunTimeState(initialSettings.timeOfDay);
    setSeasonState(initialSettings.season);
    setRoomDirectionState(initialSettings.roomOrientation);
    setSkyModeState(initialSettings.skyMode ?? 2);
    setEnvIndirectMultState(Math.round((initialSettings.envIndirectMultiplier ?? 0.5) * 100));
    setHasChanges(false);
    setIsAnimating(false);
  }, [initialSettings]);

  // 설정 변경 시 콜백 호출
  useEffect(() => {
    if (onSettingsChange && hasChanges) {
      onSettingsChange(getSunSettings());
    }
  }, [sunTime, season, roomDirection, skyMode, envIndirectMult, onSettingsChange, getSunSettings, hasChanges]);

  // 애니메이션 효과
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setSunTimeState((prev) => {
        const next = prev + animationSpeed * 0.5;
        return next >= 100 ? 0 : next;
      });
      setHasChanges(true);
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, animationSpeed]);

  return {
    // 설정값
    sunTime,
    season,
    roomDirection,
    skyMode,
    envIndirectMult,

    // 설정 함수
    setSunTime,
    setSeason,
    setRoomDirection,
    setSkyMode,
    setEnvIndirectMult,

    // 애니메이션
    isAnimating,
    animationSpeed,
    toggleAnimation,
    setAnimationSpeed,

    // 유틸
    getTimeString,
    getSunSettings,
    resetToInitial,
    hasChanges,
  };
}

export default useSunSettings;
