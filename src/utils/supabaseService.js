import { supabase } from '../supabase';

/**
 * Save quiz submission to Supabase database.
 * Table name: `quiz_submissions`
 */
export async function saveQuizSubmission({
  locationId,
  locationTitle,
  studentName = '익명 학생',
  answerName,
  answerFeature,
  score = 100
}) {
  try {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.log('ℹ️ Supabase Anon Key가 설정되지 않아 로컬 저장만 진행됩니다.');
      return { success: true, localOnly: true };
    }

    const { data, error } = await supabase
      .from('quiz_submissions')
      .insert([
        {
          location_id: locationId,
          location_title: locationTitle,
          student_name: studentName,
          answer_name: answerName,
          answer_feature: answerFeature,
          score: score,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.warn('Supabase 저장 중 주의:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Supabase 연동 에러:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all student submissions from Supabase
 */
export async function fetchAllSubmissions(limit = 300) {
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase 조회 실패:', error.message);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Supabase 조회 오류:', err);
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Fetch recent student submissions
 */
export async function fetchRecentSubmissions(limit = 10) {
  const res = await fetchAllSubmissions(limit);
  return res.data || [];
}

/**
 * Delete a submission from Supabase by ID
 */
export async function deleteSubmission(id) {
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase 삭제 실패:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Supabase 삭제 오류:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Google 로그인 에러:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sign out user
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('로그아웃 에러:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (e) {
    return null;
  }
}


