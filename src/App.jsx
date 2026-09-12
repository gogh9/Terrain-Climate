import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import WorldMapSVG from './components/WorldMapSVG';
import QuizModal from './components/QuizModal';
import SummaryNoteModal from './components/SummaryNoteModal';
import AchievementBadge from './components/AchievementBadge';
import TeacherDashboardModal from './components/TeacherDashboardModal';
import LoginModal from './components/LoginModal';
import { LOCATION_DATA } from './data/textbookData';
import { sound } from './utils/audio';
import { supabase } from './supabase';

export default function App() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [continentFilter, setContinentFilter] = useState('ALL');

  // User Auth State
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('geo_user_role') || 'student');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Subscribe to Supabase Auth Changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Completed IDs & Typed Answers
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_completed_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [userAnswers, setUserAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_user_answers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSummaryNote, setShowSummaryNote] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showTeacherDashboard, setShowTeacherDashboard] = useState(false);

  // Check URL parameters for direct teacher access (?mode=teacher or #teacher)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('mode') === 'teacher' ||
        params.get('teacher') === 'true' ||
        window.location.hash === '#teacher'
      ) {
        setShowTeacherDashboard(true);
      }
    } catch (e) {
      console.warn('URL param parse error', e);
    }
  }, []);

  // Save progress to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('geo_completed_ids', JSON.stringify(completedIds));
      localStorage.setItem('geo_user_answers', JSON.stringify(userAnswers));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [completedIds, userAnswers]);

  // Complete Location Handler
  const handleCompleteLocation = (id, answerObj) => {
    if (!completedIds.includes(id)) {
      const updatedIds = [...completedIds, id];
      setCompletedIds(updatedIds);

      // Check if all 15 completed
      if (updatedIds.length === LOCATION_DATA.length) {
        setTimeout(() => sound.playFanfare(), 600);
      }
    }

    setUserAnswers(prev => ({
      ...prev,
      [id]: answerObj
    }));
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <Header
        completedIds={completedIds}
        totalCount={LOCATION_DATA.length}
        onOpenSummaryNote={() => setShowSummaryNote(true)}
        onOpenTeacherDashboard={() => setShowTeacherDashboard(true)}
        user={user}
        userRole={userRole}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {/* Main Vector SVG Map Matching User Reference Screenshot */}
      <main className="main-content">
        <WorldMapSVG
          locations={LOCATION_DATA}
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
        />
      )}

      {/* Summary Note Modal */}
      {showSummaryNote && (
        <SummaryNoteModal
          locations={LOCATION_DATA}
          completedIds={completedIds}
          userAnswers={userAnswers}
          onClose={() => setShowSummaryNote(false)}
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
          locations={LOCATION_DATA}
          onClose={() => setShowBadges(false)}
        />
      )}
    </div>
  );
}


