import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Copy, ExternalLink, RotateCcw, Trash2, ChevronDown, ChevronUp, LogOut, Check, Users, Eye, Search, FileText, Table, LayoutGrid, X, RefreshCw, AlignLeft } from 'lucide-react';
import { fetchAllSubmissions, deleteSubmission, signOutUser } from '../utils/supabaseService';
import { sound } from '../utils/audio';

const ALL_CONTINENTS = ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아', '극지방'];

// 기후 지점 표준 순서 (사용자 엑셀 캡처 이미지 순서와 동일)
export const CLIMATE_ORDER = [
  '대한민국 / 벼농사',
  '러시아 / 타이가',
  '사우디아라비아, 사막',
  '볼리비아, 안데스 산지',
  '브라질, 아마존',
  '그린란드, 툰드라'
];

// 지형 지점 표준 순서
export const LANDFORM_ORDER = [
  '몽블랑산 (알프스산맥)',
  '사하라 사막',
  '몽골 초원',
  '콜로라도강 (그랜드 캐니언)',
  '피오르 해안 (노르웨이)',
  '하와이 화산 (킬라우에아)'
];

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

// 세션 카테고리에 따른 지점 열 목록 계산 (기본 목록 + 추가 지점)
export const getColumnsForSession = (session, subs = []) => {
  const isLandform = session?.categoryFilter === 'landform';
  const defaultList = isLandform ? LANDFORM_ORDER : CLIMATE_ORDER;

  const extraCols = [];
  subs.forEach(s => {
    const title = s.location_title || s.answer_name;
    if (title && !defaultList.includes(title) && !extraCols.includes(title)) {
      extraCols.push(title);
    }
  });

  return [...defaultList, ...extraCols];
};

