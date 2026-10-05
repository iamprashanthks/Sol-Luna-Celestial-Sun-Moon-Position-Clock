import React, { useMemo } from 'react';
import { CelestialCoordinates, SunTimes, MoonTimes, MoonPhaseInfo, calculateSun, calculateMoon } from '../utils/astronomy';
import { MoonPhaseRenderer } from './MoonPhaseRenderer';

interface SkyDomeViewProps {
  currentTime: Date;
  lat: number;
  lon: number;
  sunPos: CelestialCoordinates;
  moonPos: CelestialCoordinates;
  sunTimes: SunTimes;
  moonTimes: MoonTimes;
  moonPhase: MoonPhaseInfo;
  onTimeChange?: (time: Date) => void;
}

export const SkyDomeView: React.FC<SkyDomeViewProps> = ({
  currentTime,
  lat,
  lon,
  sunPos,
  moonPos,
  sunTimes,
  moonTimes,
  moonPhase,
  onTimeChange,
}) => {
  // SVG Canvas dimensions
  const width = 800;
  const height = 460;
  const horizonY = 320; // 0° altitude line
  const zenithY = 60;   // +90° altitude
  const nadirY = 440;   // -90° altitude (underground)
  const paddingX = 60;
  const usableWidth = width - 2 * paddingX;

  // Azimuth mapping:
  // For northern hemisphere: East (90°) -> South (180°) -> West (270°) -> North (360°/0°)
  // We plot 0° to 360° Azimuth along the horizontal axis, centered on the primary diurnal path:
  // For Lat >= 0, midday sun is South (180°). So we center on 180°:
  // X: 0° (North) -> 90° (East) -> 180° (South) -> 270° (West) -> 360° (North)
  const azimuthToX = (az: number): number => {
    // 0° North at left, 360° North at right
    const normAz = ((az % 360) + 360) % 360;
    return paddingX + (normAz / 360) * usableWidth;
  };

  const altToY = (alt: number): number => {
    if (alt >= 0) {
      // 0° to +90° maps to horizonY down to zenithY
      return horizonY - (alt / 90) * (horizonY - zenithY);
    } else {
      // -90° to 0° maps to nadirY up to horizonY
      return horizonY + (Math.abs(alt) / 90) * (nadirY - horizonY);
    }
  };

  // Generate 24-hour diurnal curve points for Sun and Moon for today
  const { sunPathPoints, moonPathPoints } = useMemo(() => {
    const sunPoints: { x: number; y: number; alt: number; az: number; time: Date }[] = [];
    const moonPoints: { x: number; y: number; alt: number; az: number; time: Date }[] = [];

    const baseDate = new Date(currentTime);
    baseDate.setHours(0, 0, 0, 0);

    const stepMins = 12; // 120 points for smooth curve
    for (let m = 0; m <= 24 * 60; m += stepMins) {
      const sampleDate = new Date(baseDate.getTime() + m * 60000);
      const s = calculateSun(sampleDate, lat, lon);
      const mn = calculateMoon(sampleDate, lat, lon);

      sunPoints.push({
        x: azimuthToX(s.azimuth),
        y: altToY(s.apparentAltitude),
        alt: s.apparentAltitude,
        az: s.azimuth,
        time: sampleDate,
      });

      moonPoints.push({
        x: azimuthToX(mn.azimuth),
        y: altToY(mn.apparentAltitude),
        alt: mn.apparentAltitude,
        az: mn.azimuth,
        time: sampleDate,
      });
    }

    return { sunPathPoints: sunPoints, moonPathPoints: moonPoints };
  }, [currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), lat, lon]);

  // Construct SVG path strings (sorted by azimuth to avoid back-and-forth loops if crossing 0/360)
  // Or simple connected line segments
  const sunPathD = useMemo(() => {
    if (sunPathPoints.length < 2) return '';
    // Sort or break when azimuth wraps
    let d = '';
    for (let i = 0; i < sunPathPoints.length; i++) {
      const p = sunPathPoints[i];
      if (i === 0) {
        d += `M ${p.x} ${p.y}`;
      } else {
        const prev = sunPathPoints[i - 1];
        if (Math.abs(p.x - prev.x) > usableWidth / 2) {
          // Wrap around azimuth
          d += ` M ${p.x} ${p.y}`;
        } else {
          d += ` L ${p.x} ${p.y}`;
        }
      }
    }
    return d;
  }, [sunPathPoints, usableWidth]);

  const moonPathD = useMemo(() => {
    if (moonPathPoints.length < 2) return '';
    let d = '';
    for (let i = 0; i < moonPathPoints.length; i++) {
      const p = moonPathPoints[i];
      if (i === 0) {
        d += `M ${p.x} ${p.y}`;
      } else {
        const prev = moonPathPoints[i - 1];
        if (Math.abs(p.x - prev.x) > usableWidth / 2) {
          d += ` M ${p.x} ${p.y}`;
        } else {
          d += ` L ${p.x} ${p.y}`;
        }
      }
    }
    return d;
  }, [moonPathPoints, usableWidth]);

  // Current positions
  const currentSunX = azimuthToX(sunPos.azimuth);
  const currentSunY = altToY(sunPos.apparentAltitude);
  const currentMoonX = azimuthToX(moonPos.azimuth);
  const currentMoonY = altToY(moonPos.apparentAltitude);

  // Dynamic Sky Background based on Sun Altitude
  const skyTheme = useMemo(() => {
    const alt = sunPos.apparentAltitude;
    if (alt > 20) {
      // Full Day
      return {
        top: '#0284c7',
        horizon: '#bae6fd',
        ground: '#0f172a',
        starsOpacity: 0,
      };
    } else if (alt > 0) {
      // Golden Hour Morning / Evening
      const t = alt / 20;
      return {
        top: '#0369a1',
        horizon: '#f59e0b',
        ground: '#090d16',
        starsOpacity: 0.1,
      };
    } else if (alt > -6) {
      // Civil Twilight
      return {
        top: '#1e1b4b',
        horizon: '#ea580c',
        ground: '#070a12',
        starsOpacity: 0.35,
      };
    } else if (alt > -12) {
      // Nautical Twilight
      return {
        top: '#0f172a',
        horizon: '#4338ca',
        ground: '#05070c',
        starsOpacity: 0.7,
      };
    } else {
      // Astronomical Twilight / Deep Night
      return {
        top: '#030712',
        horizon: '#090d16',
        ground: '#020408',
        starsOpacity: 1,
      };
    }
  }, [sunPos.apparentAltitude]);

  // Fixed Star Field for night sky
  const stars = useMemo(() => {
    return Array.from({ length: 45 }, (_, i) => ({
      x: paddingX + Math.sin(i * 37.1) * (usableWidth * 0.48) + usableWidth / 2,
      y: zenithY + (Math.sin(i * 91.7) * 0.5 + 0.5) * (horizonY - zenithY - 30),
      size: (i % 3 === 0 ? 2 : 1.2),
      opacity: 0.3 + (i % 5) * 0.15,
    }));
  }, [usableWidth, horizonY, zenithY, paddingX]);

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="w-full max-w-4xl bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden p-3 sm:p-5 shadow-2xl backdrop-blur-md">
        {/* Sky View Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-800/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-200">
              Sky Dome &amp; Diurnal Trajectory
            </h3>
            <p className="text-xs text-slate-400">
              Observer 360° Hemispheric Horizon from North (0°) through South (180°) to North (360°)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 rounded shrink-0" />
              <span>Sun Arc (Zenith: {sunTimes.solarNoon.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-300">
              <span className="w-3 h-0.5 bg-sky-300 rounded shrink-0" />
              <span>Moon Arc ({moonPhase.phaseName})</span>
            </div>
          </div>
        </div>

        {/* SVG Sky Horizon Canvas */}
        <div className="w-full relative overflow-x-auto touch-pan-x pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[520px] sm:min-w-[650px] select-none"
          >
            <defs>
              {/* Dynamic Sky Gradient */}
              <linearGradient id="sky-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={skyTheme.top} />
                <stop offset={`${(horizonY / height) * 100}%`} stopColor={skyTheme.horizon} />
                <stop offset={`${(horizonY / height) * 100}%`} stopColor={skyTheme.ground} />
                <stop offset="100%" stopColor="#020408" />
              </linearGradient>

              {/* Glowing Filters */}
              <filter id="sun-sky-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Sky & Ground Rect */}
            <rect x="0" y="0" width={width} height={height} fill="url(#sky-gradient)" rx="12" />

            {/* Star Field (visible during twilight & night) */}
            <g opacity={skyTheme.starsOpacity} className="transition-opacity duration-700">
              {stars.map((st, sIdx) => (
                <circle
                  key={`star-${sIdx}`}
                  cx={st.x}
                  cy={st.y}
                  r={st.size}
                  fill="#ffffff"
                  opacity={st.opacity}
                />
              ))}
            </g>

            {/* Twilight Bands beneath Horizon */}
            <rect x={paddingX} y={horizonY} width={usableWidth} height={altToY(-6) - horizonY} fill="rgba(244, 63, 94, 0.08)" />
            <rect x={paddingX} y={altToY(-6)} width={usableWidth} height={altToY(-12) - altToY(-6)} fill="rgba(99, 102, 241, 0.06)" />
            <rect x={paddingX} y={altToY(-12)} width={usableWidth} height={altToY(-18) - altToY(-12)} fill="rgba(56, 189, 248, 0.04)" />

            {/* Altitude Reference Grid Lines */}
            {[+60, +30, 0, -18].map((deg) => {
              const y = altToY(deg);
              const isHorizon = deg === 0;
              return (
                <g key={`alt-grid-${deg}`}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke={isHorizon ? '#f8fafc' : '#334155'}
                    strokeWidth={isHorizon ? 1.5 : 0.75}
                    strokeDasharray={isHorizon ? 'none' : '4 4'}
                    opacity={isHorizon ? 0.9 : 0.4}
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    fill={isHorizon ? '#f8fafc' : '#64748b'}
                    fontSize="10"
                    textAnchor="end"
                    className="font-mono font-medium"
                  >
                    {isHorizon ? 'HORIZON (0°)' : `${deg > 0 ? '+' : ''}${deg}°`}
                  </text>
                </g>
              );
            })}

            {/* Azimuth Cardinal Lines & Labels */}
            {[
              { deg: 0, label: 'NORTH (0°)' },
              { deg: 45, label: 'NE (45°)' },
              { deg: 90, label: 'EAST (90°)' },
              { deg: 135, label: 'SE (135°)' },
              { deg: 180, label: 'SOUTH (180°)' },
              { deg: 225, label: 'SW (225°)' },
              { deg: 270, label: 'WEST (270°)' },
              { deg: 315, label: 'NW (315°)' },
              { deg: 360, label: 'NORTH (360°)' },
            ].map((az) => {
              const x = azimuthToX(az.deg);
              const isMajor = az.deg % 90 === 0;
              return (
                <g key={`az-line-${az.deg}`}>
                  <line
                    x1={x}
                    y1={zenithY}
                    x2={x}
                    y2={nadirY}
                    stroke={isMajor ? '#475569' : '#1e293b'}
                    strokeWidth={isMajor ? 1 : 0.5}
                    strokeDasharray="2 4"
                    opacity={0.35}
                  />
                  <text
                    x={x}
                    y={horizonY + 18}
                    fill={isMajor ? '#e2e8f0' : '#64748b'}
                    fontSize={isMajor ? '10' : '8'}
                    textAnchor="middle"
                    className="font-mono font-semibold select-none"
                  >
                    {az.label}
                  </text>
                </g>
              );
            })}

            {/* SUN 24H DIURNAL TRAJECTORY ARC */}
            {sunPathD && (
              <path
                d={sunPathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity="0.8"
              />
            )}

            {/* MOON 24H DIURNAL TRAJECTORY ARC */}
            {moonPathD && (
              <path
                d={moonPathD}
                fill="none"
                stroke="#93c5fd"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
            )}

            {/* KEY SOLAR EVENTS ON HORIZON (Sunrise & Sunset) */}
            {sunTimes.sunrise && (
              <g>
                {(() => {
                  const s = calculateSun(sunTimes.sunrise, lat, lon);
                  const x = azimuthToX(s.azimuth);
                  return (
                    <>
                      <circle cx={x} cy={horizonY} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
                      <line x1={x} y1={horizonY - 12} x2={x} y2={horizonY + 12} stroke="#f59e0b" strokeWidth="1" />
                      <text x={x} y={horizonY - 16} fill="#fbbf24" fontSize="9" textAnchor="middle" className="font-mono font-semibold">
                        SUNRISE {sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {sunTimes.sunset && (
              <g>
                {(() => {
                  const s = calculateSun(sunTimes.sunset, lat, lon);
                  const x = azimuthToX(s.azimuth);
                  return (
                    <>
                      <circle cx={x} cy={horizonY} r="5" fill="#ea580c" stroke="#fff" strokeWidth="1" />
                      <line x1={x} y1={horizonY - 12} x2={x} y2={horizonY + 12} stroke="#ea580c" strokeWidth="1" />
                      <text x={x} y={horizonY - 16} fill="#f97316" fontSize="9" textAnchor="middle" className="font-mono font-semibold">
                        SUNSET {sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {/* KEY LUNAR EVENTS ON HORIZON (Moonrise & Moonset) */}
            {moonTimes.moonrise && (
              <g>
                {(() => {
                  const m = calculateMoon(moonTimes.moonrise, lat, lon);
                  const x = azimuthToX(m.azimuth);
                  return (
                    <>
                      <circle cx={x} cy={horizonY} r="4" fill="#60a5fa" stroke="#93c5fd" strokeWidth="1" />
                      <text x={x} y={horizonY + 34} fill="#93c5fd" fontSize="9" textAnchor="middle" className="font-mono">
                        Moonrise {moonTimes.moonrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {moonTimes.moonset && (
              <g>
                {(() => {
                  const m = calculateMoon(moonTimes.moonset, lat, lon);
                  const x = azimuthToX(m.azimuth);
                  return (
                    <>
                      <circle cx={x} cy={horizonY} r="4" fill="#818cf8" stroke="#a5b4fc" strokeWidth="1" />
                      <text x={x} y={horizonY + 34} fill="#c7d2fe" fontSize="9" textAnchor="middle" className="font-mono">
                        Moonset {moonTimes.moonset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {/* CURRENT MOON POSITION */}
            <g>
              <line
                x1={currentMoonX}
                y1={horizonY}
                x2={currentMoonX}
                y2={currentMoonY}
                stroke="#60a5fa"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.5"
              />
              <circle
                cx={currentMoonX}
                cy={currentMoonY}
                r="18"
                fill="rgba(15, 23, 42, 0.9)"
                stroke="#93c5fd"
                strokeWidth="1.5"
              />
              <foreignObject
                x={currentMoonX - 14}
                y={currentMoonY - 14}
                width={28}
                height={28}
                className="pointer-events-none"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <MoonPhaseRenderer
                    phase={moonPhase.phase}
                    fraction={moonPhase.fraction}
                    waxing={moonPhase.waxing}
                    size={24}
                  />
                </div>
              </foreignObject>
              <text
                x={currentMoonX}
                y={currentMoonY - 22}
                fill="#bfdbfe"
                fontSize="10"
                textAnchor="middle"
                className="font-mono font-semibold"
              >
                Moon: {moonPos.apparentAltitude.toFixed(1)}°
              </text>
            </g>

            {/* CURRENT SUN POSITION */}
            <g>
              <line
                x1={currentSunX}
                y1={horizonY}
                x2={currentSunX}
                y2={currentSunY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <circle
                cx={currentSunX}
                cy={currentSunY}
                r="14"
                fill="#fde047"
                stroke="#f59e0b"
                strokeWidth="2"
                filter="url(#sun-sky-glow)"
              />
              {/* Sun Coronal Rays */}
              {sunPos.apparentAltitude > 0 && Array.from({ length: 8 }).map((_, rIdx) => {
                const angle = (rIdx * 45) * (Math.PI / 180);
                return (
                  <line
                    key={`sky-ray-${rIdx}`}
                    x1={currentSunX + 16 * Math.cos(angle)}
                    y1={currentSunY + 16 * Math.sin(angle)}
                    x2={currentSunX + 22 * Math.cos(angle)}
                    y2={currentSunY + 22 * Math.sin(angle)}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                );
              })}
              <text
                x={currentSunX}
                y={currentSunY - 24}
                fill="#fef08a"
                fontSize="11"
                textAnchor="middle"
                className="font-mono font-bold"
              >
                Sun: {sunPos.apparentAltitude.toFixed(1)}°
              </text>
            </g>

            {/* Zenith Marker */}
            <text
              x={width / 2}
              y={zenithY - 14}
              fill="#94a3b8"
              fontSize="10"
              textAnchor="middle"
              className="font-mono font-medium uppercase tracking-widest"
            >
              ZENITH (+90° OVERHEAD)
            </text>
          </svg>
        </div>

        {/* Dome Status Footer */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-400">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Sun Altitude</span>
            <span className={`text-sm font-semibold tabular-nums ${sunPos.apparentAltitude >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {sunPos.apparentAltitude >= 0 ? `+${sunPos.apparentAltitude.toFixed(2)}°` : `${sunPos.apparentAltitude.toFixed(2)}°`}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Sun Azimuth</span>
            <span className="text-sm font-semibold text-slate-200 tabular-nums">
              {sunPos.azimuth.toFixed(1)}°
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Moon Altitude</span>
            <span className={`text-sm font-semibold tabular-nums ${moonPos.apparentAltitude >= 0 ? 'text-sky-300' : 'text-slate-400'}`}>
              {moonPos.apparentAltitude >= 0 ? `+${moonPos.apparentAltitude.toFixed(2)}°` : `${moonPos.apparentAltitude.toFixed(2)}°`}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase tracking-wide">Moon Azimuth</span>
            <span className="text-sm font-semibold text-slate-200 tabular-nums">
              {moonPos.azimuth.toFixed(1)}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
