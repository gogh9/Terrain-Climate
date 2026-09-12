import React from 'react';
import { X, Printer, CheckCircle2, Circle, Mountain, Sun, BookOpen } from 'lucide-react';
import { sound } from '../utils/audio';

export default function SummaryNoteModal({
  locations,
  completedIds,
  userAnswers,
  onClose
}) {
  const completedCount = completedIds.length;
  const totalCount = locations.length;

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '2.5rem', maxWidth: '1000px', borderRadius: '24px' }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.8rem' }}>📖</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white' }}>
                6학년 사회 세계 지형·기후 학습 백지도 요약 노트
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              학습 확인을 진행한 세계의 주요 지형 및 기후 지점 요약 보고서입니다. (완료: {completedCount}/{totalCount})
            </p>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ fontSize: '0.85rem' }}>
              <Printer size={16} /> 인쇄 / PDF 저장
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
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Location Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '1.25rem' }}>
          {locations.map((loc) => {
            const isCompleted = completedIds.includes(loc.id);
            const ans = userAnswers[loc.id];

            return (
              <div
                key={loc.id}
                style={{
                  background: isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                {/* Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{loc.category === 'landform' ? '🏔️' : '☀️'}</span>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: isCompleted ? '#34d399' : 'white' }}>
                      {loc.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      background: isCompleted ? '#10b981' : 'rgba(148, 163, 184, 0.2)',
                      color: isCompleted ? 'white' : '#94a3b8',
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
                    alt={loc.name}
                    style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div>📍 대륙: <strong style={{ color: '#e2e8f0' }}>{loc.continent}</strong></div>
                    <div>📚 출처: <strong style={{ color: '#38bdf8' }}>{loc.pageRef}</strong></div>
                    <div>🏷️ 유형: <strong style={{ color: '#f59e0b' }}>{loc.subType}</strong></div>
                  </div>
                </div>

                {/* Student Typed Answer vs Model Answer */}
                {isCompleted && ans ? (
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.82rem' }}>
                    <div style={{ color: '#34d399', fontWeight: 700, marginBottom: '2px' }}>
                      ✏️ 학생 제출 작성 내용:
                    </div>
                    <div style={{ color: '#f8fafc', marginBottom: '6px' }}>
                      - 명칭: <strong>{ans.name}</strong><br />
                      - 특징: {ans.feature}
                    </div>
                    <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '2px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                      📘 교과서 모범 답안:
                    </div>
                    <div style={{ color: '#94a3b8', lineHeight: 1.4 }}>
                      {loc.modelAnswer}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                    💡 지도에서 해당 마커를 클릭하여 지형/기후 명칭과 특징을 작성해보세요.
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
