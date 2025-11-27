/**
 * ViewportGuard - 최소 뷰포트 가드
 *
 * 데스크톱 전용 서비스를 위한 최소 뷰포트 체크
 * 1024px 미만일 경우 안내 메시지 표시
 */

import { useState, useEffect, type ReactNode } from 'react';
import './ViewportGuard.css';

interface ViewportGuardProps {
  children: ReactNode;
  minWidth?: number;
}

const MIN_VIEWPORT_WIDTH = 1024;

export default function ViewportGuard({
  children,
  minWidth = MIN_VIEWPORT_WIDTH,
}: ViewportGuardProps) {
  const [isTooSmall, setIsTooSmall] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      setIsTooSmall(window.innerWidth < minWidth);
    };

    // 초기 체크
    checkViewport();

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [minWidth]);

  if (isTooSmall) {
    return (
      <div className="viewport-guard">
        <div className="viewport-guard-content">
          <div className="viewport-guard-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>

          <h1 className="viewport-guard-title">
            데스크톱에서 이용해 주세요
          </h1>

          <p className="viewport-guard-description">
            Intery는 WebGPU 기반의 고품질 렌더링을 제공하기 위해
            <br />
            데스크톱 환경에 최적화되어 있습니다.
          </p>

          <div className="viewport-guard-tips">
            <div className="tip-item">
              <span className="tip-icon">💡</span>
              <span>브라우저 창을 최대화해 보세요</span>
            </div>
            <div className="tip-item">
              <span className="tip-icon">🖥️</span>
              <span>1024px 이상의 화면이 필요합니다</span>
            </div>
          </div>

          <div className="viewport-guard-footer">
            <p className="footer-note">
              현재 화면 너비: {typeof window !== 'undefined' ? window.innerWidth : 0}px
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
