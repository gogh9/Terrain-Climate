import React from 'react';
import { X, LogIn, UserCheck, Shield, GraduationCap, LogOut } from 'lucide-react';
import { signInWithGoogle, signOutUser } from '../utils/supabaseService';
import { sound } from '../utils/audio';

export default function LoginModal({ user, userRole, setUserRole, onClose }) {
  const handleGoogleLogin = async (role) => {
    sound.playClick();
    localStorage.setItem('geo_user_role', role);
    setUserRole(role);
    await signInWithGoogle();
  };

  const handleLogout = async () => {
    sound.playClick();
    await signOutUser();
    localStorage.removeItem('geo_user_role');
    setUserRole('student');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '2rem',
          maxWidth: '480px',
          borderRadius: '24px',
          textAlign: 'center'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem' }}>🔐</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'white' }}>
              구글 계정 로그인
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#94a3b8',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {user ? (
          /* User Logged In Status */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
            <img
              src={user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user'}
              alt="프로필 이미지"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '3px solid #38bdf8',
                boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)'
              }}
            />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>
                {user.user_metadata?.full_name || '로그인된 사용자'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                {user.email}
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '8px',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: userRole === 'teacher' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: userRole === 'teacher' ? '#34d399' : '#38bdf8',
                  border: `1px solid ${userRole === 'teacher' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
                }}
              >
                {userRole === 'teacher' ? '👨‍🏫 선생님 계정' : '🎓 학생 계정'}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', color: '#ef4444' }}
            >
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          /* Login Selector Options */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              구글 계정으로 로그인하여 제출 기록을 안전하게 관리하고 선생님 대시보드에 연동하세요.
            </p>

            {/* Student Google Login Button */}
            <button
              className="btn btn-primary"
              onClick={() => handleGoogleLogin('student')}
              style={{
                width: '100%',
                padding: '0.85rem 1.2rem',
                fontSize: '0.95rem',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              <GraduationCap size={20} />
              <span>🎓 학생용 구글 로그인</span>
            </button>

            {/* Teacher Google Login Button */}
            <button
              className="btn btn-primary"
              onClick={() => handleGoogleLogin('teacher')}
              style={{
                width: '100%',
                padding: '0.85rem 1.2rem',
                fontSize: '0.95rem',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Shield size={20} />
              <span>👨‍🏫 교사용 구글 로그인</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
