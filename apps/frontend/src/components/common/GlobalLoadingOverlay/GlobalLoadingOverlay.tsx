/**
 * GlobalLoadingOverlay - 전역 로딩 오버레이
 *
 * 전체 UI를 블로킹하는 모달 형태의 로딩 화면
 * - 렌더러 초기화
 * - Scene 로드
 * - Asset 로드
 *
 * 프로덕션 급 디자인 시스템 준수
 */

import { useEffect, useState } from 'react';
import './GlobalLoadingOverlay.css';

/** 로딩 진행 상태 */
export interface LoadingProgress {
  /** 현재 단계 (1-based) */
  step: number;
  /** 총 단계 수 */
  totalSteps: number;
  /** 현재 단계 메시지 */
  message: string;
  /** 서브 메시지 (선택) */
  subMessage?: string;
  /** Asset 로딩 시 - 로드된 개수 */
  loadedCount?: number;
  /** Asset 로딩 시 - 전체 개수 */
  totalCount?: number;
  /** Asset 로딩 시 - 현재 Asset 이름 */
  currentAssetName?: string;
}

export interface GlobalLoadingOverlayProps {
  /** 로딩 표시 여부 */
  isLoading: boolean;
  /** 진행 상태 */
  progress?: LoadingProgress | null;
  /** 기본 메시지 (progress 없을 때) */
  defaultMessage?: string;
  /** 기본 서브 메시지 */
  defaultSubMessage?: string;
}

export function GlobalLoadingOverlay({
  isLoading,
  progress,
  defaultMessage = '불러오는 중...',
  defaultSubMessage = '잠시만 기다려주세요',
}: GlobalLoadingOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // 로딩 상태 변경 시 애니메이션 처리
  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      setIsAnimatingOut(false);
    } else if (isVisible) {
      // 페이드 아웃 애니메이션 후 숨김
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isVisible]);

  if (!isVisible) return null;

  const hasAssetProgress = progress?.loadedCount !== undefined && progress?.totalCount !== undefined;
  const assetPercent = hasAssetProgress
    ? Math.round((progress!.loadedCount! / progress!.totalCount!) * 100)
    : 0;
  const stepPercent = progress
    ? Math.round((progress.step / progress.totalSteps) * 100)
    : 0;

  return (
    <div className={`global-loading-overlay ${isAnimatingOut ? 'global-loading-overlay--fade-out' : ''}`}>
      <div className="global-loading-overlay__content">
        {/* 스피너 */}
        <div className="global-loading-overlay__spinner">
          <div className="global-loading-overlay__spinner-ring" />
          <div className="global-loading-overlay__spinner-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        </div>

        {/* 메인 메시지 */}
        <h2 className="global-loading-overlay__title">
          {progress?.message || defaultMessage}
        </h2>

        {/* 전체 진행 상태 */}
        {progress && (
          <div className="global-loading-overlay__progress">
            <div className="global-loading-overlay__progress-header">
              <span className="global-loading-overlay__progress-step">
                단계 {progress.step} / {progress.totalSteps}
              </span>
              <span className="global-loading-overlay__progress-percent">
                {stepPercent}%
              </span>
            </div>
            <div className="global-loading-overlay__progress-bar">
              <div
                className="global-loading-overlay__progress-fill"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Asset 로딩 상세 (있을 때만) */}
        {hasAssetProgress && (
          <div className="global-loading-overlay__asset-progress">
            <div className="global-loading-overlay__asset-header">
              <span className="global-loading-overlay__asset-label">
                에셋 로딩
              </span>
              <span className="global-loading-overlay__asset-count">
                {progress!.loadedCount} / {progress!.totalCount}
                <span className="global-loading-overlay__asset-percent">
                  ({assetPercent}%)
                </span>
              </span>
            </div>
            <div className="global-loading-overlay__asset-bar">
              <div
                className="global-loading-overlay__asset-fill"
                style={{ width: `${assetPercent}%` }}
              />
            </div>
            {progress?.currentAssetName && (
              <div className="global-loading-overlay__asset-current">
                <span className="global-loading-overlay__asset-dot" />
                <span>{progress.currentAssetName}</span>
              </div>
            )}
          </div>
        )}

        {/* 서브 메시지 */}
        {!progress && (
          <p className="global-loading-overlay__sub-message">
            {defaultSubMessage}
          </p>
        )}
        {progress?.subMessage && (
          <p className="global-loading-overlay__sub-message">
            {progress.subMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export default GlobalLoadingOverlay;
