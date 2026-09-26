import React, { useState } from 'react';
import { signInWithGoogle } from '../utils/supabaseService';
import { sound } from '../utils/audio';
import { LogIn, Sparkles, User, Hash, School, ShieldCheck, HelpCircle } from 'lucide-react';

export default function LandingScreen({
  isStudentSession = false,
  sessionInfo = null,
  onStudentLogin,
  setUserRole
}) {
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
        {/* Header Icon / Badge */}
        {isStudentSession ? (
          /* Student Session Mode Header */
          <>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 0.8rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                letterSpacing: '-0.02em',
                wordBreak: 'keep-all'
              }}
            >
              <span>🎒</span> 지형과 기후 탐험
            </h1>

            {sessionInfo && (
              <div
                style={{
                  marginBottom: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: 'rgba(30, 215, 96, 0.12)',
                  border: '1px solid rgba(30, 215, 96, 0.35)',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  color: '#1ed760',
                  fontWeight: 700
                }}
              >
                <Sparkles size={14} />
                <span>{sessionInfo.title || '우리 반 수업 지도'} 참여 모드</span>
              </div>
            )}

            <p
              style={{
                fontSize: '0.95rem',
                color: '#b3b3b3',
                margin: '0 0 1.8rem 0',
                fontWeight: 400,
                lineHeight: 1.6,
                wordBreak: 'keep-all'
              }}
            >
              선생님 지도에 참여하기 위해 본인의 정보를 입력해 주세요.
            </p>

            {/* Student Class, Number & Name Login Form */}
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
            </form>
          </>
        ) : (
          /* Teacher Mode Landing Page (Root access) */
          <>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                background: 'rgba(30, 215, 96, 0.12)',
                border: '1px solid rgba(30, 215, 96, 0.35)',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                color: '#1ed760',
                fontWeight: 700,
                marginBottom: '1.2rem'
              }}
            >
              <ShieldCheck size={15} />
              <span>교사 전용 워크스페이스</span>
            </div>

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
              <span>🗺️</span> 지형과 기후를 알아봅시다
            </h1>

            <p
              style={{
                fontSize: '0.98rem',
                color: '#b3b3b3',
                margin: '0 0 2rem 0',
                fontWeight: 400,
                lineHeight: 1.65,
                wordBreak: 'keep-all',
                maxWidth: '440px'
              }}
            >
              구글 계정으로 로그인하여 수업용 세계지도를 개설하고, 학생들의 탐험 활동과 제출 답안을 실시간으로 관리하세요.
            </p>

            {/* Teacher Google Login Button */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={handleGoogleLogin}
                style={{
                  width: '100%',
                  padding: '1.15rem',
                  borderRadius: '9999px',
                  background: '#1ed760',
                  border: 'none',
                  color: '#000000',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(29, 215, 96, 0.4)',
                  transition: 'transform 0.15s ease, background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
                  <path
                    fill="#000000"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#000000"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#000000"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#000000"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>구글 계정으로 교사 로그인</span>
              </button>

              {/* Student Guide Note */}
              <div
                style={{
                  background: '#242424',
                  border: '1px solid #333333',
                  borderRadius: '12px',
                  padding: '0.9rem 1.1rem',
                  fontSize: '0.84rem',
                  color: '#a1a1aa',
                  lineHeight: 1.5,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginTop: '0.5rem'
                }}
              >
                <HelpCircle size={16} color="#1ed760" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong style={{ color: '#ffffff' }}>학생 참여 안내:</strong> 학생은 교사가 개설한 수업 링크를 통해서만 접속할 수 있습니다.
                </span>
              </div>
            </div>
          </>
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
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1ed760'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
          >
            개인정보처리방침
          </a>
          <span>·</span>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1ed760'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
          >
            사용약관
          </a>
          <span>·</span>
          <a
            href="/help.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s ease' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1ed760'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3b3'}
          >
            도움말
          </a>
        </div>
      </div>
    </div>
  );
}

