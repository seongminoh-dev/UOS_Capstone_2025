import { Component, ReactNode } from 'react';

// 에러 타입별 해결책 정의
interface ErrorSolution {
  title: string;
  description: string;
  solutions: string[];
  canRetry: boolean;
}

const ERROR_SOLUTIONS: Record<string, ErrorSolution> = {
  // WebGPU 관련 에러
  webgpu_not_supported: {
    title: 'WebGPU를 지원하지 않는 브라우저',
    description: '이 브라우저는 WebGPU를 지원하지 않습니다.',
    solutions: [
      'Chrome 113 이상 버전으로 업데이트하세요',
      'Edge 113 이상 버전을 사용하세요',
      'Firefox Nightly에서 dom.webgpu.enabled 플래그를 활성화하세요',
      'Safari 17 이상 (macOS Sonoma)을 사용하세요',
    ],
    canRetry: false,
  },
  webgpu_device_lost: {
    title: 'GPU 연결이 끊어졌습니다',
    description: 'GPU 디바이스와의 연결이 끊어졌습니다.',
    solutions: [
      '페이지를 새로고침하세요',
      '다른 GPU 집약적인 프로그램을 종료해보세요',
      '그래픽 드라이버를 최신 버전으로 업데이트하세요',
      '브라우저를 재시작하세요',
    ],
    canRetry: true,
  },
  webgpu_out_of_memory: {
    title: 'GPU 메모리 부족',
    description: 'GPU 메모리가 부족하여 렌더링할 수 없습니다.',
    solutions: [
      '다른 탭이나 GPU 사용 프로그램을 종료하세요',
      '더 작은 씬을 선택하세요',
      '페이지를 새로고침하세요',
      '브라우저를 재시작하세요',
    ],
    canRetry: true,
  },
  shader_compilation: {
    title: '셰이더 컴파일 오류',
    description: '그래픽 셰이더 컴파일에 실패했습니다.',
    solutions: [
      '페이지를 새로고침하세요',
      '그래픽 드라이버를 업데이트하세요',
      '다른 브라우저에서 시도해보세요',
      '문제가 지속되면 개발팀에 문의하세요',
    ],
    canRetry: true,
  },
  // Three.js 관련 에러
  webgl_not_supported: {
    title: 'WebGL을 지원하지 않는 브라우저',
    description: '이 브라우저는 WebGL을 지원하지 않습니다.',
    solutions: [
      '최신 버전의 Chrome, Firefox, Edge, Safari를 사용하세요',
      '하드웨어 가속이 활성화되어 있는지 확인하세요',
      '그래픽 드라이버를 업데이트하세요',
    ],
    canRetry: false,
  },
  model_load_failed: {
    title: '3D 모델 로드 실패',
    description: '3D 모델 파일을 불러오는데 실패했습니다.',
    solutions: [
      '인터넷 연결을 확인하세요',
      '페이지를 새로고침하세요',
      '다른 씬을 선택해보세요',
      '브라우저 캐시를 삭제해보세요',
    ],
    canRetry: true,
  },
  // 네트워크 관련 에러
  network_error: {
    title: '네트워크 오류',
    description: '서버와의 연결에 문제가 발생했습니다.',
    solutions: [
      '인터넷 연결을 확인하세요',
      '잠시 후 다시 시도하세요',
      'VPN을 사용 중이라면 비활성화해보세요',
    ],
    canRetry: true,
  },
  // 일반 에러
  unknown: {
    title: '예상치 못한 오류',
    description: '알 수 없는 오류가 발생했습니다.',
    solutions: [
      '페이지를 새로고침하세요',
      '브라우저 캐시를 삭제해보세요',
      '다른 브라우저에서 시도해보세요',
      '문제가 지속되면 개발팀에 문의하세요',
    ],
    canRetry: true,
  },
};

