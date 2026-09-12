import React, { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, Download, Search, Users, FileText, CheckCircle2, Trash2, Calendar, Award } from 'lucide-react';
import { fetchAllSubmissions, deleteSubmission } from '../utils/supabaseService';
import { sound } from '../utils/audio';

export default function TeacherDashboardModal({ onClose, locations = [] }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load submissions from Supabase
  const loadData = async () => {
    setIsRefreshing(true);
    const result = await fetchAllSubmissions(300);
    if (result.success) {
      setSubmissions(result.data);
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Refresh
  const handleRefresh = () => {
    sound.playClick();
    loadData();
  };

  // Handle Delete
  const handleDelete = async (id, studentName) => {
    if (!window.confirm(`'${studentName}' 학생의 이 제출 항목을 삭제하시겠습니까?`)) return;
    sound.playClick();
    const result = await deleteSubmission(id);
    if (result.success) {
      setSubmissions(prev => prev.filter(item => item.id !== id));
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
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '2rem',
          maxWidth: '1100px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '0.6rem', borderRadius: '14px', display: 'flex', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
              <Users size={26} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
                👨‍🏫 학생 학습 제출 현황 대시보드
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                학생들이 지도 탐험 퀴즈를 풀고 제출한 내용을 실시간으로 확인하고 관리할 수 있습니다.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ fontSize: '0.82rem', gap: '6px' }}
              title="새로고침"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handleExportCSV}
              style={{ fontSize: '0.82rem', gap: '6px', background: 'linear-gradient(135deg, #059669, #10b981)' }}
              title="엑셀 CSV 파일로 저장"
            >
              <Download size={15} />
              <span>엑셀(CSV) 다운로드</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#94a3b8',
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
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '0.9rem 1.2rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileText size={28} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>총 제출 건수</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8' }}>{submissions.length}건</div>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '0.9rem 1.2rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Users size={28} color="#34d399" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>참여 학생 수</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>{uniqueStudentsCount}명</div>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '0.9rem 1.2rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Award size={28} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>검색/필터 결과</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>{filteredSubmissions.length}건</div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="form-input"
              placeholder="학생 이름, 지형/기후명, 제출 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Location Select Filter */}
          <select
            className="form-input"
            value={selectedLocationFilter}
            onChange={(e) => setSelectedLocationFilter(e.target.value)}
            style={{ width: '220px', height: '40px', fontSize: '0.85rem' }}
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
        <div style={{ flex: 1, overflowY: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 0.8)' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              학생 제출 데이터를 불러오는 중입니다...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              {submissions.length === 0
                ? '📌 아직 제출된 학생 학습 기록이 없습니다. 지도 퀴즈를 풀고 제출하면 이곳에 모입니다.'
                : '🔍 조건에 해당하는 학생 제출 기록이 없습니다.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#38bdf8', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '10px 14px', width: '60px' }}>No.</th>
                  <th style={{ padding: '10px 14px', width: '120px' }}>제출 학생</th>
                  <th style={{ padding: '10px 14px', width: '160px' }}>지점/기후명</th>
                  <th style={{ padding: '10px 14px', width: '150px' }}>작성한 이름</th>
                  <th style={{ padding: '10px 14px' }}>작성한 특징 내용</th>
                  <th style={{ padding: '10px 14px', width: '140px' }}>제출 시각</th>
                  <th style={{ padding: '10px 14px', width: '60px', textAlign: 'center' }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub, index) => (
                  <tr
                    key={sub.id || index}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>
                      {filteredSubmissions.length - index}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#34d399' }}>
                      👤 {sub.student_name || '익명 학생'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>
                      📍 {sub.location_title || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#fbbf24', fontWeight: 700 }}>
                      {sub.answer_name || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#cbd5e1', lineHeight: 1.45 }}>
                      {sub.answer_feature || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.78rem' }}>
                      {sub.created_at ? new Date(sub.created_at).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(sub.id, sub.student_name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          opacity: 0.75,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.75}
                        title="제출 항목 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
