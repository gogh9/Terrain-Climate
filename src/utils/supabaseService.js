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
  const open = session.isOpen !== false ? '1' : '0';
  const title = encodeURIComponent(session.title || '');
  return `${baseUrl}?session=${session.id}&category=${cat}&explore=${explore}&open=${open}&title=${title}`;
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
 * Write a permanent Cloud Tombstone to Supabase to prevent deleted items from reappearing
 */
export async function writeCloudTombstone({ type, deletedIds = [], timeRange = null, sessionId = null, purgeBefore = null }) {
  try {
    const payload = {
      location_id: '__deleted_tombstone__',
      location_title: '시스템 삭제 묘비 레코드',
      student_name: '__system_tombstone__',
      answer_name: type || 'deleted_tombstone',
      answer_feature: JSON.stringify({
        type,
        deletedIds: (deletedIds || []).map(String).filter(Boolean),
        timeRange,
        sessionId: sessionId ? String(sessionId) : null,
        purgeBefore,
        timestamp: new Date().toISOString()
      }),
      score: 0,
      created_at: new Date().toISOString()
    };

    await supabase.from('quiz_submissions').insert([payload]);
  } catch (e) {
    console.warn('Cloud tombstone write warning:', e);
  }
}

/**
 * Extract active tombstones and filter out deleted/purged records
 */
export function extractCloudTombstones(rows = []) {
  const tombstoneIds = new Set();
  const tombstoneRanges = [];
  const tombstoneSessions = new Set();
  let maxPurgeTime = null;

  const normalRows = [];

  for (const row of rows) {
    if (row.location_id === '__deleted_tombstone__') {
      try {
        const meta = JSON.parse(row.answer_feature || '{}');
        if (Array.isArray(meta.deletedIds)) {
          meta.deletedIds.forEach(id => {
            if (id) tombstoneIds.add(String(id));
          });
        }
        if (meta.timeRange && meta.timeRange.start && meta.timeRange.end) {
          tombstoneRanges.push({
            start: new Date(meta.timeRange.start).getTime(),
            end: new Date(meta.timeRange.end).getTime()
          });
        }
        if (meta.sessionId) {
          tombstoneSessions.add(String(meta.sessionId));
        }
        if (meta.purgeBefore) {
          const pTime = new Date(meta.purgeBefore).getTime();
          if (!maxPurgeTime || pTime > maxPurgeTime) {
            maxPurgeTime = pTime;
          }
        }
      } catch (e) {}
    } else if (row.location_id !== '__session_config__') {
      normalRows.push(row);
    }
  }

  // Filter normal rows against all active tombstones
  const activeRows = normalRows.filter(row => {
    if (row.id && tombstoneIds.has(String(row.id))) return false;
    
    if (row.created_at) {
      const rowTime = new Date(row.created_at).getTime();
      if (maxPurgeTime && rowTime <= maxPurgeTime) return false;
      for (const range of tombstoneRanges) {
        if (rowTime >= range.start && rowTime <= range.end) return false;
      }
    }

    const { sessionId } = decodeSessionFromFeature(row.answer_feature, row.session_id || '');
    const sid = String(row.session_id || sessionId || '');
    if (sid && tombstoneSessions.has(sid)) return false;

    return true;
  });

  return {
    tombstoneIds,
    tombstoneRanges,
    tombstoneSessions,
    maxPurgeTime,
    activeRows
  };
}

/**
 * Fetch student submissions from Supabase and merge with localStorage,
 * with strict isolation support for allowed session IDs and cloud tombstones.
 */
