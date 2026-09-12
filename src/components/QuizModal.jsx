import React, { useState } from 'react';
import { X, Volume2, VolumeX, CheckCircle, HelpCircle, Eye, Sparkles, ArrowRight, ZoomIn } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound, speakText, stopSpeech } from '../utils/audio';
import { saveQuizSubmission } from '../utils/supabaseService';

export default function QuizModal({
  location,
  onClose,
  onComplete,
  isAlreadyCompleted,
  previousAnswer,
  user
}) {
  const [activeTab, setActiveTab] = useState(isAlreadyCompleted ? 'review' : 'quiz'); // 'quiz' | 'explore' | 'review'
  const [studentName, setStudentName] = useState(() => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return localStorage.getItem('geo_last_student_name') || '';
  });
  const [inputName, setInputName] = useState(previousAnswer?.name || '');
  const [inputFeature, setInputFeature] = useState(previousAnswer?.feature || '');
  const [feedback, setFeedback] = useState(isAlreadyCompleted ? { isSuccess: true, score: 100 } : null);
  const [showHint, setShowHint] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Single exact photo for this location
  const currentImage = location.image;

  // Anti-paste handlers for student inputs
  const handleBlockPaste = (e) => {
    e.preventDefault();
    alert('⚠️ 붙여넣기는 사용할 수 없습니다. 직접 타이핑하여 작성해 주세요!');
  };

  const handleBlockDrop = (e) => {
    e.preventDefault();
    alert('⚠️ 텍스트 끌어다 놓기는 사용할 수 없습니다. 직접 타이핑하여 작성해 주세요!');
  };

  const handleBlockContextMenu = (e) => {
    e.preventDefault();
  };

  // Toggle TTS
  const handleToggleSpeech = (text) => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakText(text);
    }
  };

  // Evaluate Student Submission
  const handleSubmitQuiz = (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert('학생 이름을 입력해 주세요!');
      return;
    }
    if (!inputName.trim() || !inputFeature.trim()) {
      alert('지형/기후 명칭과 특징을 모두 입력해 주세요!');
      return;
    }

    sound.playClick();
    localStorage.setItem('geo_last_student_name', studentName.trim());

    // 1. Name Check
    const cleanName = inputName.trim().replace(/\s+/g, '');
    const isNameCorrect = location.nameKeywords.some(kw => cleanName.includes(kw.replace(/\s+/g, '')));

    // 2. Feature Keywords Check
    const cleanFeature = inputFeature.trim();
    const matchedFeatureKeywords = location.featureKeywords.filter(kw => cleanFeature.includes(kw));
    const isFeatureGood = matchedFeatureKeywords.length >= 1 || cleanFeature.length >= 10;

    const isTotalSuccess = isNameCorrect && isFeatureGood;

    if (isTotalSuccess) {
      sound.playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setFeedback({
        isSuccess: true,
        score: 100,
        message: '🎉 참 잘했어요! 지형/기후 명칭과 특징을 바르게 작성했습니다.',
        matchedKeywords: matchedFeatureKeywords
      });
      onComplete(location.id, { name: inputName, feature: inputFeature });
      saveQuizSubmission({
        locationId: location.id,
        locationTitle: location.name,
        studentName: studentName.trim(),
        answerName: inputName,
        answerFeature: inputFeature,
        score: 100
      });
    }
 else if (isNameCorrect && !isFeatureGood) {
      setFeedback({
        isSuccess: false,
        score: 50,
        message: '💡 명칭은 맞았습니다! 특징 설명에 교과서 내용(예: 환경, 가옥, 농업, 옷차림 등)을 조금 더 자세히 적어보세요.',
        matchedKeywords: matchedFeatureKeywords
      });
    } else {
      setFeedback({
        isSuccess: false,
        score: 30,
        message: '🧐 명칭을 다시 한번 확인해 보세요! 힌트를 참고하거나 교과서 이미지를 살펴보세요.',
        matchedKeywords: matchedFeatureKeywords
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={() => { stopSpeech(); onClose(); }}>
      <div
        className="glass-panel modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '2rem', borderRadius: '24px' }}
      >
        {/* Close Button */}
        <button
          onClick={() => { stopSpeech(); onClose(); }}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
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
            transition: 'all 0.2s'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.2rem' }}>{location.category === 'landform' ? '🏔️' : '☀️'}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800 }}>
                {location.categoryName} 탐색지
              </span>
              <span style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
                {location.pageRef}
              </span>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginTop: '6px' }}>
              {location.name}
            </h2>
          </div>
        </div>

        {/* Main Grid: Left Image, Right Quiz & Explanation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '1.75rem' }}>
          
          {/* Left Column: Textbook Image Viewer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', background: '#090d16', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={currentImage}
                alt={location.name}
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', cursor: 'pointer' }}
                onClick={() => setShowImageZoom(true)}
              />
              
              {/* Zoom Button Overlay */}
              <button
                onClick={() => setShowImageZoom(true)}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(6px)'
                }}
              >
                <ZoomIn size={16} /> 원본 사진 확대보기
              </button>
            </div>
          </div>

          {/* Right Column: Quiz / Exploration Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Mode Switch Tabs */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => { sound.playClick(); setActiveTab('quiz'); }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: '10px',
                  background: activeTab === 'quiz' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
                  color: activeTab === 'quiz' ? 'white' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                📝 학습 확인 입력
              </button>
              <button
                onClick={() => { sound.playClick(); setActiveTab('explore'); }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  border: 'none',
                  borderRadius: '10px',
                  background: activeTab === 'explore' ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
                  color: activeTab === 'explore' ? 'white' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                📖 교과서 핵심 탐색
              </button>
            </div>

            {/* TAB 1: Quiz Form */}
            {activeTab === 'quiz' && (
              <form onSubmit={handleSubmitQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Student Name Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '1.05rem', fontWeight: 900, color: '#38bdf8', marginBottom: '6px' }}>
                    👤 학생 이름 (작성자):
                  </label>
                  <input
                    type="text"
                    placeholder="이름을 입력하세요 (예: 홍길동)"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1.1rem',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1.5px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      color: '#34d399',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Input 1: Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', marginBottom: '8px' }}>
                    1. {location.categoryName} 명칭을 입력하세요:
                  </label>

                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onPaste={handleBlockPaste}
                    onDrop={handleBlockDrop}
                    onContextMenu={handleBlockContextMenu}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.2rem',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1.5px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Input 2: Characteristic Description */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc' }}>
                      2. 이 지역의 환경이나 생활 모습 특징을 입력하세요:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <HelpCircle size={16} /> {showHint ? '힌트 닫기' : '힌트 보기'}
                    </button>
                  </div>
                  
                  {showHint && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.95rem', color: '#fbbf24', marginBottom: '10px', lineHeight: '1.5' }}>
                      💡 <strong>힌트:</strong> {location.hint}
                    </div>
                  )}

                  <textarea
                    rows={5}
                    value={inputFeature}
                    onChange={(e) => setInputFeature(e.target.value)}
                    onPaste={handleBlockPaste}
                    onDrop={handleBlockDrop}
                    onContextMenu={handleBlockContextMenu}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.2rem',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1.5px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '1.1rem',
                      lineHeight: '1.6',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px', display: 'block', fontWeight: 600 }}>
                    🔒 직접 키보드로 작성해 주세요. (붙여넣기 사용 불가)
                  </span>
                </div>

                {/* Submit Button */}
                <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.15rem', fontWeight: 800 }}>
                  <Sparkles size={20} /> 정답 제출 & 학습 확인
                </button>

                {/* Feedback Box */}
                {feedback && (
                  <div
                    style={{
                      background: feedback.isSuccess ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                      border: `1.5px solid ${feedback.isSuccess ? '#10b981' : '#ef4444'}`,
                      borderRadius: '14px',
                      padding: '1.2rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 900, fontSize: '1.1rem', color: feedback.isSuccess ? '#34d399' : '#f87171', marginBottom: '8px' }}>
                      {feedback.isSuccess ? <CheckCircle size={22} /> : <HelpCircle size={22} />}
                      <span>{feedback.message}</span>
                    </div>

                    {/* Model Answer Comparison */}
                    <div style={{ marginTop: '12px', background: 'rgba(15, 23, 42, 0.75)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 800, marginBottom: '6px' }}>
                        📖 교과서 모범 답안 비교:
                      </div>
                      <div style={{ fontSize: '1.05rem', color: '#f8fafc', lineHeight: 1.6 }}>
                        {location.modelAnswer}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* TAB 2: Exploration & Textbook Model Answer */}
            {activeTab === 'explore' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(15, 23, 42, 0.55)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>위치 및 대륙</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                    {location.continent} ({location.lat.toFixed(2)}°, {location.lng.toFixed(2)}°)
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>주요 지형/기후 명칭</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f59e0b', marginTop: '2px' }}>
                    {location.name}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>교과서 핵심 요약 정리</span>
                  <div style={{ fontSize: '1.1rem', color: '#f8fafc', lineHeight: 1.7, marginTop: '6px', background: 'rgba(15,23,42,0.85)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    {location.modelAnswer}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => { sound.playClick(); setActiveTab('quiz'); }}
                    style={{ fontSize: '1.05rem', padding: '0.85rem 1.25rem' }}
                  >
                    퀴즈 풀러 가기 <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Zoom Modal Overlay */}
        {showImageZoom && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 20000,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}
            onClick={() => setShowImageZoom(false)}
          >
            <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh' }}>
              <img
                src={currentImage}
                alt={location.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
              />
              <button
                onClick={() => setShowImageZoom(false)}
                style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
