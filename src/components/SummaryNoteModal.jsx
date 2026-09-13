import React from 'react';
import { X, Printer, CheckCircle2, Circle } from 'lucide-react';
import { sound } from '../utils/audio';

export default function SummaryNoteModal({
  locations,
  completedIds,
  userAnswers,
  onClose
}) {
  const completedCount = completedIds.length;
  const totalCount = locations.length;
  const studentName = typeof window !== 'undefined' ? (localStorage.getItem('geo_student_name') || '') : '';

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="modal-overlay summary-note-overlay" onClick={onClose}>
      <div
        className="modal-content summary-note-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '2.5rem', maxWidth: '1000px', borderRadius: '16px' }}
      >
        {/* Header Bar */}
        <div className="summary-note-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.8rem' }}>📖</span>
              <h2 className="summary-note-title" style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff' }}>
                6학년 사회 세계 지형, 기후 학습 백지도 요약 노트
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <p className="summary-note-subtitle" style={{ fontSize: '0.85rem', color: '#b3b3b3', margin: 0 }}>
                학습 확인을 진행한 세계의 주요 지형 및 기후 지점 요약 보고서입니다. (완료: {completedCount}/{totalCount})
              </p>
              {studentName && (
                <span className="summary-note-student-badge" style={{ background: '#1ed760', color: '#000000', fontSize: '0.78rem', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px' }}>
                  👤 학생: {studentName}
                </span>
              )}
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
              <Printer size={16} /> 인쇄, PDF 저장
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
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Location Summary Cards Grid */}
        <div
          className={`summary-note-grid ${locations.length <= 6 ? 'grid-spacious-6' : 'grid-compact-8'}`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '1.25rem' }}
        >
          {locations.map((loc) => {
            const isCompleted = completedIds.includes(loc.id);
            const ans = userAnswers[loc.id];
            const cleanTitle = (loc.name || '').replace(/\s*\/\s*/g, ', ');

            return (
              <div
                key={loc.id}
                className="summary-note-card"
                style={{
                  background: isCompleted ? 'rgba(30, 215, 96, 0.08)' : '#1f1f1f',
                  border: `1px solid ${isCompleted ? '#1ed760' : '#282828'}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                {/* Status Badge */}
                <div className="summary-note-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{loc.category === 'landform' ? '🏔️' : '☀️'}</span>
                    <span className="summary-note-card-title" style={{ fontWeight: 700, fontSize: '1rem', color: isCompleted ? '#1ed760' : '#ffffff' }}>
                      {cleanTitle}
                    </span>
                  </div>
                  <span
                    className="summary-note-badge"
                    style={{
                      fontSize: '0.72rem',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      background: isCompleted ? '#1ed760' : '#282828',
                      color: isCompleted ? '#000000' : '#b3b3b3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                    {isCompleted ? '학습 완료' : '미완료'}
                  </span>
                </div>

                {/* Content Details */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img
                    src={loc.image}
                    alt={cleanTitle}
                    className="summary-note-thumb"
                    style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #282828' }}
                  />
                  <div className="summary-note-info" style={{ fontSize: '0.8rem', color: '#b3b3b3', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div>📍 대륙: <strong style={{ color: '#ffffff' }}>{loc.continent}</strong></div>
                    <div>📚 출처: <strong style={{ color: '#1ed760' }}>{loc.pageRef}</strong></div>
                    <div>🏷️ 유형: <strong style={{ color: '#ffa42b' }}>{loc.subType}</strong></div>
                  </div>
                </div>

                {/* Student Typed Answer vs Model Answer */}
                {isCompleted && ans ? (
                  <div className="summary-note-answer-box" style={{ background: '#121212', padding: '10px', borderRadius: '8px', border: '1px solid #282828', fontSize: '0.82rem' }}>
                    <div className="summary-note-label" style={{ color: '#1ed760', fontWeight: 700, marginBottom: '2px' }}>
                      ✏️ 학생 제출 작성 내용:
                    </div>
                    <div className="summary-note-student-text" style={{ color: '#ffffff', marginBottom: '6px' }}>
                      - 명칭: <strong>{(ans.name || '').replace(/\s*\/\s*/g, ', ')}</strong><br />
                      - 특징: {ans.feature}
                    </div>
                    <div className="summary-note-label" style={{ color: '#1ed760', fontWeight: 700, marginBottom: '2px', borderTop: '1px solid #282828', paddingTop: '6px' }}>
                      📘 교과서 모범 답안:
                    </div>
                    <div className="summary-note-model-text" style={{ color: '#b3b3b3', lineHeight: 1.4 }}>
                      {loc.modelAnswer}
                    </div>
                  </div>
                ) : (
                  <div className="summary-note-answer-box" style={{ background: '#121212', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#71717a' }}>
                    💡 지도에서 해당 마커를 클릭하여 지형, 기후 명칭과 특징을 작성해보세요.
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
