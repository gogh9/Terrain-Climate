import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Copy, ExternalLink, RotateCcw, Trash2, ChevronDown, ChevronUp, LogOut, Check, Users, Eye, Search, FileText, Table, LayoutGrid, X, RefreshCw, AlignLeft } from 'lucide-react';
import { fetchAllSubmissions, deleteSubmission, resetSessionSubmissions, signOutUser } from '../utils/supabaseService';
import { sound } from '../utils/audio';

const ALL_CONTINENTS = ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아', '극지방'];

// 지형 지점 표준 순서 (총 12개 지점)
export const LANDFORM_ORDER = [
  '스위스 (알프스 산맥)',
  '네팔 (히말라야 산맥)',
  '나이지리아 (고원)',
  '브라질 (아마존강)',
  '베트남·타이 (메콩강·짜오프라야강)',
  '캐나다 (오타와강)',
  '짐바브웨 (빅토리아 폭포)',
  '페루 (티티카카호)',
  '오스트레일리아 (산호 해안)',
  '오스트레일리아 (암석 해안)',
  '미국 (샌타모니카 모래 해안)',
  '인도네시아 (발리섬 모래 해안)'
];

// 기후 지점 표준 순서 (총 12개 지점)
export const CLIMATE_ORDER = [
  '대한민국 (벼농사)',
  '영국·네덜란드 (밀농사·화훼 농업)',
  '캐나다 (타이가 숲·임업)',
  '몽골 (게르와 초원)',
  '모로코·알제리 (사하라 사막·흙집)',
  '사우디아라비아 (원형 경작지)',
  '브라질 (아마존 밀림)',
  '케냐 (사파리 초원)',
  '캄보디아 (고상 가옥)',
  '그린란드 (이누이트)',
  '캐나다 (순록 유목·이글루)',
  '페루 (쿠스코)'
];

// 지점명 내 슬래시(/) 및 결합 표기 통일 정규화 헬퍼
export const normalizeTitle = (title) => {
  if (!title) return '';
  return String(title)
    .replace(/\s*\/\s*/g, ', ')
    .replace(/티티카카호와/g, '티티카카호')
    .replace(/영국\s*,\s*네덜란드/g, '영국·네덜란드')
    .replace(/네덜란드\s*,\s*영국/g, '영국·네덜란드')
    .replace(/네덜란드·영국/g, '영국·네덜란드')
    .replace(/모로코\s*,\s*알제리/g, '모로코·알제리')
    .replace(/알제리\s*,\s*모로코/g, '모로코·알제리')
    .replace(/알제리·모로코/g, '모로코·알제리')
    .replace(/베트남\s*,\s*타이/g, '베트남·타이')
    .replace(/타이\s*,\s*베트남/g, '베트남·타이')
    .replace(/타이·베트남/g, '베트남·타이')
    .trim();
};

// XML 특수문자 이스케이프 헬퍼
export const escapeXml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// 학생 이름에서 반, 번호, 이름 파싱 유틸리티 ("4반 3번 김성재", "4-3 김성재", "3번 김성재" 등 완벽 지원)
export const parseStudentInfo = (rawName = '') => {
  const str = (rawName || '').trim();

  // 1. "4반 3번 김성재" 또는 "6학년 4반 3번 김성재"
  const m1 = str.match(/(?:(\d+)학년\s*)?(\d+)반\s*(\d+)번\s*(.+)/);
  if (m1) {
    return {
      classNum: m1[2] || '',
      studentNum: m1[3] || '',
      name: (m1[4] || '').trim(),
      raw: str
    };
  }

  // 2. "4-3 김성재" 또는 "6-4-3 김성재"
  const m2 = str.match(/^(?:(\d+)[-.]\s*)?(\d+)[-.]\s*(\d+)\s+(.+)/);
  if (m2) {
    return {
      classNum: m2[2] || '',
      studentNum: m2[3] || '',
      name: (m2[4] || '').trim(),
      raw: str
    };
  }

  // 3. "3번 김성재"
  const m3 = str.match(/^(\d+)번\s*(.+)/);
  if (m3) {
    return {
      classNum: '',
      studentNum: m3[1] || '',
      name: (m3[2] || '').trim(),
      raw: str
    };
  }

  // 4. 일반 이름만 있는 경우
  return {
    classNum: '',
    studentNum: '',
    name: str || '익명',
    raw: str
  };
};

// 번호 순서(반 오름차순 -> 번호 오름차순 -> 이름 가나다순) 정렬 비교자
export const compareStudents = (rawA, rawB) => {
  const a = parseStudentInfo(rawA);
  const b = parseStudentInfo(rawB);

  const cA = parseInt(a.classNum, 10) || 0;
  const cB = parseInt(b.classNum, 10) || 0;
  if (cA !== cB) return cA - cB;

  const sA = parseInt(a.studentNum, 10) || 0;
  const sB = parseInt(b.studentNum, 10) || 0;
  if (sA !== sB) return sA - sB;

  return (a.name || '').localeCompare(b.name || '', 'ko');
};

