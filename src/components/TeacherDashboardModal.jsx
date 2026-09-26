import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, Download, Search, Users, FileText, Trash2, Award, Eye } from 'lucide-react';
import { fetchAllSubmissions, deleteSubmission, subscribeSubmissions } from '../utils/supabaseService';
import { sound } from '../utils/audio';

export default function TeacherDashboardModal({ onClose, locations = [], user = null }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load submissions from Supabase
  const loadData = async () => {
    setIsRefreshing(true);
    const result = await fetchAllSubmissions({ limit: 300, user });
    if (result.success) {
      setSubmissions(result.data);
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();

    // Realtime Broadcast Subscription
    const unsubscribe = subscribeSubmissions((newSub) => {
      if (newSub) {
        setSubmissions(prev => {
          const key = `${newSub.student_name}_${newSub.location_id}_${newSub.created_at?.slice(0, 16)}`;
          const exists = prev.some(item => `${item.student_name}_${item.location_id}_${item.created_at?.slice(0, 16)}` === key || item.id === newSub.id);
          if (exists) return prev;
          return [newSub, ...prev];
        });
      }
    });

    const interval = setInterval(loadData, 4000);
    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, []);

  // Handle Refresh
  const handleRefresh = () => {
    sound.playClick();
    loadData();
  };

  // Handle Delete
  const handleDelete = async (submission) => {
    const studentName = submission?.student_name || '익명';
    if (!window.confirm(`'${studentName}' 학생의 이 제출 항목을 삭제하시겠습니까?`)) return;
    sound.playClick();
    const result = await deleteSubmission(submission, user);
    if (result.success) {
      setSubmissions(prev => prev.filter(item => item.id !== submission.id));
    } else {
      alert('삭제 중 오류가 발생했습니다: ' + result.error);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    sound.playClick();
    if (submissions.length === 0) {
      alert('다운로드할 제출 데이터가 없습니다.');
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
    link.setAttribute('download', `세계지형기후_학생제출현황_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchSearch =
        (sub.student_name && sub.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.location_title && sub.location_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.answer_name && sub.answer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.answer_feature && sub.answer_feature.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchLocation = selectedLocationFilter === 'ALL' || sub.location_id === selectedLocationFilter;

      return matchSearch && matchLocation;
    });
  }, [submissions, searchQuery, selectedLocationFilter]);

  // Statistics
  const uniqueStudentsCount = useMemo(() => {
    const names = new Set(submissions.map(s => s.student_name).filter(Boolean));
    return names.size;
  }, [submissions]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '2rem',
          maxWidth: '1100px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          background: '#181818',
          border: '1px solid #282828',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#1ed760', padding: '0.6rem', borderRadius: '50%', display: 'flex', boxShadow: '0 4px 14px rgba(29, 215, 96, 0.4)' }}>
              <Users size={24} color="#000000" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                👨‍🏫 학생 학습 제출 현황 대시보드
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#b3b3b3', marginTop: '2px' }}>
                학생들이 지도 탐험 퀴즈를 풀고 제출한 내용을 실시간으로 확인하고 관리할 수 있습니다.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
              title="새로고침"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handleExportCSV}
              style={{ fontSize: '0.8rem', padding: '0.45rem 1.1rem' }}
              title="엑셀 CSV 파일로 저장"
            >
              <Download size={14} />
              <span>엑셀(CSV) 다운로드</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#1f1f1f',
                border: 'none',
                color: '#b3b3b3',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ background: '#1f1f1f', border: '1px solid #282828', padding: '0.9rem 1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileText size={28} color="#1ed760" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#b3b3b3', fontWeight: 500 }}>총 제출 건수</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1ed760' }}>{submissions.length}건</div>
            </div>
          </div>

          <div style={{ background: '#1f1f1f', border: '1px solid #282828', padding: '0.9rem 1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Users size={28} color="#1ed760" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#b3b3b3', fontWeight: 500 }}>참여 학생 수</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>{uniqueStudentsCount}명</div>
            </div>
          </div>

          <div style={{ background: '#1f1f1f', border: '1px solid #282828', padding: '0.9rem 1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Award size={28} color="#ffa42b" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#b3b3b3', fontWeight: 500 }}>검색/필터 결과</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffa42b' }}>{filteredSubmissions.length}건</div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b3b3b3' }} />
            <input
              type="text"
              placeholder="학생 이름, 지형/기후명, 제출 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="spotify-input"
              style={{ width: '100%', paddingLeft: '40px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Location Select Filter */}
          <select
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
            style={{
              width: '220px',
              background: '#1f1f1f',
              color: '#ffffff',
              border: '1px solid #7c7c7c',
              borderRadius: '9999px',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              outline: 'none',
              fontWeight: 700
            }}
          >
            <option value="ALL">전체 지점 보기 ({locations.length}개)</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                [{loc.categoryName}] {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table Container */}
        <div style={{ flex: 1, overflowY: 'auto', borderRadius: '12px', border: '1px solid #282828', background: '#121212' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#b3b3b3', fontSize: '0.9rem' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              학생 제출 데이터를 불러오는 중입니다...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#71717a', fontSize: '0.9rem' }}>
              {submissions.length === 0
                ? '📌 아직 제출된 학생 학습 기록이 없습니다. 지도 퀴즈를 풀고 제출하면 이곳에 모입니다.'
                : '🔍 조건에 해당하는 학생 제출 기록이 없습니다.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#181818', color: '#1ed760', borderBottom: '1px solid #282828', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '10px 14px', width: '55px' }}>No.</th>
                  <th style={{ padding: '10px 14px', width: '120px' }}>제출 학생</th>
                  <th style={{ padding: '10px 14px', width: '170px' }}>지형/기후명</th>
                  <th style={{ padding: '10px 14px' }}>학생이 작성한 특징 및 생활 모습 내용</th>
                  <th style={{ padding: '10px 14px', width: '90px', textAlign: 'center' }}>상세 확인</th>
                  <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center' }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub, index) => {
                  const loc = locations.find(l => l.id === sub.location_id || l.name === sub.location_title);
                  return (
                    <tr
                      key={sub.id || index}
                      style={{
                        borderBottom: '1px solid #282828',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1f1f1f'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', color: '#71717a', fontWeight: 700 }}>
                        {filteredSubmissions.length - index}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1ed760' }}>
                        👤 {sub.student_name || '익명 학생'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#ffffff' }}>
                        📍 {sub.location_title || sub.answer_name || '-'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
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
                          title="클릭하여 교과서 모범 답안과 비교 및 상세 확인"
                        >
                          {sub.answer_feature || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
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
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(sub)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f3727f',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            opacity: 0.8,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = 0.8}
                          title="제출 항목 삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Inspection Modal */}
        {selectedSubmission && (() => {
          const loc = locations.find(l => l.id === selectedSubmission.location_id || l.name === selectedSubmission.location_title);
          return (
            <div
              className="modal-overlay"
              onClick={() => setSelectedSubmission(null)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 20000,
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.6rem' }}>{loc?.category === 'landform' ? '🏔️' : '☀️'}</span>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                        {selectedSubmission.location_title || selectedSubmission.answer_name}
                      </h3>
                      {loc && (
                        <span style={{ background: '#1ed760', color: '#000', fontWeight: 800, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '9999px' }}>
                          {loc.categoryName}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: '#b3b3b3', flexWrap: 'wrap' }}>
                      <span>👤 <strong>제출 학생:</strong> <span style={{ color: '#1ed760', fontWeight: 700 }}>{selectedSubmission.student_name}</span></span>
                      {loc && <span>📍 <strong>대륙:</strong> {loc.continent}</span>}
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
                {loc?.modelAnswer && (
                  <div style={{ background: '#121212', border: '1px solid #1ed760', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#1ed760', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📖</span>
                      <span>교과서 핵심 모범 답안 (참고용)</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.7 }}>
                      {loc.modelAnswer}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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
    </div>
  );
}