export async function fetchAllSubmissions({ limit = 500, allowedSessionIds = null, user = null } = {}) {
  const ns = getUserNamespace(user);

  // Load deleted IDs blacklist and session reset timestamps for this user/namespace
  let deletedIds = new Set();
  try {
    const list = JSON.parse(localStorage.getItem(`geo_deleted_submission_ids_${ns}`) || localStorage.getItem('geo_deleted_submission_ids') || '[]');
    deletedIds = new Set(list.map(String));
  } catch (e) {}

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

  // Extract cloud tombstones and get active rows
  const { tombstoneIds, tombstoneRanges, tombstoneSessions, maxPurgeTime, activeRows } = extractCloudTombstones(rawRemoteData);

  // Sync cloud tombstone IDs into local set
  tombstoneIds.forEach(id => deletedIds.add(id));

  const isSubmissionValid = (item) => {
    if (!item) return false;
    if (item.location_id === '__session_config__' || item.location_id === '__deleted_tombstone__') return false;
    if (item.id && deletedIds.has(String(item.id))) return false;
    
    if (item.created_at) {
      const itemTime = new Date(item.created_at).getTime();
      if (maxPurgeTime && itemTime <= maxPurgeTime) return false;
      for (const range of tombstoneRanges) {
        if (itemTime >= range.start && itemTime <= range.end) return false;
      }
    }

    const { sessionId: decodedSid } = decodeSessionFromFeature(item.answer_feature, item.session_id || '');
    const sid = String(item.session_id || decodedSid || '');
    if (sid && tombstoneSessions.has(sid)) return false;
    
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

  // Parse and decode embedded sessionId from activeRows
  const remoteData = activeRows.map(item => {
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
 * Delete multiple submissions in batch with instant local update, cloud tombstones, and Supabase deletion
 */
export async function deleteSubmissions(submissionsList = [], user = null) {
  const list = (Array.isArray(submissionsList) ? submissionsList : [submissionsList]).filter(Boolean);
  if (list.length === 0) return { success: true, count: 0 };

  const ns = getUserNamespace(user);
  const ids = list.map(s => typeof s === 'object' && s !== null ? String(s.id || '') : String(s)).filter(Boolean);
  const remoteIds = ids.filter(id => !id.startsWith('local_'));

  // 1. Add to deleted IDs in localStorage (permanent tombstone)
  try {
    const deletedListNs = JSON.parse(localStorage.getItem(`geo_deleted_submission_ids_${ns}`) || '[]');
    const deletedListGen = JSON.parse(localStorage.getItem('geo_deleted_submission_ids') || '[]');
    const mergedDeleted = Array.from(new Set([...deletedListNs, ...deletedListGen, ...ids]));
    localStorage.setItem(`geo_deleted_submission_ids_${ns}`, JSON.stringify(mergedDeleted));
    localStorage.setItem('geo_deleted_submission_ids', JSON.stringify(mergedDeleted));
  } catch (e) {}

  // 2. Delete from localStorage geo_quiz_submissions
  try {
    const idSet = new Set(ids);
    const filterLocal = (raw) => {
      const parsed = JSON.parse(raw || '[]');
      return parsed.filter(item => {
        if (item.id && idSet.has(String(item.id))) return false;
        if (list.some(s => s.student_name && s.location_id && item.student_name === s.student_name && item.location_id === s.location_id)) return false;
        return true;
      });
    };
    localStorage.setItem(`geo_quiz_submissions_${ns}`, JSON.stringify(filterLocal(localStorage.getItem(`geo_quiz_submissions_${ns}`))));
    localStorage.setItem('geo_quiz_submissions', JSON.stringify(filterLocal(localStorage.getItem('geo_quiz_submissions'))));
  } catch (e) {}

  // 3. Broadcast deletion to all connected student devices
  for (const s of list) {
    if (typeof s === 'object' && s !== null) {
      broadcastDeletion({
        sessionId: String(s.session_id || s.sessionId || '1'),
        studentName: s.student_name || '',
        locationId: s.location_id || '',
        id: String(s.id || '')
      });
    }
  }

  // 4. Write Cloud Tombstone to Supabase (prevents zombie resurrection)
  if (ids.length > 0) {
    await writeCloudTombstone({
      type: 'batch_ids',
      deletedIds: ids
    });
  }

  // 5. Direct delete from Supabase
  if (remoteIds.length > 0) {
    const chunkSize = 30;
    for (let i = 0; i < remoteIds.length; i += chunkSize) {
      const chunk = remoteIds.slice(i, i + chunkSize);
      try {
        let { error } = await supabase
          .from('quiz_submissions')
          .delete()
          .in('id', chunk);

        if (error && chunk.every(id => !isNaN(Number(id)))) {
          await supabase
            .from('quiz_submissions')
            .delete()
            .in('id', chunk.map(Number));
        }
      } catch (err) {
        console.warn('Supabase bulk delete chunk error:', err);
      }
    }
  }

  // Fallback delete by student_name & location_id
  for (const s of list) {
    if (typeof s === 'object' && s !== null && s.student_name && s.location_id) {
      try {
        await supabase
          .from('quiz_submissions')
          .delete()
          .eq('student_name', s.student_name)
          .eq('location_id', s.location_id);
      } catch (e) {}
    }
  }

  return { success: true, count: list.length };
}

/**
 * Delete a single submission by ID or submission object with realtime broadcast to students
 */
export async function deleteSubmission(submissionOrId, user = null) {
  return await deleteSubmissions([submissionOrId], user);
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
  const deletedIdsList = [];
  try {
    const deletedList = JSON.parse(localStorage.getItem(`geo_deleted_submission_ids_${ns}`) || localStorage.getItem('geo_deleted_submission_ids') || '[]');
    currentSubmissions.forEach(sub => {
      const subSid = String(sub.session_id || '');
      if (subSid === sid && sub.id) {
        deletedIdsList.push(String(sub.id));
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

  // 6. Write Cloud Tombstone to Supabase (permanently kills zombie rows in this session)
  await writeCloudTombstone({
    type: 'session_reset',
    sessionId: sid,
    deletedIds: deletedIdsList
  });

  // 7. Attempt Supabase delete for this session
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
 * Fetch all raw submissions and meta from Supabase for Super Admin,
 * strictly filtering out tombstoned (deleted) records.
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

    // Extract tombstones and active rows
    const { activeRows } = extractCloudTombstones(data || []);

    const rows = activeRows.map(row => {
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
      count: rows.length
    };
  } catch (err) {
    console.error('Super admin fetch exception:', err);
    return { success: false, error: err.message, data: [], count: 0 };
  }
}

/**
 * Delete a specific list of submission IDs or objects (Super Admin)
 */
export async function superAdminDeleteSubmissions(ids = [], submissions = []) {
  const validIds = (Array.isArray(ids) ? ids : [ids]).filter(id => id && !String(id).startsWith('local_'));
  const subList = Array.isArray(submissions) ? submissions : [];

  if (validIds.length === 0 && subList.length === 0) {
    return { success: true, count: 0 };
  }

  let deletedCount = 0;
  let lastError = null;

  // 1. Write permanent Cloud Tombstone to Supabase (kills zombie rows forever across all devices)
  await writeCloudTombstone({
    type: 'batch_ids',
    deletedIds: validIds
  });

  // 2. Attempt direct Supabase delete in chunks of 30 using .in('id', chunk)
  const chunkSize = 30;
  for (let i = 0; i < validIds.length; i += chunkSize) {
    const chunk = validIds.slice(i, i + chunkSize);
    try {
      let { error } = await supabase
        .from('quiz_submissions')
        .delete()
        .in('id', chunk);

      if (error && chunk.every(id => !isNaN(Number(id)))) {
        const numChunk = chunk.map(Number);
        const retry = await supabase
          .from('quiz_submissions')
          .delete()
          .in('id', numChunk);
        error = retry.error;
      }

      if (!error) {
        deletedCount += chunk.length;
      }
    } catch (e) {
      lastError = e;
    }
  }

  // 3. Fallback direct delete by student_name + location_id
  if (subList.length > 0) {
    for (const sub of subList) {
      if (sub.student_name && sub.location_id) {
        try {
          await supabase
            .from('quiz_submissions')
            .delete()
            .eq('student_name', sub.student_name)
            .eq('location_id', sub.location_id);
        } catch (e) {}
      }
    }
  }

  // 4. Update localStorage tombstones and clear cache across all keys
  try {
    const deletedList = JSON.parse(localStorage.getItem('geo_deleted_submission_ids') || '[]');
    validIds.forEach(id => {
      if (!deletedList.includes(String(id))) deletedList.push(String(id));
    });
    localStorage.setItem('geo_deleted_submission_ids', JSON.stringify(deletedList));

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('geo_quiz_submissions')) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = list.filter(item => {
            if (validIds.includes(item.id)) return false;
            if (subList.some(s => s.student_name === item.student_name && s.location_id === item.location_id)) return false;
            return true;
          });
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch (err) {}
      }
      if (key && key.startsWith('geo_deleted_submission_ids_')) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          validIds.forEach(id => {
            if (!list.includes(String(id))) list.push(String(id));
          });
          localStorage.setItem(key, JSON.stringify(list));
        } catch (err) {}
      }
    }
  } catch (e) {}

  // 5. Broadcast deletion to all students
  if (subList.length > 0) {
    subList.forEach(sub => {
      broadcastDeletion({
        sessionId: sub.resolvedSessionId || sub.session_id || '1',
        studentName: sub.student_name,
        locationId: sub.location_id,
        id: sub.id
      });
    });
  }

  return { 
    success: true, 
    count: validIds.length || subList.length,
    error: null 
  };
}

/**
 * Delete all submissions belonging to a specific time group (Super Admin)
 */
export async function superAdminDeleteTimeGroup(group) {
  if (!group) return { success: false, error: '시간대 그룹 정보가 유효하지 않습니다.' };

  const submissions = group.submissions || [];
  const ids = (group.submissionIds || []).concat(submissions.map(s => s.id)).filter(Boolean);

  let minTimeIso = null;
  let maxTimeIso = null;

  const timestamps = submissions.map(s => s.created_at).filter(Boolean);
  if (timestamps.length > 0) {
    const times = timestamps.map(t => new Date(t).getTime()).filter(n => !isNaN(n));
    if (times.length > 0) {
      minTimeIso = new Date(Math.min(...times) - 1000).toISOString();
      maxTimeIso = new Date(Math.max(...times) + 1000).toISOString();
    }
  }

  // 1. Write Cloud Tombstone to Supabase (guarantees zombie rows cannot return)
  await writeCloudTombstone({
    type: 'time_group',
    deletedIds: ids,
    timeRange: minTimeIso && maxTimeIso ? { start: minTimeIso, end: maxTimeIso } : null
  });

  // 2. Attempt direct Supabase delete by Time Range
  if (minTimeIso && maxTimeIso) {
    try {
      await supabase
        .from('quiz_submissions')
        .delete()
        .gte('created_at', minTimeIso)
        .lte('created_at', maxTimeIso);
    } catch (e) {
      console.warn('Delete by time range warning:', e);
    }
  }

  // 3. Also execute deletion by IDs & Submissions
  await superAdminDeleteSubmissions(ids, submissions);

  // 4. Clean up localStorage tombstones and caches
  try {
    const deletedList = JSON.parse(localStorage.getItem('geo_deleted_submission_ids') || '[]');
    ids.forEach(id => {
      if (id && !deletedList.includes(String(id))) deletedList.push(String(id));
    });
    localStorage.setItem('geo_deleted_submission_ids', JSON.stringify(deletedList));

    // Clear from all namespaced caches
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('geo_quiz_submissions')) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = list.filter(item => {
            if (ids.includes(item.id)) return false;
            if (submissions.some(s => s.student_name === item.student_name && s.location_id === item.location_id)) return false;
            return true;
          });
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch (err) {}
      }
    }
  } catch (e) {}

  return { success: true, count: submissions.length || ids.length };
}

