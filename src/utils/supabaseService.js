import { supabase } from '../supabase';

/**
 * Helper to get user namespace key
 */
export function getUserNamespace(user) {
  if (!user) return 'anonymous';
  if (user.id) return user.id;
  if (user.email) return user.email.replace(/[^a-zA-Z0-9_-]/g, '_');
  return 'default';
}

/**
 * Generate a collision-free session ID bound to user/account
 */
export function generateSessionId(user) {
  const prefix = user?.id ? user.id.slice(0, 8) : 'map';
  return `s_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Generate a student distribution link for a given session
 */
export function getStudentShareUrl(session) {
  if (!session) return typeof window !== 'undefined' ? window.location.href : '';
  if (typeof window === 'undefined') return '';
  const baseUrl = window.location.origin + window.location.pathname;
  const cat = session.categoryFilter || 'landform';
  const explore = session.allowExplore !== false ? '1' : '0';
  const title = encodeURIComponent(session.title || '');
  return `${baseUrl}?session=${session.id}&category=${cat}&explore=${explore}&title=${title}`;
}

/**
 * Robust clipboard copy with fallback
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback', err);
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Clipboard copy fallback error:', err);
    return false;
  }
}

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
 * Save multiple quiz submissions in bulk (for Excel import)
 */
export async function saveBatchSubmissions(submissionsList = [], user = null) {
  if (!Array.isArray(submissionsList) || submissionsList.length === 0) {
    return { success: true, data: [] };
  }

  const ns = getUserNamespace(user);
  const formatted = submissionsList.map((item, idx) => ({
    id: item.id || `local_imp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
    session_id: String(item.sessionId || item.session_id || '1'),
    location_id: item.locationId || item.location_id || 'loc_unknown',
    location_title: item.locationTitle || item.location_title || '',
    student_name: item.studentName || item.student_name || '익명 학생',
    answer_name: item.answerName || item.answer_name || '',
    answer_feature: item.answerFeature || item.answer_feature || '',
    score: item.score || 100,
    created_at: item.createdAt || item.created_at || new Date().toISOString()
  }));

  // 1. Update local cache
  try {
    const existing = JSON.parse(localStorage.getItem(`geo_quiz_submissions_${ns}`) || localStorage.getItem('geo_quiz_submissions') || '[]');
    const combined = [...formatted, ...existing].slice(0, 1000);
    localStorage.setItem(`geo_quiz_submissions_${ns}`, JSON.stringify(combined));
    localStorage.setItem('geo_quiz_submissions', JSON.stringify(combined));
  } catch (e) {
    console.warn('Batch local save warning:', e);
  }

  // 2. Insert to Supabase in chunks of 50
  try {
    const payloads = formatted.map(f => ({
      session_id: f.session_id,
      location_id: f.location_id,
      location_title: f.location_title,
      student_name: f.student_name,
      answer_name: f.answer_name,
      answer_feature: f.answer_feature,
      score: f.score,
      created_at: f.created_at
    }));

    for (let i = 0; i < payloads.length; i += 50) {
      const chunk = payloads.slice(i, i + 50);
      const { error } = await supabase.from('quiz_submissions').insert(chunk);
      if (error) {
        console.warn('Supabase batch insert error chunk:', error.message);
      }
    }
  } catch (err) {
    console.warn('Supabase bulk insert warning:', err);
  }

  return { success: true, data: formatted };
}

/**
 * Fetch student submissions from Supabase and merge with localStorage,
 * with strict isolation support for allowed session IDs.
 */
export async function fetchAllSubmissions({ limit = 500, allowedSessionIds = null, user = null } = {}) {
  const ns = getUserNamespace(user);

  // Load deleted IDs blacklist and session reset timestamps for this user/namespace
  let deletedIds = new Set();
  try {
    const list = JSON.parse(localStorage.getItem(`geo_deleted_submission_ids_${ns}`) || localStorage.getItem('geo_deleted_submission_ids') || '[]');
    deletedIds = new Set(list.map(String));
  } catch (e) {}

  const isSubmissionValid = (item) => {
    if (!item) return false;
    if (item.id && deletedIds.has(String(item.id))) return false;
    
    const sid = String(item.session_id || '1');
    
    // If allowedSessionIds are specified, strictly filter out foreign sessions
    if (allowedSessionIds && Array.isArray(allowedSessionIds) && allowedSessionIds.length > 0) {
      const allowedSet = new Set(allowedSessionIds.map(String));
      if (!allowedSet.has(sid)) {
        return false;
      }
    }

    try {
      const resetTimeStr = localStorage.getItem(`geo_session_reset_${ns}_${sid}`) || localStorage.getItem(`geo_session_reset_${sid}`);
      if (resetTimeStr && item.created_at) {
        if (new Date(item.created_at) <= new Date(resetTimeStr)) {
          return false;
        }
      }
    } catch (e) {}
    return true;
  };

  let remoteData = [];
  try {
    let query = supabase
      .from('quiz_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (allowedSessionIds && Array.isArray(allowedSessionIds) && allowedSessionIds.length > 0) {
      // In query filter if allowedSessionIds are provided
      query = query.in('session_id', allowedSessionIds.map(String));
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      remoteData = data;
    }
  } catch (err) {
    console.warn('Supabase 조회 실패, 로컬 캐시를 조회합니다:', err);
  }

  // Load from local storage (both user-namespaced and general)
  let localData = [];
  try {
    const nsData = JSON.parse(localStorage.getItem(`geo_quiz_submissions_${ns}`) || '[]');
    const genData = JSON.parse(localStorage.getItem('geo_quiz_submissions') || '[]');
    localData = [...nsData, ...genData];
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
      if (isSubmissionValid(enrichedItem)) {
        merged.push(enrichedItem);
      }
    }
  }

  // Then add localData items not yet in remoteData
  for (const item of localData) {
    const key = `${item.student_name}_${item.location_id}_${item.created_at?.slice(0, 16)}`;
    if (!seen.has(key)) {
      seen.add(key);
      const candidate = { ...item, session_id: item.session_id || '1' };
      if (isSubmissionValid(candidate)) {
        merged.push(candidate);
      }
    }
  }

  // Sort descending by created_at
  merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  return { success: true, data: merged };
}

