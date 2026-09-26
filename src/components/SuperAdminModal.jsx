import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, RefreshCw, Shield, Trash2, Download, Search, Filter, 
  Database, AlertTriangle, CheckSquare, Square, Layers, 
  FileSpreadsheet, FileJson, Users, Clock, MapPin, ChevronRight, Eye, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  fetchSuperAdminSubmissions, 
  superAdminDeleteSubmissions, 
  superAdminDeleteTimeGroup,
  superAdminDeleteSession, 
  superAdminCleanLegacySubmissions, 
  superAdminPurgeAllSubmissions 
} from '../utils/supabaseService';
import { sound } from '../utils/audio';

// Time grouping helper
export const getTimeGroupKey = (isoString) => {
  if (!isoString) return '미분류 시간대';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '미분류 시간대';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const hour = d.getHours();
    const ampm = hour < 12 ? '오전' : '오후';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${year}. ${month}. ${date}. ${ampm} ${hour12}시경 (${String(hour).padStart(2, '0')}:00~${String(hour).padStart(2, '0')}:59)`;
  } catch {
    return '미분류 시간대';
  }
};

export default function SuperAdminModal({ onClose, user }) {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Active Tab: 'explorer' | 'timeline' | 'sessions' | 'maintenance' | 'danger'
  const [activeTab, setActiveTab] = useState('explorer');

  // Search & Filter in Explorer
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inspectItem, setInspectItem] = useState(null);

  // Danger Zone confirmation text
  const [confirmText, setConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // Load Supabase Data
  const loadData = async () => {
    setIsRefreshing(true);
    const result = await fetchSuperAdminSubmissions();
    if (result.success) {
      setSubmissions(result.data);
      setTotalCount(result.count);
    } else {
      alert('데이터 불러오기 실패: ' + result.error);
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Summary Metrics
  const stats = useMemo(() => {
    const sessionMap = {};
    const timeGroupMap = {};
    const students = new Set();
    let legacyCount = 0;
    let configCount = 0;

    submissions.forEach(sub => {
      if (sub.isConfigRow) {
        configCount++;
        return;
      }
      if (sub.isLegacyUnassigned) {
        legacyCount++;
      }
      const sid = sub.resolvedSessionId || '(미지정)';
      if (!sessionMap[sid]) {
        sessionMap[sid] = {
          id: sid,
          count: 0,
          students: new Set(),
          latestDate: sub.created_at || '1970-01-01',
          earliestDate: sub.created_at || '1970-01-01',
          isLegacy: sub.isLegacyUnassigned
        };
      }
      sessionMap[sid].count++;
      if (sub.student_name) {
        sessionMap[sid].students.add(sub.student_name);
        students.add(sub.student_name);
      }
      if (sub.created_at && new Date(sub.created_at) > new Date(sessionMap[sid].latestDate)) {
        sessionMap[sid].latestDate = sub.created_at;
      }
      if (sub.created_at && new Date(sub.created_at) < new Date(sessionMap[sid].earliestDate)) {
        sessionMap[sid].earliestDate = sub.created_at;
      }

      // Time block clustering
      const tKey = getTimeGroupKey(sub.created_at);
      if (!timeGroupMap[tKey]) {
        timeGroupMap[tKey] = {
          key: tKey,
          rawDate: sub.created_at || '1970-01-01',
          count: 0,
          students: new Set(),
          sessions: new Set(),
          submissionIds: [],
          submissions: []
        };
      }
      timeGroupMap[tKey].count++;
      timeGroupMap[tKey].submissions.push(sub);
      if (sub.student_name) timeGroupMap[tKey].students.add(sub.student_name);
      if (sub.resolvedSessionId) timeGroupMap[tKey].sessions.add(sub.resolvedSessionId);
      if (sub.id) timeGroupMap[tKey].submissionIds.push(sub.id);
    });

    const timeGroupList = Object.values(timeGroupMap).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

    return {
      totalSubmissions: submissions.filter(s => !s.isConfigRow).length,
      distinctSessions: Object.keys(sessionMap).length,
      sessionList: Object.values(sessionMap).sort((a, b) => b.count - a.count),
      timeGroupList,
      uniqueStudentsCount: students.size,
      legacyCount,
      configCount
    };
  }, [submissions]);

  // Filtered Submissions in Explorer
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (sub.isConfigRow) return false;

      // Session Filter
      if (sessionFilter !== 'ALL') {
        if (sessionFilter === '__LEGACY__') {
          if (!sub.isLegacyUnassigned) return false;
        } else if (sub.resolvedSessionId !== sessionFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (sub.student_name || '').toLowerCase().includes(q);
        const matchLoc = (sub.location_title || '').toLowerCase().includes(q);
        const matchAns = (sub.answer_name || '').toLowerCase().includes(q);
        const matchFeat = (sub.resolvedFeature || '').toLowerCase().includes(q);
        const matchSid = (sub.resolvedSessionId || '').toLowerCase().includes(q);
        return matchName || matchLoc || matchAns || matchFeat || matchSid;
      }

      return true;
    });
  }, [submissions, sessionFilter, searchQuery]);

  // Selection toggle
  const toggleSelect = (id) => {
    sound.playClick();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    sound.playClick();
    if (selectedIds.size === filteredSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubmissions.map(s => s.id)));
    }
  };

  // Delete selected IDs
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.size}개의 제출 데이터를 Supabase에서 영구 삭제하시겠습니까?`)) return;
    
    sound.playClick();
    setLoading(true);
    const selectedSubmissions = submissions.filter(s => selectedIds.has(s.id));
    const result = await superAdminDeleteSubmissions(Array.from(selectedIds), selectedSubmissions);
    if (result.success) {
      alert(`성공적으로 ${result.count}건의 데이터가 삭제되었습니다.`);
      setSelectedIds(new Set());
      await loadData();
    } else {
      alert('삭제 중 오류: ' + result.error);
    }
    setLoading(false);
  };

  // Delete specific session
  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm(`[세션 ID: ${sessionId}] 의 모든 제출 데이터를 Supabase에서 일괄 삭제하시겠습니까?`)) return;
    sound.playClick();
    setLoading(true);
    const result = await superAdminDeleteSession(sessionId);
    if (result.success) {
      alert(`[${sessionId}] 회차의 모든 데이터가 정리되었습니다.`);
      await loadData();
    } else {
      alert('삭제 실패: ' + result.error);
    }
    setLoading(false);
  };

  // Clean Legacy / Unassigned Submissions
  const handleCleanLegacy = async () => {
    if (!window.confirm(`미지정/레거시 테스트 데이터(${stats.legacyCount}건)를 Supabase에서 일괄 정리하시겠습니까?`)) return;
    sound.playClick();
    setLoading(true);
    const result = await superAdminCleanLegacySubmissions();
    if (result.success) {
      alert(`미지정 데이터 ${result.count}건이 성공적으로 정리되었습니다.`);
      await loadData();
    } else {
      alert('정리 실패: ' + result.error);
    }
    setLoading(false);
  };

  // Full Database Purge (Danger Zone)
  const handlePurgeAll = async () => {
    if (confirmText.trim() !== '초기화') {
      alert("확인 문구로 '초기화' 를 정확히 입력해 주세요.");
      return;
    }
    if (!window.confirm('⚠️ 경고: Supabase에 저장된 모든 학습 데이터가 영구 삭제됩니다. 계속하시겠습니까?')) return;

    sound.playClick();
    setIsPurging(true);
    const result = await superAdminPurgeAllSubmissions();
    if (result.success) {
      alert('🎉 Supabase 데이터베이스의 모든 제출 데이터가 완전 초기화되었습니다.');
      setConfirmText('');
      await loadData();
    } else {
      alert('초기화 실패: ' + result.error);
    }
    setIsPurging(false);
  };

  // Export Full JSON
  const handleExportJson = () => {
    sound.playClick();
    const cleanData = submissions.map(s => ({
      id: s.id,
      session_id: s.resolvedSessionId,
      created_at: s.created_at,
      student_name: s.student_name,
      location_id: s.location_id,
      location_title: s.location_title,
      answer_name: s.answer_name,
      answer_feature: s.resolvedFeature,
      score: s.score
    }));
    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supabase_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Full Excel
  const handleExportExcel = () => {
    sound.playClick();
    const rows = submissions.map(s => ({
      '데이터ID': s.id,
      '세션(회차)ID': s.resolvedSessionId,
      '제출일시': new Date(s.created_at).toLocaleString('ko-KR'),
      '학생이름': s.student_name || '익명',
      '지형/기후 지점': s.location_title || '',
      '제출 지명': s.answer_name || '',
      '작성 특징 및 내용': s.resolvedFeature || '',
      '점수': s.score ?? 100
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '전체Supabase데이터');
    XLSX.writeFile(wb, `슈파베이스_전체데이터_백업_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: "'Noto Sans KR', sans-serif"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#121212',
          border: '1px solid #2e2e2e',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1280px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          color: '#ffffff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid #242424',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#181818'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <Shield size={22} color="#000000" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#ffffff' }}>
                  Supabase 최고 관리자 콘솔 (Super Admin)
                </h2>
                <span style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  Supabase DB 연결됨
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                클라우드에 저장된 모든 학생 제출 답안과 세션을 직접 열람, 백업, 일괄 삭제 및 초기화합니다.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => { sound.playClick(); loadData(); }}
              disabled={isRefreshing}
              style={{
                background: '#242424',
                border: '1px solid #383838',
                color: '#e4e4e7',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              새로고침
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#242424',
                border: 'none',
                color: '#a1a1aa',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats Metrics Cards Bar */}
        <div style={{
          padding: '1.2rem 2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          background: '#141414',
          borderBottom: '1px solid #242424'
        }}>
          {/* Total Submissions */}
          <div style={{
            background: '#1c1c1c',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>전체 저장 레코드</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff' }}>{stats.totalSubmissions.toLocaleString()}건</div>
            </div>
          </div>

          {/* Distinct Sessions */}
          <div style={{
            background: '#1c1c1c',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>등록 세션(회차) 수</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff' }}>{stats.distinctSessions}개 세션</div>
            </div>
          </div>

          {/* Unique Students */}
          <div style={{
            background: '#1c1c1c',
            border: '1px solid #2d2d2d',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>고유 참여 학생 수</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff' }}>{stats.uniqueStudentsCount}명</div>
            </div>
          </div>

          {/* Legacy / Unassigned */}
          <div style={{
            background: '#1c1c1c',
            border: stats.legacyCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #2d2d2d',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: stats.legacyCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(113, 113, 122, 0.15)', color: stats.legacyCount > 0 ? '#f87171' : '#a1a1aa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>미지정/레거시 데이터</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: stats.legacyCount > 0 ? '#f87171' : '#ffffff' }}>
                  {stats.legacyCount}건
                </div>
              </div>
            </div>
            {stats.legacyCount > 0 && (
              <button
                onClick={handleCleanLegacy}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                일괄 정리
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '0.75rem 2rem',
          background: '#161616',
          borderBottom: '1px solid #242424'
        }}>
          {[
            { id: 'explorer', label: '📋 전체 원본 데이터 탐색기' },
            { id: 'timeline', label: '🕒 시간대별 분석 & 정리' },
            { id: 'sessions', label: '📊 회차(세션)별 관리' },
            { id: 'maintenance', label: '💾 데이터 백업 & 정비' },
            { id: 'danger', label: '🚨 위험 구역 (전체 초기화)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { sound.playClick(); setActiveTab(tab.id); }}
              style={{
                background: activeTab === tab.id ? '#282828' : 'transparent',
                border: activeTab === tab.id ? '1px solid #444444' : '1px solid transparent',
                color: activeTab === tab.id ? '#ffffff' : '#a1a1aa',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: activeTab === tab.id ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
          {/* TAB 1: EXPLORER */}
          {activeTab === 'explorer' && (
            <div>
              {/* Controls Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px' }}>
                  <div style={{
                    position: 'relative',
                    flex: 1,
                    background: '#1c1c1c',
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <Search size={16} color="#71717a" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                    <input
                      type="text"
                      placeholder="학생 이름, 지점명, 작성 내용, 세션 ID 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Session Filter Dropdown */}
                  <select
                    value={sessionFilter}
                    onChange={(e) => setSessionFilter(e.target.value)}
                    style={{
                      background: '#1c1c1c',
                      color: '#ffffff',
                      border: '1px solid #333',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="ALL">전체 세션 ({submissions.length}건)</option>
                    <option value="__LEGACY__">미지정/레거시만 ({stats.legacyCount}건)</option>
                    {stats.sessionList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.id} ({s.count}건)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={selectAllFiltered}
                    style={{
                      background: '#242424',
                      border: '1px solid #383838',
                      color: '#d4d4d8',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0 ? (
                      <CheckSquare size={14} color="#4ade80" />
                    ) : (
                      <Square size={14} />
                    )}
                    전체 선택 ({selectedIds.size}/{filteredSubmissions.length})
                  </button>

                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        color: '#ffffff',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trash2 size={14} />
                      선택 {selectedIds.size}건 삭제
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div style={{
                background: '#161616',
                border: '1px solid #282828',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{ maxHeight: '55vh', overflow: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#202020', borderBottom: '1px solid #333333', color: '#a1a1aa' }}>
                        <th style={{ padding: '10px 14px', width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                            onChange={selectAllFiltered}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '10px 14px', width: '140px' }}>제출 일시</th>
                        <th style={{ padding: '10px 14px', width: '130px' }}>세션 ID</th>
                        <th style={{ padding: '10px 14px', width: '120px' }}>학생 이름</th>
                        <th style={{ padding: '10px 14px', width: '160px' }}>지형/기후 지점</th>
                        <th style={{ padding: '10px 14px', width: '140px' }}>제출 지명</th>
                        <th style={{ padding: '10px 14px' }}>작성 특징 내용</th>
                        <th style={{ padding: '10px 14px', width: '90px', textAlign: 'center' }}>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#71717a' }}>
                            {loading ? '데이터를 불러오는 중입니다...' : '검색 조건에 일치하는 데이터가 없습니다.'}
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map((sub, idx) => {
                          const isSelected = selectedIds.has(sub.id);
                          return (
                            <tr
                              key={sub.id || idx}
                              style={{
                                borderBottom: '1px solid #222222',
                                background: isSelected ? 'rgba(56, 189, 248, 0.08)' : (idx % 2 === 0 ? '#161616' : '#191919'),
                                transition: 'background-color 0.1s ease'
                              }}
                            >
                              <td style={{ padding: '10px 14px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(sub.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ padding: '10px 14px', color: '#a1a1aa', fontSize: '0.78rem' }}>
                                {new Date(sub.created_at).toLocaleString('ko-KR', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{
                                  background: sub.isLegacyUnassigned ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                                  color: sub.isLegacyUnassigned ? '#f87171' : '#38bdf8',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}>
                                  {sub.resolvedSessionId}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#ffffff' }}>
                                {sub.student_name || '익명'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#4ade80', fontWeight: 600 }}>
                                {sub.location_title || '-'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#fbbf24' }}>
                                {sub.answer_name || '-'}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#d4d4d8', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sub.resolvedFeature || '-'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                  <button
                                    onClick={() => setInspectItem(sub)}
                                    title="상세 JSON 보기"
                                    style={{
                                      background: '#242424',
                                      border: 'none',
                                      color: '#a1a1aa',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm(`'${sub.student_name || '익명'}' 학생의 이 답안을 삭제하시겠습니까?`)) return;
                                      sound.playClick();
                                      setLoading(true);
                                      const res = await superAdminDeleteSubmissions([sub.id], [sub]);
                                      if (res.success) {
                                        await loadData();
                                      } else {
                                        alert('삭제 실패: ' + res.error);
                                      }
                                      setLoading(false);
                                    }}
                                    title="삭제"
                                    style={{
                                      background: '#242424',
                                      border: 'none',
                                      color: '#f87171',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SESSIONS OVERVIEW */}
          {activeTab === 'sessions' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {stats.sessionList.map(session => (
                <div
                  key={session.id}
                  style={{
                    background: '#181818',
                    border: '1px solid #2e2e2e',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: session.isLegacy ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: session.isLegacy ? '#f87171' : '#4ade80',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          {session.isLegacy ? '미지정/레거시' : `세션 ID: ${session.id}`}
                        </span>
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                        {session.count}건
                      </span>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#a1a1aa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>참여 학생 수:</span>
                        <strong style={{ color: '#ffffff' }}>{session.students.size}명</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>최근 제출 일시:</span>
                        <span style={{ color: '#e4e4e7' }}>{new Date(session.latestDate).toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #262626', paddingTop: '0.75rem' }}>
                    <button
                      onClick={() => {
                        setSessionFilter(session.id);
                        setActiveTab('explorer');
                      }}
                      style={{
                        flex: 1,
                        background: '#242424',
                        border: '1px solid #383838',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      데이터 탐색
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      style={{
                        background: '#261c1c',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      이 회차 전체 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: TIMELINE (시간대별 분석 & 정리) */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
              {stats.timeGroupList.map(group => (
                <div
                  key={group.key}
                  style={{
                    background: '#181818',
                    border: '1px solid #2e2e2e',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Clock size={16} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#ffffff' }}>
                          {group.key}
                        </h4>
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38bdf8' }}>
                        {group.count}건
                      </span>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#a1a1aa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>참여 학생:</span>
                        <strong style={{ color: '#1ed760' }}>{group.students.size}명</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>관련 세션(회차):</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                          {Array.from(group.sessions).join(', ') || '(미지정)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #262626', paddingTop: '0.75rem' }}>
                    <button
                      onClick={() => {
                        setSearchQuery(group.rawDate.slice(0, 10));
                        setActiveTab('explorer');
                      }}
                      style={{
                        flex: 1,
                        background: '#242424',
                        border: '1px solid #383838',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      데이터 탐색
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`[${group.key}] 시간대에 등록된 ${group.count}건의 모든 데이터를 Supabase에서 삭제하시겠습니까?`)) return;
                        sound.playClick();
                        setLoading(true);
                        // Optimistically remove from state for instant responsiveness
                        setSubmissions(prev => prev.filter(sub => !group.submissionIds.includes(sub.id) && !group.submissions.some(gs => gs.id === sub.id)));
                        const res = await superAdminDeleteTimeGroup(group);
                        if (res.success) {
                          alert(`[${group.key}] 시간대 데이터 ${group.count}건이 Supabase에서 삭제되었습니다.`);
                        } else {
                          alert('삭제 실패: ' + (res.error || '알 수 없는 오류'));
                        }
                        await loadData();
                        setLoading(false);
                      }}
                      style={{
                        background: '#261c1c',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      이 시간대 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: MAINTENANCE & BACKUP */}
          {activeTab === 'maintenance' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {/* Export Full Excel */}
              <div style={{ background: '#181818', border: '1px solid #2c2c2c', borderRadius: '14px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                  <FileSpreadsheet size={24} color="#1ed760" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>엑셀(.xlsx) 전체 백업 다운로드</h3>
                </div>
                <p style={{ fontSize: '0.83rem', color: '#a1a1aa', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Supabase `quiz_submissions`에 저장된 모든 학생의 제출 답안과 세션 메타데이터를 엑셀 파일로 일괄 백업합니다.
                </p>
                <button
                  onClick={handleExportExcel}
                  style={{
                    background: '#1ed760',
                    color: '#000000',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={16} /> 엑셀 백업 다운로드
                </button>
              </div>

              {/* Export Full JSON */}
              <div style={{ background: '#181818', border: '1px solid #2c2c2c', borderRadius: '14px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                  <FileJson size={24} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>JSON 원본 데이터 덤프</h3>
                </div>
                <p style={{ fontSize: '0.83rem', color: '#a1a1aa', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  개발자 및 복원용 포맷으로 전체 Supabase 레코드 필드를 원본 JSON 파일로 내보냅니다.
                </p>
                <button
                  onClick={handleExportJson}
                  style={{
                    background: '#38bdf8',
                    color: '#000000',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={16} /> JSON 덤프 다운로드
                </button>
              </div>

              {/* Clean Legacy */}
              <div style={{ background: '#181818', border: '1px solid #2c2c2c', borderRadius: '14px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                  <Sparkles size={24} color="#f59e0b" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>미지정 레거시 데이터 청소</h3>
                </div>
                <p style={{ fontSize: '0.83rem', color: '#a1a1aa', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  초기 테스트 시 생성되었거나 세션 ID가 지정되지 않은 고아(Orphan) 레코드 {stats.legacyCount}건을 일괄 청소합니다.
                </p>
                <button
                  onClick={handleCleanLegacy}
                  disabled={stats.legacyCount === 0}
                  style={{
                    background: stats.legacyCount > 0 ? '#f59e0b' : '#333333',
                    color: '#000000',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: stats.legacyCount > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={16} /> 미지정 데이터 정리 ({stats.legacyCount}건)
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div style={{
              background: '#1c1313',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '700px',
              margin: '0 auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <AlertTriangle size={32} color="#ef4444" />
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171', margin: 0 }}>
                    Supabase 전체 데이터베이스 완전 초기화 (Factory Reset)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: '4px 0 0 0' }}>
                    이 작업은 되돌릴 수 없으며, Supabase의 모든 학생 제출 답안 데이터가 즉시 삭제됩니다.
                  </p>
                </div>
              </div>

              <div style={{
                background: '#2b1b1b',
                borderRadius: '10px',
                padding: '1rem',
                margin: '1.5rem 0',
                fontSize: '0.85rem',
                color: '#fca5a5',
                lineHeight: 1.6
              }}>
                • 현재 총 <strong>{stats.totalSubmissions}건</strong>의 답안이 Supabase에 보관되어 있습니다.<br/>
                • 삭제 전 반드시 [데이터 백업] 탭에서 엑셀이나 JSON 백업본을 다운로드해 두세요.<br/>
                • 안전을 위해 아래 입력창에 <strong>초기화</strong> 라고 입력하신 후 버튼을 클릭하세요.
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="'초기화' 를 입력하세요"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#121212',
                    border: '1px solid #ef4444',
                    color: '#ffffff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handlePurgeAll}
                  disabled={confirmText.trim() !== '초기화' || isPurging}
                  style={{
                    background: confirmText.trim() === '초기화' ? '#ef4444' : '#452222',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    cursor: confirmText.trim() === '초기화' ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={16} />
                  {isPurging ? '초기화 중...' : '데이터베이스 완전 삭제'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 2rem',
          borderTop: '1px solid #242424',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#181818',
          fontSize: '0.8rem',
          color: '#71717a'
        }}>
          <div>
            Supabase Project ID: <code style={{ color: '#a1a1aa' }}>cjhmsladfnjuomodmeim</code> • Table: <code style={{ color: '#a1a1aa' }}>quiz_submissions</code>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#282828',
              border: 'none',
              color: '#ffffff',
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>
      </div>

      {/* JSON Inspection Sub-modal */}
      {inspectItem && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
          onClick={() => setInspectItem(null)}
        >
          <div 
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              padding: '1.5rem',
              color: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>📄 레코드 상세 필드 정보</h4>
              <button onClick={() => setInspectItem(null)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <pre style={{
              background: '#0d0d0d',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              overflow: 'auto',
              maxHeight: '400px',
              color: '#38bdf8'
            }}>
              {JSON.stringify(inspectItem, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
