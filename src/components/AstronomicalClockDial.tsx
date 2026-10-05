import React, { useMemo } from 'react';
import { SunTimes, MoonTimes, CelestialCoordinates, MoonPhaseInfo, calculateMoon } from '../utils/astronomy';
import { MoonPhaseRenderer } from './MoonPhaseRenderer';
import { Sunrise, Sunset, Moon, Sun, Compass } from 'lucide-react';

interface AstronomicalClockDialProps {
  currentTime: Date;
  sunPos: CelestialCoordinates;
  moonPos: CelestialCoordinates;
  sunTimes: SunTimes;
  moonTimes: MoonTimes;
  moonPhase: MoonPhaseInfo;
  lat?: number;
  lon?: number;
  onTimeChange?: (time: Date) => void;
}

export const AstronomicalClockDial: React.FC<AstronomicalClockDialProps> = ({
  currentTime,
  sunPos,
  moonPos,
  sunTimes,
  moonTimes,
  moonPhase,
  lat,
  lon,
  onTimeChange,
}) => {
  // Dial geometry constants
  const size = 520;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 230;
  const innerRadius = 160;

  // Convert hours to clock angle:
  // 12:00 (Noon) = 0° (top)
  // 18:00 (Evening) = 90° (right)
  // 00:00 (Midnight) = 180° (bottom)
  // 06:00 (Morning) = 270° (left)
  const timeToAngle = (d: Date): number => {
    const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    // 12 is top (0 deg), 24h = 360 deg -> angle = (hours - 12) * 15 deg
    return (hours - 12) * 15;
  };

  const currentAngle = useMemo(() => timeToAngle(currentTime), [currentTime]);

  // Seconds hand angle
  const secondsAngle = (currentTime.getSeconds() + currentTime.getMilliseconds() / 1000) * 6;

  // Calculate angles for celestial events
  const sunriseAngle = sunTimes.sunrise ? timeToAngle(sunTimes.sunrise) : null;
  const sunsetAngle = sunTimes.sunset ? timeToAngle(sunTimes.sunset) : null;
  const dawnAngle = sunTimes.civilDawn ? timeToAngle(sunTimes.civilDawn) : null;
  const duskAngle = sunTimes.civilDusk ? timeToAngle(sunTimes.civilDusk) : null;
  const astroDawnAngle = sunTimes.astronomicalDawn ? timeToAngle(sunTimes.astronomicalDawn) : null;
  const astroDuskAngle = sunTimes.astronomicalDusk ? timeToAngle(sunTimes.astronomicalDusk) : null;

  const moonriseAngle = moonTimes.moonrise ? timeToAngle(moonTimes.moonrise) : null;
  const moonsetAngle = moonTimes.moonset ? timeToAngle(moonTimes.moonset) : null;

  // Helper to convert polar to cartesian (angle 0 is TOP, clockwise)
  const polarToCartesian = (centerRadius: number, angleDegrees: number) => {
    const rad = (angleDegrees - 90) * (Math.PI / 180);
    return {
      x: cx + centerRadius * Math.cos(rad),
      y: cy + centerRadius * Math.sin(rad),
    };
  };

  // SVG arc path generator
  const createArc = (startAng: number, endAng: number, rOuter: number, rInner: number) => {
    let diff = endAng - startAng;
    if (diff < 0) diff += 360;
    const largeArc = diff > 180 ? 1 : 0;

    const startOuter = polarToCartesian(rOuter, startAng);
    const endOuter = polarToCartesian(rOuter, endAng);
    const startInner = polarToCartesian(rInner, endAng);
    const endInner = polarToCartesian(rInner, startAng);

    return `M ${startOuter.x} ${startOuter.y} 
            A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} 
            L ${startInner.x} ${startInner.y} 
            A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
  };

  // Hour numerals array (00 to 23)
  const hoursList = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      // 12 is top (index 12 -> angle 0)
      const hour = i;
      const angle = (hour - 12) * 15;
      const pos = polarToCartesian(radius - 22, angle);
      const romanHour = [
        'XXIV', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
        'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII'
      ][hour];

      return {
        hour,
        label: hour.toString().padStart(2, '0'),
        roman: romanHour,
        angle,
        pos,
      };
    });
  }, [radius]);

  // Handle dial click to scrub time
  const handleDialClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onTimeChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - (rect.width / 2);
    const clickY = e.clientY - rect.top - (rect.height / 2);

    // Calculate angle in degrees from top (clockwise)
    let deg = Math.atan2(clickY, clickX) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;

    // Convert angle to hours: angle 0° = 12h, angle 180° = 0h/24h
    let targetHours = (deg / 15 + 12) % 24;
    const hours = Math.floor(targetHours);
    const minutes = Math.floor((targetHours - hours) * 60);

    const newTime = new Date(currentTime);
    newTime.setHours(hours, minutes, 0, 0);
    onTimeChange(newTime);
  };

  // Sun radial distance inside the dial:
  // Reflects altitude (high altitude = closer to center or outer band)
  const sunHandRadius = innerRadius + 28;
  const sunPosCartesian = polarToCartesian(sunHandRadius, currentAngle);

  // ASTRONOMICAL CELESTIAL PROJECTION FOR THE MOON:
  // Decoupled completely from the 24-hour time clock ring.
  // Calculated using true astronomical Moon altitude and azimuth for the current timestamp and observer coordinates.
  const R_arena = 175;

  const projectCelestial = (altDeg: number, azDeg: number) => {
    const altRad = altDeg * (Math.PI / 180);
    const azRad = azDeg * (Math.PI / 180);

    // Horizontal position X is determined by Azimuth (East = 90° on left, West = 270° on right, South = 180° centered):
    const x = cx - R_arena * Math.cos(altRad) * Math.sin(azRad);

    // Vertical position Y is determined by Altitude (+90° Zenith at top, 0° Horizon at cy, negative altitude below horizon):
    const y = cy - R_arena * Math.sin(altRad);

    return { x, y };
  };

  // Moon position at current timestamp
  const moonPosCartesian = useMemo(() => {
    return projectCelestial(moonPos.apparentAltitude, moonPos.azimuth);
  }, [moonPos.apparentAltitude, moonPos.azimuth, cx, cy]);

  const isSunUp = sunPos.apparentAltitude > 0;
  const isMoonUp = moonPos.apparentAltitude > 0;

  // Calculate continuous 24-hour Moon diurnal trajectory path on the Astrolabe Clock
  const moonTrajectory = useMemo(() => {
    if (lat === undefined || lon === undefined) {
      return { aboveD: '', belowD: '' };
    }

    const startOfDay = new Date(currentTime);
    startOfDay.setHours(0, 0, 0, 0);

    const steps = 72; // every 20 minutes across 24h
    const pts: { x: number; y: number; alt: number }[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = new Date(startOfDay.getTime() + i * 20 * 60 * 1000);
      const m = calculateMoon(t, lat, lon);
      const coord = projectCelestial(m.apparentAltitude, m.azimuth);
      pts.push({ x: coord.x, y: coord.y, alt: m.apparentAltitude });
    }

    let aboveSegments: string[] = [];
    let belowSegments: string[] = [];
    let curAbove: string[] = [];
    let curBelow: string[] = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.alt >= 0) {
        if (curBelow.length > 0) {
          curBelow.push(`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
          belowSegments.push(curBelow.join(' '));
          curBelow = [];
        }
        if (curAbove.length === 0) {
          curAbove.push(`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        } else {
          curAbove.push(`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        }
      } else {
        if (curAbove.length > 0) {
          curAbove.push(`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
          aboveSegments.push(curAbove.join(' '));
          curAbove = [];
        }
        if (curBelow.length === 0) {
          curBelow.push(`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        } else {
          curBelow.push(`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        }
      }
    }

    if (curAbove.length > 0) aboveSegments.push(curAbove.join(' '));
    if (curBelow.length > 0) belowSegments.push(curBelow.join(' '));

    return {
      aboveD: aboveSegments.join(' '),
      belowD: belowSegments.join(' '),
    };
  }, [currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), lat, lon]);

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 w-full">
      {/* Astrolabe Circular Dial */}
      <div className="relative w-[280px] xs:w-[320px] sm:w-[400px] md:w-[480px] lg:w-[520px] max-w-full aspect-square flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full cursor-pointer select-none drop-shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
          onClick={handleDialClick}
        >
          <defs>
            {/* Dial Gradients */}
            <radialGradient id="dial-body" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0d1322" />
              <stop offset="60%" stopColor="#090d16" />
              <stop offset="90%" stopColor="#07090e" />
              <stop offset="100%" stopColor="#030408" />
            </radialGradient>

            <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="horizon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="daylight-sector" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.15" />
            </linearGradient>

            <filter id="celestial-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Clock Outer Rim & Brass Bezel */}
          <circle cx={cx} cy={cy} r={radius + 18} fill="url(#dial-body)" stroke="#1e293b" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={radius + 14} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke="#475569" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={radius} fill="#060911" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.3" />

          {/* 24-HOUR SECTORS & TWILIGHT BANDS ON THE RIM */}
          {/* Base Night Rim */}
          <circle cx={cx} cy={cy} r={(radius + innerRadius) / 2} stroke="#0b1120" strokeWidth={radius - innerRadius} fill="none" />

          {/* Astronomical & Nautical Twilight Arcs */}
          {astroDawnAngle !== null && sunriseAngle !== null && (
            <path
              d={createArc(astroDawnAngle, sunriseAngle, radius - 2, innerRadius + 2)}
              fill="rgba(56, 189, 248, 0.12)"
            />
          )}
          {sunsetAngle !== null && astroDuskAngle !== null && (
            <path
              d={createArc(sunsetAngle, astroDuskAngle, radius - 2, innerRadius + 2)}
              fill="rgba(244, 63, 94, 0.12)"
            />
          )}

          {/* Civil Dawn / Golden Hour Arc */}
          {dawnAngle !== null && sunriseAngle !== null && (
            <path
              d={createArc(dawnAngle, sunriseAngle, radius - 2, innerRadius + 2)}
              fill="rgba(245, 158, 11, 0.22)"
            />
          )}

          {/* Daylight Arc (Sunrise to Sunset) */}
          {sunriseAngle !== null && sunsetAngle !== null && (
            <path
              d={createArc(sunriseAngle, sunsetAngle, radius - 2, innerRadius + 2)}
              fill="url(#daylight-sector)"
              stroke="rgba(56, 189, 248, 0.3)"
              strokeWidth="0.5"
            />
          )}

          {/* Civil Dusk / Golden Hour Sunset Arc */}
          {sunsetAngle !== null && duskAngle !== null && (
            <path
              d={createArc(sunsetAngle, duskAngle, radius - 2, innerRadius + 2)}
              fill="rgba(234, 88, 12, 0.25)"
            />
          )}

          {/* Concentric Coordinate Rings */}
          <circle cx={cx} cy={cy} r={innerRadius} fill="none" stroke="#1e293b" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={innerRadius - 40} fill="none" stroke="#172554" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx={cx} cy={cy} r={innerRadius - 80} fill="none" stroke="#0f172a" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={40} fill="#030712" stroke="#1e293b" strokeWidth="1.5" />

          {/* Central Compass Rose Crosshairs */}
          <line x1={cx} y1={cy - radius + 10} x2={cx} y2={cy + radius - 10} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 6" />
          
          {/* HORIZON REFERENCE LINE (0° Altitude) */}
          <line x1={cx - radius + 8} y1={cy} x2={cx + radius - 8} y2={cy} stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Cardinal Labels */}
          <text x={cx} y={cy - radius + 32} fill="#94a3b8" textAnchor="middle" fontSize="10" className="font-mono uppercase font-semibold">NOON · S (ZENITH)</text>
          <text x={cx} y={cy + radius - 24} fill="#64748b" textAnchor="middle" fontSize="10" className="font-mono uppercase font-semibold">MIDNIGHT · N (NADIR)</text>
          <text x={cx - radius + 30} y={cy - 4} fill="#38bdf8" textAnchor="middle" fontSize="9" className="font-mono uppercase font-semibold">EAST (0°)</text>
          <text x={cx + radius - 30} y={cy - 4} fill="#38bdf8" textAnchor="middle" fontSize="9" className="font-mono uppercase font-semibold">WEST (0°)</text>

          {/* MOON 24-HOUR DIURNAL TRAJECTORY ARC */}
          {moonTrajectory.aboveD && (
            <path
              d={moonTrajectory.aboveD}
              fill="none"
              stroke="#93c5fd"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.75"
            />
          )}
          {moonTrajectory.belowD && (
            <path
              d={moonTrajectory.belowD}
              fill="none"
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.45"
            />
          )}

          {/* 24-HOUR TICK MARKS & NUMERALS */}
          {hoursList.map((item) => {
            const isMajor = item.hour % 6 === 0;
            const isMedium = item.hour % 2 === 0;
            const outerTick = polarToCartesian(radius - 2, item.angle);
            const innerTick = polarToCartesian(radius - (isMajor ? 12 : isMedium ? 8 : 4), item.angle);

            return (
              <g key={`hour-${item.hour}`}>
                <line
                  x1={innerTick.x}
                  y1={innerTick.y}
                  x2={outerTick.x}
                  y2={outerTick.y}
                  stroke={isMajor ? '#e2e8f0' : isMedium ? '#64748b' : '#334155'}
                  strokeWidth={isMajor ? 2 : 1}
                />
                <text
                  x={item.pos.x}
                  y={item.pos.y + 4}
                  fill={isMajor ? '#f8fafc' : isMedium ? '#94a3b8' : '#475569'}
                  textAnchor="middle"
                  fontSize={isMajor ? '12' : '10'}
                  className="font-mono select-none"
                  fontWeight={isMajor ? 'bold' : 'normal'}
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* SUNRISE MARKER */}
          {sunriseAngle !== null && (
            <g>
              {(() => {
                const p1 = polarToCartesian(radius + 10, sunriseAngle);
                const p2 = polarToCartesian(innerRadius, sunriseAngle);
                return (
                  <>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx={p1.x} cy={p1.y} r="5" fill="#f59e0b" filter="url(#celestial-glow)" />
                    <text
                      x={p1.x - 14}
                      y={p1.y + (p1.y > cy ? 14 : -6)}
                      fill="#fbbf24"
                      fontSize="9"
                      className="font-mono font-semibold"
                      textAnchor="end"
                    >
                      SUNRISE
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* SUNSET MARKER */}
          {sunsetAngle !== null && (
            <g>
              {(() => {
                const p1 = polarToCartesian(radius + 10, sunsetAngle);
                const p2 = polarToCartesian(innerRadius, sunsetAngle);
                return (
                  <>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#ea580c" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx={p1.x} cy={p1.y} r="5" fill="#ea580c" filter="url(#celestial-glow)" />
                    <text
                      x={p1.x + 14}
                      y={p1.y + (p1.y > cy ? 14 : -6)}
                      fill="#f97316"
                      fontSize="9"
                      className="font-mono font-semibold"
                      textAnchor="start"
                    >
                      SUNSET
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* MOONRISE MARKER */}
          {moonriseAngle !== null && (
            <g>
              {(() => {
                const p = polarToCartesian(radius + 4, moonriseAngle);
                return (
                  <>
                    <polygon
                      points={`${p.x},${p.y - 6} ${p.x + 5},${p.y + 4} ${p.x - 5},${p.y + 4}`}
                      fill="#93c5fd"
                      transform={`rotate(${moonriseAngle}, ${p.x}, ${p.y})`}
                    />
                  </>
                );
              })()}
            </g>
          )}

          {/* MOONSET MARKER */}
          {moonsetAngle !== null && (
            <g>
              {(() => {
                const p = polarToCartesian(radius + 4, moonsetAngle);
                return (
                  <>
                    <polygon
                      points={`${p.x},${p.y + 6} ${p.x + 5},${p.y - 4} ${p.x - 5},${p.y - 4}`}
                      fill="#818cf8"
                      transform={`rotate(${moonsetAngle}, ${p.x}, ${p.y})`}
                    />
                  </>
                );
              })()}
            </g>
          )}

          {/* LUNAR HAND & POSITION */}
          <g>
            <line
              x1={cx}
              y1={cy}
              x2={moonPosCartesian.x}
              y2={moonPosCartesian.y}
              stroke={isMoonUp ? '#93c5fd' : '#475569'}
              strokeWidth="1.5"
              strokeDasharray={isMoonUp ? 'none' : '4 4'}
              opacity={isMoonUp ? 0.9 : 0.4}
            />
            {/* Moon Glyphs & Halos */}
            <circle
              cx={moonPosCartesian.x}
              cy={moonPosCartesian.y}
              r={16}
              fill="rgba(15, 23, 42, 0.9)"
              stroke={isMoonUp ? '#93c5fd' : '#334155'}
              strokeWidth="1.5"
              filter={isMoonUp ? 'url(#celestial-glow)' : 'none'}
            />
            <foreignObject
              x={moonPosCartesian.x - 14}
              y={moonPosCartesian.y - 14}
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
            {/* Moon altitude badge */}
            <text
              x={moonPosCartesian.x}
              y={moonPosCartesian.y + (moonPosCartesian.y > cy ? 22 : -20)}
              fill={isMoonUp ? '#bfdbfe' : '#94a3b8'}
              fontSize="9"
              textAnchor="middle"
              className="font-mono font-medium"
            >
              ☽ {moonPos.apparentAltitude >= 0 ? `+${moonPos.apparentAltitude.toFixed(1)}°` : `${moonPos.apparentAltitude.toFixed(1)}°`}
            </text>
          </g>

          {/* SOLAR HAND & RADIANT GLYPH */}
          <g>
            {/* Laser pointer hand */}
            <line
              x1={cx}
              y1={cy}
              x2={sunPosCartesian.x}
              y2={sunPosCartesian.y}
              stroke={isSunUp ? '#f59e0b' : '#78350f'}
              strokeWidth="2.5"
              filter={isSunUp ? 'url(#celestial-glow)' : 'none'}
            />
            {/* Radiant Sun Head */}
            <circle
              cx={sunPosCartesian.x}
              cy={sunPosCartesian.y}
              r={14}
              fill="url(#sun-glow)"
              stroke="#fbbf24"
              strokeWidth="1.5"
            />
            {/* Sun rays */}
            {isSunUp && Array.from({ length: 8 }).map((_, rIdx) => {
              const rayAngle = (rIdx * 45) * (Math.PI / 180);
              const r1 = 16;
              const r2 = 22;
              return (
                <line
                  key={`ray-${rIdx}`}
                  x1={sunPosCartesian.x + r1 * Math.cos(rayAngle)}
                  y1={sunPosCartesian.y + r1 * Math.sin(rayAngle)}
                  x2={sunPosCartesian.x + r2 * Math.cos(rayAngle)}
                  y2={sunPosCartesian.y + r2 * Math.sin(rayAngle)}
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}
            {/* Sun altitude badge */}
            <text
              x={sunPosCartesian.x}
              y={sunPosCartesian.y + (sunPosCartesian.y > cy ? -20 : 28)}
              fill={isSunUp ? '#fde047' : '#92400e'}
              fontSize="10"
              textAnchor="middle"
              className="font-mono font-bold"
            >
              ☉ {sunPos.apparentAltitude.toFixed(1)}°
            </text>
          </g>

          {/* LIVE TIME POINTER (Fine Hour/Minute Hand) */}
          <line
            x1={cx}
            y1={cy}
            x2={polarToCartesian(radius - 12, currentAngle).x}
            y2={polarToCartesian(radius - 12, currentAngle).y}
            stroke="#f8fafc"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Subtle Seconds Hand */}
          <line
            x1={cx}
            y1={cy}
            x2={polarToCartesian(radius - 6, secondsAngle).x}
            y2={polarToCartesian(radius - 6, secondsAngle).y}
            stroke="#ef4444"
            strokeWidth="1"
            opacity="0.85"
          />

          {/* Central Astrolabe Hub */}
          <circle cx={cx} cy={cy} r="18" fill="#0f172a" stroke="#475569" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="10" fill="#1e293b" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="4" fill="#f59e0b" />
        </svg>

        {/* Dynamic Center Info Overlay */}
        <div className="absolute flex flex-col items-center pointer-events-none mt-14 sm:mt-24">
          <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-slate-400">
            {isSunUp ? 'Solar Day' : 'Lunar Night'}
          </span>
          <span className="text-base xs:text-lg sm:text-2xl font-mono font-bold text-slate-100 tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>
      </div>

      {/* Legend & Dial Guide */}
      <div className="w-full max-w-lg mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-y-2 gap-x-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] shrink-0" />
          <span className="truncate">Sun: <strong className="text-slate-200 font-mono tabular-nums">{sunPos.apparentAltitude >= 0 ? `+${sunPos.apparentAltitude.toFixed(1)}°` : `${sunPos.apparentAltitude.toFixed(1)}°`}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(186,230,253,0.6)] shrink-0" />
          <span className="truncate">Moon: <strong className="text-slate-200 font-mono tabular-nums">{moonPos.apparentAltitude >= 0 ? `+${moonPos.apparentAltitude.toFixed(1)}°` : `${moonPos.apparentAltitude.toFixed(1)}°`}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-amber-500 rounded shrink-0" />
          <span className="truncate">Rise: <strong className="text-slate-200 font-mono">{sunTimes.sunrise ? sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-orange-600 rounded shrink-0" />
          <span className="truncate">Set: <strong className="text-slate-200 font-mono">{sunTimes.sunset ? sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}</strong></span>
        </div>
      </div>

      {/* ASTRONOMICAL MOON POSITION DEBUG DISPLAY */}
      <div className="w-full max-w-lg mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold uppercase tracking-wider text-[11px]">
            <Moon className="w-3.5 h-3.5" />
            <span>Astronomical Moon Position</span>
          </div>
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${isMoonUp ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' : 'bg-slate-800/80 text-slate-400 border border-slate-700'}`}>
            {isMoonUp ? 'Above Horizon' : 'Below Horizon'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-200">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Moon Altitude</span>
            <span className={`text-sm font-bold tabular-nums ${isMoonUp ? 'text-sky-300' : 'text-slate-400'}`}>
              {moonPos.apparentAltitude >= 0 ? `+${moonPos.apparentAltitude.toFixed(1)}°` : `${moonPos.apparentAltitude.toFixed(1)}°`}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Moon Azimuth</span>
            <span className="text-sm font-bold tabular-nums text-slate-200">
              {moonPos.azimuth.toFixed(1)}°
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Moonrise</span>
            <span className="text-sm font-semibold tabular-nums text-slate-200">
              {moonTimes.moonrise
                ? moonTimes.moonrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                : (moonTimes.alwaysUp ? 'Always Up' : '--')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Moonset</span>
            <span className="text-sm font-semibold tabular-nums text-slate-200">
              {moonTimes.moonset
                ? moonTimes.moonset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                : (moonTimes.alwaysDown ? 'Always Down' : '--')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
