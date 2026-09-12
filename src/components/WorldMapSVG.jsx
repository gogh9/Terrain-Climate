import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';
import worldDataRaw from '../data/worldData.json';
import { sound } from '../utils/audio';
import { ZoomIn, ZoomOut, RotateCcw, Search, Globe, X } from 'lucide-react';
import { getCountryByFeature, searchCountries, COUNTRY_LIST } from '../data/countryData';

const CONTINENT_VIEWS = {
  'ALL': { center: [0, 10], scale: 165 },
  '아시아': { center: [90, 30], scale: 320 },
  '유럽': { center: [15, 52], scale: 500 },
  '아프리카': { center: [20, 0], scale: 300 },
  '북아메리카': { center: [-100, 45], scale: 280 },
  '남아메리카': { center: [-60, -25], scale: 290 },
  '오세아니아': { center: [135, -25], scale: 340 },
  '극지방': { center: [0, 80], scale: 250 }
};

const COUNTRY_TO_LOCATION_MAP = {
  'MN': 'landform_mongolia',
  'NP': 'climate_everest',
  'CN': 'climate_taklamakan',
  'KR': 'landform_mongolia',
  'JP': 'landform_mongolia',
  'KP': 'landform_mongolia',
  'IN': 'climate_everest',
  'FR': 'landform_montblanc',
  'CH': 'landform_montblanc',
  'IT': 'landform_montblanc',
  'DE': 'landform_montblanc',
  'GB': 'landform_montblanc',
  'NO': 'climate_tundra',
  'SE': 'climate_tundra',
  'FI': 'climate_tundra',
  'US': 'landform_colorado',
  'CA': 'landform_colorado',
  'MX': 'landform_cancun',
  'AR': 'landform_perito',
  'CL': 'climate_atacama',
  'BR': 'climate_amazon',
  'EC': 'climate_galapagos',
  'PE': 'climate_amazon',
  'CO': 'climate_amazon',
  'KE': 'climate_savanna',
  'TZ': 'climate_savanna',
  'DZ': 'landform_sahara',
  'EG': 'landform_sahara',
  'LY': 'landform_sahara',
  'MA': 'landform_sahara',
  'SD': 'landform_sahara',
  'TD': 'landform_sahara',
  'NE': 'landform_sahara',
  'ML': 'landform_sahara',
  'ZA': 'climate_savanna',
  'AU': 'landform_outback',
  'NZ': 'landform_outback',
  'AQ': 'climate_antarctica'
};

function findBestLocationForCountry(countryData, locations) {
  if (!countryData || !locations || locations.length === 0) return locations[0];
  const locId = COUNTRY_TO_LOCATION_MAP[countryData.code];
  if (locId) {
    const found = locations.find(l => l.id === locId);
    if (found) return found;
  }
  const nameMatch = locations.find(loc => {
    if (loc.name.includes(countryData.nameKo)) return true;
    if (countryData.aliases && countryData.aliases.some(alias => loc.name.includes(alias))) return true;
    return false;
  });
  if (nameMatch) return nameMatch;
  return locations[0];
}

