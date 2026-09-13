import { supabase } from '../supabase';

/**
 * Save quiz submission to Supabase database.
 * Table name: `quiz_submissions`
 */
export async function saveQuizSubmission({
  sessionId = '1',
  locationId,
  locationTitle,
  studentName = '익명 학생',
  answerName,
  answerFeature,
  score = 100
}) {
  const newSubmission = {
    id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    session_id: String(sessionId || '1'),
    location_id: locationId,
    location_title: locationTitle,
    student_name: studentName,
    answer_name: answerName,
    answer_feature: answerFeature,
    score: score,
    created_at: new Date().toISOString()
  };

  // Always save to localStorage as local cache/backup
  try {
    const local = JSON.parse(localStorage.getItem('geo_quiz_submissions') || '[]');
    local.unshift(newSubmission);
    localStorage.setItem('geo_quiz_submissions', JSON.stringify(local.slice(0, 500)));
  } catch (e) {
    console.warn('Local save warning:', e);
  }

  try {
    // 1st attempt: insert with session_id
    const payloadWithSession = {
      session_id: String(sessionId || '1'),
      location_id: locationId,
      location_title: locationTitle,
      student_name: studentName,
      answer_name: answerName,
      answer_feature: answerFeature,
      score: score,
      created_at: newSubmission.created_at
    };

    let { data, error } = await supabase
      .from('quiz_submissions')
      .insert([payloadWithSession])
      .select();

    // Fallback if Supabase schema does not yet have session_id column
    if (error && (error.message?.includes('session_id') || error.code === 'PGRST204')) {
      console.warn('Supabase에 session_id 컬럼이 없어 제외 후 저장 시도:', error.message);
      const payloadWithoutSession = {
        location_id: locationId,
        location_title: locationTitle,
        student_name: studentName,
        answer_name: answerName,
        answer_feature: answerFeature,
        score: score,
        created_at: newSubmission.created_at
      };
      const retry = await supabase
        .from('quiz_submissions')
        .insert([payloadWithoutSession])
        .select();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn('Supabase 저장 중 주의:', error.message);
      return { success: true, localOnly: true, data: [newSubmission] };
    }

    const resultData = (data && data.length > 0)
      ? data.map(d => ({ ...newSubmission, ...d, session_id: String(d.session_id || sessionId || '1') }))
      : [newSubmission];

    return { success: true, data: resultData };
  } catch (err) {
    console.error('Supabase 연동 에러:', err);
    return { success: true, localOnly: true, data: [newSubmission] };
  }
}

/**
 * Fetch all student submissions from Supabase and merge with localStorage
 */
export async function fetchAllSubmissions(limit = 500) {
  let remoteData = [];
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      remoteData = data;
    }
  } catch (err) {
    console.warn('Supabase 조회 실패, 로컬 캐시를 조회합니다:', err);
  }

  // Load from local storage
  let localData = [];
  try {
    localData = JSON.parse(localStorage.getItem('geo_quiz_submissions') || '[]');
  } catch (e) {}

  // Map local items by key to preserve session_id if remote missed it
  const localMap = new Map();
  for (const item of localData) {
    const key = `${item.student_name}_${item.location_id}_${item.created_at?.slice(0, 16)}`;
    localMap.set(key, item);
  }

  // Merge unique by comparing location_id + student_name + created_at
  const seen = new Set();
  const merged = [];

  // Prefer remoteData first, enriching session_id from local if missing
  for (const item of remoteData) {
    const key = `${item.student_name}_${item.location_id}_${item.created_at?.slice(0, 16)}`;
    if (!seen.has(key)) {
      seen.add(key);
      const localMatch = localMap.get(key);
      const enrichedItem = {
        ...item,
        session_id: item.session_id || localMatch?.session_id || '1'
      };
      merged.push(enrichedItem);
    }
  }

  // Then add localData items not yet in remoteData
  for (const item of localData) {
    const key = `${item.student_name}_${item.location_id}_${item.created_at?.slice(0, 16)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...item, session_id: item.session_id || '1' });
    }
  }

  // Sort descending by created_at
  merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  return { success: true, data: merged };
}

/**
 * Fetch recent student submissions
 */
export async function fetchRecentSubmissions(limit = 10) {
  const res = await fetchAllSubmissions(limit);
  return res.data || [];
}

/**
 * Delete a submission by ID
 */
export async function deleteSubmission(id) {
  // Delete from localStorage
  try {
    const local = JSON.parse(localStorage.getItem('geo_quiz_submissions') || '[]');
    const filtered = local.filter(item => item.id !== id);
    localStorage.setItem('geo_quiz_submissions', JSON.stringify(filtered));
  } catch (e) {}

  // Delete from Supabase if not a purely local ID
  if (!String(id).startsWith('local_')) {
    try {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase 삭제 실패:', error.message);
        return { success: true };
      }
      return { success: true, data };
    } catch (err) {
      console.error('Supabase 삭제 오류:', err);
      return { success: true };
    }
  }

  return { success: true };
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


