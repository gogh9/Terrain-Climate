import React from 'react';
import { signInWithGoogle } from '../utils/supabaseService';
import { sound } from '../utils/audio';

export default function LandingScreen({ setUserRole }) {
  const handleGoogleLogin = async () => {
    sound.playClick();
    localStorage.setItem('geo_user_role', 'teacher');
    if (setUserRole) setUserRole('teacher');
    await signInWithGoogle();
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0d0d0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: "'Noto Sans KR', sans-serif"
      }}
    >
      <div
        style={{
          padding: '3rem 2.5rem',
          maxWidth: '560px',
          width: '100%',
          borderRadius: '20px',
          background: '#181818',
          border: '1px solid #282828',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
          textAlign: 'center',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: '2.1rem',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 1.2rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            letterSpacing: '-0.02em',
            wordBreak: 'keep-all'
          }}
        >
          <span>🗺️</span> 지형과 기후를 알아봅시다.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '1.05rem',
            color: '#cccccc',
            margin: '0 0 2.5rem 0',
            fontWeight: 500,
            lineHeight: 1.55,
            wordBreak: 'keep-all'
          }}
        >
          우리 반 친구들과 함께 세계 여러 나라의 지형과 기후를 조사해 보아요!
        </p>

        {/* Green Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '1.1rem',
            borderRadius: '9999px',
            background: '#1db954',
            border: 'none',
            color: '#000000',
            fontSize: '1.1rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(29, 185, 84, 0.45)',
            transition: 'transform 0.15s ease, background 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1ed760';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1db954';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          GOOGLE 로그인
        </button>

        {/* Footer Credit */}
        <div
          style={{
            marginTop: '3rem',
            fontSize: '0.88rem',
            color: '#71717a',
            letterSpacing: '-0.01em'
          }}
        >
          powerd by sota / gogh999@gmail.com
        </div>



        {/* Footer Links */}
        <div
          style={{
            marginTop: '1.25rem',
            fontSize: '0.88rem',
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            gap: '1.2rem'
          }}
        >
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
            개인정보처리방침
          </a>
          <span>·</span>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
            사용약관
          </a>
          <span>·</span>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
            도움말
          </a>
        </div>

      </div>
    </div>
  );
}