export default function WorldMapSVG({
  locations = [],
  completedIds = [],
  onSelectLocation,
  continentFilter = 'ALL'
}) {
  const containerRef = useRef(null);
  const [mapTheme, setMapTheme] = useState('white'); // 'white' | 'coral'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover states
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Country search state
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  // View configuration
  const viewConfig = CONTINENT_VIEWS[continentFilter] || CONTINENT_VIEWS['ALL'];
  
  const projection = useMemo(() => {
    try {
      return d3Geo.geoEqualEarth()
        .scale(viewConfig.scale)
        .center(viewConfig.center)
        .translate([480, 260]);
    } catch (e) {
      return d3Geo.geoEquirectangular().scale(150).translate([480, 260]);
    }
  }, [viewConfig]);

  const pathGenerator = useMemo(() => {
    return d3Geo.geoPath().projection(projection);
  }, [projection]);

  // Graticule grid lines
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

  // Country search results
  const searchResults = useMemo(() => {
    if (!countrySearch.trim()) return [];
    return searchCountries(countrySearch).slice(0, 8);
  }, [countrySearch]);

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

  const handleResetView = () => {
    sound.playClick();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedCountry(null);
    setCountrySearch('');
  };

  // Reset zoom on continent change
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [continentFilter]);

  // Theme Styles
  const isWhite = mapTheme === 'white';
  const landFill = isWhite ? '#ffffff' : '#ff5c5c';
  const landStroke = isWhite ? '#334155' : '#d32f2f';
  const landHover = isWhite ? '#38bdf8' : '#e879f9';
  const landSelect = '#f59e0b';

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
        background: '#121212',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      {/* SVG Canvas Map */}
      <svg
        viewBox="0 0 960 520"
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        <defs>
          {/* Radial Ocean Gradient (Spotify Near Black Theme) */}
          <radialGradient id="ocean-gradient" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#121212" />
          </radialGradient>

          {/* Glow Filter for Pins */}
          <filter id="pin-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Spotify Green Flag Gradients */}
          <linearGradient id="red-flag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3727f" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="green-flag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1ed760" />
            <stop offset="100%" stopColor="#1db954" />
          </linearGradient>
        </defs>

        {/* Ocean Background Rounded Rectangle */}
        <rect
          x="15"
          y="15"
          width="930"
          height="490"
          rx="40"
          ry="40"
          fill="url(#ocean-gradient)"
          stroke="#282828"
          strokeWidth="2"
        />

        {/* Latitude & Longitude Graticule Lines */}
        {graticules && (
          <path
            d={graticules}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="0.8"
            strokeDasharray="3,3"
          />
        )}

        {/* Country Polygons */}
        <g>
          {countries.map((feature, i) => {
            const countryPath = pathGenerator(feature);
            if (!countryPath) return null;

            const countryData = getCountryByFeature(feature);
            const isHovered = hoveredFeature?.id === feature.id || (hoveredFeature && hoveredFeature.properties?.name === feature.properties?.name);
            const isSelected = selectedCountry && countryData && (selectedCountry.code === countryData.code || selectedCountry.id === countryData.id);

            let fillColor = '#242424';
            if (isSelected) fillColor = '#1ed760';
            else if (isHovered) fillColor = '#333333';

            return (
              <path
                key={feature.id || i}
                d={countryPath}
                fill={fillColor}
                stroke={isHovered ? '#1ed760' : '#181818'}
                strokeWidth={isHovered ? "1.6" : "0.7"}
                style={{
                  transition: 'fill 0.15s ease, stroke 0.15s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredFeature(feature)}
                onMouseLeave={() => setHoveredFeature(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (countryData) {
                    setSelectedCountry(countryData);
                    setCountrySearch(countryData.nameKo);
                  }
                  const matchedLoc = findBestLocationForCountry(countryData, locations);
                  if (matchedLoc) {
                    handleSelectLocation(e, matchedLoc);
                  }
                }}
              />
            );
          })}
        </g>

        {/* Location Pretty Flag Pin Markers */}
        {locations.map(loc => {
          const coords = projection([loc.lng, loc.lat]);
          if (!coords) return null;
          const [cx, cy] = coords;

          const isCompleted = completedIds.includes(loc.id);
          const isHovered = hoveredLocation?.id === loc.id;
          const scaleVal = isHovered ? 1.35 : 1.0;

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
              {/* Invisible Hit Area (Ensures 100% click detection) */}
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
                fill={isCompleted ? 'rgba(30, 215, 96, 0.4)' : 'rgba(239, 68, 68, 0.35)'}
                style={{ transition: 'all 0.2s ease' }}
              />

              {/* Base Pin Circle */}
              <circle
                r="4.5"
                fill={isCompleted ? '#1ed760' : '#dc2626'}
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
                stroke={isCompleted ? '#14833b' : '#1e293b'}
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
                stroke={isCompleted ? '#14833b' : '#991b1b'}
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
            background: '#181818',
            border: '1px solid #1ed760',
            color: 'white',
            padding: '8px 14px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 1200,
            fontFamily: 'Noto Sans KR, sans-serif'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#1ed760', fontWeight: 700 }}>
            [{hoveredLocation.categoryName}] {hoveredLocation.pageRef}
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'white', marginTop: '2px' }}>
            {hoveredLocation.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b3b3b3', marginTop: '3px' }}>
            클릭하여 지형/기후 확인 📝
          </div>
        </div>
      ) : (hoveredCountryData && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipPos.x + 15}px`,
            top: `${tooltipPos.y - 15}px`,
            background: '#181818',
            border: '1px solid #1ed760',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '9999px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
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

      {/* Map Control Floating Toolbar (Theme Switch & Zoom & Reset) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '6px',
          background: '#181818',
          border: '1px solid #282828',
          borderRadius: '9999px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          zIndex: 1000
        }}
      >
        <button
          className="btn btn-secondary"
          onClick={() => handleZoom(1.25)}
          title="확대"
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleZoom(0.8)}
          title="축소"
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleResetView}
          title="초기화"
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%' }}
        >
          <RotateCcw size={18} />
        </button>
      </div>

    </div>
  );
}