// 세션 카테고리에 따른 지점 열 목록 계산 (지형: 지형 12개 표준 순서, 기후: 기후 12개 표준 순서)
export const getColumnsForSession = (session) => {
  const isClimate = session?.categoryFilter === 'climate';
  const isLandform = session?.categoryFilter === 'landform';
  if (isClimate) return CLIMATE_ORDER;
  if (isLandform) return LANDFORM_ORDER;
  return [...LANDFORM_ORDER, ...CLIMATE_ORDER];
};

// 세션별 제출 데이터 추출 헬퍼 (1회차 레거시 데이터 호환 및 회차별 엄격 격리)
export const getSubmissionsForSession = (session, allSubmissions = [], allSessions = []) => {
  if (!session) return [];
  const targetId = String(session.id);
  const isFirstSession = allSessions.length > 0 ? String(allSessions[0].id) === targetId : targetId === '1';
  const isClimate = session.categoryFilter === 'climate';
  const isLandform = session.categoryFilter === 'landform';

  return allSubmissions.filter(sub => {
    const subSid = String(sub.session_id || '1');
    const matchesSession = subSid === targetId || (isFirstSession && (subSid === '1' || !sub.session_id));
    if (!matchesSession) return false;

    const title = normalizeTitle(sub.location_title || sub.answer_name);
    if (isLandform) return LANDFORM_ORDER.includes(title);
    if (isClimate) return CLIMATE_ORDER.includes(title);
    return true;
  });
};

// 회차 목록을 무조건 순서대로 1회, 2회, 3회... 로 재부여하는 헬퍼
export const renumberSessions = (sessionList) => {
  if (!Array.isArray(sessionList)) return [];
  return sessionList.map((s, index) => {
    const num = index + 1;
    const dateMatch = (s.title || '').match(/\((.*?)\)/);
    let datePart = '';
    if (dateMatch) {
      datePart = `(${dateMatch[1]})`;
    } else if (s.createdAt) {
      const d = new Date(s.createdAt);
      datePart = `(${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.)`;
    }
    return {
      ...s,
      title: `${num}회${datePart}`
    };
  });
};

