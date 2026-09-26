import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, CheckCircle, HelpCircle, Eye, Sparkles, ArrowRight, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound, speakText, stopSpeech } from '../utils/audio';
import { saveQuizSubmission } from '../utils/supabaseService';

// 지형 대분류 선택지 (1단계)
export const LANDFORM_MAIN_CHOICES = [
  { label: '산', icon: '⛰️' },
  { label: '하천', icon: '🌊' },
  { label: '해안', icon: '🏖️' }
];

// 지형 하부 요소 세부 선택지 (2단계)
export const LANDFORM_SUB_CHOICES = {
  '산': [
    { label: '산맥', icon: '🏔️' },
    { label: '고원', icon: '⛰️' },
    { label: '화산', icon: '🌋' }
  ],
  '하천': [
    { label: '폭포', icon: '💦' },
    { label: '강', icon: '🌊' },
    { label: '호수', icon: '🏞️' }
  ],
  '해안': [
    { label: '피오르', icon: '🏔️🌊' },
    { label: '갯벌', icon: '🦀' },
    { label: '모래 해안', icon: '🏖️' },
    { label: '암석 해안', icon: '🪨' },
    { label: '산호 해안', icon: '🪸' }
  ]
};

// 하위 호환용 단일 배열
export const LANDFORM_CHOICES = [
  ...LANDFORM_MAIN_CHOICES
];

// 기후 대분류 선택지 (1단계)
export const CLIMATE_MAIN_CHOICES = [
  { label: '열대 기후', icon: '🌴' },
  { label: '건조 기후', icon: '🏜️' },
  { label: '온대 기후', icon: '🌾' },
  { label: '냉대 기후', icon: '🌲' },
  { label: '한대 기후', icon: '❄️' },
  { label: '고산 기후', icon: '🏔️' }
];

// 기후 세부 하부 요소 선택지 (2단계)
export const CLIMATE_SUB_CHOICES = {
  '열대 기후': [
    { label: '열대 우림 기후', icon: '🌴🌧️' },
    { label: '열대 사바나 기후', icon: '🦒' }
  ],
  '건조 기후': [
    { label: '사막 기후', icon: '🏜️' },
    { label: '초원(스텝) 기후', icon: '🏕️' }
  ],
  '온대 기후': [
    { label: '서안 해양성 기후', icon: '🌊🌾' },
    { label: '지중해성 기후', icon: '🫒☀️' },
    { label: '온대 계절풍 기후', icon: '🌾🍚' }
  ]
};

// 하위 호환용 단일 배열
export const CLIMATE_CHOICES = [
  ...CLIMATE_MAIN_CHOICES
];

