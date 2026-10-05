import React, { useState } from 'react';
import { X, ZoomIn, Info } from 'lucide-react';

interface MoonPhaseRendererProps {
  phase: number; // 0 to 1
  fraction: number; // 0 to 1
  waxing: boolean;
  size?: number;
  className?: string;
  rotationDeg?: number;
  interactiveModal?: boolean;
}

/**
 * Photorealistic Real-Time Lunar Face Renderer
 * Mathematically projects accurate Moon face morphology:
 * - Major Lunar Maria: Oceanus Procellarum, Mare Imbrium, Serenitatis, Tranquillitatis, Crisium, Fecunditatis, Nubium, Nectaris
 * - Prominent Craters: Tycho (with extensive ray system), Copernicus, Kepler, Aristarchus, Plato
 * - Dynamic Real-Time Phase Terminator Masking with 3D limb darkening and authentic Earthshine
 */
export const MoonPhaseRenderer: React.FC<MoonPhaseRendererProps> = ({
  phase,
  fraction,
  waxing,
  size = 48,
  className = '',
  rotationDeg = 0,
  interactiveModal = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  // Compute terminator ellipse radius x:
  // At new moon (fraction=0), rx = r, both dark
  // At quarter (fraction=0.5), rx = 0 (straight line)
  // At full (fraction=1.0), rx = r, all illuminated
  const rx = Math.abs(r * (2 * fraction - 1));
  const isGibbous = fraction > 0.5;

  let illuminatedPath = '';
  if (fraction < 0.01) {
    illuminatedPath = '';
  } else if (fraction > 0.99) {
    illuminatedPath = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  } else {
    if (waxing) {
      if (isGibbous) {
        illuminatedPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z`;
      } else {
        illuminatedPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 0 ${cx} ${cy - r} Z`;
      }
    } else {
      if (isGibbous) {
        illuminatedPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 0 ${cx} ${cy - r} Z`;
      } else {
        illuminatedPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 1 ${cx} ${cy - r} Z`;
      }
    }
  }

  const uniqueId = `moon-face-${size}-${Math.round(phase * 1000)}`;

  // Reusable SVG Lunar Face Graphic content
  const renderLunarFaceContent = (currentSize: number, isHighRes: boolean) => {
    const curR = currentSize / 2 - 2;
    const curCx = currentSize / 2;
    const curCy = currentSize / 2;
    const scale = curR / 100; // Normalized to 100 unit radius

    return (
      <g>
        {/* Base Lunar Highlands Crust */}
        <circle cx={curCx} cy={curCy} r={curR} fill={isHighRes ? '#e2e8f0' : '#cbd5e1'} />

        {/* 3D Spherical Limb Shadow Gradient */}
        <circle cx={curCx} cy={curCy} r={curR} fill={`url(#${uniqueId}-spherical-shade)`} />

        {/* --- LUNAR MARIA (Dark Basaltic Volcanic Plains) --- */}
        {/* 1. Oceanus Procellarum (Ocean of Storms - Large Western expanse) */}
        <path
          d={`M ${curCx - 20 * scale} ${curCy - 55 * scale} 
              C ${curCx - 55 * scale} ${curCy - 45 * scale}, ${curCx - 75 * scale} ${curCy - 10 * scale}, ${curCx - 65 * scale} ${curCy + 25 * scale} 
              C ${curCx - 55 * scale} ${curCy + 48 * scale}, ${curCx - 30 * scale} ${curCy + 45 * scale}, ${curCx - 22 * scale} ${curCy + 20 * scale} 
              C ${curCx - 15 * scale} ${curCy - 5 * scale}, ${curCx - 10 * scale} ${curCy - 35 * scale}, ${curCx - 20 * scale} ${curCy - 55 * scale} Z`}
          fill="#475569"
          opacity="0.85"
        />

        {/* 2. Mare Imbrium (Sea of Rains - circular dark sea) */}
        <path
          d={`M ${curCx - 12 * scale} ${curCy - 55 * scale} 
              C ${curCx - 42 * scale} ${curCy - 52 * scale}, ${curCx - 48 * scale} ${curCy - 20 * scale}, ${curCx - 22 * scale} ${curCy - 15 * scale} 
              C ${curCx + 5 * scale} ${curCy - 12 * scale}, ${curCx + 12 * scale} ${curCy - 42 * scale}, ${curCx - 12 * scale} ${curCy - 55 * scale} Z`}
          fill="#334155"
          opacity="0.9"
        />

        {/* 3. Mare Serenitatis (Sea of Serenity) */}
        <circle cx={curCx + 20 * scale} cy={curCy - 26 * scale} r={17 * scale} fill="#334155" opacity="0.88" />

        {/* 4. Mare Tranquillitatis (Sea of Tranquility - Apollo 11) */}
        <path
          d={`M ${curCx + 18 * scale} ${curCy - 12 * scale} 
              C ${curCx + 42 * scale} ${curCy - 18 * scale}, ${curCx + 48 * scale} ${curCy + 8 * scale}, ${curCx + 30 * scale} ${curCy + 15 * scale} 
              C ${curCx + 16 * scale} ${curCy + 10 * scale}, ${curCx + 10 * scale} ${curCy - 2 * scale}, ${curCx + 18 * scale} ${curCy - 12 * scale} Z`}
          fill="#334155"
          opacity="0.9"
        />

        {/* 5. Mare Crisium (Sea of Crises - isolated eastern oval) */}
        <ellipse cx={curCx + 58 * scale} cy={curCy - 18 * scale} rx={12 * scale} ry={9 * scale} fill="#1e293b" opacity="0.92" />

        {/* 6. Mare Fecunditatis (Sea of Fertility) */}
        <ellipse cx={curCx + 46 * scale} cy={curCy + 18 * scale} rx={16 * scale} ry={14 * scale} fill="#334155" opacity="0.85" />

        {/* 7. Mare Nectaris (Sea of Nectar) */}
        <circle cx={curCx + 30 * scale} cy={curCy + 28 * scale} r={9 * scale} fill="#334155" opacity="0.88" />

        {/* 8. Mare Nubium (Sea of Clouds) */}
        <ellipse cx={curCx - 16 * scale} cy={curCy + 32 * scale} rx={18 * scale} ry={15 * scale} fill="#475569" opacity="0.85" />

        {/* 9. Mare Humorum (Sea of Moisture) */}
        <circle cx={curCx - 44 * scale} cy={curCy + 35 * scale} r={10 * scale} fill="#334155" opacity="0.88" />

        {/* 10. Sinus Iridum (Bay of Rainbows) */}
        <circle cx={curCx - 28 * scale} cy={curCy - 48 * scale} r={6 * scale} fill="#1e293b" opacity="0.9" />

        {/* --- FAMOUS CRATERS & TYCHO RAY SYSTEM --- */}
        {/* Tycho Ray System (shooting across southern & eastern hemisphere) */}
        <g opacity={isHighRes ? 0.45 : 0.35}>
          <line x1={curCx - 10 * scale} y1={curCy + 55 * scale} x2={curCx - 60 * scale} y2={curCy + 10 * scale} stroke="#ffffff" strokeWidth={1 * scale} />
          <line x1={curCx - 10 * scale} y1={curCy + 55 * scale} x2={curCx + 50 * scale} y2={curCy - 10 * scale} stroke="#ffffff" strokeWidth={1.2 * scale} />
          <line x1={curCx - 10 * scale} y1={curCy + 55 * scale} x2={curCx + 30 * scale} y2={curCy - 60 * scale} stroke="#ffffff" strokeWidth={1 * scale} />
          <line x1={curCx - 10 * scale} y1={curCy + 55 * scale} x2={curCx - 30 * scale} y2={curCy - 30 * scale} stroke="#ffffff" strokeWidth={0.8 * scale} />
          <line x1={curCx - 10 * scale} y1={curCy + 55 * scale} x2={curCx - 50 * scale} y2={curCy + 40 * scale} stroke="#ffffff" strokeWidth={1.1 * scale} />
          <line x1={curCx - 10 * scale} y1={curCy + 55 * scale} x2={curCx + 60 * scale} y2={curCy + 45 * scale} stroke="#ffffff" strokeWidth={0.9 * scale} />
        </g>

        {/* Tycho Crater */}
        <circle cx={curCx - 10 * scale} cy={curCy + 55 * scale} r={4.5 * scale} fill="#ffffff" stroke="#94a3b8" strokeWidth={0.8 * scale} />
        <circle cx={curCx - 10 * scale} cy={curCy + 55 * scale} r={2 * scale} fill="#334155" />

        {/* Copernicus Crater */}
        <circle cx={curCx - 20 * scale} cy={curCy - 8 * scale} r={6 * scale} fill="none" stroke="#ffffff" strokeWidth={1 * scale} opacity="0.8" />
        <circle cx={curCx - 20 * scale} cy={curCy - 8 * scale} r={2.8 * scale} fill="#1e293b" />

        {/* Kepler Crater */}
        <circle cx={curCx - 40 * scale} cy={curCy - 6 * scale} r={3 * scale} fill="#ffffff" opacity="0.9" />

        {/* Aristarchus (Brightest spot on the Moon) */}
        <circle cx={curCx - 48 * scale} cy={curCy - 28 * scale} r={2.5 * scale} fill="#ffffff" stroke="#f8fafc" strokeWidth={1 * scale} />

        {/* Plato Crater (Dark floor) */}
        <circle cx={curCx - 8 * scale} cy={curCy - 58 * scale} r={3.5 * scale} fill="#0f172a" stroke="#cbd5e1" strokeWidth={0.6 * scale} />
      </g>
    );
  };

  return (
    <>
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${interactiveModal ? 'cursor-pointer group' : ''} ${className}`}
        style={{ width: size, height: size }}
        onClick={() => interactiveModal && setIsModalOpen(true)}
        title={interactiveModal ? 'Click to inspect real-time Moon face details' : undefined}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          style={{ transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined }}
        >
          <defs>
            {/* 3D Spherical Limb Darkening */}
            <radialGradient id={`${uniqueId}-spherical-shade`} cx="42%" cy="40%" r="58%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="70%" stopColor="#000000" stopOpacity="0.05" />
              <stop offset="95%" stopColor="#000000" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
            </radialGradient>

            {/* Earthshine Dark Body Gradient */}
            <radialGradient id={`${uniqueId}-earthshine`} cx="38%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.92" />
              <stop offset="65%" stopColor="#0f172a" stopOpacity="0.96" />
              <stop offset="100%" stopColor="#070a12" stopOpacity="0.99" />
            </radialGradient>

            {/* Clip path for real-time sunlit phase terminator */}
            <clipPath id={`${uniqueId}-illuminated-clip`}>
              {illuminatedPath ? (
                <path d={illuminatedPath} />
              ) : (
                <circle cx={cx} cy={cy} r="0" />
              )}
            </clipPath>
          </defs>

          {/* Ambient outer halo if sunlit */}
          {fraction > 0.05 && (
            <circle
              cx={cx}
              cy={cy}
              r={r + 2.5}
              fill="none"
              stroke="rgba(226, 232, 240, 0.2)"
              strokeWidth="1.2"
              className="filter blur-[1px]"
            />
          )}

          {/* 1. DARK SIDE IN REALISTIC EARTHSHINE WITH FAINT LUNAR FACE VISIBLE */}
          <g>
            {renderLunarFaceContent(size, false)}
            {/* Dark Earthshine Scrim */}
            <circle cx={cx} cy={cy} r={r} fill={`url(#${uniqueId}-earthshine)`} />
          </g>

          {/* 2. REAL-TIME ILLUMINATED SUNLIT MOON FACE */}
          {illuminatedPath && (
            <g clipPath={`url(#${uniqueId}-illuminated-clip)`}>
              {renderLunarFaceContent(size, true)}
            </g>
          )}

          {/* Outer disk rim boundary */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="0.75" />
        </svg>

        {interactiveModal && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-[1px] transition-opacity">
            <ZoomIn className="w-3.5 h-3.5 text-white drop-shadow" />
          </div>
        )}
      </div>

      {/* REAL-TIME HIGH RESOLUTION MOON FACE INSPECTOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative text-xs font-mono max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-semibold font-sans text-slate-100 flex items-center gap-2">
                  <span>Real-Time Moon Face</span>
                  <span className="text-xs font-mono text-amber-400">
                    {(fraction * 100).toFixed(1)}% Illuminated
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Orthographic Lunar Disk with Real-Time Phase Terminator & Geological Features
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Resolution Moon Face Canvas */}
            <div className="relative flex flex-col items-center justify-center py-4 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-4 overflow-hidden">
              <div className="relative" style={{ width: 220, height: 220 }}>
                <svg
                  width={220}
                  height={220}
                  viewBox="0 0 220 220"
                  className="overflow-visible select-none drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  <defs>
                    <radialGradient id="modal-spherical-shade" cx="42%" cy="40%" r="58%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                      <stop offset="70%" stopColor="#000000" stopOpacity="0.05" />
                      <stop offset="95%" stopColor="#000000" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
                    </radialGradient>
                    <radialGradient id="modal-earthshine" cx="38%" cy="38%" r="62%">
                      <stop offset="0%" stopColor="#1e293b" stopOpacity="0.94" />
                      <stop offset="65%" stopColor="#0f172a" stopOpacity="0.97" />
                      <stop offset="100%" stopColor="#070a12" stopOpacity="0.99" />
                    </radialGradient>
                    <clipPath id="modal-illuminated-clip">
                      {(() => {
                        const modalR = 108;
                        const modalCx = 110;
                        const modalCy = 110;
                        const modalRx = Math.abs(modalR * (2 * fraction - 1));
                        const modalIsGibbous = fraction > 0.5;
                        if (fraction < 0.01) return <circle cx={modalCx} cy={modalCy} r="0" />;
                        if (fraction > 0.99) return <circle cx={modalCx} cy={modalCy} r={modalR} />;
                        if (waxing) {
                          if (modalIsGibbous) {
                            return <path d={`M ${modalCx} ${modalCy - modalR} A ${modalR} ${modalR} 0 0 1 ${modalCx} ${modalCy + modalR} A ${modalRx} ${modalR} 0 0 1 ${modalCx} ${modalCy - modalR} Z`} />;
                          } else {
                            return <path d={`M ${modalCx} ${modalCy - modalR} A ${modalR} ${modalR} 0 0 1 ${modalCx} ${modalCy + modalR} A ${modalRx} ${modalR} 0 0 0 ${modalCx} ${modalCy - modalR} Z`} />;
                          }
                        } else {
                          if (modalIsGibbous) {
                            return <path d={`M ${modalCx} ${modalCy - modalR} A ${modalR} ${modalR} 0 0 0 ${modalCx} ${modalCy + modalR} A ${modalRx} ${modalR} 0 0 0 ${modalCx} ${modalCy - modalR} Z`} />;
                          } else {
                            return <path d={`M ${modalCx} ${modalCy - modalR} A ${modalR} ${modalR} 0 0 0 ${modalCx} ${modalCy + modalR} A ${modalRx} ${modalR} 0 0 1 ${modalCx} ${modalCy - modalR} Z`} />;
                          }
                        }
                      })()}
                    </clipPath>
                  </defs>

                  {/* Earthshine base */}
                  <g>
                    {renderLunarFaceContent(220, false)}
                    <circle cx="110" cy="110" r="108" fill="url(#modal-earthshine)" />
                  </g>

                  {/* Sunlit side */}
                  <g clipPath="url(#modal-illuminated-clip)">
                    {renderLunarFaceContent(220, true)}
                  </g>

                  <circle cx="110" cy="110" r="108" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                </svg>
              </div>

              {/* Surface Feature Annotations */}
              <div className="mt-3 text-[10px] text-slate-400 flex flex-wrap justify-center gap-x-4 gap-y-1">
                <span>· Oceanus Procellarum</span>
                <span>· Mare Imbrium</span>
                <span>· Mare Serenitatis</span>
                <span>· Mare Tranquillitatis</span>
                <span>· Tycho Ray Crater</span>
                <span>· Copernicus</span>
              </div>
            </div>

            {/* Quick Lunar Face Facts */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Phase Status</span>
                <span className="text-slate-100 font-semibold">{waxing ? 'Waxing' : 'Waning'} (Day {(phase * 29.53).toFixed(1)} / 29.5)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Illumination Fraction</span>
                <span className="text-amber-300 font-semibold tabular-nums">{(fraction * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