export default function TeacherWorkspace({ user, locations = [], initialSessionId, onEnterMap, onLogout }) {
  // Saved sessions list (sorted so 1회 is on the left, newer sessions on the right, always renumbered 1, 2, 3...)
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_map_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sort ascending by existing sequence or createdAt
          const sorted = parsed.sort((a, b) => {
            const numA = parseInt((a.title || '').match(/(\d+)회/)?.[1] || '0', 10);
            const numB = parseInt((b.title || '').match(/(\d+)회/)?.[1] || '0', 10);
            if (numA && numB && numA !== numB) return numA - numB;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          });
          return renumberSessions(sorted);
        }
      }
    } catch (e) {
      console.warn('Session load error', e);
    }
    return [
      {
        id: '1',
        title: '1회(2026. 9. 12.)',
        categoryFilter: 'landform', // 'landform' | 'climate'
        continents: ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아', '극지방'],
        isOpen: true,
        allowExplore: true,
        accessCount: 0,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const savedActive = localStorage.getItem('geo_active_session_id');
      if (savedActive) return String(savedActive);
    } catch {}
    return initialSessionId ? String(initialSessionId) : '1';
  });
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync activeSessionId if initialSessionId prop updates
  useEffect(() => {
    if (initialSessionId) {
      setActiveSessionId(String(initialSessionId));
    }
  }, [initialSessionId]);

  // Persist activeSessionId to LocalStorage
  useEffect(() => {
    if (activeSessionId) {
      try {
        localStorage.setItem('geo_active_session_id', String(activeSessionId));
      } catch (e) {}
    }
  }, [activeSessionId]);

  // Set workspace active view and clean lingering URL parameters on workspace mount
  useEffect(() => {
    try {
      localStorage.setItem('geo_active_view', 'workspace');
      if (window.location.search) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (e) {}
  }, []);

  // Save sessions to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('geo_map_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.warn('Session save error', e);
    }
  }, [sessions]);

  // Fetch Submissions from Supabase
  const loadSubmissions = async () => {
    const res = await fetchAllSubmissions(500);
    if (res.success) {
      setSubmissions(res.data);
    }
  };

  useEffect(() => {
    loadSubmissions();
    const interval = setInterval(loadSubmissions, 10000); // 10 sec polling
    return () => clearInterval(interval);
  }, []);

  // Create New Map Session (새 지도는 오른쪽에 추가하며 순서대로 1,2,3회 재부여)
  const handleCreateNewMap = () => {
    sound.playClick();
    const newId = String(Date.now());
    const now = new Date();
    const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;

    const newSession = {
      id: newId,
      title: `(${dateStr})`,
      categoryFilter: 'landform',
      continents: [...ALL_CONTINENTS],
      isOpen: true,
      allowExplore: true,
      accessCount: 0,
      createdAt: now.toISOString()
    };

    setSessions(prev => renumberSessions([...prev, newSession]));
    setActiveSessionId(newId);
  };

  // Toggle Session Open/Closed Status
  const handleToggleOpen = (sessionId) => {
    sound.playClick();
    const strId = String(sessionId);
    setSessions(prev => prev.map(s => String(s.id) === strId ? { ...s, isOpen: !s.isOpen } : s));
  };

  // Toggle Textbook Exploration Permission (allowExplore)
  const handleToggleExplore = (sessionId) => {
    sound.playClick();
    const strId = String(sessionId);
    setSessions(prev => prev.map(s => {
      if (String(s.id) === strId) {
        const currentVal = s.allowExplore !== false;
        return { ...s, allowExplore: !currentVal };
      }
      return s;
    }));
  };

  // Toggle Category Filter (Landform / Climate)
  const handleCategoryChange = (sessionId, category) => {
    sound.playClick();
    const strId = String(sessionId);
    setActiveSessionId(strId);
    setSessions(prev => prev.map(s => String(s.id) === strId ? { ...s, categoryFilter: category } : s));
  };

  // Copy Student Distribution Link
  const handleCopyLink = (session) => {
    sound.playClick();
    const cat = session.categoryFilter === 'climate' ? 'climate' : 'landform';
    const explore = session.allowExplore !== false ? '1' : '0';
    const link = `${window.location.origin}/?session=${session.id}&category=${cat}&explore=${explore}`;
    navigator.clipboard.writeText(link);
    setCopiedId(session.id);
    alert(`📋 학생 배부용 링크가 복사되었습니다!\n\n${link}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Reset Submissions for Session
  const handleResetSession = async (sessionId) => {
    if (!window.confirm('이 지도의 수집된 모든 데이터 제출을 초기화하시겠습니까?')) return;
    sound.playClick();

    const targetSessionId = String(sessionId || '1');

    // 1. Immediately filter out from React state for zero UI latency
    setSubmissions(prev => prev.filter(sub => {
      const sid = String(sub.session_id || '1');
      return sid !== targetSessionId;
    }));

    // 2. Perform comprehensive reset (blacklist IDs + reset timestamp + clear local cache + Supabase delete)
    const toDelete = submissions.filter(sub => {
      if (sub.session_id) return String(sub.session_id) === targetSessionId;
      return targetSessionId === '1';
    });
    await resetSessionSubmissions(targetSessionId, toDelete);

    // 3. Reset access count in session state
    setSessions(prev => prev.map(s => String(s.id) === targetSessionId ? { ...s, accessCount: 0 } : s));

    // 4. Reload submissions
    await loadSubmissions();
    alert('초기화되었습니다.');
  };

  // Delete Session Card (삭제 후 남은 세션들을 순서대로 1,2,3회로 자동 재부여)
  const handleDeleteSession = (sessionId) => {
    if (sessions.length <= 1) {
      alert('최소 1개의 지도는 유지되어야 합니다.');
      return;
    }
    if (!window.confirm('이 지도를 삭제하시겠습니까?')) return;
    sound.playClick();
    const strId = String(sessionId);
    
    setSessions(prev => {
      const remaining = prev.filter(s => String(s.id) !== strId);
      const renumbered = renumberSessions(remaining);
      if (String(activeSessionId) === strId && renumbered.length > 0) {
        setActiveSessionId(String(renumbered[0].id));
      }
      return renumbered;
    });
  };

  // Active Session helper
  const activeSession = useMemo(() => {
    return sessions.find(s => String(s.id) === String(activeSessionId)) || sessions[0];
  }, [sessions, activeSessionId]);

  // Submissions filtered strictly for the Active Session & Category
  const sessionSubmissions = useMemo(() => {
    return getSubmissionsForSession(activeSession, submissions, sessions);
  }, [submissions, activeSession, sessions]);

  // Columns for Active Session (Strictly 12 standard columns according to session category)
  const activeColumns = useMemo(() => {
    return getColumnsForSession(activeSession);
  }, [activeSession]);

  // Excel (.xls SpreadsheetML) Export with centering, proper widths, and student order
  const handleExportExcel = (session) => {
    sound.playClick();
    const targetSession = session || activeSession;
    const targetSubmissions = getSubmissionsForSession(targetSession, submissions, sessions);

    if (targetSubmissions.length === 0) {
      alert(`'${targetSession.title}' 지도에 저장된 제출 데이터가 없습니다.`);
      return;
    }

    const columns = getColumnsForSession(targetSession);

    // Group submissions by student name
    const studentsMap = {};
    targetSubmissions.forEach(sub => {
      const rawName = sub.student_name || '익명 학생';
      if (!studentsMap[rawName]) {
        studentsMap[rawName] = {};
      }
      const rawTitle = sub.location_title || sub.answer_name;
      const title = normalizeTitle(rawTitle);
      if (title) {
        studentsMap[rawName][title] = sub.answer_feature || '';
      }
    });

    // Sort students by class -> number -> name (출석 번호 순서 정렬)
    const sortedNames = Object.keys(studentsMap).sort(compareStudents);

    // Header cells: 반, 번호, 이름, [각 지점...]
    const headerCells = [
      '<Cell ss:StyleID="Header"><Data ss:Type="String">반</Data></Cell>',
      '<Cell ss:StyleID="Header"><Data ss:Type="String">번호</Data></Cell>',
      '<Cell ss:StyleID="Header"><Data ss:Type="String">이름</Data></Cell>',
      ...columns.map(col => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col)}</Data></Cell>`)
    ].join('');

    // Column widths: 반(45), 번호(45), 이름(80), 지점(220)
    const colWidths = [
      '<Column ss:Width="45"/>',
      '<Column ss:Width="45"/>',
      '<Column ss:Width="80"/>',
      ...columns.map(() => '<Column ss:Width="220"/>')
    ].join('');

    // Rows for each student
    const rowXmlList = sortedNames.map(rawName => {
      const parsed = parseStudentInfo(rawName);
      const studentSubMap = studentsMap[rawName] || {};

      const dataCells = [
        `<Cell ss:StyleID="CenterCell"><Data ss:Type="${parsed.classNum ? 'Number' : 'String'}">${escapeXml(parsed.classNum)}</Data></Cell>`,
        `<Cell ss:StyleID="CenterCell"><Data ss:Type="${parsed.studentNum ? 'Number' : 'String'}">${escapeXml(parsed.studentNum)}</Data></Cell>`,
        `<Cell ss:StyleID="CenterCell"><Data ss:Type="String">${escapeXml(parsed.name)}</Data></Cell>`,
        ...columns.map(col => {
          const val = studentSubMap[col] || '';
          return `<Cell ss:StyleID="TextCell"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`;
        })
      ].join('');

      return `<Row ss:AutoFitHeight="1">${dataCells}</Row>`;
    }).join('\n');

    const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>우리 반 세계지도</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="맑은 고딕" x:CharSet="129" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C0C0C0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C0C0C0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C0C0C0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C0C0C0"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Size="10" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CenterCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Size="10"/>
  </Style>
  <Style ss:ID="TextCell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Size="10"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(targetSession.title || '학습제출내용')}">
  <Table>
   ${colWidths}
   <Row ss:Height="28">
    ${headerCells}
   </Row>
   ${rowXmlList}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (targetSession.title || '학습제출기록').replace(/[\\/:*?"<>|]/g, '_');
    link.setAttribute('download', `${safeTitle}_학습제출기록.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Match location information from master locations list
  const getLocationInfo = (sub) => {
    const rawTitle = sub.location_title || sub.answer_name || '';
    const normTitle = normalizeTitle(rawTitle);
    const found = locations.find(l => 
      l.id === sub.location_id || 
      l.name === rawTitle || 
      l.name === normTitle ||
      (l.name && normalizeTitle(l.name) === normTitle)
    );
    if (found) return found;
    return {
      name: normTitle || '탐험 지점',
      category: 'landform',
      categoryName: '지형, 기후',
      continent: '전체',
      modelAnswer: '교과서 핵심 요약 내용이 제공되지 않는 지점입니다.'
    };
  };

  // Group Submissions By Student Name (Filtered for Active Session)
  const submissionsByStudent = useMemo(() => {
    const groups = {};
    sessionSubmissions.forEach(sub => {
      const name = sub.student_name || '익명 학생';
      if (!groups[name]) groups[name] = [];
      groups[name].push(sub);
    });
    return groups;
  }, [sessionSubmissions]);

  // Unique Student Names sorted by student number (Filtered for Active Session)
  const studentNames = useMemo(() => {
    return Object.keys(submissionsByStudent).sort(compareStudents);
  }, [submissionsByStudent]);

  // Student Matrix Map: { [studentName]: { [locationTitle]: submission } } (Filtered for Active Session)
  const studentMatrixMap = useMemo(() => {
    const map = {};
    sessionSubmissions.forEach(sub => {
      const raw = sub.student_name || '익명 학생';
      if (!map[raw]) map[raw] = {};
      const rawTitle = sub.location_title || sub.answer_name;
      const title = normalizeTitle(rawTitle);
      if (title) {
        map[raw][title] = sub;
      }
    });
    return map;
  }, [sessionSubmissions]);

  // Sorted Student Names for Matrix View
  const sortedMatrixStudentNames = useMemo(() => {
    return Object.keys(studentMatrixMap).sort(compareStudents);
  }, [studentMatrixMap]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#121212',
        color: '#ffffff',
        fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: '1.5rem 2rem'
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #282828'
        }}
      >
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
          우리반 세계지도(지형, 기후)
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.88rem', color: '#b3b3b3' }}>
            {user?.email || 'gogh999@gmail.com'}
          </span>

          <button
            onClick={onLogout}
            style={{
              background: '#1f1f1f',
              border: '1px solid #7c7c7c',
              borderRadius: '9999px',
              color: '#b3b3b3',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              transition: 'all 0.15s ease'
            }}
            title="로그아웃"
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#b3b3b3'; e.currentTarget.style.borderColor = '#7c7c7c'; }}
          >
            <LogOut size={16} />
          </button>

          <button
            onClick={handleCreateNewMap}
            style={{
              background: '#1ed760',
              color: '#000000',
              border: 'none',
              padding: '0.65rem 1.4rem',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.88rem',
              textTransform: 'uppercase',
              letterSpacing: '1.4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(29, 215, 96, 0.35)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={18} /> 새 지도 만들기
          </button>
        </div>
      </header>

      {/* Map Assignment Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        {sessions.map(session => {
          const isSelected = String(activeSessionId) === String(session.id);
          const isClimate = session.categoryFilter === 'climate';
          const isLandform = session.categoryFilter === 'landform';
          const sessionSubmissionsForCard = getSubmissionsForSession(session, submissions, sessions);
          const cardStudentCount = new Set(sessionSubmissionsForCard.map(s => s.student_name || '익명')).size;
          const sessionSubCount = sessionSubmissionsForCard.length;

          return (
            <div
              key={session.id}
              onClick={() => setActiveSessionId(String(session.id))}
              style={{
                background: '#181818',
                borderRadius: '12px',
                border: `2px solid ${isSelected ? '#1ed760' : '#282828'}`,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem',
                position: 'relative',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                boxShadow: isSelected ? '0 0 20px rgba(29, 215, 96, 0.25)' : 'rgba(0, 0, 0, 0.3) 0px 8px 8px',
                cursor: 'pointer'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                      {session.title}
                    </h3>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: isClimate ? 'rgba(245, 158, 11, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                      color: isClimate ? '#fbbf24' : '#38bdf8',
                      border: `1px solid ${isClimate ? 'rgba(245, 158, 11, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`
                    }}>
                      {isClimate ? '☀️ 기후 (12개)' : '🏔️ 지형 (12개)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', fontSize: '0.8rem', color: '#a1a1aa' }}>
                    <span>제출 학생: <strong style={{ color: cardStudentCount > 0 ? '#1ed760' : '#71717a' }}>{cardStudentCount}명</strong></span>
                    <span>•</span>
                    <span>답안 건수: <strong style={{ color: sessionSubCount > 0 ? '#1ed760' : '#71717a' }}>{sessionSubCount}건</strong></span>
                    {isSelected && (
                      <span style={{ color: '#1ed760', fontWeight: 800, marginLeft: '4px' }}>
                        ● 선택됨 (아래 확인)
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Top Right: Reset and Delete Buttons */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResetSession(session.id); }}
                    style={{
                      background: '#1f1f1f',
                      color: '#ffa42b',
                      border: '1px solid #404040',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffa42b'; e.currentTarget.style.background = '#282828'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#404040'; e.currentTarget.style.background = '#1f1f1f'; }}
                    title="이 회차 학생 제출 기록 초기화"
                  >
                    <RotateCcw size={12} /> 초기화
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                    style={{
                      background: '#1f1f1f',
                      color: '#f3727f',
                      border: '1px solid #404040',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f3727f'; e.currentTarget.style.background = '#282828'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#404040'; e.currentTarget.style.background = '#1f1f1f'; }}
                    title="이 회차 지도 삭제"
                  >
                    <Trash2 size={12} /> 삭제
                  </button>
                </div>
              </div>

              {/* Category Filter Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#b3b3b3' }}>
                <span style={{ fontWeight: 600 }}>학습 주제:</span>
                <select
                  value={session.categoryFilter === 'climate' ? 'climate' : 'landform'}
                  onChange={(e) => handleCategoryChange(session.id, e.target.value)}
                  style={{
                    background: '#1f1f1f',
                    color: '#ffffff',
                    border: '1px solid #404040',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <option value="landform">🏔️ 지형 (12개 지점)</option>
                  <option value="climate">☀️ 기후 (12개 지점)</option>
                </select>
              </div>

              {/* Distinct Share Link Box */}
              <div
                style={{
                  background: '#121212',
                  border: '1px solid #282828',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                  <span style={{ fontSize: '0.78rem', color: '#1ed760', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    🔗 배부 링크:
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#888888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {`${window.location.origin}/?session=${session.id}&category=${session.categoryFilter === 'climate' ? 'climate' : 'landform'}&explore=${session.allowExplore !== false ? '1' : '0'}`}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#222222', color: '#a1a1aa', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                  ID: {session.id}
                </span>
              </div>

              {/* Actions: Direct Map View & Excel Export & Open/Close Toggle & Explore Toggle (Equal 4-Column Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '100%' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSessionId(String(session.id));
                    onEnterMap?.(session);
                  }}
                  style={{
                    background: '#1f1f1f',
                    color: '#ffffff',
                    border: '1px solid #7c7c7c',
                    padding: '7px 4px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1ed760'; e.currentTarget.style.color = '#1ed760'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#7c7c7c'; e.currentTarget.style.color = '#ffffff'; }}
                  title={`이 회차(${session.title}) 지도로 바로 이동`}
                >
                  🗺️ 지도 보기
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleExportExcel(session); }}
                  style={{
                    background: '#1f1f1f',
                    color: '#1ed760',
                    border: '1px solid #1ed760',
                    padding: '7px 4px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#1ed760'; e.currentTarget.style.color = '#000000'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#1f1f1f'; e.currentTarget.style.color = '#1ed760'; }}
                >
                  <Download size={14} /> 엑셀 저장
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleOpen(session.id); }}
                  style={{
                    background: session.isOpen ? '#1ed760' : '#282828',
                    color: session.isOpen ? '#000000' : '#b3b3b3',
                    border: 'none',
                    padding: '7px 4px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    transition: 'all 0.15s ease'
                  }}
                  title="학생들의 답안 제출 가능 여부를 설정합니다"
                >
                  {session.isOpen ? '✓ 입력 가능' : '🔒 마감'}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleExplore(session.id); }}
                  style={{
                    background: session.allowExplore !== false ? '#1ed760' : '#282828',
                    color: session.allowExplore !== false ? '#000000' : '#b3b3b3',
                    border: session.allowExplore !== false ? 'none' : '1px solid #404040',
                    padding: '7px 4px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    transition: 'all 0.15s ease'
                  }}
                  title="학생들의 퀴즈 창 내 '교과서 핵심 탐색' 이용 가능 여부를 설정합니다"
                >
                  {session.allowExplore !== false ? '📖 탐색 가능' : '🔒 탐색 잠금'}
                </button>
              </div>

              {/* Spotify Green Copy Link Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleCopyLink(session); }}
                style={{
                  background: '#1ed760',
                  color: '#000000',
                  border: 'none',
                  padding: '0.9rem',
                  borderRadius: '9999px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1.4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(29, 215, 96, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {copiedId === session.id ? <Check size={20} /> : <Copy size={20} />}
                <span>{copiedId === session.id ? '링크 복사 완료!' : '📋 학생 배부용 링크 복사'}</span>
              </button>

            </div>
          );
        })}
      </div>

      {/* Student Submissions Section */}
      <div style={{ marginTop: '1.5rem' }}>
        {/* Section Header with Stats & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                📝 [{activeSession?.title || '선택된 지도'}] 학생 학습 제출 내용 확인 & 관리
              </h2>
              <span style={{
                background: activeSession?.categoryFilter === 'climate' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                color: activeSession?.categoryFilter === 'climate' ? '#fbbf24' : '#38bdf8',
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '9999px',
                border: `1px solid ${activeSession?.categoryFilter === 'climate' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(2, 132, 199, 0.4)'}`
              }}>
                {activeSession?.categoryFilter === 'climate' ? '☀️ 기후' : '🏔️ 지형'}
              </span>
              <span style={{ background: '#282828', color: '#1ed760', fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px' }}>
                참여 학생 {studentNames.length}명 ({sessionSubmissions.length}개 답안)
              </span>
            </div>
          </div>

          {/* Controls: Excel Download & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handleExportExcel(activeSession)}
              style={{
                background: '#1ed760',
                border: 'none',
                color: '#000000',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              title="현재 보고 있는 회차 학생 제출 데이터를 엑셀로 다운로드"
            >
              <Download size={13} />
              <span>엑셀 다운로드</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setIsRefreshing(true);
                loadSubmissions().then(() => setIsRefreshing(false));
              }}
              style={{
                background: '#1f1f1f',
                border: '1px solid #333333',
                color: '#b3b3b3',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>새로고침</span>
            </button>
          </div>
        </div>



        {/* Content Body: Empty State or Horizontal Matrix */}
        {sessionSubmissions.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#71717a', background: '#181818', borderRadius: '16px', border: '1px solid #282828' }}>
            <FileText size={32} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b3b3b3' }}>
              이 지도('{activeSession?.title || '선택된 지도'}')에 제출된 학생 학습 기록이 없습니다. 학생들이 지도를 탐험하며 작성하면 여기에 실시간으로 표시됩니다.
            </div>
          </div>
        ) : (
          /* HORIZONTAL MATRIX VIEW (창 너비에 맞춰 가로 스크롤 없이 전체 표시) */
          <div style={{ borderRadius: '12px', border: '1px solid #282828', background: '#181818', boxShadow: 'rgba(0, 0, 0, 0.35) 0px 8px 16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#1f1f1f', borderBottom: '2px solid #2d2d2d', color: '#1ed760' }}>
                  <th style={{ padding: '10px 2px', width: '38px', textAlign: 'center' }}>반</th>
                  <th style={{ padding: '10px 2px', width: '38px', textAlign: 'center' }}>번호</th>
                  <th style={{ padding: '10px 4px', width: '70px', textAlign: 'center', borderRight: '2px solid #2d2d2d' }}>이름</th>
                  {activeColumns.map(col => {
                    const isLand = activeSession?.categoryFilter === 'landform' || LANDFORM_ORDER.includes(col);
                    return (
                      <th
                        key={col}
                        style={{
                          padding: '10px 6px',
                          textAlign: 'center',
                          fontWeight: 800,
                          color: '#ffffff',
                          borderRight: '1px solid #282828',
                          lineHeight: 1.25
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem' }}>{isLand ? '🏔️' : '☀️'}</span>
                          <span style={{ color: '#1ed760', fontSize: '0.8rem', wordBreak: 'keep-all' }}>{col}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ padding: '10px 4px', width: '65px', textAlign: 'center', borderRight: '1px solid #282828', color: '#b3b3b3', fontSize: '0.78rem' }}>현황</th>
                  <th style={{ padding: '10px 2px', width: '38px', textAlign: 'center', color: '#b3b3b3', fontSize: '0.78rem' }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatrixStudentNames.map((studentName, idx) => {
                  const parsed = parseStudentInfo(studentName);
                  const studentSubs = studentMatrixMap[studentName] || {};
                  const submittedCount = Object.keys(studentSubs).length;
                  const isFull = submittedCount >= activeColumns.length && activeColumns.length > 0;

                  return (
                    <tr
                      key={studentName}
                      style={{
                        borderBottom: '1px solid #262626',
                        background: idx % 2 === 0 ? '#181818' : '#141414',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#202020'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#181818' : '#141414'}
                    >
                      {/* 반 (컴팩트 가운데 정렬) */}
                      <td style={{
                        padding: '8px 2px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#e4e4e7'
                      }}>
                        {parsed.classNum ? (
                          <span style={{ background: '#27272a', padding: '2px 5px', borderRadius: '4px', fontSize: '0.78rem' }}>
                            {parsed.classNum}
                          </span>
                        ) : '-'}
                      </td>

                      {/* 번호 (컴팩트 가운데 정렬) */}
                      <td style={{
                        padding: '8px 2px',
                        textAlign: 'center',
                        fontWeight: 800,
                        color: '#ffffff',
                        fontSize: '0.82rem'
                      }}>
                        {parsed.studentNum ? `${parsed.studentNum}` : '-'}
                      </td>

                      {/* 이름 (컴팩트 가운데 정렬) */}
                      <td style={{
                        padding: '8px 4px',
                        textAlign: 'center',
                        fontWeight: 900,
                        color: '#1ed760',
                        borderRight: '2px solid #2d2d2d',
                        fontSize: '0.84rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {parsed.name}
                      </td>

                      {/* 각 지점별 칸 */}
                      {activeColumns.map(col => {
                        const sub = studentSubs[col];
                        if (!sub) {
                          return (
                            <td
                              key={col}
                              style={{
                                padding: '8px 4px',
                                textAlign: 'center',
                                color: '#404040',
                                borderRight: '1px solid #242424',
                                verticalAlign: 'middle'
                              }}
                            >
                              <span style={{ fontSize: '0.8rem' }}>-</span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col}
                            style={{
                              padding: '6px 5px',
                              borderRight: '1px solid #242424',
                              verticalAlign: 'top'
                            }}
                          >
                            <div
                              onClick={() => setSelectedSubmission(sub)}
                              style={{
                                background: '#121212',
                                border: '1px solid #2a2a2a',
                                borderRadius: '6px',
                                padding: '6px 8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                minHeight: '52px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#1ed760';
                                e.currentTarget.style.background = '#1a1a1a';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#2a2a2a';
                                e.currentTarget.style.background = '#121212';
                              }}
                              title={sub.answer_feature || '(작성 내용 없음)'}
                            >
                              <div style={{
                                fontSize: '0.78rem',
                                color: '#f4f4f5',
                                lineHeight: 1.4,
                                wordBreak: 'break-word',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {sub.answer_feature || '(작성 내용 없음)'}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* 제출 현황 (가운데 정렬) */}
                      <td style={{
                        padding: '8px 2px',
                        textAlign: 'center',
                        borderRight: '1px solid #282828',
                        verticalAlign: 'middle'
                      }}>
                        <span style={{
                          display: 'inline-block',
                          background: isFull ? 'rgba(30, 215, 96, 0.15)' : 'rgba(255, 164, 43, 0.12)',
                          color: isFull ? '#1ed760' : '#ffa42b',
                          border: `1px solid ${isFull ? 'rgba(30, 215, 96, 0.3)' : 'rgba(255, 164, 43, 0.3)'}`,
                          padding: '2px 5px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}>
                          {submittedCount}/{activeColumns.length}
                        </span>
                      </td>

                      {/* 학생 제출 전체 삭제 (가운데 정렬) */}
                      <td style={{
                        padding: '8px 2px',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        <button
                          onClick={async () => {
                            const subList = Object.values(studentSubs);
                            if (subList.length === 0) return;
                            if (!window.confirm(`'${studentName}' 학생의 전체 제출 기록(${subList.length}건)을 삭제하시겠습니까?`)) return;
                            sound.playClick();
                            for (const s of subList) {
                              await deleteSubmission(s.id);
                            }
                            loadSubmissions();
                          }}
                          style={{ background: 'none', border: 'none', color: '#f3727f', cursor: 'pointer', padding: '2px', opacity: 0.7 }}
                          title="해당 학생의 모든 제출 기록 삭제"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Inspection Modal */}
      {selectedSubmission && (() => {
        const loc = getLocationInfo(selectedSubmission);
        return (
          <div
            className="modal-overlay"
            onClick={() => setSelectedSubmission(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              backdropFilter: 'blur(4px)'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#181818',
                border: '1px solid #282828',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{loc.category === 'landform' ? '🏔️' : '☀️'}</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                      {normalizeTitle(selectedSubmission.location_title || selectedSubmission.answer_name)}
                    </h3>
                    <span style={{ background: '#1ed760', color: '#000', fontWeight: 800, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '9999px' }}>
                      {loc.categoryName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: '#b3b3b3', flexWrap: 'wrap' }}>
                    <span>👤 <strong>제출 학생:</strong> <span style={{ color: '#1ed760', fontWeight: 700 }}>{selectedSubmission.student_name}</span></span>
                    <span>📍 <strong>대륙:</strong> {loc.continent}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  style={{
                    background: '#1f1f1f',
                    border: 'none',
                    color: '#b3b3b3',
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Written Content */}
              <div style={{ background: '#121212', border: '1px solid #38bdf8', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✍️</span>
                  <span>학생이 입력한 특징 및 생활 모습</span>
                </div>
                <div style={{ fontSize: '1.05rem', color: '#ffffff', lineHeight: 1.7, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                  {selectedSubmission.answer_feature || '(작성된 내용이 없습니다)'}
                </div>
              </div>

              {/* Textbook Model Answer */}
              <div style={{ background: '#121212', border: '1px solid #1ed760', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#1ed760', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📖</span>
                  <span>교과서 핵심 모범 답안 (채점 및 지도 참고용)</span>
                </div>
                <div style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.7 }}>
                  {loc.modelAnswer}
                </div>
                {loc.featureKeywords && loc.featureKeywords.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #282828', fontSize: '0.82rem', color: '#9e9e9e' }}>
                    <span style={{ color: '#1ed760', fontWeight: 700 }}>📌 핵심 판정 키워드 (2개 이상 포함 시 인정): </span>
                    {loc.featureKeywords.join(', ')}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  onClick={async () => {
                    if (!window.confirm(`'${selectedSubmission.student_name}' 학생의 이 제출 기록을 삭제하시겠습니까?`)) return;
                    sound.playClick();
                    await deleteSubmission(selectedSubmission.id);
                    setSelectedSubmission(null);
                    loadSubmissions();
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid #f3727f',
                    color: '#f3727f',
                    padding: '0.55rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={14} /> 제출 기록 삭제
                </button>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  style={{
                    background: '#1ed760',
                    color: '#000000',
                    border: 'none',
                    padding: '0.6rem 1.4rem',
                    borderRadius: '9999px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  확인 완료
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