/**
 * Fetch recent student submissions
 */
export async function fetchRecentSubmissions({ limit = 10, allowedSessionIds = null, user = null } = {}) {
  const res = await fetchAllSubmissions({ limit, allowedSessionIds, user });
  return res.data || [];
}

/**
 * Delete a submission by ID
 */
export async function deleteSubmission(id, user = null) {
  const strId = String(id);
  const ns = getUserNamespace(user);

  // 1. Add to deleted IDs in localStorage (permanent tombstone)
  try {
    const deletedList = JSON.parse(localStorage.getItem(`geo_deleted_submission_ids_${ns}`) || localStorage.getItem('geo_deleted_submission_ids') || '[]');
    if (!deletedList.includes(strId)) {
      deletedList.push(strId);
      localStorage.setItem(`geo_deleted_submission_ids_${ns}`, JSON.stringify(deletedList));
    }
  } catch (e) {}

  // 2. Delete from localStorage geo_quiz_submissions
  try {
    const local = JSON.parse(localStorage.getItem(`geo_quiz_submissions_${ns}`) || localStorage.getItem('geo_quiz_submissions') || '[]');
    const filtered = local.filter(item => String(item.id) !== strId);
    localStorage.setItem(`geo_quiz_submissions_${ns}`, JSON.stringify(filtered));
    localStorage.setItem('geo_quiz_submissions', JSON.stringify(filtered));
  } catch (e) {}

  // 3. Delete from Supabase if not a purely local ID
  if (!strId.startsWith('local_')) {
    try {
      const { data, error } = await supabase
        .from('quiz_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase 삭제 알림:', error.message);
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
 * Reset all submissions for a specific session
 */
export async function resetSessionSubmissions(sessionId, currentSubmissions = [], user = null) {
  const sid = String(sessionId || '1');
  const ns = getUserNamespace(user);
  const nowIso = new Date().toISOString();

  // 1. Record session reset timestamp
  try {
    localStorage.setItem(`geo_session_reset_${ns}_${sid}`, nowIso);
    localStorage.setItem(`geo_session_reset_${sid}`, nowIso);
  } catch (e) {}

  // 2. Add all current matching IDs to deleted blacklist
  try {
    const deletedList = JSON.parse(localStorage.getItem(`geo_deleted_submission_ids_${ns}`) || localStorage.getItem('geo_deleted_submission_ids') || '[]');
    currentSubmissions.forEach(sub => {
      const subSid = String(sub.session_id || '1');
      if (subSid === sid && sub.id) {
        if (!deletedList.includes(String(sub.id))) {
          deletedList.push(String(sub.id));
        }
      }
    });
    localStorage.setItem(`geo_deleted_submission_ids_${ns}`, JSON.stringify(deletedList));
  } catch (e) {}

  // 3. Clear local quiz submissions for this session
  try {
    const local = JSON.parse(localStorage.getItem(`geo_quiz_submissions_${ns}`) || localStorage.getItem('geo_quiz_submissions') || '[]');
    const filtered = local.filter(sub => String(sub.session_id || '1') !== sid);
    localStorage.setItem(`geo_quiz_submissions_${ns}`, JSON.stringify(filtered));
    localStorage.setItem('geo_quiz_submissions', JSON.stringify(filtered));
  } catch (e) {}

  // 4. Clear student map completed state and answers for this session
  try {
    localStorage.removeItem(`geo_completed_ids_${sid}`);
    localStorage.removeItem(`geo_user_answers_${sid}`);
    if (sid === '1') {
      localStorage.removeItem('geo_completed_ids');
      localStorage.removeItem('geo_user_answers');
    }
  } catch (e) {}

  // 5. Attempt Supabase delete for this session
  try {
    await supabase
      .from('quiz_submissions')
      .delete()
      .eq('session_id', sid);

    if (sid === '1') {
      await supabase
        .from('quiz_submissions')
        .delete()
        .is('session_id', null);
    }
  } catch (err) {
    console.warn('Supabase session reset info:', err);
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



