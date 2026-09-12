import React from 'react';
import { Globe, FileText, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';

export default function Header({
  completedIds,
  totalCount,
  onOpenSummaryNote
}) {
  const completedCount = completedIds.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '0.75rem 1.5rem', zIndex: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', padding: '0.5rem', borderRadius: '12px', display: 'flex', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)' }}>
            <Globe size={24} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                6학년 사회 세계 지형·기후 백지도 탐험
              </h1>
              <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                교과서 백지도
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
              백지도의 지점을 클릭하여 해당 지역의 지형과 기후 특징을 확인하고 학습해 보세요.
            </p>
          </div>
        </div>

        {/* Right Side Controls & Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          {/* Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
            <div style={{ flex: 1, height: '10px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(to right, #10b981, #34d399)',
                  borderRadius: '10px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
              <CheckCircle2 size={16} />
              <span>{completedCount} / {totalCount}</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            className="btn btn-primary"
            onClick={() => { sound.playClick(); onOpenSummaryNote(); }}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <FileText size={16} />
            <span>학습 요약 노트</span>
          </button>
        </div>

      </div>
    </header>
  );
}