export default function TeacherWorkspace({ user, locations = [], onEnterMap, onLogout }) {
  // Saved sessions list
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_map_sessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Session load error', e);
    }
    return [
      {
        id: '1',
        title: '1회(2026. 9. 12.)',
        categoryFilter: 'climate', // 'climate' | 'landform'
        continents: ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아', '극지방'],
        isOpen: true,
        accessCount: 0,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState('1');
  const [submissions, setSubmissions] = useState([]);
  const [studentFilter, setStudentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Create New Map Session
  const handleCreateNewMap = () => {
    sound.playClick();
    const newId = String(Date.now());
    const count = sessions.length + 1;
    const now = new Date();
    const dateStr = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}.`;

    const newSession = {
      id: newId,
      title: `${count}회(${dateStr})`,
      categoryFilter: 'climate',
      continents: [...ALL_CONTINENTS],
      isOpen: true,
      accessCount: 0,
      createdAt: now.toISOString()
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  // Toggle Session Open/Closed Status
  const handleToggleOpen = (sessionId) => {
    sound.playClick();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isOpen: !s.isOpen } : s));
  };

  // Toggle Category Filter (Landform / Climate)
  const handleCategoryChange = (sessionId, category) => {
    sound.playClick();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, categoryFilter: category } : s));
  };

  // Copy Student Distribution Link
  const handleCopyLink = (session) => {
    sound.playClick();
    const cat = session.categoryFilter === 'landform' ? 'landform' : 'climate';
    const link = `${window.location.origin}/?session=${session.id}&category=${cat}`;
    navigator.clipboard.writeText(link);
    setCopiedId(session.id);
    alert(`📋 학생 배부용 링크가 복사되었습니다!\n\n${link}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Reset Submissions for Session
  const handleResetSession = async (sessionId) => {
    if (!window.confirm('이 지도의 수집된 모든 데이터 제출을 초기화하시겠습니까?')) return;
    sound.playClick();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, accessCount: 0 } : s));
    alert('초기화되었습니다.');
  };

  // Delete Session Card
  const handleDeleteSession = (sessionId) => {
    if (sessions.length <= 1) {
      alert('최소 1개의 지도는 유지되어야 합니다.');
      return;
    }
    if (!window.confirm('이 지도를 삭제하시겠습니까?')) return;
    sound.playClick();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions[0].id);
    }
  };

  // Active Session helper
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  // Columns for Active Session
  const activeColumns = useMemo(() => {
    return getColumnsForSession(activeSession, submissions);
  }, [activeSession, submissions]);

  // Excel (.xls SpreadsheetML) Export with centering, proper widths, and student order
  const handleExportExcel = (session) => {
    sound.playClick();
    if (submissions.length === 0) {
      alert('저장할 제출 데이터가 없습니다.');
      return;
    }

    const targetSession = session || activeSession;
    const columns = getColumnsForSession(targetSession, submissions);

    // Group submissions by student name
    const studentsMap = {};
    submissions.forEach(sub => {
      const rawName = sub.student_name || '익명 학생';
      if (!studentsMap[rawName]) {
        studentsMap[rawName] = {};
      }
      const title = sub.location_title || sub.answer_name;
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
    const found = locations.find(l => l.id === sub.location_id || l.name === sub.location_title || l.name === sub.answer_name);
    if (found) return found;
    return {
      name: sub.location_title || sub.answer_name || '탐험 지점',
      category: 'climate',
      categoryName: '기후/지형',
      continent: '전체',
      modelAnswer: '교과서 핵심 요약 내용이 제공되지 않는 지점입니다.'
    };
  };

  // Group Submissions By Student Name
  const submissionsByStudent = useMemo(() => {
    const groups = {};
    submissions.forEach(sub => {
      const name = sub.student_name || '익명 학생';
      if (!groups[name]) groups[name] = [];
      groups[name].push(sub);
    });
    return groups;
  }, [submissions]);

  // Unique Student Names sorted by student number
  const studentNames = useMemo(() => {
    return Object.keys(submissionsByStudent).sort(compareStudents);
  }, [submissionsByStudent]);

  // Filtered Submissions based on search query and student filter
  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return submissions.filter(sub => {
      const matchSearch = !q ||
        (sub.student_name && sub.student_name.toLowerCase().includes(q)) ||
        (sub.location_title && sub.location_title.toLowerCase().includes(q)) ||
        (sub.answer_name && sub.answer_name.toLowerCase().includes(q)) ||
        (sub.answer_feature && sub.answer_feature.toLowerCase().includes(q));

      const matchStudent = studentFilter === 'ALL' || sub.student_name === studentFilter;

      return matchSearch && matchStudent;
    });
  }, [submissions, searchQuery, studentFilter]);

  // Filtered Submissions Grouped By Student
  const filteredSubmissionsByStudent = useMemo(() => {
    const groups = {};
    filteredSubmissions.forEach(sub => {
      const name = sub.student_name || '익명 학생';
      if (!groups[name]) groups[name] = [];
      groups[name].push(sub);
    });
    return groups;
  }, [filteredSubmissions]);

  const filteredStudentNames = useMemo(() => {
    return Object.keys(filteredSubmissionsByStudent).sort(compareStudents);
  }, [filteredSubmissionsByStudent]);

  // Student Matrix Map: { [studentName]: { [locationTitle]: submission } }
  const studentMatrixMap = useMemo(() => {
    const map = {};
    filteredSubmissions.forEach(sub => {
      const raw = sub.student_name || '익명 학생';
      if (!map[raw]) map[raw] = {};
      const title = sub.location_title || sub.answer_name;
      if (title) {
        map[raw][title] = sub;
      }
    });
    return map;
  }, [filteredSubmissions]);

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
          우리반 세계지도(기후, 지형)
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
            onClick={() => onEnterMap?.(sessions.find(s => s.id === activeSessionId) || sessions[0])}
            style={{
              background: '#1f1f1f',
              border: '1px solid #7c7c7c',
              borderRadius: '9999px',
              padding: '0.65rem 1.2rem',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="학생 백지도 화면으로 이동"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1ed760'; e.currentTarget.style.color = '#1ed760'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#7c7c7c'; e.currentTarget.style.color = '#ffffff'; }}
          >
            🗺️ 지도 화면 이동
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
          const isSelected = activeSessionId === session.id;

          return (
            <div
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
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
                boxShadow: isSelected ? '0 0 20px rgba(29, 215, 96, 0.25)' : 'rgba(0, 0, 0, 0.3) 0px 8px 8px'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                    {session.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#1ed760', marginTop: '4px', fontWeight: 700 }}>
                    접속 횟수 (학생): <strong style={{ color: '#1ed760' }}>{session.accessCount}회</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportExcel(session); }}
                      style={{
                        background: '#1ed760',
                        color: '#000000',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Download size={14} /> 엑셀 저장
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleOpen(session.id); }}
                      style={{
                        background: session.isOpen ? '#1ed760' : '#282828',
                        color: session.isOpen ? '#000000' : '#b3b3b3',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ✓ {session.isOpen ? '입력 가능' : '마감'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResetSession(session.id); }}
                      style={{
                        background: '#1f1f1f',
                        color: '#ffa42b',
                        border: '1px solid #404040',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'border-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffa42b'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#404040'; }}
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
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'border-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f3727f'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#404040'; }}
                      title="이 회차 지도 삭제"
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Filter Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#b3b3b3' }}>
                <span>학습 주제:</span>
                <select
                  value={session.categoryFilter === 'landform' ? 'landform' : 'climate'}
                  onChange={(e) => handleCategoryChange(session.id, e.target.value)}
                  style={{
                    background: '#1f1f1f',
                    color: '#ffffff',
                    border: '1px solid #7c7c7c',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.82rem',
                    outline: 'none',
                    fontWeight: 700
                  }}
                >
                  <option value="climate">☀️ 기후</option>
                  <option value="landform">🏔️ 지형</option>
                </select>
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
                📝 학생 학습 제출 내용 확인 & 관리
              </h2>
              <span style={{ background: '#282828', color: '#b3b3b3', fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px' }}>
                참여 학생 {studentNames.length}명
              </span>
            </div>
          </div>

          {/* Refresh Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        {/* Filter Bar: Search Input & Student Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
            <input
              type="text"
              placeholder="학생 이름, 탐험 지점명, 작성 내용으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="spotify-input"
              style={{
                width: '100%',
                paddingLeft: '38px',
                fontSize: '0.85rem',
                background: '#181818',
                border: '1px solid #282828',
                color: '#ffffff',
                borderRadius: '9999px'
              }}
            />
          </div>

          {/* Student Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', color: '#b3b3b3', fontWeight: 600 }}>학생 필터:</span>
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              style={{
                background: '#181818',
                color: '#ffffff',
                border: '1px solid #333333',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '0.82rem',
                outline: 'none',
                fontWeight: 700
              }}
            >
              <option value="ALL">전체 학생 ({studentNames.length}명)</option>
              {studentNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body: Empty State or Horizontal Matrix or Cards or Table */}
        {filteredSubmissions.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#71717a', background: '#181818', borderRadius: '16px', border: '1px solid #282828' }}>
            <FileText size={32} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b3b3b3' }}>
              {submissions.length === 0
                ? '아직 제출된 학생 학습 기록이 없습니다. 학생들이 지도를 탐험하며 작성하면 여기에 실시간으로 표시됩니다.'
                : '검색 및 필터 조건에 일치하는 학생 제출 기록이 없습니다.'}
            </div>
          </div>
        ) : (
          /* HORIZONTAL MATRIX VIEW (엑셀 시트처럼 가로로 길게 한 줄 정렬) */
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #282828', background: '#181818', boxShadow: 'rgba(0, 0, 0, 0.35) 0px 8px 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', minWidth: `${300 + activeColumns.length * 260}px` }}>
              <thead>
                <tr style={{ background: '#1f1f1f', borderBottom: '2px solid #2d2d2d', color: '#1ed760' }}>
                  <th style={{ padding: '12px 10px', width: '55px', textAlign: 'center', position: 'sticky', left: 0, background: '#1f1f1f', zIndex: 2 }}>반</th>
                  <th style={{ padding: '12px 10px', width: '55px', textAlign: 'center', position: 'sticky', left: '55px', background: '#1f1f1f', zIndex: 2 }}>번호</th>
                  <th style={{ padding: '12px 14px', width: '100px', textAlign: 'center', position: 'sticky', left: '110px', background: '#1f1f1f', zIndex: 2, borderRight: '2px solid #2d2d2d' }}>이름</th>
                  {activeColumns.map(col => {
                    const isLand = activeSession?.categoryFilter === 'landform' || LANDFORM_ORDER.includes(col);
                    return (
                      <th
                        key={col}
                        style={{
                          padding: '12px 16px',
                          width: '260px',
                          minWidth: '240px',
                          textAlign: 'center',
                          fontWeight: 800,
                          color: '#ffffff',
                          borderRight: '1px solid #282828'
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span>{isLand ? '🏔️' : '☀️'}</span>
                          <span style={{ color: '#1ed760' }}>{col}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center', borderRight: '1px solid #282828', color: '#b3b3b3' }}>제출 현황</th>
                  <th style={{ padding: '12px 10px', width: '60px', textAlign: 'center', color: '#b3b3b3' }}>삭제</th>
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
                        background: idx % 2 === 0 ? '#181818' : '#151515',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#202020'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#181818' : '#151515'}
                    >
                      {/* 반 (가운데 정렬) */}
                      <td style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        position: 'sticky',
                        left: 0,
                        background: 'inherit',
                        fontWeight: 700,
                        color: '#e4e4e7',
                        zIndex: 1
                      }}>
                        {parsed.classNum ? (
                          <span style={{ background: '#27272a', padding: '3px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                            {parsed.classNum}
                          </span>
                        ) : '-'}
                      </td>

                      {/* 번호 (가운데 정렬) */}
                      <td style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        position: 'sticky',
                        left: '55px',
                        background: 'inherit',
                        fontWeight: 800,
                        color: '#ffffff',
                        zIndex: 1,
                        fontSize: '0.88rem'
                      }}>
                        {parsed.studentNum ? `${parsed.studentNum}` : '-'}
                      </td>

                      {/* 이름 (가운데 정렬) */}
                      <td style={{
                        padding: '12px 10px',
                        textAlign: 'center',
                        position: 'sticky',
                        left: '110px',
                        background: 'inherit',
                        fontWeight: 900,
                        color: '#1ed760',
                        borderRight: '2px solid #2d2d2d',
                        zIndex: 1,
                        fontSize: '0.9rem',
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
                                padding: '12px 14px',
                                textAlign: 'center',
                                color: '#52525b',
                                borderRight: '1px solid #242424',
                                verticalAlign: 'middle'
                              }}
                            >
                              <span style={{ fontSize: '0.85rem' }}>-</span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col}
                            style={{
                              padding: '10px 12px',
                              borderRight: '1px solid #242424',
                              verticalAlign: 'top'
                            }}
                          >
                            <div
                              onClick={() => setSelectedSubmission(sub)}
                              style={{
                                background: '#121212',
                                border: '1px solid #2f2f2f',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#1ed760';
                                e.currentTarget.style.background = '#1a1a1a';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#2f2f2f';
                                e.currentTarget.style.background = '#121212';
                              }}
                              title="클릭하여 모범 답안 비교 및 상세 확인"
                            >
                              <div style={{
                                fontSize: '0.84rem',
                                color: '#f4f4f5',
                                lineHeight: 1.55,
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {sub.answer_feature || '(작성 내용 없음)'}
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.68rem', color: '#71717a' }}>
                                  {sub.created_at ? new Date(sub.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#1ed760', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <Eye size={11} /> 모범답안
                                </span>
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* 제출 현황 (가운데 정렬) */}
                      <td style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        borderRight: '1px solid #282828',
                        verticalAlign: 'middle'
                      }}>
                        <span style={{
                          display: 'inline-block',
                          background: isFull ? 'rgba(30, 215, 96, 0.15)' : 'rgba(255, 164, 43, 0.12)',
                          color: isFull ? '#1ed760' : '#ffa42b',
                          border: `1px solid ${isFull ? 'rgba(30, 215, 96, 0.3)' : 'rgba(255, 164, 43, 0.3)'}`,
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}>
                          {submittedCount} / {activeColumns.length}
                        </span>
                      </td>

                      {/* 학생 제출 전체 삭제 (가운데 정렬) */}
                      <td style={{
                        padding: '12px 6px',
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
                          style={{ background: 'none', border: 'none', color: '#f3727f', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
                          title="해당 학생의 모든 제출 기록 삭제"
                        >
                          <Trash2 size={14} />
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
                      {selectedSubmission.location_title || selectedSubmission.answer_name}
                    </h3>
                    <span style={{ background: '#1ed760', color: '#000', fontWeight: 800, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '9999px' }}>
                      {loc.categoryName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: '#b3b3b3', flexWrap: 'wrap' }}>
                    <span>👤 <strong>제출 학생:</strong> <span style={{ color: '#1ed760', fontWeight: 700 }}>{selectedSubmission.student_name}</span></span>
                    <span>📍 <strong>대륙:</strong> {loc.continent}</span>
                    <span>🕒 <strong>제출 시각:</strong> {selectedSubmission.created_at ? new Date(selectedSubmission.created_at).toLocaleString('ko-KR') : '-'}</span>
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
