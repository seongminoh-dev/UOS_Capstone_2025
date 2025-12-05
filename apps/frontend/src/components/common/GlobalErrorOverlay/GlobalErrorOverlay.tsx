/**
 * GlobalErrorOverlay - 전역 에러 오버레이
 *
 * 전체 UI를 블로킹하는 모달 형태의 에러 화면
 * - 렌더러 초기화 실패
 * - Scene 로드 실패
 * - Room 로드 실패
 *
 * 프로덕션 급 디자인 시스템 준수
 */

import { Button } from '../Button';
import './GlobalErrorOverlay.css';

/** 에러 해결책 정보 */
export interface ErrorSolution {
  title: string;
  description: string;
  solutions: string[];
  canRetry: boolean;
}

/** 에러 코드별 해결책 매핑 */
export const ERROR_SOLUTIONS: Record<string, ErrorSolution> = {
  INIT_FAILED: {
    title: '렌더러 초기화 실패',
    description: 'Three.js 렌더러를 초기화하는 중 문제가 발생했습니다.',
    solutions: [
      '페이지를 새로고침 해주세요.',
      '다른 브라우저(Chrome, Edge)를 사용해 보세요.',
      '그래픽 드라이버를 최신 버전으로 업데이트 해주세요.',
    ],
    canRetry: true,
  },
  SCENE_LOAD_FAILED: {
    title: '공간 로드 실패',
    description: '공간 데이터를 불러오는 중 문제가 발생했습니다.',
    solutions: [
      '인터넷 연결 상태를 확인해 주세요.',
      '페이지를 새로고침 해주세요.',
      '문제가 지속되면 공간을 다시 생성해 주세요.',
    ],
    canRetry: true,
  },
  ROOM_LOAD_FAILED: {
    title: '방 모델 로드 실패',
    description: '방 모델 파일을 불러오는 중 문제가 발생했습니다.',
    solutions: [
      '인터넷 연결 상태를 확인해 주세요.',
      '페이지를 새로고침 해주세요.',
      '다른 방 템플릿을 선택해 보세요.',
    ],
    canRetry: true,
  },
  UNKNOWN: {
    title: '알 수 없는 오류',
    description: '예상치 못한 오류가 발생했습니다.',
    solutions: [
      '페이지를 새로고침 해주세요.',
      '문제가 지속되면 관리자에게 문의해 주세요.',
    ],
    canRetry: true,
  },
};

export interface GlobalErrorOverlayProps {
  /** 에러 코드 */
  errorCode: string;
  /** 에러 메시지 */
  errorMessage: string;
  /** 상세 정보 (선택) */
  errorDetails?: string;
  /** 재시도 콜백 */
  onRetry?: () => void;
  /** 뒤로가기 콜백 */
  onBack?: () => void;
}

export function GlobalErrorOverlay({
  errorCode,
  errorMessage,
  errorDetails,
  onRetry,
  onBack,
}: GlobalErrorOverlayProps) {
  const solution = ERROR_SOLUTIONS[errorCode] || ERROR_SOLUTIONS.UNKNOWN;

  return (
    <div className="global-error-overlay">
      <div className="global-error-overlay__card">
        {/* 에러 아이콘 */}
        <div className="global-error-overlay__icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* 제목 */}
        <h2 className="global-error-overlay__title">{solution.title}</h2>

        {/* 설명 */}
        <p className="global-error-overlay__description">{solution.description}</p>

        {/* 해결책 목록 */}
        <div className="global-error-overlay__solutions">
          <h3 className="global-error-overlay__solutions-title">해결 방법</h3>
          <ul className="global-error-overlay__solutions-list">
            {solution.solutions.map((sol, index) => (
              <li key={index} className="global-error-overlay__solutions-item">
                <span className="global-error-overlay__solutions-number">{index + 1}</span>
                <span>{sol}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 액션 버튼 */}
        <div className="global-error-overlay__actions">
          {solution.canRetry && onRetry && (
            <Button variant="primary" size="md" onClick={onRetry}>
              다시 시도
            </Button>
          )}
          {onBack && (
            <Button variant="secondary" size="md" onClick={onBack}>
              목록으로 돌아가기
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={() => window.location.reload()}>
            페이지 새로고침
          </Button>
        </div>

        {/* 기술적 상세 정보 */}
        <details className="global-error-overlay__details">
          <summary className="global-error-overlay__details-summary">
            기술적 상세 정보
          </summary>
          <div className="global-error-overlay__details-content">
            <p><strong>Error Code:</strong> {errorCode}</p>
            <p><strong>Message:</strong> {errorMessage}</p>
            {errorDetails && <p><strong>Details:</strong> {errorDetails}</p>}
          </div>
        </details>
      </div>
    </div>
  );
}

export default GlobalErrorOverlay;
