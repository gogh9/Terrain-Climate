import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';
import worldDataRaw from '../data/worldData.json';
import { sound } from '../utils/audio';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Layers } from 'lucide-react';
import { getCountryByFeature, searchCountries } from '../data/countryData';

export default function WorldMapSVG({
  locations = [],
  completedIds = [],
  onSelectLocation,
  continentFilter = 'ALL'
}) {
  const containerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover states
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Country selection state
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Safe TopoJSON Features extraction
  const countries = useMemo(() => {
    try {
      const data = (worldDataRaw && worldDataRaw.default) ? worldDataRaw.default : worldDataRaw;
      if (data && data.objects && data.objects.countries) {
        return topojson.feature(data, data.objects.countries).features;
      }
      return [];
    } catch (e) {
      console.error('TopoJSON load error:', e);
      return [];
    }
  }, []);

  // Equal Earth Projection (대륙 면적 왜곡이 적은 이퀄 어스 도법)
  // 1920 x 939 해상도의 Equal Earth Physical Map과 1:1 완벽 정합
  const projection = useMemo(() => {
    try {
      return d3Geo.geoEqualEarth()
        .scale(352.6)
        .translate([960, 470]);
    } catch (e) {
      return d3Geo.geoEqualEarth().scale(352.6).translate([960, 470]);
    }
  }, []);

  const pathGenerator = useMemo(() => {
    return d3Geo.geoPath().projection(projection);
  }, [projection]);

  // Graticule grid lines (위도/경도선)
  const graticules = useMemo(() => {
    try {
      const graticuleGen = d3Geo.geoGraticule10();
      return pathGenerator(graticuleGen);
    } catch (e) {
      return '';
    }
  }, [pathGenerator]);

  // Hovered Country Data lookup
  const hoveredCountryData = useMemo(() => {
    if (!hoveredFeature) return null;
    return getCountryByFeature(hoveredFeature);
  }, [hoveredFeature]);

  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // Handle Dragging / Pan
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    isDraggingRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setDragStart({ x: e.clientX - panOffsetRef.current.x, y: e.clientY - panOffsetRef.current.y });
  };

  const handleMouseMove = (e) => {
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (e.buttons === 1) {
      if (dist > 4) {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          setIsDragging(true);
        }
        setPanOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleSelectLocation = (e, loc) => {
    if (e) {
      e.stopPropagation();
    }
    sound.playClick();
    if (onSelectLocation) {
      onSelectLocation(loc);
    }
  };

  // Zoom Controls
  const handleZoom = (factor) => {
    sound.playClick();
    setZoomLevel(prev => Math.min(Math.max(prev * factor, 0.8), 4));
  };

  const handleResetView = (e) => {
    if (e) {
      e.stopPropagation();
    }
    sound.playClick();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedCountry(null);
  };

  // Reset zoom on continent change
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [continentFilter]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0d1117',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      {/* SVG Canvas Map */}
      <svg
        viewBox="0 0 1920 939"
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        <defs>
          {/* Glow Filter for Pins */}
          <filter id="pin-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Location Flag Gradients */}
          <linearGradient id="red-flag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="green-flag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Map Frame Clip for Seamless Rounded Border Fitting */}
          <clipPath id="map-frame-clip">
            <rect
              x="6"
              y="6"
              width="1908"
              height="927"
              rx="24"
              ry="24"
            />
          </clipPath>
        </defs>

        {/* Clipped Map Content (Equal Earth Topographic Map & Vectors) */}
        <g clipPath="url(#map-frame-clip)">
          {/* 1. Open-Source Equal Earth Physical Topographic Map (오픈소스 지형도) */}
          <image
            href="/equal_earth_physical.jpg"
            x="0"
            y="0"
            width="1920"
            height="939"
            preserveAspectRatio="none"
          />

          {/* 2. Latitude & Longitude Graticule Lines (은은한 경위도망) */}
          {graticules && (
            <path
              d={graticules}
              fill="none"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
              strokeDasharray="4,4"
              pointerEvents="none"
            />
          )}

          {/* 3. Country Polygons (국가 경계선 및 호버 하이라이트 - 지형을 가리지 않도록 투명 처리) */}
          <g>
            {countries.map((feature, i) => {
              const countryPath = pathGenerator(feature);
              if (!countryPath) return null;

              const countryData = getCountryByFeature(feature);
              const isHovered = hoveredFeature?.id === feature.id || (hoveredFeature && hoveredFeature.properties?.name === feature.properties?.name);
              const isSelected = selectedCountry && countryData && (selectedCountry.code === countryData.code || selectedCountry.id === countryData.id);

              let fillColor = 'transparent';
              let strokeColor = 'rgba(255, 255, 255, 0.22)';
              let strokeWidth = '0.7';

              if (isSelected) {
                fillColor = 'rgba(52, 211, 153, 0.3)';
                strokeColor = '#10b981';
                strokeWidth = '2';
              } else if (isHovered) {
                fillColor = 'rgba(56, 189, 248, 0.25)';
                strokeColor = '#38bdf8';
                strokeWidth = '1.6';
              }

              return (
                <path
                  key={feature.id || i}
                  d={countryPath}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{
                    transition: 'fill 0.15s ease, stroke 0.15s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredFeature(feature)}
                  onMouseLeave={() => setHoveredFeature(null)}
                />
              );
            })}
          </g>
        </g>

        {/* Outer Elegant Border Frame */}
        <rect
          x="6"
          y="6"
          width="1908"
          height="927"
          rx="24"
          ry="24"
          fill="none"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="2.5"
          pointerEvents="none"
        />

        {/* 4. Location Interactive Pretty Flag Pin Markers (14개 교과서 지점) */}
        {locations.map(loc => {
          const coords = projection([loc.lng, loc.lat]);
          if (!coords) return null;
          const [cx, cy] = coords;

          const isCompleted = completedIds.includes(loc.id);
          const isHovered = hoveredLocation?.id === loc.id;
          // 1920 viewBox 기준 최적 가독성 배율 (기본 1.85, 호버 2.4)
          const scaleVal = isHovered ? 2.4 : 1.85;

          return (
            <g
              key={loc.id}
              transform={`translate(${cx}, ${cy}) scale(${scaleVal})`}
              onClick={(e) => handleSelectLocation(e, loc)}
              onMouseEnter={() => setHoveredLocation(loc)}
              onMouseLeave={() => setHoveredLocation(null)}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Invisible Hit Area (클릭 판정 보장) */}
              <rect
                x="-24"
                y="-32"
                width="48"
                height="48"
                fill="rgba(0,0,0,0.001)"
                style={{ cursor: 'pointer' }}
              />

              {/* Outer Pulse Glow at Flag Base */}
              <circle
                r={isHovered ? 14 : 9}
                fill={isCompleted ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.4)'}
                style={{ transition: 'all 0.2s ease' }}
              />

              {/* Base Pin Circle */}
              <circle
                r="4.5"
                fill={isCompleted ? '#10b981' : '#ef4444'}
                stroke="#ffffff"
                strokeWidth="1.5"
                filter="url(#pin-glow)"
              />

              {/* Flag Pole */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-22"
                stroke={isCompleted ? '#065f46' : '#1e293b'}
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Pole Top Golden Knob */}
              <circle
                cx="0"
                cy="-23"
                r="2.5"
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth="0.8"
              />

              {/* Waving Flag Banner */}
              <path
                d="M 0 -22 Q 9 -26 18 -22 Q 9 -17 0 -13 Z"
                fill={isCompleted ? 'url(#green-flag-grad)' : 'url(#red-flag-grad)'}
                stroke={isCompleted ? '#065f46' : '#991b1b'}
                strokeWidth="1"
                filter="url(#pin-glow)"
              />

              {/* Flag Inner Icon / Label */}
              {isCompleted ? (
                <text x="7" y="-15" fill="white" fontSize="8" fontWeight="900" textAnchor="middle">
                  ✓
                </text>
              ) : (
                <circle cx="8" cy="-17.5" r="1.5" fill="#ffffff" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip: Location Pin Tooltip OR Country Tooltip */}
      {hoveredLocation ? (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y - 15}px`,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #10b981',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
            zIndex: 1200,
            fontFamily: 'Noto Sans KR, sans-serif'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700 }}>
            [{hoveredLocation.categoryName}] {hoveredLocation.pageRef}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>
            {hoveredLocation.name}
          </div>
        </div>
      ) : (hoveredCountryData && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y - 15}px`,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.7)',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '9999px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 1200,
            fontFamily: 'Noto Sans KR, sans-serif',
            fontSize: '0.9rem',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
        >
          {hoveredCountryData.nameKo}
        </div>
      ))}

      {/* Map Information & Legend Overlay (하단 좌측 정보 배지) */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 1000,
          padding: '10px 16px',
          borderRadius: '14px',
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '15px' }}>🏔️</span> 지형 지점
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '15px' }}>☀️</span> 기후 지점
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: '#10b981' }}></span> 완료 지점
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.18)', paddingLeft: '12px', color: '#94a3b8', fontSize: '0.75rem' }}>
          🌍 이퀄 어스 지형도 (대륙 면적 왜곡 최소화)
        </div>
      </div>

      {/* Map Control Floating Toolbar (확대/축소 및 초기화) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '6px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '9999px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          zIndex: 1000
        }}
      >
        <button
          className="btn btn-secondary"
          onClick={(e) => { e.stopPropagation(); handleZoom(1.25); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          title="확대"
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="btn btn-secondary"
          onClick={(e) => { e.stopPropagation(); handleZoom(0.8); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          title="축소"
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="btn btn-secondary"
          onClick={(e) => { e.stopPropagation(); handleResetView(e); }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          title="시점 초기화"
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
