import React, { useState } from 'react';
import { signInWithGoogle } from '../utils/supabaseService';
import { sound } from '../utils/audio';
import { LogIn, Sparkles, User, Hash, School } from 'lucide-react';

export default function LandingScreen({
  isStudentSession = false,
  sessionInfo = null,
  onStudentLogin,
  setUserRole
}) {
  const [studentMode, setStudentMode] = useState(isStudentSession);

  React.useEffect(() => {
    setStudentMode(isStudentSession);
  }, [isStudentSession]);
  const [studentClass, setStudentClass] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_student_user');
      return saved ? JSON.parse(saved).studentClass || '' : '';
    } catch { return ''; }
  });
  const [studentNumber, setStudentNumber] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_student_user');
      return saved ? JSON.parse(saved).number || '' : '';
    } catch { return ''; }
  });
  const [studentName, setStudentName] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_student_user');
      return saved ? JSON.parse(saved).name || '' : '';
    } catch { return ''; }
  });

  const handleGoogleLogin = async () => {
    sound.playClick();
    localStorage.setItem('geo_user_role', 'teacher');
    if (setUserRole) setUserRole('teacher');
    await signInWithGoogle();
  };

  const handleStudentSubmit = (e) => {
    e.preventDefault();
    const cleanClass = studentClass.trim();
    const cleanNum = studentNumber.trim();
    const cleanName = studentName.trim();

    if (!cleanClass) {
      alert('반을 입력해 주세요!');
      return;
    }
    if (!cleanNum) {
      alert('출석 번호를 입력해 주세요!');
      return;
    }
    if (!cleanName) {
      alert('학생 이름을 입력해 주세요!');
      return;
    }

    sound.playSuccess();
    if (onStudentLogin) {
      onStudentLogin({
        studentClass: cleanClass,
        number: cleanNum,
        name: cleanName
      });
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#121212',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div
        style={{
          padding: '3.2rem 2.5rem',
          maxWidth: '540px',
          width: '100%',
          borderRadius: '16px',
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
            margin: '0 0 1rem 0',
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
            fontSize: '1rem',
            color: '#b3b3b3',
            margin: '0 0 1.8rem 0',
            fontWeight: 400,
            lineHeight: 1.6,
            wordBreak: 'keep-all'
          }}
        >
          우리 반 친구들과 함께 세계 여러 나라의 지형과 기후를 조사해 보아요!
        </p>

        {/* Student Session Badge if present */}
        {sessionInfo && (
          <div
            style={{
              marginBottom: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'rgba(30, 215, 96, 0.12)',
              border: '1px solid rgba(30, 215, 96, 0.35)',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              color: '#1ed760',
              fontWeight: 700
            }}
          >
            <Sparkles size={14} />
            <span>{sessionInfo.title || '우리 반 세계지도'} 참여 모드</span>
          </div>
        )}

        {isStudentSession || studentMode ? (
          /* Student Class, Number & Name Login Form */
          <form
            onSubmit={handleStudentSubmit}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.75rem', textAlign: 'left' }}>
              {/* Class Input */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#b3b3b3',
                    marginBottom: '6px',
                    fontWeight: 600
                  }}
                >
                  <School size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                  반
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder="반"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.85rem 0.75rem',
                    background: '#242424',
                    border: '1px solid #3e3e3e',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1ed760';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(30, 215, 96, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#3e3e3e';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Number Input */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#b3b3b3',
                    marginBottom: '6px',
                    fontWeight: 600
                  }}
                >
                  <Hash size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                  번호
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder="번호"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 0.75rem',
                    background: '#242424',
                    border: '1px solid #3e3e3e',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1ed760';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(30, 215, 96, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#3e3e3e';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Name Input */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#b3b3b3',
                    marginBottom: '6px',
                    fontWeight: 600
                  }}
                >
                  <User size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                  이름
                </label>
                <input
                  type="text"
                  placeholder="이름"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: '#242424',
                    border: '1px solid #3e3e3e',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1ed760';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(30, 215, 96, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#3e3e3e';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Spotify Green Enter Button */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '1.05rem',
                borderRadius: '9999px',
                background: '#1ed760',
                border: 'none',
                color: '#000000',
                fontSize: '1.02rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(29, 215, 96, 0.4)',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <LogIn size={18} />
              <span>세계 지형도 탐험 시작하기</span>
            </button>

            {/* Switch to Teacher Google Login */}
            <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStudentMode(false);
                  try {
                    window.history.replaceState(null, '', window.location.pathname);
                  } catch (e) {}
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}
              >
                선생님 구글 계정으로 로그인하기
              </button>
            </div>
          </form>
        ) : (
          /* Teacher Google Login Screen (Only shown when not on student session link) */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <button
              onClick={handleGoogleLogin}
              style={{
                width: '100%',
                padding: '1.1rem',
                borderRadius: '9999px',
                background: '#1ed760',
                border: 'none',
                color: '#000000',
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.6px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(29, 215, 96, 0.4)',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              GOOGLE 로그인
            </button>

            {/* Switch to Student Login */}
            <div style={{ marginTop: '0.4rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStudentMode(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}
              >
                학생 참여 모드로 전환
              </button>
            </div>
          </div>
        )}

        {/* Footer Credit */}
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

        {/* Footer Links */}
        <div
          style={{
            marginTop: '1.25rem',
            fontSize: '0.85rem',
            color: '#b3b3b3',
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
