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

// Helper to embed sessionId in feature text for zero-schema loss
export function encodeSessionInFeature(featureText, sessionId) {
  const clean = (featureText || '').replace(/<!--SID:.*?-->/g, '').trim();
  return `${clean}\n<!--SID:${sessionId || '1'}-->`;
}

// Helper to extract embedded sessionId from feature text
export function decodeSessionFromFeature(rawFeature, fallbackSessionId = '') {
  if (!rawFeature) return { sessionId: fallbackSessionId, featureText: '' };
  const match = String(rawFeature).match(/<!--SID:(.*?)-->/);
  const sessionId = match && match[1] ? match[1] : fallbackSessionId;
  const clean = String(rawFeature).replace(/<!--SID:.*?-->/g, '').trim();
  return { sessionId, featureText: clean };
}

// Global shared broadcast channel for submissions
let submissionChannel = null;

function getSubmissionChannel() {
  if (!submissionChannel) {
    submissionChannel = supabase.channel('submissions_realtime_sync', {
      config: { broadcast: { self: false } }
    });
    submissionChannel.subscribe();
  }
  return submissionChannel;
}

/**
 * Broadcast a new submission in real-time to all connected teacher screens
 */
export function broadcastSubmission(submission) {
  try {
    const ch = getSubmissionChannel();
    ch.send({
      type: 'broadcast',
      event: 'new_submission',
      payload: submission
    });
  } catch (e) {
    console.warn('Broadcast submission warning:', e);
  }
}

/**
 * Broadcast deletion of a student's specific submission
 */
export function broadcastDeletion(delInfo) {
  try {
    const ch = getSubmissionChannel();
    ch.send({
      type: 'broadcast',
      event: 'delete_submission',
      payload: delInfo
    });
  } catch (e) {
    console.warn('Broadcast deletion warning:', e);
  }
}

/**
 * Broadcast full reset of a session to all students
 */
export function broadcastReset(resetInfo) {
  try {
    const ch = getSubmissionChannel();
    ch.send({
      type: 'broadcast',
      event: 'reset_session',
      payload: resetInfo
    });
  } catch (e) {
    console.warn('Broadcast reset warning:', e);
  }
}

/**
 * Subscribe to new student submissions in real time
 */
export function subscribeSubmissions(onNewSubmission) {
  const ch = getSubmissionChannel();
  
  const listener = (event) => {
    if (event?.payload && onNewSubmission) {
      onNewSubmission(event.payload);
    }
  };

  ch.on('broadcast', { event: 'new_submission' }, listener);

  return () => {
    // Keep channel alive
  };
}

/**
 * Subscribe to deletions and session resets in real time (for student devices)
 */
