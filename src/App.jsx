import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import WorldMapSVG from './components/WorldMapSVG';
import QuizModal from './components/QuizModal';
import SummaryNoteModal from './components/SummaryNoteModal';
import AchievementBadge from './components/AchievementBadge';
import TeacherDashboardModal from './components/TeacherDashboardModal';
import TeacherWorkspace from './components/TeacherWorkspace';
import LoginModal from './components/LoginModal';
import LandingScreen from './components/LandingScreen';
import { LOCATION_DATA } from './data/textbookData';
import { sound } from './utils/audio';
import { supabase } from './supabase';
import { signOutUser } from './utils/supabaseService';

export default function App() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [continentFilter, setContinentFilter] = useState('ALL');

  // User Auth & View Mode
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('geo_user_role') || 'student');
  // Student user starts as null on fresh link entry so the login screen is always presented
  const [studentUser, setStudentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeView, setActiveView] = useState('workspace'); // 'workspace' | 'map'
  const [currentSession, setCurrentSession] = useState(null);
  const [urlCategory, setUrlCategory] = useState(null);

  // Subscribe to Supabase Auth Changes
  useEffect(() => {
    try {
      const fullUrl = window.location.href;
      if (fullUrl.includes('error=')) {
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const searchParams = new URLSearchParams(window.location.search);
        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description') || hashParams.get('error') || searchParams.get('error');
        if (errorDesc) {
          alert(`🚨 구글 로그인 처리 중 오류 발생:\n${decodeURIComponent(errorDesc).replace(/\+/g, ' ')}\n\n(Supabase 대시보드 -> Authentication -> Providers -> Google 설정이 활성화되어 있는지 확인해 주세요)`);
        }
      }
    } catch (e) {
      console.warn('Error parsing URL auth error', e);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    }).catch(() => {
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check URL parameters for Student Session links (?session=...&category=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session');
      const categoryParam = params.get('category');
      if (sessionId) {
        setActiveView('map');
        const saved = localStorage.getItem('geo_map_sessions');
        if (saved) {
          const sessions = JSON.parse(saved);
          const found = sessions.find(s => s.id === sessionId);
          if (found) {
            setCurrentSession(found);
            if (found.categoryFilter) {
              setUrlCategory(found.categoryFilter);
            }
          }
        }
      }
      if (categoryParam) {
        setUrlCategory(categoryParam);
      }
    } catch (e) {
      console.warn('URL param parse error', e);
    }
  }, []);

  // Determine active category filter
  const activeCategoryFilter = urlCategory || currentSession?.categoryFilter || categoryFilter || 'all';

  // Filter locations based on active category filter ('all' | 'landform' | 'climate')
  const displayedLocations = useMemo(() => {
    if (activeCategoryFilter === 'landform') {
      return LOCATION_DATA.filter(loc => loc.category === 'landform');
    }
    if (activeCategoryFilter === 'climate') {
      return LOCATION_DATA.filter(loc => loc.category === 'climate');
    }
    return LOCATION_DATA;
  }, [activeCategoryFilter]);

  // Determine effective session ID
  const effectiveSessionId = currentSession?.id || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('session') : null) || '1';

  // Completed IDs & Typed Answers isolated per session
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`geo_completed_ids_${effectiveSessionId}`);
      if (saved) return JSON.parse(saved);
      if (effectiveSessionId === '1') {
        const legacy = localStorage.getItem('geo_completed_ids');
        return legacy ? JSON.parse(legacy) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [userAnswers, setUserAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`geo_user_answers_${effectiveSessionId}`);
      if (saved) return JSON.parse(saved);
      if (effectiveSessionId === '1') {
        const legacy = localStorage.getItem('geo_user_answers');
        return legacy ? JSON.parse(legacy) : {};
      }
      return {};
    } catch {
      return {};
    }
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSummaryNote, setShowSummaryNote] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showTeacherDashboard, setShowTeacherDashboard] = useState(false);

  // Reload progress when effectiveSessionId changes
  useEffect(() => {
    try {
      const savedIds = localStorage.getItem(`geo_completed_ids_${effectiveSessionId}`);
      setCompletedIds(savedIds ? JSON.parse(savedIds) : (effectiveSessionId === '1' && localStorage.getItem('geo_completed_ids') ? JSON.parse(localStorage.getItem('geo_completed_ids')) : []));

      const savedAnswers = localStorage.getItem(`geo_user_answers_${effectiveSessionId}`);
      setUserAnswers(savedAnswers ? JSON.parse(savedAnswers) : (effectiveSessionId === '1' && localStorage.getItem('geo_user_answers') ? JSON.parse(localStorage.getItem('geo_user_answers')) : {}));
    } catch (e) {
      console.warn('Session progress load error', e);
    }
  }, [effectiveSessionId]);

  // Save progress to LocalStorage per session
  useEffect(() => {
    try {
      localStorage.setItem(`geo_completed_ids_${effectiveSessionId}`, JSON.stringify(completedIds));
      localStorage.setItem(`geo_user_answers_${effectiveSessionId}`, JSON.stringify(userAnswers));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [completedIds, userAnswers, effectiveSessionId]);

  // Complete Location Handler
  const handleCompleteLocation = (id, answerObj) => {
    if (!completedIds.includes(id)) {
      const updatedIds = [...completedIds, id];
      setCompletedIds(updatedIds);

      if (updatedIds.length === displayedLocations.length) {
        setTimeout(() => sound.playFanfare(), 600);
      }
    }

    setUserAnswers(prev => ({
      ...prev,
      [id]: answerObj
    }));
  };

  // Reset student/teacher progress for current map session
  const handleResetProgress = () => {
    if (!window.confirm('현재 지도의 나의 학습 기록(체크 표시 및 입력 내용)을 초기화하시겠습니까?')) return;
    sound.playClick();
    setCompletedIds([]);
    setUserAnswers({});
    try {
      localStorage.removeItem(`geo_completed_ids_${effectiveSessionId}`);
      localStorage.removeItem(`geo_user_answers_${effectiveSessionId}`);
      if (effectiveSessionId === '1') {
        localStorage.removeItem('geo_completed_ids');
        localStorage.removeItem('geo_user_answers');
      }
    } catch (e) {}
    alert('학습 기록이 초기화되었습니다.');
  };

  // Student Login Handler (반, 번호, 이름)
  const handleStudentLogin = ({ studentClass, number, name }) => {
    const fullName = `${studentClass}반 ${number}번 ${name}`;
    const info = { studentClass, number, name, fullName };
    setStudentUser(info);
    setUserRole('student');
    try {
      localStorage.setItem('geo_student_user', JSON.stringify(info));
      localStorage.setItem('geo_last_student_name', fullName);
      localStorage.setItem('geo_user_role', 'student');
    } catch (e) {
      console.warn('Error saving student info', e);
    }
    setActiveView('map');
  };

  // Student Logout Handler
  const handleStudentLogout = () => {
    sound.playClick();
    setStudentUser(null);
    try {
      localStorage.removeItem('geo_student_user');
    } catch (e) {
      console.warn('Error removing student info', e);
    }
  };

  // Logout Handler (Teacher)
  const handleLogout = async () => {
    sound.playClick();
    await signOutUser();
    setUser(null);
    setActiveView('workspace');
  };

  // Show loading indicator while parsing URL hash auth token
  if (authLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#121212', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#1ed760', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>구글 로그인 인증 확인 중...</div>
      </div>
    );
  }

  // If neither teacher nor student is logged in, show Landing Screen
  const params = new URLSearchParams(window.location.search);
  const isStudentSession = Boolean(params.get('session'));

  if (!user && !studentUser) {
    return (
      <LandingScreen
        isStudentSession={isStudentSession}
        sessionInfo={currentSession}
        onStudentLogin={handleStudentLogin}
        setUserRole={setUserRole}
      />
    );
  }

  // If Teacher is logged in and activeView is 'workspace', show Teacher Workspace
  if (user && activeView === 'workspace') {
    return (
      <TeacherWorkspace
        user={user}
        locations={LOCATION_DATA}
        onEnterMap={(session) => {
          setCurrentSession(session);
          setUrlCategory(session.categoryFilter);
          setActiveView('map');
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header
        completedIds={completedIds}
        totalCount={displayedLocations.length}
        categoryFilter={activeCategoryFilter}
        onOpenSummaryNote={() => setShowSummaryNote(true)}
        onOpenTeacherDashboard={() => {
          if (user) setActiveView('workspace');
          else setShowTeacherDashboard(true);
        }}
        user={user}
        userRole={userRole}
        studentUser={studentUser}
        onStudentLogout={handleStudentLogout}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* Main Vector SVG Map */}
      <main className="main-content">
        <WorldMapSVG
          locations={displayedLocations}
          completedIds={completedIds}
          onSelectLocation={(loc) => setSelectedLocation(loc)}
          continentFilter="ALL"
        />
      </main>

      {/* Location Quiz Modal */}
      {selectedLocation && (
        <QuizModal
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onComplete={handleCompleteLocation}
          isAlreadyCompleted={completedIds.includes(selectedLocation.id)}
          previousAnswer={userAnswers[selectedLocation.id]}
          user={user}
          studentUser={studentUser}
          sessionId={effectiveSessionId}
        />
      )}

      {/* Summary Note Modal */}
      {showSummaryNote && (
        <SummaryNoteModal
          locations={displayedLocations}
          completedIds={completedIds}
          userAnswers={userAnswers}
          onClose={() => setShowSummaryNote(false)}
          onResetProgress={handleResetProgress}
        />
      )}

      {/* Teacher Submissions Dashboard Modal */}
      {showTeacherDashboard && (
        <TeacherDashboardModal
          locations={LOCATION_DATA}
          onClose={() => setShowTeacherDashboard(false)}
        />
      )}

      {/* Google Login Modal */}
      {showLoginModal && (
        <LoginModal
          user={user}
          userRole={userRole}
          setUserRole={setUserRole}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Achievement Badges Modal */}
      {showBadges && (
        <AchievementBadge
          completedCount={completedIds.length}
          completedIds={completedIds}
          locations={displayedLocations}
          onClose={() => setShowBadges(false)}
        />
      )}
    </div>
  );
}