// 에러 메시지에서 에러 타입 추론
function detectErrorType(error: Error): string {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // WebGPU 관련
  if (message.includes('webgpu') && (message.includes('not supported') || message.includes('unavailable'))) {
    return 'webgpu_not_supported';
  }
  if (message.includes('device') && message.includes('lost')) {
    return 'webgpu_device_lost';
  }
  if (message.includes('out of memory') || message.includes('allocation failed')) {
    return 'webgpu_out_of_memory';
  }
  if (message.includes('shader') || message.includes('compilation') || message.includes('wgsl')) {
    return 'shader_compilation';
  }

  // WebGL/Three.js 관련
  if (message.includes('webgl') && (message.includes('not supported') || message.includes('unavailable'))) {
    return 'webgl_not_supported';
  }
  if (message.includes('load') && (message.includes('model') || message.includes('gltf') || message.includes('glb'))) {
    return 'model_load_failed';
  }

  // 네트워크 관련
  if (name.includes('network') || message.includes('network') || message.includes('fetch') || message.includes('cors')) {
    return 'network_error';
  }

  return 'unknown';
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: string;
}

/**
 * ErrorBoundary - GPU/렌더링 에러를 잡아 사용자에게 해결책을 제시하는 컴포넌트
 *
 * 사용법:
 * <ErrorBoundary>
 *   <WebGPURenderer ... />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorType = detectErrorType(error);
    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 에러 로깅 (추후 에러 리포팅 서비스 연동 가능)
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'unknown',
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const solution = ERROR_SOLUTIONS[this.state.errorType] || ERROR_SOLUTIONS.unknown;
      const { fallbackTitle } = this.props;

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            {/* 에러 아이콘 */}
            <div style={styles.iconContainer}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ff6b6b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* 에러 제목 */}
            <h2 style={styles.title}>
              {fallbackTitle || solution.title}
            </h2>

            {/* 에러 설명 */}
            <p style={styles.description}>
              {solution.description}
            </p>

            {/* 해결책 목록 */}
            <div style={styles.solutionsContainer}>
              <h3 style={styles.solutionsTitle}>해결 방법</h3>
              <ul style={styles.solutionsList}>
                {solution.solutions.map((sol, index) => (
                  <li key={index} style={styles.solutionItem}>
                    <span style={styles.solutionNumber}>{index + 1}</span>
                    <span>{sol}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 액션 버튼들 */}
            <div style={styles.buttonContainer}>
              {solution.canRetry && (
                <button
                  onClick={this.handleRetry}
                  style={styles.retryButton}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#3d8bfd';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#0d6efd';
                  }}
                >
                  다시 시도
                </button>
              )}
              <button
                onClick={this.handleRefresh}
                style={styles.refreshButton}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a6268';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6c757d';
                }}
              >
                페이지 새로고침
              </button>
            </div>

            {/* 기술적 상세 정보 (접기/펼치기) */}
            <details style={styles.details}>
              <summary style={styles.summary}>기술적 상세 정보</summary>
              <div style={styles.errorDetails}>
                <p><strong>Error Type:</strong> {this.state.errorType}</p>
                <p><strong>Error Name:</strong> {this.state.error?.name}</p>
                <p><strong>Error Message:</strong> {this.state.error?.message}</p>
                {this.state.error?.stack && (
                  <pre style={styles.stackTrace}>
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 스타일 정의
const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    border: '1px solid #0f3460',
  },
  iconContainer: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    color: '#ff6b6b',
    fontSize: '20px',
    fontWeight: 600,
    textAlign: 'center',
    margin: '0 0 12px 0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  description: {
    color: '#a0a0a0',
    fontSize: '14px',
    textAlign: 'center',
    margin: '0 0 24px 0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  solutionsContainer: {
    backgroundColor: '#0f3460',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  solutionsTitle: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 12px 0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  solutionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  solutionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    color: '#c0c0c0',
    fontSize: '13px',
    marginBottom: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.5,
  },
  solutionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    backgroundColor: '#1a1a2e',
    borderRadius: '50%',
    fontSize: '11px',
    fontWeight: 600,
    color: '#4dabf7',
    flexShrink: 0,
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  retryButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#0d6efd',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'background-color 0.2s',
  },
  refreshButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#6c757d',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'background-color 0.2s',
  },
  details: {
    borderTop: '1px solid #0f3460',
    paddingTop: '16px',
  },
  summary: {
    color: '#6c757d',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    userSelect: 'none',
  },
  errorDetails: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#0a0a1a',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#888',
    fontFamily: 'monospace',
    wordBreak: 'break-word',
  },
  stackTrace: {
    margin: '8px 0 0 0',
    padding: '8px',
    backgroundColor: '#050510',
    borderRadius: '4px',
    fontSize: '10px',
    overflow: 'auto',
    maxHeight: '150px',
    whiteSpace: 'pre-wrap',
  },
};

export default ErrorBoundary;