export default function QuizModal({
  location,
  onClose,
  onComplete,
  isAlreadyCompleted,
  previousAnswer,
  user,
  studentUser,
  sessionId = '1',
  allowExplore = true,
  isOpen = true
}) {
  const canExplore = Boolean(user) || allowExplore !== false;
  const isInputAllowed = isOpen !== false;
  const [activeTab, setActiveTab] = useState('quiz');

  useEffect(() => {
    if (!canExplore && activeTab === 'explore') {
      setActiveTab('quiz');
    }
  }, [canExplore, activeTab]);

  const [studentName, setStudentName] = useState(() => {
    if (studentUser?.fullName) return studentUser.fullName;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return localStorage.getItem('geo_last_student_name') || '';
  });

  // 지형 대분류 선택 상태
  const [selectedMainType, setSelectedMainType] = useState(() => {
    if (location.category === 'climate') return '';
    const prev = previousAnswer?.name || '';
    if (!prev) return '';
    if (prev.includes('산맥') || prev.includes('고원') || prev.includes('화산') || prev === '산' || prev.startsWith('산')) return '산';
    if (prev.includes('강') || prev.includes('호수') || prev.includes('폭포') || prev === '하천' || prev.startsWith('하천')) return '하천';
    if (prev.includes('피오르') || prev.includes('갯벌') || prev.includes('해안') || prev.includes('해변') || prev.includes('산호') || prev.includes('암석') || prev.includes('모래')) return '해안';
    return '';
  });

  // 지형 하부 요소(세부 지형) 선택 상태
  const [selectedSubType, setSelectedSubType] = useState(() => {
    if (location.category === 'climate') return '';
    const prev = previousAnswer?.name || '';
    if (!prev) return '';
    if (prev.includes('산맥')) return '산맥';
    if (prev.includes('고원')) return '고원';
    if (prev.includes('화산')) return '화산';
    if (prev.includes('폭포')) return '폭포';
    if (prev.includes('강')) return '강';
    if (prev.includes('호수')) return '호수';
    if (prev.includes('피오르')) return '피오르';
    if (prev.includes('갯벌')) return '갯벌';
    if (prev.includes('산호')) return '산호 해안';
    if (prev.includes('암석') || prev.includes('바위')) return '암석 해안';
    if (prev.includes('모래') || prev.includes('해변')) return '모래 해안';
    return '';
  });

  // 기후 대분류 선택 상태 (1단계)
  const [selectedClimateMain, setSelectedClimateMain] = useState(() => {
    if (location.category !== 'climate') return '';
    const prev = previousAnswer?.name || '';
    if (!prev) return '';
    if (prev.includes('열대')) return '열대 기후';
    if (prev.includes('건조') || prev.includes('사막') || prev.includes('초원') || prev.includes('스텝')) return '건조 기후';
    if (prev.includes('온대') || prev.includes('서안') || prev.includes('지중해') || prev.includes('계절풍')) return '온대 기후';
    if (prev.includes('냉대') || prev.includes('타이가')) return '냉대 기후';
    if (prev.includes('한대') || prev.includes('툰드라') || prev.includes('빙설') || prev.includes('이누이트') || prev.includes('이글루')) return '한대 기후';
    if (prev.includes('고산') || prev.includes('상춘') || prev.includes('안데스')) return '고산 기후';
    const found = CLIMATE_MAIN_CHOICES.find(c => prev.includes(c.label.slice(0, 2)));
    return found ? found.label : '';
  });

  // 기후 세부 하부 요소 선택 상태 (2단계)
  const [selectedClimateSub, setSelectedClimateSub] = useState(() => {
    if (location.category !== 'climate') return '';
    const prev = previousAnswer?.name || '';
    if (!prev) return '';
    if (prev.includes('열대 우림') || prev.includes('우림')) return '열대 우림 기후';
    if (prev.includes('사바나')) return '열대 사바나 기후';
    if (prev.includes('사막')) return '사막 기후';
    if (prev.includes('초원') || prev.includes('스텝')) return '초원(스텝) 기후';
    if (prev.includes('서안 해양성') || prev.includes('서안해양성') || prev.includes('서안')) return '서안 해양성 기후';
    if (prev.includes('지중해') || prev.includes('지중해성')) return '지중해성 기후';
    if (prev.includes('온대 계절풍') || prev.includes('계절풍')) return '온대 계절풍 기후';
    if (prev.includes('타이가') || prev.includes('침엽수')) return '타이가(침엽수림) 기후';
    if (prev.includes('툰드라')) return '툰드라(극지방) 기후';
    if (prev.includes('빙설')) return '빙설 기후';
    if (prev.includes('고산') || prev.includes('상춘')) return '고산(상춘) 기후';
    return '';
  });

  const [inputFeature, setInputFeature] = useState(previousAnswer?.feature || '');
  const [feedback, setFeedback] = useState(isAlreadyCompleted ? { isSuccess: true, score: 100, message: '🎉 이미 학습 확인을 완료한 지점입니다.' } : null);
  const [showHint, setShowHint] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Multi-image list & current photo index
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageList = (location.images && location.images.length > 0) ? location.images : [location.image];
  const currentImage = imageList[currentImageIndex] || imageList[0];

  const handlePrevImage = (e) => {
    e?.stopPropagation();
    sound.playClick();
    setCurrentImageIndex(prev => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e?.stopPropagation();
    sound.playClick();
    setCurrentImageIndex(prev => (prev === imageList.length - 1 ? 0 : prev + 1));
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
    if (!isInputAllowed) {
      alert('현재 선생님께서 학습 입력을 마감하셨습니다.');
      return;
    }
    const effectiveStudentName = studentUser?.fullName || studentName?.trim() || localStorage.getItem('geo_last_student_name') || '익명 학생';
    const cleanFeature = inputFeature.trim();

    if (location.category === 'climate') {
      if (!selectedClimateMain) {
        alert('이 지역에서 볼 수 있는 기후(대분류)를 먼저 선택해 주세요!');
        return;
      }
      if (CLIMATE_SUB_CHOICES[selectedClimateMain] && !selectedClimateSub) {
        alert(`'${selectedClimateMain}'의 세부 기후(하부 요소)를 선택해 주세요!`);
        return;
      }
    } else {
      if (!selectedMainType) {
        alert('이 지역에서 볼 수 있는 지형(대분류)을 먼저 선택해 주세요!');
        return;
      }
      if (!selectedSubType) {
        alert(`'${selectedMainType}'의 세부 지형(하부 요소)을 선택해 주세요!`);
        return;
      }
    }

    if (!cleanFeature) {
      alert('이 지역의 환경이나 생활 모습 특징(서술형 답안)을 20자 이상 입력해 주세요!');
      return;
    }

    if (cleanFeature.length < 20) {
      alert(`서술형 답안을 20자 이상 작성해야 제출할 수 있습니다.\n\n(현재: ${cleanFeature.length}자 / 최소: 20자)`);
      return;
    }

    sound.playClick();
    localStorage.setItem('geo_last_student_name', effectiveStudentName);

    const cleanName = location.category === 'climate'
      ? `${selectedClimateMain} - ${selectedClimateSub || selectedClimateMain}`
      : `${selectedMainType} - ${selectedSubType}`;

    // 1. Name Check (지형 or 기후 선택지 정답 검사)
    let isNameCorrect = false;
    let isMainCorrect = false;
    let isSubCorrect = false;

    if (location.category === 'climate') {
      const expMain = location.mainType || location.subType || '';
      const expSub = location.subType || '';

      isMainCorrect = selectedClimateMain === expMain || expMain.includes(selectedClimateMain.slice(0, 2));
      isSubCorrect = selectedClimateSub === expSub ||
        (expSub.includes('우림') && selectedClimateSub.includes('우림')) ||
        (expSub.includes('사바나') && selectedClimateSub.includes('사바나')) ||
        (expSub.includes('서안') && selectedClimateSub.includes('서안')) ||
        (expSub.includes('지중해') && selectedClimateSub.includes('지중해')) ||
        (expSub.includes('계절풍') && selectedClimateSub.includes('계절풍')) ||
        (expSub.includes('사막') && selectedClimateSub.includes('사막')) ||
        (expSub.includes('초원') && selectedClimateSub.includes('초원')) ||
        (expSub.includes('타이가') && selectedClimateSub.includes('타이가')) ||
        (expSub.includes('툰드라') && selectedClimateSub.includes('툰드라')) ||
        (expSub.includes('고산') && selectedClimateSub.includes('고산'));

      isNameCorrect = isMainCorrect && (CLIMATE_SUB_CHOICES[selectedClimateMain] ? isSubCorrect : true);
    } else {
      const expMain = location.mainType || (['산맥', '고원', '화산', '산지'].includes(location.subType) ? '산' : (['하천', '강', '호수', '폭포'].includes(location.subType) ? '하천' : '해안'));
      const expSub = location.subType || '';

      isMainCorrect = selectedMainType === expMain;
      isSubCorrect = selectedSubType === expSub ||
        (expSub.includes('산맥') && selectedSubType === '산맥') ||
        (expSub.includes('고원') && selectedSubType === '고원') ||
        (expSub.includes('화산') && selectedSubType === '화산') ||
        (expSub.includes('강') && selectedSubType === '강') ||
        (expSub.includes('호수') && selectedSubType === '호수') ||
        (expSub.includes('폭포') && selectedSubType === '폭포') ||
        (expSub.includes('피오르') && selectedSubType === '피오르') ||
        (expSub.includes('갯벌') && selectedSubType === '갯벌') ||
        (expSub.includes('산호') && selectedSubType.includes('산호')) ||
        (expSub.includes('암석') && selectedSubType.includes('암석')) ||
        (expSub.includes('모래') && selectedSubType.includes('모래'));

      isNameCorrect = isMainCorrect && isSubCorrect;
    }

    // 2. Feature Keywords Check (키워드 2개 이상 매칭 시 인정)
    const normFeature = cleanFeature.replace(/\s+/g, '').toLowerCase();
    const matchedFeatureKeywords = location.featureKeywords
      ? location.featureKeywords.filter(kw => {
          const normKw = kw.replace(/\s+/g, '').toLowerCase();
          return normFeature.includes(normKw);
        })
      : [];
    const isFeatureGood = matchedFeatureKeywords.length >= 2;

    let finalScore = 30;
    if (isNameCorrect && isFeatureGood) {
      finalScore = 100;
      sound.playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setFeedback({
        isSuccess: true,
        score: 100,
        message: location.category === 'climate'
          ? `🎉 참 잘했어요! 기후(${selectedClimateMain} > ${selectedClimateSub})와 핵심 키워드(${matchedFeatureKeywords.join(', ')})를 바르게 작성했습니다.`
          : `🎉 참 잘했어요! 지형(${selectedMainType} > ${selectedSubType})과 핵심 키워드(${matchedFeatureKeywords.join(', ')})를 바르게 작성했습니다.`,
        matchedKeywords: matchedFeatureKeywords
      });
      onComplete(location.id, { name: cleanName, feature: cleanFeature });
    } else if (!isNameCorrect && isFeatureGood) {
      finalScore = 50;
      let nameHintMsg = '기후를 다시 확인해 보세요.';
      if (location.category === 'climate') {
        if (isMainCorrect && !isSubCorrect) {
          nameHintMsg = `'${selectedClimateMain}'은 맞았어요! 세부 기후(${selectedClimateSub})를 다시 확인해 보세요.`;
        } else {
          nameHintMsg = `기후의 대분류(${selectedClimateMain})를 다시 확인해 보세요.`;
        }
      } else if (location.category === 'landform') {
        if (isMainCorrect && !isSubCorrect) {
          nameHintMsg = `'${selectedMainType}' 지형은 맞았어요! 세부 지형(${selectedSubType})을 다시 확인해 보세요.`;
        } else {
          nameHintMsg = `지형의 대분류(${selectedMainType})를 다시 확인해 보세요.`;
        }
      }
      setFeedback({
        isSuccess: false,
        score: 50,
        message: `💡 특징 핵심 키워드는 잘 작성했어요! (${matchedFeatureKeywords.join(', ')}) ${nameHintMsg}`,
        matchedKeywords: matchedFeatureKeywords
      });
    } else if (isNameCorrect && !isFeatureGood) {
      finalScore = 50;
      setFeedback({
        isSuccess: false,
        score: 50,
        message: matchedFeatureKeywords.length === 1
          ? `💡 명칭은 맞았지만 핵심 키워드가 1개만 포함되었습니다 (${matchedFeatureKeywords[0]}). 핵심 키워드가 최소 2개 이상 들어가도록 특징을 더 자세히 적어보세요.`
          : '💡 명칭은 맞았습니다! 특징 설명에 교과서 핵심 키워드(환경, 가옥, 농업, 옷차림 등)가 최소 2개 이상 들어가도록 조금 더 자세히 적어보세요.',
        matchedKeywords: matchedFeatureKeywords
      });
    } else {
      finalScore = 30;
      setFeedback({
        isSuccess: false,
        score: 30,
        message: location.category === 'climate' 
          ? '🧐 힌트를 참고하여 알맞은 기후와 핵심 특징(키워드 2개 이상)을 다시 작성해 보세요.' 
          : '🧐 힌트를 참고하여 알맞은 지형과 핵심 특징(키워드 2개 이상)을 다시 작성해 보세요.',
        matchedKeywords: matchedFeatureKeywords
      });
    }

    // Always record and broadcast submission to teacher in real time
    saveQuizSubmission({
      sessionId: String(sessionId || '1'),
      locationId: location.id,
      locationTitle: location.name,
      studentName: effectiveStudentName,
      answerName: cleanName,
      answerFeature: cleanFeature,
      score: finalScore
    });
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
                alt={`${location.name} - 사진 ${currentImageIndex + 1}`}
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', cursor: 'pointer' }}
                onClick={() => setShowImageZoom(true)}
              />

              {/* Photo Count Badge (if multiple images) */}
              {imageList.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(0, 0, 0, 0.78)',
                    color: '#1ed760',
                    border: '1px solid rgba(30, 215, 96, 0.45)',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    backdropFilter: 'blur(4px)',
                    zIndex: 2
                  }}
                >
                  📷 사진 {currentImageIndex + 1} / {imageList.length}
                </div>
              )}

              {/* Carousel Prev Button */}
              {imageList.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevImage}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    color: '#ffffff',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3,
                    transition: 'all 0.15s ease'
                  }}
                  title="이전 사진 보기"
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1ed760'; e.currentTarget.style.color = '#000000'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)'; e.currentTarget.style.color = '#ffffff'; }}
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Carousel Next Button */}
              {imageList.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextImage}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    color: '#ffffff',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3,
                    transition: 'all 0.15s ease'
                  }}
                  title="다음 사진 보기"
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1ed760'; e.currentTarget.style.color = '#000000'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)'; e.currentTarget.style.color = '#ffffff'; }}
                >
                  <ChevronRight size={22} />
                </button>
              )}
              
              {/* Zoom Button Overlay */}
              <button
                type="button"
                onClick={() => setShowImageZoom(true)}
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backdropFilter: 'blur(6px)',
                  zIndex: 2
                }}
              >
                <ZoomIn size={15} /> 확대보기
              </button>
            </div>

            {/* Thumbnail Navigation Row if Multiple Images */}
            {imageList.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                {imageList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { sound.playClick(); setCurrentImageIndex(idx); }}
                    style={{
                      flex: 1,
                      maxWidth: '90px',
                      height: '56px',
                      padding: 0,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: idx === currentImageIndex ? '2px solid #1ed760' : '1px solid rgba(255,255,255,0.2)',
                      opacity: idx === currentImageIndex ? 1 : 0.6,
                      cursor: 'pointer',
                      background: 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    <img src={img} alt={`사진 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
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
              {canExplore ? (
                <button
                  type="button"
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
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    alert('🔒 선생님께서 이번 회차의 "교과서 핵심 탐색" 이용을 잠금 설정하셨습니다.\n스스로 생각하여 퀴즈를 풀어보세요!');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.7rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    border: 'none',
                    borderRadius: '9999px',
                    background: 'transparent',
                    color: '#666666',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  title="선생님께서 교과서 핵심 탐색을 잠금 설정하셨습니다"
                >
                  🔒 핵심 탐색 잠김
                </button>
              )}
            </div>

            {/* TAB 1: Quiz Form */}
            {activeTab === 'quiz' && (
              <form onSubmit={handleSubmitQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Input Lock Notification Banner if locked by teacher */}
                {!isInputAllowed && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.45)',
                      color: '#f87171',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    <span>🔒</span> 현재 선생님께서 학습 입력을 마감하셨습니다. (조회만 가능합니다)
                  </div>
                )}

                {/* Input 1: Climate (Hierarchical 2-step Selection) */}
                {location.category === 'climate' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Step 1: Main Climate Selection */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                          사진 지역의 기후로 알맞은 것은 다음 중 어느 것입니까?
                        </label>
                        {selectedClimateMain && (
                          <span style={{ fontSize: '0.78rem', color: '#1ed760', fontWeight: 800 }}>
                            ✓ {selectedClimateMain} 선택됨
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {CLIMATE_MAIN_CHOICES.map((opt) => {
                          const isSelected = selectedClimateMain === opt.label;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              disabled={!isInputAllowed}
                              onClick={() => {
                                if (!isInputAllowed) return;
                                sound.playClick();
                                if (selectedClimateMain !== opt.label) {
                                  setSelectedClimateMain(opt.label);
                                  setSelectedClimateSub('');
                                }
                              }}
                              style={{
                                padding: '0.8rem 0.5rem',
                                background: isSelected ? '#1ed760' : '#1f1f1f',
                                color: isSelected ? '#000000' : (isInputAllowed ? '#ffffff' : '#666666'),
                                border: isSelected ? '2px solid #1ed760' : '1px solid #404040',
                                borderRadius: '12px',
                                fontSize: '0.95rem',
                                fontWeight: isSelected ? 900 : 700,
                                cursor: isInputAllowed ? 'pointer' : 'not-allowed',
                                opacity: isInputAllowed ? 1 : 0.6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                wordBreak: 'keep-all',
                                textAlign: 'center',
                                boxShadow: isSelected ? '0 4px 14px rgba(30, 215, 96, 0.35)' : 'none',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (isInputAllowed && !isSelected) {
                                  e.currentTarget.style.borderColor = '#1ed760';
                                  e.currentTarget.style.background = '#282828';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isInputAllowed && !isSelected) {
                                  e.currentTarget.style.borderColor = '#404040';
                                  e.currentTarget.style.background = '#1f1f1f';
                                }
                              }}
                            >
                              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{opt.icon}</span>
                              <span style={{ wordBreak: 'keep-all', lineHeight: 1.25 }}>{opt.label}</span>
                              {isSelected && <span style={{ fontSize: '0.9rem', fontWeight: 900, flexShrink: 0 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Climate Sub-element Selection */}
                    {selectedClimateMain && CLIMATE_SUB_CHOICES[selectedClimateMain] && (
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>👉 다음에서 사진의 기후로 알맞은 것을 고르시오.</span>
                          </label>
                          {selectedClimateSub && (
                            <span style={{ fontSize: '0.78rem', background: '#1ed760', color: '#000000', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800 }}>
                              {selectedClimateMain} &gt; {selectedClimateSub}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {CLIMATE_SUB_CHOICES[selectedClimateMain].map((subOpt) => {
                            const isSubSelected = selectedClimateSub === subOpt.label;
                            return (
                              <button
                                key={subOpt.label}
                                type="button"
                                disabled={!isInputAllowed}
                                onClick={() => {
                                  if (!isInputAllowed) return;
                                  sound.playClick();
                                  setSelectedClimateSub(subOpt.label);
                                }}
                                style={{
                                  flex: '1 1 calc(33.333% - 8px)',
                                  minWidth: '110px',
                                  padding: '0.7rem 0.6rem',
                                  background: isSubSelected ? '#38bdf8' : '#181818',
                                  color: isSubSelected ? '#000000' : (isInputAllowed ? '#ffffff' : '#666666'),
                                  border: isSubSelected ? '2px solid #38bdf8' : '1px solid #383838',
                                  borderRadius: '10px',
                                  fontSize: '0.9rem',
                                  fontWeight: isSubSelected ? 900 : 700,
                                  cursor: isInputAllowed ? 'pointer' : 'not-allowed',
                                  opacity: isInputAllowed ? 1 : 0.6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  wordBreak: 'keep-all',
                                  textAlign: 'center',
                                  boxShadow: isSubSelected ? '0 4px 14px rgba(56, 189, 248, 0.35)' : 'none',
                                  transform: isSubSelected ? 'scale(1.02)' : 'scale(1)',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (isInputAllowed && !isSubSelected) {
                                    e.currentTarget.style.borderColor = '#38bdf8';
                                    e.currentTarget.style.background = '#20293a';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (isInputAllowed && !isSubSelected) {
                                    e.currentTarget.style.borderColor = '#383838';
                                    e.currentTarget.style.background = '#181818';
                                  }
                                }}
                              >
                                <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{subOpt.icon}</span>
                                <span style={{ wordBreak: 'keep-all', lineHeight: 1.25, textAlign: 'center' }}>{subOpt.label}</span>
                                {isSubSelected && <span style={{ fontSize: '0.85rem', fontWeight: 900, flexShrink: 0 }}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Step 1: Main Landform Selection */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                          사진의 지역에서 확인할 수 있는 지형으로 알맞은 것은 다음 중 어느 것입니까?
                        </label>
                        {selectedMainType && (
                          <span style={{ fontSize: '0.78rem', color: '#1ed760', fontWeight: 800 }}>
                            ✓ {selectedMainType} 선택됨
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {LANDFORM_MAIN_CHOICES.map((opt) => {
                          const isSelected = selectedMainType === opt.label;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              disabled={!isInputAllowed}
                              onClick={() => {
                                if (!isInputAllowed) return;
                                sound.playClick();
                                if (selectedMainType !== opt.label) {
                                  setSelectedMainType(opt.label);
                                  setSelectedSubType('');
                                }
                              }}
                              style={{
                                padding: '0.8rem 0.5rem',
                                background: isSelected ? '#1ed760' : '#1f1f1f',
                                color: isSelected ? '#000000' : (isInputAllowed ? '#ffffff' : '#666666'),
                                border: isSelected ? '2px solid #1ed760' : '1px solid #404040',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: isSelected ? 900 : 700,
                                cursor: isInputAllowed ? 'pointer' : 'not-allowed',
                                opacity: isInputAllowed ? 1 : 0.6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                wordBreak: 'keep-all',
                                textAlign: 'center',
                                boxShadow: isSelected ? '0 4px 14px rgba(30, 215, 96, 0.35)' : 'none',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (isInputAllowed && !isSelected) {
                                  e.currentTarget.style.borderColor = '#1ed760';
                                  e.currentTarget.style.background = '#282828';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isInputAllowed && !isSelected) {
                                  e.currentTarget.style.borderColor = '#404040';
                                  e.currentTarget.style.background = '#1f1f1f';
                                }
                              }}
                            >
                              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{opt.icon}</span>
                              <span style={{ wordBreak: 'keep-all', lineHeight: 1.25 }}>{opt.label}</span>
                              {isSelected && <span style={{ fontSize: '0.9rem', fontWeight: 900, flexShrink: 0 }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 2: Sub-element Selection (Appears when Main Landform is selected) */}
                    {selectedMainType && LANDFORM_SUB_CHOICES[selectedMainType] && (
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>👉 다음에서 사진의 지형으로 알맞은 것을 고르시오.</span>
                          </label>
                          {selectedSubType && (
                            <span style={{ fontSize: '0.78rem', background: '#1ed760', color: '#000000', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800 }}>
                              {selectedMainType} &gt; {selectedSubType}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {LANDFORM_SUB_CHOICES[selectedMainType].map((subOpt) => {
                            const isSubSelected = selectedSubType === subOpt.label;
                            return (
                              <button
                                key={subOpt.label}
                                type="button"
                                disabled={!isInputAllowed}
                                onClick={() => {
                                  if (!isInputAllowed) return;
                                  sound.playClick();
                                  setSelectedSubType(subOpt.label);
                                }}
                                style={{
                                  flex: '1 1 calc(33.333% - 8px)',
                                  minWidth: '90px',
                                  padding: '0.7rem 0.6rem',
                                  background: isSubSelected ? '#38bdf8' : '#181818',
                                  color: isSubSelected ? '#000000' : (isInputAllowed ? '#ffffff' : '#666666'),
                                  border: isSubSelected ? '2px solid #38bdf8' : '1px solid #383838',
                                  borderRadius: '10px',
                                  fontSize: '0.9rem',
                                  fontWeight: isSubSelected ? 900 : 700,
                                  cursor: isInputAllowed ? 'pointer' : 'not-allowed',
                                  opacity: isInputAllowed ? 1 : 0.6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  wordBreak: 'keep-all',
                                  textAlign: 'center',
                                  boxShadow: isSubSelected ? '0 4px 14px rgba(56, 189, 248, 0.35)' : 'none',
                                  transform: isSubSelected ? 'scale(1.02)' : 'scale(1)',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (isInputAllowed && !isSubSelected) {
                                    e.currentTarget.style.borderColor = '#38bdf8';
                                    e.currentTarget.style.background = '#222222';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (isInputAllowed && !isSubSelected) {
                                    e.currentTarget.style.borderColor = '#383838';
                                    e.currentTarget.style.background = '#181818';
                                  }
                                }}
                              >
                                <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{subOpt.icon}</span>
                                <span style={{ wordBreak: 'keep-all', lineHeight: 1.25, textAlign: 'center' }}>{subOpt.label}</span>
                                {isSubSelected && <span style={{ fontSize: '0.85rem', fontWeight: 900, flexShrink: 0 }}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                    disabled={!isInputAllowed}
                    onChange={(e) => setInputFeature(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    placeholder={isInputAllowed ? "교과서에서 학습했거나 사진을 통해서 알 수 있는 지형/기후 특징, 주민 생활 모습(의식주 등)을 핵심 키워드 2개 이상 포함하여 20자 이상 자세히 적어보세요." : "선생님께서 학습 입력을 마감하셨습니다."}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.2rem',
                      background: isInputAllowed ? '#1f1f1f' : '#181818',
                      color: isInputAllowed ? '#ffffff' : '#888888',
                      borderRadius: '12px',
                      boxShadow: 'rgb(18, 18, 18) 0px 1px 0px, rgb(124, 124, 124) 0px 0px 0px 1px inset',
                      border: 'none',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      cursor: isInputAllowed ? 'text' : 'not-allowed',
                      opacity: isInputAllowed ? 1 : 0.7
                    }}
                  />

                  {/* Character Counter & Minimum 20 Guidance */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.82rem' }}>
                    <span style={{ color: '#8e8e8e', fontSize: '0.8rem' }}>
                      * 핵심 키워드 2개 이상 포함 및 20자 이상 작성 시 정답 인정
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: inputFeature.trim().length >= 20 ? '#1ed760' : '#ffa42b',
                        background: inputFeature.trim().length >= 20 ? 'rgba(30, 215, 96, 0.12)' : 'rgba(255, 164, 43, 0.12)',
                        border: `1px solid ${inputFeature.trim().length >= 20 ? 'rgba(30, 215, 96, 0.3)' : 'rgba(255, 164, 43, 0.3)'}`,
                        padding: '2px 9px',
                        borderRadius: '6px',
                        letterSpacing: '0.3px'
                      }}
                    >
                      {inputFeature.trim().length >= 20 ? '✓ ' : ''}{inputFeature.trim().length} / 20자
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isInputAllowed}
                  className="btn btn-primary"
                  style={{
                    padding: '0.9rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    opacity: isInputAllowed ? 1 : 0.6,
                    cursor: isInputAllowed ? 'pointer' : 'not-allowed',
                    background: isInputAllowed ? '#1ed760' : '#282828',
                    color: isInputAllowed ? '#000000' : '#888888',
                    border: isInputAllowed ? 'none' : '1px solid #404040'
                  }}
                >
                  {isInputAllowed ? (
                    <>
                      <Sparkles size={18} /> 정답 제출 & 학습 확인
                    </>
                  ) : (
                    <>
                      🔒 입력 마감 (선생님 허용 대기 중)
                    </>
                  )}
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
              background: 'rgba(0,0,0,0.94)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}
            onClick={() => setShowImageZoom(false)}
          >
            <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
              <img
                src={currentImage}
                alt={`${location.name} - 사진 ${currentImageIndex + 1}`}
                style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }}
              />

              {/* Photo Count Badge (if multiple) */}
              {imageList.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: '#1ed760',
                    border: '1px solid rgba(30, 215, 96, 0.4)',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '0.9rem',
                    fontWeight: 800
                  }}
                >
                  📷 사진 {currentImageIndex + 1} / {imageList.length}
                </div>
              )}

              {/* Zoom Carousel Prev Button */}
              {imageList.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevImage}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              {/* Zoom Carousel Next Button */}
              {imageList.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextImage}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                >
                  <ChevronRight size={28} />
                </button>
              )}

              <button
                type="button"
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
                  fontWeight: 'bold',
                  zIndex: 20
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
