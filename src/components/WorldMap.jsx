import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { sound } from '../utils/audio';

const CONTINENT_BOUNDS = {
  'ALL': [[-60, -180], [80, 180]],
  '아시아': [[0, 50], [60, 150]],
  '유럽': [[35, -15], [70, 45]],
  '아프리카': [[-35, -20], [38, 55]],
  '북아메리카': [[15, -168], [75, -50]],
  '남아메리카': [[-55, -82], [13, -34]],
  '오세아니아': [[-45, 110], [-10, 180]],
  '극지방': [[60, -180], [85, 180]]
};

export default function WorldMap({
  locations,
  completedIds,
  onSelectLocation,
  continentFilter
}) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize Leaflet Map
    if (!mapRef.current) {
      const map = L.map('leaflet-world-map', {
        center: [20, 10],
        zoom: 2.3,
        minZoom: 2,
        maxZoom: 9,
        zoomControl: false,
        worldCopyJump: true
      });

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add CartoDB Positron (clean white map) open-source tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      mapRef.current = map;
    }
  }, []);

  // Update Continent View
  useEffect(() => {
    if (mapRef.current && continentFilter && CONTINENT_BOUNDS[continentFilter]) {
      const bounds = CONTINENT_BOUNDS[continentFilter];
      mapRef.current.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
    }
  }, [continentFilter]);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    locations.forEach(loc => {
      const isCompleted = completedIds.includes(loc.id);
      const iconEmoji = loc.category === 'landform' ? '🏔️' : '☀️';

      const customHtml = `
        <div class="custom-pin ${isCompleted ? 'completed' : ''}">
          <span>${iconEmoji}</span>
          ${isCompleted ? '<span class="badge-check">✓</span>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: 'custom-pin-wrapper',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(mapRef.current);

      // Hover Tooltip
      const statusBadge = isCompleted 
        ? `<span style="background:#10b981;color:white;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">학습 완료 ✓</span>`
        : `<span style="background:#0284c7;color:white;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">탐색 및 질문</span>`;

      const tooltipContent = `
        <div style="font-family:'Noto Sans KR', sans-serif; padding: 4px; min-width: 140px; text-align: center;">
          <div style="font-size:10px; color:#94a3b8; margin-bottom:2px;">[${loc.categoryName}] ${loc.pageRef}</div>
          <div style="font-weight:bold; font-size:13px; color:#0f172a; margin-bottom:4px;">${loc.name}</div>
          <div>${statusBadge}</div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -20],
        opacity: 0.95
      });

      marker.on('click', () => {
        sound.playClick();
        onSelectLocation(loc);
      });

      markersRef.current.push(marker);
    });

  }, [locations, completedIds, onSelectLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="leaflet-world-map" style={{ width: '100%', height: '100%' }} />

      {/* Map Legend Overlay */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          zIndex: 1000,
          padding: '10px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#e2e8f0',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px' }}>🏔️</span> 지형 지점
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px' }}>☀️</span> 기후 지점
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span> 완료된 지점
        </div>
      </div>
    </div>
  );
}
