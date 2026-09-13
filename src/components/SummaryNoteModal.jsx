import React, { useState } from 'react';
import { X, Download, CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export default function SummaryNoteModal({
  locations,
  completedIds,
  userAnswers,
  onClose,
  onResetProgress,
  studentUser
}) {
  const [cardImageIndex, setCardImageIndex] = useState({});
  const [isSavingHtml, setIsSavingHtml] = useState(false);
  const completedCount = completedIds.length;
  const totalCount = locations.length;
  const studentName = studentUser?.fullName || (typeof window !== 'undefined' ? (localStorage.getItem('geo_last_student_name') || localStorage.getItem('geo_student_name') || '') : '');

  const handleCycleImage = (locId, totalImages) => {
    sound.playClick();
    setCardImageIndex(prev => ({
      ...prev,
      [locId]: ((prev[locId] || 0) + 1) % totalImages
    }));
  };

  const handleSaveHtml = async () => {
    sound.playClick();
    setIsSavingHtml(true);
    try {
      // Convert image path to base64 data URL for completely portable offline HTML
      const toBase64 = async (imgPath) => {
        try {
          if (!imgPath) return '';
          if (imgPath.startsWith('data:')) return imgPath;
          const fullUrl = imgPath.startsWith('http') ? imgPath : `${window.location.origin}${encodeURI(imgPath)}`;
          const res = await fetch(fullUrl);
          if (!res.ok) return fullUrl;
          const blob = await res.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(fullUrl);
            reader.readAsDataURL(blob);
          });
        } catch {
          return imgPath.startsWith('http') ? imgPath : `${window.location.origin}${encodeURI(imgPath)}`;
        }
      };

      // Convert images
      const imageMap = {};
      await Promise.all(
        locations.map(async (loc) => {
          const imgPath = (loc.images && loc.images.length > 0) ? (loc.images[cardImageIndex[loc.id] || 0] || loc.images[0]) : loc.image;
          imageMap[loc.id] = await toBase64(imgPath);
        })
      );

      const now = new Date();
      const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
      const currentStudent = studentName || '익명 학생';

      const cardsHtml = locations.map(loc => {
        const isCompleted = completedIds.includes(loc.id);
        const ans = userAnswers[loc.id];
        const cleanTitle = escapeHtml((loc.name || '').replace(/\s*\/\s*/g, ', '));
        const imgSrc = imageMap[loc.id] || loc.image;

        return `
        <div class="card ${isCompleted ? 'completed' : ''}">
          <div class="card-header">
            <div class="card-title">
              <span>${loc.category === 'landform' ? '🏔️' : '☀️'}</span>
              <span>${cleanTitle}</span>
            </div>
            <span class="status-tag ${isCompleted ? 'completed' : 'pending'}">
              ${isCompleted ? '✓ 학습 완료' : '미완료'}
            </span>
          </div>

          <div class="card-body">
            <img src="${imgSrc}" alt="${cleanTitle}" class="card-thumb" />
            <div class="card-meta">
              <div>📍 대륙: <strong>${escapeHtml(loc.continent || '-')}</strong></div>
              <div>📚 출처: <strong>${escapeHtml(loc.pageRef || '-')}</strong></div>
              <div>🏷️ 유형: <strong>${escapeHtml(loc.subType || '-')}</strong></div>
            </div>
          </div>

          ${isCompleted && ans ? `
            <div class="answer-box">
              <div class="answer-label">✏️ 학생 제출 작성 내용:</div>
              <div class="student-text">
                • ${loc.category === 'climate' ? '기후' : '지형'}: <strong>${escapeHtml((ans.name || '').replace(/\s*\/\s*/g, ', '))}</strong><br />
                • 특징: ${escapeHtml(ans.feature || '')}
              </div>
              <div class="model-label">📘 교과서 모범 답안:</div>
              <div class="model-text">${escapeHtml(loc.modelAnswer || '')}</div>
            </div>
          ` : `
            <div class="pending-box">
              💡 지도에서 해당 마커를 클릭하여 지형, 기후 명칭과 특징을 작성해보세요.
            </div>
          `}
        </div>`;
      }).join('\n');

      const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>6학년 사회 세계 지형·기후 학습 요약 노트 - ${escapeHtml(currentStudent)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #121212;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
      padding: 2.5rem 1.5rem;
      line-height: 1.5;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #282828;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .title-area h1 {
      font-size: 1.8rem;
      font-weight: 900;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-area p {
      color: #b3b3b3;
      font-size: 0.95rem;
      margin-top: 6px;
    }
    .meta-badges {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .badge-student {
      background: #1ed760;
      color: #000000;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.88rem;
    }
    .badge-date {
      background: #1f1f1f;
      color: #b3b3b3;
      border: 1px solid #404040;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 0.85rem;
    }
    .badge-score {
      background: rgba(30, 215, 96, 0.15);
      color: #1ed760;
      border: 1px solid #1ed760;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.88rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: #181818;
      border: 1px solid #282828;
      border-radius: 14px;
      padding: 1.3rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .card.completed {
      border-color: #1ed760;
      background: rgba(30, 215, 96, 0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #ffffff;
    }
    .card.completed .card-title {
      color: #1ed760;
    }
    .status-tag {
      font-size: 0.75rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
    }
    .status-tag.completed {
      background: #1ed760;
      color: #000000;
    }
    .status-tag.pending {
      background: #282828;
      color: #888888;
    }
    .card-body {
      display: flex;
      gap: 1.2rem;
      align-items: center;
    }
    .card-thumb {
      width: 120px;
      height: 85px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #282828;
      flex-shrink: 0;
      background: #222;
    }
    .card-meta {
      font-size: 0.85rem;
      color: #b3b3b3;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .card-meta strong {
      color: #ffffff;
    }
    .answer-box {
      background: #121212;
      border: 1px solid #282828;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 0.88rem;
      line-height: 1.5;
    }
    .answer-label {
      color: #1ed760;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .student-text {
      color: #ffffff;
      margin-bottom: 8px;
    }
    .model-label {
      color: #1ed760;
      font-weight: 800;
      border-top: 1px solid #282828;
      padding-top: 8px;
      margin-bottom: 4px;
    }
    .model-text {
      color: #b3b3b3;
      line-height: 1.4;
    }
    .pending-box {
      background: #121212;
      border: 1px dashed #333333;
      border-radius: 10px;
      padding: 12px;
      font-size: 0.85rem;
      color: #666666;
      text-align: center;
    }
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #282828;
      text-align: center;
      color: #666666;
      font-size: 0.85rem;
    }
    @media print {
      body { background: #ffffff !important; color: #000000 !important; padding: 0 !important; }
      .card { background: #ffffff !important; border: 1px solid #cccccc !important; page-break-inside: avoid; }
      .answer-box { background: #f8f8f8 !important; border-color: #dddddd !important; }
      .card-title, .answer-label, .model-label { color: #000000 !important; }
      .student-text, .card-meta strong { color: #111111 !important; }
      .model-text, .card-meta { color: #444444 !important; }
      .badge-student { background: #eeeeee !important; color: #000000 !important; }
    }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr; }
      .card-body { flex-direction: column; align-items: flex-start; }
      .card-thumb { width: 100%; height: 160px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="title-area">
        <h1>📖 6학년 사회 세계 지형·기후 학습 요약 노트</h1>
        <p>세계의 주요 지형 및 기후 지점 탐험 학습 결과 요약 보고서입니다.</p>
      </div>
      <div class="meta-badges">
        <span class="badge-student">👤 학생: ${escapeHtml(currentStudent)}</span>
        <span class="badge-date">📅 작성일: ${dateStr}</span>
        <span class="badge-score">🏆 완료: ${completedCount}/${totalCount}</span>
      </div>
    </header>

    <main class="grid">
      ${cardsHtml}
    </main>

    <footer class="footer">
      6학년 사회 | 세계의 지형과 기후 탐험대 • 학습 요약 노트
    </footer>
  </div>
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedName = currentStudent.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const fileDate = now.toISOString().slice(0, 10);
      a.download = `학습요약노트_${sanitizedName}_${fileDate}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('HTML export error', err);
      alert('HTML 파일 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingHtml(false);
    }
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
                6학년 사회 세계 지형, 기후 학습 요약 노트
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
            {onResetProgress && completedCount > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => { onResetProgress(); onClose(); }}
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', color: '#ffa42b', borderColor: '#ffa42b' }}
                title="이 지도의 나의 학습 기록 초기화"
              >
                <RotateCcw size={15} /> 학습 초기화
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSaveHtml}
              disabled={isSavingHtml}
              style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="학습 요약 노트를 독립적인 HTML 파일로 다운로드합니다"
            >
              <Download size={16} /> {isSavingHtml ? 'HTML 생성 중...' : 'HTML 파일로 저장'}
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
                  <div
                    style={{ position: 'relative', width: '100px', height: '70px', flexShrink: 0, cursor: (loc.images && loc.images.length > 1) ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (loc.images && loc.images.length > 1) {
                        handleCycleImage(loc.id, loc.images.length);
                      }
                    }}
                    title={(loc.images && loc.images.length > 1) ? '클릭하여 다음 사진 보기' : cleanTitle}
                  >
                    <img
                      src={(loc.images && loc.images.length > 0) ? (loc.images[cardImageIndex[loc.id] || 0] || loc.images[0]) : loc.image}
                      alt={cleanTitle}
                      className="summary-note-thumb"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #282828' }}
                    />
                    {loc.images && loc.images.length > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '3px',
                          right: '3px',
                          background: 'rgba(0,0,0,0.8)',
                          color: '#1ed760',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}
                      >
                        {(cardImageIndex[loc.id] || 0) + 1}/{loc.images.length}
                      </span>
                    )}
                  </div>
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
                      - {loc.category === 'climate' ? '기후' : '지형'}: <strong>{(ans.name || '').replace(/\s*\/\s*/g, ', ')}</strong><br />
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
