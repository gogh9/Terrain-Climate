import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          background: '#121212',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: "'Noto Sans KR', sans-serif",
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f87171', marginBottom: '1rem' }}>
            ⚠️ 일시적인 화면 렌더링 오류가 발생했습니다
          </h2>
          <p style={{ color: '#a1a1aa', maxWidth: '600px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            데이터를 불러오는 도중 오류가 발생했습니다. 아래 버튼을 눌러 캐시를 초기화하고 화면을 새로고침해 주세요.
          </p>
          <pre style={{
            background: '#1c1c1c',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '1rem',
            color: '#fbbf24',
            fontSize: '0.82rem',
            maxWidth: '650px',
            maxHeight: '150px',
            overflow: 'auto',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            {this.state.error?.message || '알 수 없는 오류'}
          </pre>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('geo_active_view');
                } catch (e) {}
                window.location.reload();
              }}
              style={{
                background: '#1ed760',
                color: '#000000',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '9999px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              🔄 새로고침
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                } catch (e) {}
                window.location.href = window.location.origin + window.location.pathname;
              }}
              style={{
                background: '#282828',
                color: '#ffffff',
                border: '1px solid #444',
                padding: '10px 20px',
                borderRadius: '9999px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🧹 캐시 전체 초기화 후 이동
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