export function subscribeDeletions(onDelete, onReset) {
  const ch = getSubmissionChannel();

  const deleteListener = (event) => {
    if (event?.payload && onDelete) {
      onDelete(event.payload);
    }
  };

  const resetListener = (event) => {
    if (event?.payload && onReset) {
      onReset(event.payload);
    }
  };

  ch.on('broadcast', { event: 'delete_submission' }, deleteListener);
  ch.on('broadcast', { event: 'reset_session' }, resetListener);

  return () => {
    // Keep channel alive
  };
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
  const sid = String(sessionId || '1');
  const cleanFeature = (answerFeature || '').replace(/<!--SID:.*?-->/g, '').trim();
  const embeddedFeature = encodeSessionInFeature(cleanFeature, sid);

  const newSubmission = {
    id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    session_id: sid,
    location_id: locationId,
    location_title: locationTitle,
    student_name: studentName,
    answer_name: answerName,
    answer_feature: cleanFeature,
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

  // Instantly broadcast to teacher in real time
  broadcastSubmission(newSubmission);

  try {
    // 1st attempt: insert with session_id
    const payloadWithSession = {
      session_id: sid,
      location_id: locationId,
      location_title: locationTitle,
      student_name: studentName,
      answer_name: answerName,
      answer_feature: embeddedFeature,
      score: score,
      created_at: newSubmission.created_at
    };

    let { data, error } = await supabase
      .from('quiz_submissions')
      .insert([payloadWithSession])
      .select();

    // Fallback if Supabase schema does not yet have session_id column
    if (error && (error.message?.includes('session_id') || error.code === 'PGRST204')) {
      const payloadWithoutSession = {
        location_id: locationId,
        location_title: locationTitle,
        student_name: studentName,
        answer_name: answerName,
        answer_feature: embeddedFeature,
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
      ? data.map(d => {
          const { sessionId: decodedSid, featureText } = decodeSessionFromFeature(d.answer_feature, sid);
          return {
            ...newSubmission,
            ...d,
            session_id: String(d.session_id || decodedSid || sid),
            answer_feature: featureText || cleanFeature
          };
        })
      : [newSubmission];

    // Re-broadcast enriched result
    if (resultData[0]) {
      broadcastSubmission(resultData[0]);
    }

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
  const formatted = submissionsList.map((item, idx) => {
    const sid = String(item.sessionId || item.session_id || '1');
    const cleanFeature = (item.answerFeature || item.answer_feature || '').replace(/<!--SID:.*?-->/g, '').trim();
    return {
      id: item.id || `local_imp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      session_id: sid,
      location_id: item.locationId || item.location_id || 'loc_unknown',
      location_title: item.locationTitle || item.location_title || '',
      student_name: item.studentName || item.student_name || '익명 학생',
      answer_name: item.answerName || item.answer_name || '',
      answer_feature: cleanFeature,
      score: item.score || 100,
      created_at: item.createdAt || item.created_at || new Date().toISOString()
    };
  });

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
      answer_feature: encodeSessionInFeature(f.answer_feature, f.session_id),
      score: f.score,
      created_at: f.created_at
    }));

    for (let i = 0; i < payloads.length; i += 50) {
      const chunk = payloads.slice(i, i + 50);
      let { error } = await supabase.from('quiz_submissions').insert(chunk);
      if (error && (error.message?.includes('session_id') || error.code === 'PGRST204')) {
        const chunkWithoutSid = chunk.map(({ session_id, ...rest }) => rest);
        await supabase.from('quiz_submissions').insert(chunkWithoutSid);
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
    if (item.location_id === '__session_config__') return false;
    if (item.id && deletedIds.has(String(item.id))) return false;
    
    const sid = String(item.session_id || '');
    
    // If allowedSessionIds are specified, filter strictly matching sessions
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

  let rawRemoteData = [];
  try {
    const res = await supabase
      .from('quiz_submissions')
      .select('*')
      .neq('location_id', '__session_config__')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!res.error && Array.isArray(res.data)) {
      rawRemoteData = res.data;
    }
  } catch (err) {
    console.warn('Supabase 조회 실패, 로컬 캐시를 조회합니다:', err);
  }

  // Parse and decode embedded sessionId from rawRemoteData
  const remoteData = rawRemoteData.map(item => {
    const { sessionId: decodedSid, featureText } = decodeSessionFromFeature(item.answer_feature, item.session_id || '');
    return {
      ...item,
      session_id: String(item.session_id || decodedSid || ''),
      answer_feature: featureText || item.answer_feature
    };
  });

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
        session_id: item.session_id || localMatch?.session_id || ''
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
      const candidate = { ...item, session_id: item.session_id || '' };
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
 * Delete a submission by ID or submission object with realtime broadcast to students
 */
export async function deleteSubmission(submissionOrId, user = null) {
  const isObj = typeof submissionOrId === 'object' && submissionOrId !== null;
  const strId = isObj ? String(submissionOrId.id || '') : String(submissionOrId);
  const sid = isObj ? String(submissionOrId.session_id || submissionOrId.sessionId || '1') : '1';
  const studentName = isObj ? (submissionOrId.student_name || submissionOrId.studentName || '') : '';
  const locationId = isObj ? (submissionOrId.location_id || submissionOrId.locationId || '') : '';

  const ns = getUserNamespace(user);

  // 1. Add to deleted IDs in localStorage (permanent tombstone)
  try {
    const deletedList = JSON.parse(localStorage.getItem(`geo_deleted_submission_ids_${ns}`) || localStorage.getItem('geo_deleted_submission_ids') || '[]');
    if (strId && !deletedList.includes(strId)) {
      deletedList.push(strId);
      localStorage.setItem(`geo_deleted_submission_ids_${ns}`, JSON.stringify(deletedList));
    }
  } catch (e) {}

  // 2. Delete from localStorage geo_quiz_submissions
  try {
    const local = JSON.parse(localStorage.getItem(`geo_quiz_submissions_${ns}`) || localStorage.getItem('geo_quiz_submissions') || '[]');
    const filtered = local.filter(item => {
      if (strId && String(item.id) === strId) return false;
      if (studentName && locationId && item.student_name === studentName && item.location_id === locationId) return false;
      return true;
    });
    localStorage.setItem(`geo_quiz_submissions_${ns}`, JSON.stringify(filtered));
    localStorage.setItem('geo_quiz_submissions', JSON.stringify(filtered));
  } catch (e) {}

  // 3. Instantly broadcast deletion to all connected student devices
  broadcastDeletion({
    sessionId: sid,
    studentName,
    locationId,
    id: strId
  });

  // 4. Delete from Supabase
  try {
    if (strId && !strId.startsWith('local_')) {
      await supabase
        .from('quiz_submissions')
        .delete()
        .eq('id', strId);
    }
    if (studentName && locationId) {
      await supabase
        .from('quiz_submissions')
        .delete()
        .eq('student_name', studentName)
        .eq('location_id', locationId);
    }
  } catch (err) {
    console.error('Supabase 삭제 오류:', err);
  }

  return { success: true };
}

/**
 * Reset all submissions for a specific session with realtime broadcast to students
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
      const subSid = String(sub.session_id || '');
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
    const filtered = local.filter(sub => String(sub.session_id || '') !== sid);
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

  // 5. Instantly broadcast session reset to all connected student devices
  broadcastReset({ sessionId: sid });

  // 6. Attempt Supabase delete for this session
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

/**
 * Active Supabase Realtime channels map
 */
const activeChannels = new Map();

/**
 * Get or create Realtime broadcast channel for a session
 */
export function getSessionChannel(sessionId) {
  const sid = String(sessionId || '1');
  const channelName = `session_sync_${sid}`;
  if (activeChannels.has(channelName)) {
    return activeChannels.get(channelName);
  }
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false }
    }
  });
  channel.subscribe();
  activeChannels.set(channelName, channel);
  return channel;
}

/**
 * Broadcast session configuration changes in real-time (sub-100ms)
 * and asynchronously persist to Supabase / LocalStorage
 */
export async function broadcastSessionConfig(sessionId, config) {
  const sid = String(sessionId || '1');
  const payload = {
    sessionId: sid,
    isOpen: config.isOpen !== undefined ? Boolean(config.isOpen) : true,
    allowExplore: config.allowExplore !== undefined ? Boolean(config.allowExplore) : true,
    categoryFilter: config.categoryFilter || 'landform',
    title: config.title || '',
    updatedAt: Date.now()
  };

  // 1. Broadcast immediately via Supabase Realtime channel
  try {
    const channel = getSessionChannel(sid);
    channel.send({
      type: 'broadcast',
      event: 'config_change',
      payload
    });
  } catch (e) {
    console.warn('Realtime broadcast warning:', e);
  }

  // 2. Persist to localStorage cache
  try {
    localStorage.setItem(`geo_session_remote_config_${sid}`, JSON.stringify(payload));
  } catch (e) {}

  // 3. Persist to Supabase quiz_submissions table as system config record
  try {
    await supabase.from('quiz_submissions').insert([{
      session_id: sid,
      location_id: '__session_config__',
      location_title: '__session_config__',
      student_name: '__SYSTEM__',
      answer_name: config.categoryFilter || 'landform',
      answer_feature: JSON.stringify(payload),
      score: 100,
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.warn('Config remote persist warning:', e);
  }

  return payload;
}

/**
 * Subscribe to session config changes in real-time
 */
export function subscribeSessionConfig(sessionId, onConfigUpdate, onRequestConfig = null) {
  const sid = String(sessionId || '1');
  const channelName = `session_sync_${sid}`;
  
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false }
    }
  });

  channel
    .on('broadcast', { event: 'config_change' }, (event) => {
      if (event?.payload && String(event.payload.sessionId || sid) === sid) {
        if (onConfigUpdate) onConfigUpdate(event.payload);
      }
    })
    .on('broadcast', { event: 'request_config' }, () => {
      if (onRequestConfig) {
        const cfg = onRequestConfig();
        if (cfg) {
          channel.send({
            type: 'broadcast',
            event: 'config_change',
            payload: { ...cfg, sessionId: sid, updatedAt: Date.now() }
          });
        }
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Ping for current config
        channel.send({
          type: 'broadcast',
          event: 'request_config',
          payload: { sessionId: sid, reqTime: Date.now() }
        });
      }
    });

  activeChannels.set(channelName, channel);

  return () => {
    try {
      supabase.removeChannel(channel);
      activeChannels.delete(channelName);
    } catch (e) {}
  };
}

/**
 * Fetch latest remote config for a session (from Supabase DB or cache)
 */
export async function fetchSessionConfigRemote(sessionId) {
  const sid = String(sessionId || '1');
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('*')
      .eq('session_id', sid)
      .eq('location_id', '__session_config__')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0 && data[0].answer_feature) {
      const parsed = JSON.parse(data[0].answer_feature);
      if (parsed) {
        localStorage.setItem(`geo_session_remote_config_${sid}`, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Fetch session remote config error:', e);
  }

  // Fallback to local cache
  try {
    const cached = localStorage.getItem(`geo_session_remote_config_${sid}`);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  return null;
}

/**
 * ============================================================================
 * SUPER ADMIN (최고 관리자) MANAGEMENT FUNCTIONS
 * ============================================================================
 */

/**
 * Fetch all raw submissions and meta from Supabase for Super Admin
 */
export async function fetchSuperAdminSubmissions() {
  try {
    const { data, error, count } = await supabase
      .from('quiz_submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.error('Super admin fetch error:', error);
      return { success: false, error: error.message, data: [], count: 0 };
    }

    const rows = (data || []).map(row => {
      const { sessionId, featureText } = decodeSessionFromFeature(row.answer_feature, row.session_id || '');
      const isConfigRow = row.location_id === '__session_config__';
      const isLegacyUnassigned = !row.session_id && !sessionId;
      return {
        ...row,
        resolvedSessionId: String(row.session_id || sessionId || '(미지정)'),
        resolvedFeature: featureText || row.answer_feature,
        isConfigRow,
        isLegacyUnassigned
      };
    });

    return {
      success: true,
      data: rows,
      count: count || rows.length
    };
  } catch (err) {
    console.error('Super admin fetch exception:', err);
    return { success: false, error: err.message, data: [], count: 0 };
  }
}

/**
 * Delete a specific list of submission IDs (Super Admin)
 */
export async function superAdminDeleteSubmissions(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return { success: true, count: 0 };

  try {
    const validIds = ids.filter(id => id && !String(id).startsWith('local_'));
    const chunkSize = 40;
    let deletedCount = 0;

    for (let i = 0; i < validIds.length; i += chunkSize) {
      const chunk = validIds.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('quiz_submissions')
        .delete()
        .in('id', chunk);

      if (error) {
        console.error('Super admin delete batch error:', error);
      } else {
        deletedCount += chunk.length;
      }
    }

    // Also remove from local storage tombstones
    try {
      const deletedList = JSON.parse(localStorage.getItem('geo_deleted_submission_ids') || '[]');
      validIds.forEach(id => {
        if (!deletedList.includes(String(id))) deletedList.push(String(id));
      });
      localStorage.setItem('geo_deleted_submission_ids', JSON.stringify(deletedList));
    } catch (e) {}

    return { success: true, count: deletedCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete all submissions belonging to a specific session ID (Super Admin)
 */
export async function superAdminDeleteSession(sessionId) {
  if (!sessionId) return { success: false, error: '세션 ID가 지정되지 않았습니다.' };
  const sid = String(sessionId);

  try {
    // 1. Delete by session_id column
    await supabase
      .from('quiz_submissions')
      .delete()
      .eq('session_id', sid);

    // 2. Delete by embedded session tag in answer_feature
    await supabase
      .from('quiz_submissions')
      .delete()
      .like('answer_feature', `%<!--SID:${sid}-->%`);

    // Broadcast reset to connected students
    broadcastReset({ sessionId: sid });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Clean up legacy/unassigned submissions without a session ID (Super Admin)
 */
export async function superAdminCleanLegacySubmissions() {
  try {
    // 1. Fetch all rows
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('id, session_id, answer_feature')
      .limit(5000);

    if (error || !data) return { success: false, error: error?.message || '조회 실패' };

    const legacyIds = data
      .filter(row => {
        if (row.session_id) return false;
        const hasSidTag = row.answer_feature && row.answer_feature.includes('<!--SID:');
        return !hasSidTag;
      })
      .map(row => row.id)
      .filter(Boolean);

    if (legacyIds.length > 0) {
      return await superAdminDeleteSubmissions(legacyIds);
    }

    return { success: true, count: 0 };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Full factory reset: Purge all submissions from quiz_submissions (Super Admin)
 */
export async function superAdminPurgeAllSubmissions() {
  try {
    // Supabase requires a filter for delete
    const { error } = await supabase
      .from('quiz_submissions')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z');

    if (error) {
      // Fallback delete
      await supabase
        .from('quiz_submissions')
        .delete()
        .neq('location_id', '__non_existent_loc__');
    }

    // Clear local storage submissions cache
    try {
      localStorage.removeItem('geo_quiz_submissions');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('geo_quiz_submissions_') || key.startsWith('geo_deleted_submission_ids_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}




