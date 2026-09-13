import React from 'react';
import { X, Award, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { BADGES } from '../data/textbookData';
import { sound } from '../utils/audio';

export default function AchievementBadge({
  completedCount,
  completedIds,
  locations,
  onClose
}) {
  const totalLandform = locations.filter(l => l.category === 'landform').length;
  const totalClimate = locations.filter(l => l.category === 'climate').length;
  const landformCompletedCount = locations.filter(l => l.category === 'landform' && completedIds.includes(l.id)).length;
  const climateCompletedCount = locations.filter(l => l.category === 'climate' && completedIds.includes(l.id)).length;

  const isBadgeUnlocked = (badge) => {
    if (badge.category === 'landform') return landformCompletedCount >= badge.reqCount;
    if (badge.category === 'climate') return climateCompletedCount >= badge.reqCount;
    return completedCount >= badge.reqCount;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '2rem', maxWidth: '640px', borderRadius: '24px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '10px', borderRadius: '12px' }}>
              <Award size={24} color="#f59e0b" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
                세계 지리 탐험 도전 과제 & 칭호
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                지도를 탐색하고 학습 확인을 완료하여 칭호를 수집하세요!
              </p>
            </div>
          </div>
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

        {/* Badges List Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {BADGES.map(badge => {
            const unlocked = isBadgeUnlocked(badge);

            return (
              <div
                key={badge.id}
                style={{
                  background: unlocked ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(2, 132, 199, 0.15) 100%)' : 'rgba(15, 23, 42, 0.5)',
                  border: `1px solid ${unlocked ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  opacity: unlocked ? 1 : 0.6
                }}
              >
                <div style={{ fontSize: '2.2rem', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                  {badge.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: unlocked ? '#fbbf24' : '#94a3b8' }}>
                      {badge.title}
                    </span>
                    {unlocked ? <CheckCircle2 size={14} color="#f59e0b" /> : <Lock size={14} color="#64748b" />}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    {badge.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Level Banner */}
        <div style={{ marginTop: '1.5rem', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700 }}>
            ✨ 지형 탐험 달성도: {landformCompletedCount}/{totalLandform} | 기후 탐험 달성도: {climateCompletedCount}/{totalClimate}
          </span>
        </div>

      </div>
    </div>
  );
}
