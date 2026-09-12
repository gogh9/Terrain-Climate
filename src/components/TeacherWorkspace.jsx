import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Copy, ExternalLink, RotateCcw, Trash2, ChevronDown, ChevronUp, LogOut, Check, Users } from 'lucide-react';
import { fetchAllSubmissions, deleteSubmission, signOutUser } from '../utils/supabaseService';
import { sound } from '../utils/audio';

const ALL_CONTINENTS = ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아', '극지방'];

export default function TeacherWorkspace({ user, locations = [], onEnterMap, onLogout }) {
  // Saved sessions list
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_map_sessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Session load error', e);
    }
    return [
      {
        id: '1',
        title: '1회(2026. 9. 12.)',
        categoryFilter: 'all', // 'all' | 'landform' | 'climate'
        continents: ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아', '극지방'],
        isOpen: true,
        accessCount: 0,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState('1');
  const [submissions, setSubmissions] = useState([]);
  const [studentFilter, setStudentFilter] = useState('ALL');
  const [showUnsubmittedAccordion, setShowUnsubmittedAccordion] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Save sessions to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('geo_map_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.warn('Session save error', e);
    }
  }, [sessions]);

  // Fetch Submissions from Supabase
  const loadSubmissions = async () => {
    const res = await fetchAllSubmissions(500);
    if (res.success) {
      setSubmissions(res.data);
    }
  };

  useEffect(() => {
    loadSubmissions();
    const interval = setInterval(loadSubmissions, 10000); // 10 sec polling
    return () => clearInterval(interval);
  }, []);

  // Create New Map Session
  const handleCreateNewMap = () => {
    sound.playClick();
    const newId = String(Date.now());
    const count = sessions.length + 1;
    const now = new Date();
    const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;

    const newSession = {
      id: newId,
      title: `${count}회(${dateStr})`,
      categoryFilter: 'all',
      continents: [...ALL_CONTINENTS],
      isOpen: true,
      accessCount: 0,
      createdAt: now.toISOString()
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  // Toggle Session Open/Closed Status
  const handleToggleOpen = (sessionId) => {
    sound.playClick();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isOpen: !s.isOpen } : s));
  };

  // Toggle Category Filter (All / Landform / Climate)
  const handleCategoryChange = (sessionId, category) => {
    sound.playClick();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, categoryFilter: category } : s));
  };

  // Copy Student Distribution Link
  const handleCopyLink = (session) => {
    sound.playClick();
    const cat = session.categoryFilter || 'all';
    const link = `${window.location.origin}/?session=${session.id}&category=${cat}`;
    navigator.clipboard.writeText(link);
    setCopiedId(session.id);
    alert(`📋 학생 배부용 링크가 복사되었습니다!\n\n${link}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Reset Submissions for Session
  const handleResetSession = async (sessionId) => {
    if (!window.confirm('이 지도의 수집된 모든 데이터 제출을 초기화하시겠습니까?')) return;
    sound.playClick();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, accessCount: 0 } : s));
    alert('초기화되었습니다.');
  };

  // Delete Session Card
  const handleDeleteSession = (sessionId) => {
    if (sessions.length <= 1) {
      alert('최소 1개의 지도는 유지되어야 합니다.');
      return;
    }
    if (!window.confirm('이 지도를 삭제하시겠습니까?')) return;
    sound.playClick();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions[0].id);
    }
  };

  // CSV Export for Session
  const handleExportCSV = (session) => {
    sound.playClick();
    if (submissions.length === 0) {
      alert('저장할 제출 데이터가 없습니다.');
      return;
    }

    const headers = ['제출일시', '학생이름', '지형기후지점', '작성한지명이름', '작성한특징내용'];
    const rows = submissions.map(sub => [
      new Date(sub.created_at).toLocaleString('ko-KR'),
      `"${sub.student_name || '익명'}"`,
      `"${sub.location_title || ''}"`,
      `"${sub.answer_name || ''}"`,
      `"${(sub.answer_feature || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${session.title}_학습제출기록.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group Submissions By Student Name
  const submissionsByStudent = useMemo(() => {
    const groups = {};
    submissions.forEach(sub => {
      const name = sub.student_name || '익명 학생';
      if (!groups[name]) groups[name] = [];
      groups[name].push(sub);
    });
    return groups;
  }, [submissions]);

  // Unique Student Names
  const studentNames = useMemo(() => {
    return Object.keys(submissionsByStudent);
  }, [submissionsByStudent]);

  // Unsubmitted Locations Count
  const submittedLocationTitles = useMemo(() => {
    return new Set(submissions.map(s => s.location_title).filter(Boolean));
  }, [submissions]);

  const unsubmittedLocations = useMemo(() => {
    return locations.filter(loc => !submittedLocationTitles.has(loc.name));
  }, [locations, submittedLocationTitles]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#121212',
        color: '#ffffff',
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: '1.5rem 2rem'
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #282828'
        }}
      >
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
          우리 반 세계지도
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.88rem', color: '#b3b3b3' }}>
            {user?.email || 'gogh999@gmail.com'}
          </span>

          <button
            onClick={onLogout}
            style={{
              background: '#1f1f1f',
              border: '1px solid #7c7c7c',
              borderRadius: '9999px',
              color: '#b3b3b3',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              transition: 'all 0.15s ease'
            }}
            title="로그아웃"
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#b3b3b3'; e.currentTarget.style.borderColor = '#7c7c7c'; }}
          >
            <LogOut size={16} />
          </button>

          <button
            onClick={handleCreateNewMap}
            style={{
              background: '#1ed760',
              color: '#000000',
              border: 'none',
              padding: '0.65rem 1.4rem',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textTransform: 'uppercase',
              letterSpacing: '1.4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(29, 215, 96, 0.35)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={18} /> 새 지도 만들기
          </button>
        </div>
      </header>

      {/* Map Assignment Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        {sessions.map(session => {
          const isSelected = activeSessionId === session.id;

          return (
            <div
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              style={{
                background: '#181818',
                borderRadius: '12px',
                border: `2px solid ${isSelected ? '#1ed760' : '#282828'}`,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem',
                position: 'relative',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                boxShadow: isSelected ? '0 0 20px rgba(29, 215, 96, 0.25)' : 'rgba(0, 0, 0, 0.3) 0px 8px 8px'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                    {session.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#1ed760', marginTop: '4px', fontWeight: 700 }}>
                    접속 횟수 (학생): <strong style={{ color: '#1ed760' }}>{session.accessCount}회</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExportCSV(session); }}
                    style={{
                      background: '#1ed760',
                      color: '#000000',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Download size={14} /> 엑셀 저장
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleOpen(session.id); }}
                    style={{
                      background: session.isOpen ? '#1ed760' : '#282828',
                      color: session.isOpen ? '#000000' : '#b3b3b3',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ✓ {session.isOpen ? '입력 가능' : '마감'}
                  </button>
                </div>
              </div>

              {/* Category Filter Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#b3b3b3' }}>
                <span>학습 주제:</span>
                <select
                  value={session.categoryFilter}
                  onChange={(e) => handleCategoryChange(session.id, e.target.value)}
                  style={{
                    background: '#1f1f1f',
                    color: '#ffffff',
                    border: '1px solid #7c7c7c',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    fontWeight: 700
                  }}
                >
                  <option value="all">지형 & 기후 전체</option>
                  <option value="landform">🏔️ 지형만 보기</option>
                  <option value="climate">☀️ 기후만 보기</option>
                </select>
              </div>

              {/* Spotify Green Copy Link Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleCopyLink(session); }}
                style={{
                  background: '#1ed760',
                  color: '#000000',
                  border: 'none',
                  padding: '0.9rem',
                  borderRadius: '9999px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(29, 215, 96, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {copiedId === session.id ? <Check size={20} /> : <Copy size={20} />}
                <span>{copiedId === session.id ? '링크 복사 완료!' : '📋 학생 배부용 링크 복사'}</span>
              </button>

              {/* Bottom 3 Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '2px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onEnterMap(session); }}
                  style={{
                    background: '#1f1f1f',
                    color: '#ffffff',
                    border: '1px solid #7c7c7c',
                    padding: '8px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ExternalLink size={14} /> 지도 입장
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleResetSession(session.id); }}
                  style={{
                    background: '#1f1f1f',
                    color: '#ffa42b',
                    border: '1px solid #7c7c7c',
                    padding: '8px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={14} /> 초기화
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                  style={{
                    background: '#1f1f1f',
                    color: '#f3727f',
                    border: '1px solid #7c7c7c',
                    padding: '8px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={14} /> 삭제
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Accordion: Unsubmitted Locations Tracker */}
      <div
        style={{
          background: '#181818',
          borderRadius: '12px',
          border: '1px solid #282828',
          marginBottom: '2rem',
          overflow: 'hidden'
        }}
      >
        <div
          onClick={() => setShowUnsubmittedAccordion(!showUnsubmittedAccordion)}
          style={{
            padding: '1.1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            background: '#1f1f1f'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', fontWeight: 700 }}>
            <span>🧙‍♂️</span>
            <span>아직 입력되지 않은 지역</span>
            <span style={{ background: '#1ed760', color: '#000', padding: '2px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 900 }}>
              {unsubmittedLocations.length}개
            </span>
          </div>
          <div style={{ color: '#b3b3b3', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
            <span>{showUnsubmittedAccordion ? '접기' : '펼치기'}</span>
            {showUnsubmittedAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {showUnsubmittedAccordion && (
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #282828', background: '#121212' }}>
            {unsubmittedLocations.length === 0 ? (
              <div style={{ color: '#1ed760', fontWeight: 700, fontSize: '0.9rem' }}>
                🎉 모든 지형과 기후 지점이 성공적으로 탐험 및 제출되었습니다!
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {unsubmittedLocations.map(loc => (
                  <span
                    key={loc.id}
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #333333',
                      color: '#cbcbcb',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.83rem',
                      fontWeight: 600
                    }}
                  >
                    {loc.category === 'landform' ? '🏔️' : '☀️'} {loc.name} ({loc.continent})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Submissions Section Filter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#b3b3b3' }}>작성자 필터:</span>
        <select
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          style={{
            background: '#1f1f1f',
            color: '#ffffff',
            border: '1px solid #7c7c7c',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '0.85rem',
            outline: 'none',
            fontWeight: 700
          }}
        >
          <option value="ALL">전체 보기 ({studentNames.length}명)</option>
          {studentNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Student Submissions Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {studentNames
          .filter(name => studentFilter === 'ALL' || name === studentFilter)
          .map(studentName => {
            const list = submissionsByStudent[studentName] || [];

            return (
              <div
                key={studentName}
                style={{
                  background: '#181818',
                  borderRadius: '12px',
                  border: '1px solid #282828',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 8px'
                }}
              >
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  {studentName}의 기록
                </h4>

                <div style={{ fontSize: '0.82rem', color: '#1ed760', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🎯 등록한 나라/지점 ({list.length}개)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {list.map(sub => (
                    <div
                      key={sub.id}
                      style={{
                        background: '#1f1f1f',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.82rem'
                      }}
                    >
                      <span style={{ color: '#1ed760', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.answer_name || sub.location_title}
                      </span>

                      <div style={{ display: 'flex', gap: '4px', opacity: 0.8 }}>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`'${sub.answer_name || sub.location_title}' 기록을 삭제하시겠습니까?`)) return;
                            sound.playClick();
                            await deleteSubmission(sub.id);
                            loadSubmissions();
                          }}
                          style={{ background: 'none', border: 'none', color: '#f3727f', cursor: 'pointer', padding: 0 }}
                          title="삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

    </div>
  );
}
