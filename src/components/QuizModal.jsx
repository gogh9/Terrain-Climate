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
  user,
  studentUser,
  sessionId = '1'
}) {
  const [activeTab, setActiveTab] = useState('quiz');
  const [studentName, setStudentName] = useState(() => {
    if (studentUser?.fullName) return studentUser.fullName;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return localStorage.getItem('geo_last_student_name') || '';
  });
  const [inputName, setInputName] = useState(previousAnswer?.name || '');
  const [inputFeature, setInputFeature] = useState(previousAnswer?.feature || '');
  const [feedback, setFeedback] = useState(isAlreadyCompleted ? { isSuccess: true, score: 100, message: '🎉 이미 학습 확인을 완료한 지점입니다.' } : null);
  const [showHint, setShowHint] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Single exact photo for this location
  const currentImage = location.image;

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
    const effectiveStudentName = studentUser?.fullName || studentName?.trim() || localStorage.getItem('geo_last_student_name') || '익명 학생';

    const cleanName = inputName.trim();
    const cleanFeature = inputFeature.trim();

    if (!cleanName) {
      alert(location.category === 'climate' 
        ? '이 지역에 나타나는 기후를 입력해 주세요!' 
        : '이 지역에서 볼 수 있는 지형을 입력해 주세요!'
      );
      return;
    }

    if (!cleanFeature) {
      alert('이 지역의 환경이나 생활 모습 특징을 입력해 주세요!');
      return;
    }

    sound.playClick();
    localStorage.setItem('geo_last_student_name', effectiveStudentName);

    // 1. Name Keywords Check (기후 or 지형 명칭 검사)
    const nameKeywords = [
      ...(location.nameKeywords || []),
      ...(location.subType ? [location.subType, location.subType.replace(/\s+/g, '')] : [])
    ];
    const isNameCorrect = nameKeywords.some(kw => {
      const normKw = kw.replace(/\s+/g, '').toLowerCase();
      const normInput = cleanName.replace(/\s+/g, '').toLowerCase();
      return normInput.includes(normKw) || normKw.includes(normInput);
    });

    // 2. Feature Keywords Check
    const matchedFeatureKeywords = location.featureKeywords ? location.featureKeywords.filter(kw => cleanFeature.includes(kw)) : [];
    const isFeatureGood = matchedFeatureKeywords.length >= 1 || cleanFeature.length >= 8;

    if (isNameCorrect && isFeatureGood) {
      sound.playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setFeedback({
        isSuccess: true,
        score: 100,
        message: `🎉 참 잘했어요! ${location.category === 'climate' ? '기후' : '지형'}와 핵심 특징을 바르게 작성했습니다.`,
        matchedKeywords: matchedFeatureKeywords
      });
      onComplete(location.id, { name: cleanName, feature: cleanFeature });
      saveQuizSubmission({
        sessionId: String(sessionId || '1'),
        locationId: location.id,
        locationTitle: location.name,
        studentName: effectiveStudentName,
        answerName: cleanName,
        answerFeature: cleanFeature,
        score: 100
      });
    } else if (!isNameCorrect && isFeatureGood) {
      setFeedback({
        isSuccess: false,
        score: 50,
        message: location.category === 'climate' 
          ? '💡 특징은 잘 작성했어요! 기후를 다시 확인해 보세요.' 
          : '💡 특징은 잘 작성했어요! 지형을 다시 확인해 보세요.',
        matchedKeywords: matchedFeatureKeywords
      });
    } else if (isNameCorrect && !isFeatureGood) {
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
        message: location.category === 'climate' 
          ? '🧐 힌트를 참고하여 알맞은 기후와 특징을 다시 작성해 보세요.' 
          : '🧐 힌트를 참고하여 알맞은 지형과 특징을 다시 작성해 보세요.',
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
            <div style={{ display: 'flex', background: '#1f1f1f', padding: '5px', borderRadius: '9999px', border: '1px solid #282828' }}>
              <button
                onClick={() => { sound.playClick(); setActiveTab('quiz'); }}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  border: 'none',
                  borderRadius: '9999px',
                  background: activeTab === 'quiz' ? '#1ed760' : 'transparent',
                  color: activeTab === 'quiz' ? '#000000' : '#b3b3b3',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                📝 학습 확인 입력
              </button>
              <button
                onClick={() => { sound.playClick(); setActiveTab('explore'); }}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  border: 'none',
                  borderRadius: '9999px',
                  background: activeTab === 'explore' ? '#1ed760' : 'transparent',
                  color: activeTab === 'explore' ? '#000000' : '#b3b3b3',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                📖 교과서 핵심 탐색
              </button>
            </div>

            {/* TAB 1: Quiz Form */}
            {activeTab === 'quiz' && (
              <form onSubmit={handleSubmitQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Input 1: Climate or Landform */}
                <div>
                  <label style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                    {location.category === 'climate' ? '이 지역에 나타나는 기후를 쓰시오:' : '이 지역에서 볼 수 있는 지형을 쓰시오:'}
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1.2rem',
                      background: '#1f1f1f',
                      color: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: 'rgb(18, 18, 18) 0px 1px 0px, rgb(124, 124, 124) 0px 0px 0px 1px inset',
                      border: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Input 2: Characteristic Description */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      이 지역의 환경이나 생활 모습 특징을 입력하세요:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      style={{ background: 'none', border: 'none', color: '#ffa42b', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <HelpCircle size={16} /> {showHint ? '힌트 닫기' : '힌트 보기'}
                    </button>
                  </div>
                  
                  {showHint && (
                    <div style={{ background: 'rgba(255, 164, 43, 0.12)', border: '1px solid rgba(255, 164, 43, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', color: '#ffa42b', marginBottom: '10px', lineHeight: '1.5' }}>
                      💡 <strong>힌트:</strong> {location.hint}
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={inputFeature}
                    onChange={(e) => setInputFeature(e.target.value)}
                    placeholder="교과서에서 학습한 지형이나 기후의 특징, 주민들의 생활 모습(의식주 등)을 적어보세요."
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.2rem',
                      background: '#1f1f1f',
                      color: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: 'rgb(18, 18, 18) 0px 1px 0px, rgb(124, 124, 124) 0px 0px 0px 1px inset',
                      border: 'none',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Submit Button */}
                <button type="submit" className="btn btn-primary" style={{ padding: '0.9rem', fontSize: '1rem', fontWeight: 700 }}>
                  <Sparkles size={18} /> 정답 제출 & 학습 확인
                </button>

                {/* Feedback Box */}
                {feedback && (
                  <div
                    style={{
                      background: feedback.isSuccess ? 'rgba(30, 215, 96, 0.12)' : 'rgba(243, 114, 127, 0.12)',
                      border: `1px solid ${feedback.isSuccess ? '#1ed760' : '#f3727f'}`,
                      borderRadius: '12px',
                      padding: '1.2rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1rem', color: feedback.isSuccess ? '#1ed760' : '#f3727f', marginBottom: '8px' }}>
                      {feedback.isSuccess ? <CheckCircle size={20} /> : <HelpCircle size={20} />}
                      <span>{feedback.message}</span>
                    </div>

                    {/* Model Answer Comparison */}
                    <div style={{ marginTop: '12px', background: '#121212', padding: '12px 16px', borderRadius: '8px', border: '1px solid #282828' }}>
                      <div style={{ fontSize: '0.85rem', color: '#1ed760', fontWeight: 700, marginBottom: '6px' }}>
                        📖 교과서 모범 답안 비교:
                      </div>
                      <div style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.6 }}>
                        <div style={{ marginBottom: '4px', color: '#ffa42b', fontWeight: 700 }}>
                          • {location.category === 'climate' ? '기후' : '지형'}: {location.subType}
                        </div>
                        <div>
                          • 환경 및 생활 모습: {location.modelAnswer}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* TAB 2: Exploration & Textbook Model Answer */}
            {activeTab === 'explore' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#121212', padding: '1.25rem', borderRadius: '12px', border: '1px solid #282828' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#b3b3b3', fontWeight: 500 }}>
                    {location.category === 'climate' ? '나타나는 기후' : '볼 수 있는 지형'}
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1ed760', marginTop: '4px' }}>
                    {location.subType}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.85rem', color: '#b3b3b3', fontWeight: 500 }}>교과서 핵심 요약 정리</span>
                  <div style={{ fontSize: '1rem', color: '#ffffff', lineHeight: 1.7, marginTop: '6px', background: '#181818', padding: '16px', borderRadius: '8px', border: '1px solid #282828' }}>
                    {location.modelAnswer}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-success"
                    onClick={() => { sound.playClick(); setActiveTab('quiz'); }}
                    style={{ fontSize: '0.9rem', padding: '0.75rem 1.4rem' }}
                  >
                    학습 확인 입력하러 가기 <ArrowRight size={18} />
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
