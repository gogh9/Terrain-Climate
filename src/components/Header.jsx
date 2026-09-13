import React from 'react';
import { Globe, FileText, CheckCircle2, Users, LogOut } from 'lucide-react';
import { sound } from '../utils/audio';

export default function Header({
  completedIds,
  totalCount,
  onOpenSummaryNote,
  onOpenTeacherDashboard,
  user,
  userRole,
  studentUser,
  onStudentLogout,
  onOpenLoginModal,
  categoryFilter = 'all'
}) {
  const completedCount = completedIds.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <header
      style={{
        background: '#121212',
        borderBottom: '1px solid #282828',
        padding: '0.75rem 1.5rem',
        zIndex: 1000,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Title & Brand Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              background: '#181818',
              border: '1px solid #282828',
              padding: '0.5rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
          >
            <Globe size={24} color="#1ed760" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                6학년 사회 세계 지형·기후 백지도 탐험
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  background: 'rgba(30, 215, 96, 0.15)',
                  color: '#1ed760',
                  border: '1px solid rgba(30, 215, 96, 0.3)',
                  padding: '2px 10px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px'
                }}
              >
                {categoryFilter === 'landform' ? '🏔️ 지형만 보기' : categoryFilter === 'climate' ? '☀️ 기후만 보기' : '🗺️ 지형&기후 전체'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#b3b3b3', marginTop: '2px' }}>
              백지도의 지점을 클릭하여 해당 지역의 지형과 기후 특징을 확인하고 학습해 보세요.
            </p>
          </div>
        </div>

        {/* Right Controls & Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Spotify Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '170px' }}>
            <div style={{ flex: 1, height: '8px', background: '#1f1f1f', borderRadius: '9999px', overflow: 'hidden', border: '1px solid #282828' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: '#1ed760',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', color: '#1ed760' }}>
              <CheckCircle2 size={16} />
              <span>{completedCount} / {totalCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <button
            className="btn btn-secondary"
            onClick={() => { sound.playClick(); onOpenSummaryNote(); }}
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
          >
            <FileText size={15} />
            <span>학습 요약 노트</span>
          </button>

          {/* Student Profile & Logout (Shown when Student is logged in without Teacher) */}
          {studentUser && !user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  background: '#181818',
                  border: '1px solid #1ed760',
                  borderRadius: '9999px',
                  padding: '0.35rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(29, 215, 96, 0.25)'
                }}
              >
                <span>🎒</span>
                <span>{studentUser.fullName}</span>
                <span style={{ fontSize: '0.72rem', color: '#1ed760', fontWeight: 900 }}>
                  (학생)
                </span>
              </div>

              <button
                onClick={onStudentLogout}
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #7c7c7c',
                  borderRadius: '9999px',
                  padding: '0.35rem 0.75rem',
                  color: '#b3b3b3',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                title="학생 로그아웃 (시작화면으로 이동)"
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f3727f'; e.currentTarget.style.borderColor = '#f3727f'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#b3b3b3'; e.currentTarget.style.borderColor = '#7c7c7c'; }}
              >
                <LogOut size={13} />
                <span>로그아웃</span>
              </button>
            </div>
          )}

          {/* Teacher Navigation & User Profile (Only shown when Teacher is logged in) */}
          {user && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => { sound.playClick(); onOpenTeacherDashboard(); }}
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem' }}
              >
                <Users size={15} />
                <span>교사 워크스페이스</span>
              </button>

              <button
                onClick={() => { sound.playClick(); onOpenLoginModal(); }}
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #7c7c7c',
                  borderRadius: '9999px',
                  padding: '0.4rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                <img
                  src={user.user_metadata?.avatar_url || 'https://lh3.googleusercontent.com/a/default-user'}
                  alt="Profile"
                  style={{ width: '22px', height: '22px', borderRadius: '50%' }}
                />
                <span>{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                <span style={{ fontSize: '0.7rem', color: '#1ed760', fontWeight: 900 }}>
                  (교사)
                </span>
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
