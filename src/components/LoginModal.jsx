import React from 'react';
import { X, LogOut } from 'lucide-react';
import { signInWithGoogle, signOutUser } from '../utils/supabaseService';
import { sound } from '../utils/audio';

export default function LoginModal({ user, userRole, setUserRole, onClose }) {
  const handleGoogleLogin = async () => {
    sound.playClick();
    localStorage.setItem('geo_user_role', 'teacher');
    setUserRole('teacher');
    await signInWithGoogle();
  };

  const handleLogout = async () => {
    sound.playClick();
    await signOutUser();
    localStorage.removeItem('geo_user_role');
    setUserRole('student');
    if (onClose) onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '2.5rem 2rem',
          maxWidth: '520px',
          width: '90%',
          borderRadius: '16px',
          background: '#181818',
          border: '1px solid #282828',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              color: '#888888',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        )}

        {user ? (
          /* User Logged In Status */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <img
              src={user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user'}
              alt="프로필 이미지"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '3px solid #1db954',
                boxShadow: '0 4px 16px rgba(29, 185, 84, 0.4)'
              }}
            />
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
                {user.user_metadata?.full_name || '교사 사용자'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#a0a0a0', marginTop: '4px' }}>
                {user.email}
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '10px',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  background: 'rgba(29, 185, 84, 0.2)',
                  color: '#1db954',
                  border: '1px solid rgba(29, 185, 84, 0.4)'
                }}
              >
                👨‍🏫 교사 계정 로그인됨
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.85rem',
                borderRadius: '9999px',
                border: '1px solid #333',
                background: '#242424',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={18} />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          /* Exact Reference Screenshot Card UI */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* Title with Map Emoji */}
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 1rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '-0.02em'
              }}
            >
              <span>🗺️</span> 우리 반 세계지도
            </h2>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '1rem',
                color: '#cccccc',
                margin: '0 0 2rem 0',
                fontWeight: 500,
                lineHeight: 1.4
              }}
            >
              우리 반 친구들과 함께 세계 여러 나라를 조사해 보아요!
            </p>

            {/* Green Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '9999px',
                background: '#1db954',
                border: 'none',
                color: '#000000',
                fontSize: '1.05rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(29, 185, 84, 0.4)',
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

            {/* Footer Powered By Credit */}
            <div
              style={{
                marginTop: '2.5rem',
                fontSize: '0.85rem',
                color: '#71717a',
                letterSpacing: '-0.01em'
              }}
            >
              powerd by sota / gogh999@gmail.com
            </div>

            {/* Footer Navigation Links */}
            <div
              style={{
                marginTop: '1.25rem',
                fontSize: '0.85rem',
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
        )}
      </div>
    </div>
  );
}