/**
 * Delete all submissions belonging to a specific session ID (Super Admin)
 */
export async function superAdminDeleteSession(sessionId) {
  if (!sessionId) return { success: false, error: '세션 ID가 지정되지 않았습니다.' };
  const sid = String(sessionId);

  try {
    // 1. Write Cloud Tombstone to Supabase (kills zombie rows for this session forever)
    await writeCloudTombstone({
      type: 'session_delete',
      sessionId: sid
    });

    // 2. Attempt Supabase direct delete
    await supabase
      .from('quiz_submissions')
      .delete()
      .eq('session_id', sid);

    await supabase
      .from('quiz_submissions')
      .delete()
      .like('answer_feature', `%<!--SID:${sid}-->%`);

    // Broadcast reset to connected students
    broadcastReset({ sessionId: sid });

    // Clear local caches matching this session
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('geo_quiz_submissions')) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const filtered = list.filter(item => String(item.session_id || '') !== sid);
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch (err) {}
      }
    }

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
    // 1. Fetch all rows to catch any legacy
    const { data } = await supabase
      .from('quiz_submissions')
      .select('id, session_id, answer_feature, student_name, location_id')
      .limit(5000);

    const legacyRows = (data || []).filter(row => {
      if (row.location_id === '__session_config__' || row.location_id === '__deleted_tombstone__') return false;
      if (row.session_id) return false;
      const hasSidTag = row.answer_feature && row.answer_feature.includes('<!--SID:');
      return !hasSidTag;
    });

    const legacyIds = legacyRows.map(row => row.id).filter(Boolean);

    // 2. Write Cloud Tombstone to Supabase
    if (legacyIds.length > 0) {
      await writeCloudTombstone({
        type: 'legacy_cleanup',
        deletedIds: legacyIds
      });
      await superAdminDeleteSubmissions(legacyIds, legacyRows);
    }

    // 3. Attempt direct delete
    try {
      await supabase
        .from('quiz_submissions')
        .delete()
        .is('session_id', null)
        .not('answer_feature', 'like', '%<!--SID:%');
    } catch (e) {}

    return { success: true, count: legacyIds.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Full factory reset: Purge all submissions from quiz_submissions (Super Admin)
 */
export async function superAdminPurgeAllSubmissions() {
  try {
    const purgeTime = new Date().toISOString();

    // 1. Write Cloud Tombstone to Supabase (permanently drops all records prior to purgeTime)
    await writeCloudTombstone({
      type: 'purge_all',
      purgeBefore: purgeTime
    });

    // 2. Attempt Supabase direct delete
    try {
      await supabase
        .from('quiz_submissions')
        .delete()
        .gte('created_at', '1970-01-01T00:00:00Z');
    } catch (e) {}

    // 3. Clear local storage submissions cache
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

/**
 * Automatically categorize and assign unassigned legacy submissions into separate sessions based on time groups
 */
export async function superAdminAutoAssignSessionsByTimeGroup(timeGroupList = [], user = null) {
  if (!Array.isArray(timeGroupList) || timeGroupList.length === 0) {
    return { success: true, count: 0, sessionsCreated: 0 };
  }

  const ns = getUserNamespace(user);
  let assignedCount = 0;
  const newSessions = [];

  for (let idx = 0; idx < timeGroupList.length; idx++) {
    const group = timeGroupList[idx];
    const rawDate = group.rawDate || '1970-01-01';
    const dateObj = new Date(rawDate);
    const dateFormatted = !isNaN(dateObj.getTime())
      ? `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`
      : '날짜미상';
    const hourFormatted = !isNaN(dateObj.getTime()) ? `${dateObj.getHours()}시경` : '';

    const newSid = `s_auto_${dateFormatted.replace(/\./g, '')}_${String(dateObj.getHours() || '0').padStart(2, '0')}`;
    const sessionTitle = `${timeGroupList.length - idx}회차 (${dateFormatted} ${hourFormatted} 수업)`;

    newSessions.push({
      id: newSid,
      title: sessionTitle,
      categoryFilter: 'landform',
      continents: ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아', '극지방'],
      isOpen: true,
      allowExplore: true,
      accessCount: group.submissions.length,
      createdAt: rawDate
    });

    assignedCount += group.submissions.length;
  }

  // Save new sessions into localStorage for teacher workspace
  try {
    const existingSessions = JSON.parse(localStorage.getItem(`geo_map_sessions_${ns}`) || localStorage.getItem('geo_map_sessions') || '[]');
    const combinedSessions = [...newSessions, ...existingSessions.filter(es => !newSessions.some(ns => ns.id === es.id))];
    localStorage.setItem(`geo_map_sessions_${ns}`, JSON.stringify(combinedSessions));
    localStorage.setItem('geo_map_sessions', JSON.stringify(combinedSessions));
  } catch (e) {}

  return { success: true, count: assignedCount, sessionsCreated: newSessions.length, newSessions };
}




