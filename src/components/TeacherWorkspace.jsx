import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Copy, ExternalLink, RotateCcw, Trash2, ChevronDown, ChevronUp, LogOut, Check, Users, Eye, Search, FileText, Table, LayoutGrid, X, RefreshCw } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showUnsubmittedAccordion, setShowUnsubmittedAccordion] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Match location information from master locations list
  const getLocationInfo = (sub) => {
    const found = locations.find(l => l.id === sub.location_id || l.name === sub.location_title || l.name === sub.answer_name);
    if (found) return found;
    return {
      name: sub.location_title || sub.answer_name || '탐험 지점',
      category: 'climate',
      categoryName: '기후/지형',
      continent: '전체',
      modelAnswer: '교과서 핵심 요약 내용이 제공되지 않는 지점입니다.'
    };
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

  // Unique Student Names (Naturally sorted: 1번, 2번, 10번...)
  const studentNames = useMemo(() => {
    return Object.keys(submissionsByStudent).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [submissionsByStudent]);

  // Filtered Submissions based on search query and student filter
  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return submissions.filter(sub => {
      const matchSearch = !q ||
        (sub.student_name && sub.student_name.toLowerCase().includes(q)) ||
        (sub.location_title && sub.location_title.toLowerCase().includes(q)) ||
        (sub.answer_name && sub.answer_name.toLowerCase().includes(q)) ||
        (sub.answer_feature && sub.answer_feature.toLowerCase().includes(q));

      const matchStudent = studentFilter === 'ALL' || sub.student_name === studentFilter;

      return matchSearch && matchStudent;
    });
  }, [submissions, searchQuery, studentFilter]);

  // Filtered Submissions Grouped By Student
  const filteredSubmissionsByStudent = useMemo(() => {
    const groups = {};
    filteredSubmissions.forEach(sub => {
      const name = sub.student_name || '익명 학생';
      if (!groups[name]) groups[name] = [];
      groups[name].push(sub);
    });
    return groups;
  }, [filteredSubmissions]);

  const filteredStudentNames = useMemo(() => {
    return Object.keys(filteredSubmissionsByStudent).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [filteredSubmissionsByStudent]);

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

      {/* Student Submissions Section */}
      <div style={{ marginTop: '2.5rem' }}>
        {/* Section Header with Stats & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                📝 학생 학습 제출 내용 확인 & 관리
              </h2>
              <span style={{ background: '#1ed760', color: '#000', fontSize: '0.78rem', fontWeight: 900, padding: '3px 10px', borderRadius: '9999px' }}>
                총 {submissions.length}건
              </span>
              <span style={{ background: '#282828', color: '#b3b3b3', fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px' }}>
                참여 학생 {studentNames.length}명
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#b3b3b3', marginTop: '4px', margin: 0 }}>
              학생들이 작성한 지형·기후의 환경 및 생활 모습 특징을 실시간으로 확인하고 교과서 모범 답안과 비교할 수 있습니다.
            </p>
          </div>

          {/* View Mode Switch & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                sound.playClick();
                setIsRefreshing(true);
                loadSubmissions().then(() => setIsRefreshing(false));
              }}
              style={{
                background: '#1f1f1f',
                border: '1px solid #333333',
                color: '#b3b3b3',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>

            {/* Toggle View Mode Buttons */}
            <div style={{ display: 'flex', background: '#1f1f1f', padding: '3px', borderRadius: '9999px', border: '1px solid #333333' }}>
              <button
                onClick={() => { sound.playClick(); setViewMode('cards'); }}
                style={{
                  background: viewMode === 'cards' ? '#1ed760' : 'transparent',
                  color: viewMode === 'cards' ? '#000000' : '#b3b3b3',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutGrid size={14} /> 학생별 카드
              </button>
              <button
                onClick={() => { sound.playClick(); setViewMode('table'); }}
                style={{
                  background: viewMode === 'table' ? '#1ed760' : 'transparent',
                  color: viewMode === 'table' ? '#000000' : '#b3b3b3',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Table size={14} /> 전체 목록 표
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar: Search Input & Student Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
            <input
              type="text"
              placeholder="학생 이름, 탐험 지점명, 작성 내용으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="spotify-input"
              style={{
                width: '100%',
                paddingLeft: '38px',
                fontSize: '0.85rem',
                background: '#181818',
                border: '1px solid #282828',
                color: '#ffffff',
                borderRadius: '9999px'
              }}
            />
          </div>

          {/* Student Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: '#b3b3b3', fontWeight: 600 }}>학생 필터:</span>
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              style={{
                background: '#181818',
                color: '#ffffff',
                border: '1px solid #333333',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                outline: 'none',
                fontWeight: 700
              }}
            >
              <option value="ALL">전체 학생 ({studentNames.length}명)</option>
              {studentNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body: Empty State or Cards or Table */}
        {filteredSubmissions.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#71717a', background: '#181818', borderRadius: '16px', border: '1px solid #282828' }}>
            <FileText size={32} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b3b3b3' }}>
              {submissions.length === 0
                ? '아직 제출된 학생 학습 기록이 없습니다. 학생들이 지도를 탐험하며 작성하면 여기에 실시간으로 표시됩니다.'
                : '검색 및 필터 조건에 일치하는 학생 제출 기록이 없습니다.'}
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          /* CARD VIEW */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {filteredStudentNames.map(studentName => {
              const list = filteredSubmissionsByStudent[studentName] || [];

              return (
                <div
                  key={studentName}
                  style={{
                    background: '#181818',
                    borderRadius: '16px',
                    border: '1px solid #282828',
                    padding: '1.35rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: 'rgba(0, 0, 0, 0.35) 0px 8px 16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>👤</span>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                        {studentName}
                      </h4>
                    </div>
                    <span style={{ background: 'rgba(30, 215, 96, 0.15)', color: '#1ed760', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.76rem', fontWeight: 800 }}>
                      제출 {list.length}곳 완료
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {list.map(sub => {
                      const loc = getLocationInfo(sub);
                      return (
                        <div
                          key={sub.id}
                          style={{
                            background: '#121212',
                            borderRadius: '12px',
                            border: '1px solid #262626',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'border-color 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span style={{ fontSize: '0.95rem' }}>{loc.category === 'landform' ? '🏔️' : '☀️'}</span>
                              <span style={{ color: '#1ed760', fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sub.location_title || sub.answer_name}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#1f1f1f', padding: '1px 6px', borderRadius: '4px' }}>
                                {loc.continent}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#71717a' }}>
                                {sub.created_at ? new Date(sub.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`'${studentName}' 학생의 '${sub.location_title || sub.answer_name}' 제출 기록을 삭제하시겠습니까?`)) return;
                                  sound.playClick();
                                  await deleteSubmission(sub.id);
                                  loadSubmissions();
                                }}
                                style={{ background: 'none', border: 'none', color: '#f3727f', cursor: 'pointer', padding: '2px', opacity: 0.7 }}
                                title="삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Student Response Bubble */}
                          <div
                            onClick={() => setSelectedSubmission(sub)}
                            style={{
                              background: '#181818',
                              border: '1px solid #333333',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1ed760'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#333333'}
                            title="클릭하여 교과서 모범 답안과 비교 및 상세 확인"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>
                                ✍️ 학생 작성 내용:
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#1ed760', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <Eye size={12} /> 모범답안 비교
                              </span>
                            </div>
                            <div style={{ fontSize: '0.86rem', color: '#f1f5f9', lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              {sub.answer_feature || '(작성된 특징 내용이 없습니다)'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #282828', background: '#181818' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#1f1f1f', color: '#1ed760', borderBottom: '1px solid #282828' }}>
                  <th style={{ padding: '12px 16px', width: '55px' }}>No.</th>
                  <th style={{ padding: '12px 16px', width: '120px' }}>제출 학생</th>
                  <th style={{ padding: '12px 16px', width: '170px' }}>지점/기후명</th>
                  <th style={{ padding: '12px 16px' }}>학생이 입력한 특징 및 생활 모습 내용</th>
                  <th style={{ padding: '12px 16px', width: '130px' }}>제출 시각</th>
                  <th style={{ padding: '12px 16px', width: '90px', textAlign: 'center' }}>상세/비교</th>
                  <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center' }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub, idx) => {
                  const loc = getLocationInfo(sub);
                  return (
                    <tr
                      key={sub.id || idx}
                      style={{ borderBottom: '1px solid #242424', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1e1e1e'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: '#71717a', fontWeight: 700 }}>
                        {filteredSubmissions.length - idx}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1ed760' }}>
                        👤 {sub.student_name || '익명 학생'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#ffffff' }}>
                        {loc.category === 'landform' ? '🏔️ ' : '☀️ '}{sub.location_title || sub.answer_name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div
                          onClick={() => setSelectedSubmission(sub)}
                          style={{
                            color: '#ffffff',
                            lineHeight: 1.5,
                            cursor: 'pointer',
                            background: '#121212',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #2a2a2a',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            transition: 'border-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1ed760'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                          title="클릭하여 모범 답안과 함께 상세 확인"
                        >
                          {sub.answer_feature || '(작성 내용 없음)'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {sub.created_at ? new Date(sub.created_at).toLocaleString('ko-KR', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedSubmission(sub)}
                          style={{
                            background: '#1ed760',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '9999px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={12} /> 확인
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`'${sub.student_name}' 학생의 제출 기록을 삭제하시겠습니까?`)) return;
                            sound.playClick();
                            await deleteSubmission(sub.id);
                            loadSubmissions();
                          }}
                          style={{ background: 'none', border: 'none', color: '#f3727f', cursor: 'pointer', opacity: 0.7 }}
                          title="삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedSubmission && (() => {
        const loc = getLocationInfo(selectedSubmission);
        return (
          <div
            className="modal-overlay"
            onClick={() => setSelectedSubmission(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              backdropFilter: 'blur(4px)'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#181818',
                border: '1px solid #282828',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{loc.category === 'landform' ? '🏔️' : '☀️'}</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                      {selectedSubmission.location_title || selectedSubmission.answer_name}
                    </h3>
                    <span style={{ background: '#1ed760', color: '#000', fontWeight: 800, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '9999px' }}>
                      {loc.categoryName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: '#b3b3b3', flexWrap: 'wrap' }}>
                    <span>👤 <strong>제출 학생:</strong> <span style={{ color: '#1ed760', fontWeight: 700 }}>{selectedSubmission.student_name}</span></span>
                    <span>📍 <strong>대륙:</strong> {loc.continent}</span>
                    <span>🕒 <strong>제출 시각:</strong> {selectedSubmission.created_at ? new Date(selectedSubmission.created_at).toLocaleString('ko-KR') : '-'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  style={{
                    background: '#1f1f1f',
                    border: 'none',
                    color: '#b3b3b3',
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

              {/* Student Written Content */}
              <div style={{ background: '#121212', border: '1px solid #38bdf8', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✍️</span>
                  <span>학생이 입력한 특징 및 생활 모습</span>
                </div>
                <div style={{ fontSize: '1.05rem', color: '#ffffff', lineHeight: 1.7, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                  {selectedSubmission.answer_feature || '(작성된 내용이 없습니다)'}
                </div>
              </div>

              {/* Textbook Model Answer */}
              <div style={{ background: '#121212', border: '1px solid #1ed760', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#1ed760', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📖</span>
                  <span>교과서 핵심 모범 답안 (채점 및 지도 참고용)</span>
                </div>
                <div style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.7 }}>
                  {loc.modelAnswer}
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  onClick={async () => {
                    if (!window.confirm(`'${selectedSubmission.student_name}' 학생의 이 제출 기록을 삭제하시겠습니까?`)) return;
                    sound.playClick();
                    await deleteSubmission(selectedSubmission.id);
                    setSelectedSubmission(null);
                    loadSubmissions();
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid #f3727f',
                    color: '#f3727f',
                    padding: '0.55rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={14} /> 제출 기록 삭제
                </button>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  style={{
                    background: '#1ed760',
                    color: '#000000',
                    border: 'none',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '9999px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  확인 완료
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
