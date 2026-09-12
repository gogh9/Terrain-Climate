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
 * Fetch recent student submissions
 */
export async function fetchRecentSubmissions(limit = 10) {
  try {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) return [];

    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase 조회 실패:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Supabase 조회 오류:', err);
    return [];
  }
}
