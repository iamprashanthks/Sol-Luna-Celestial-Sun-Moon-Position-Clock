import React from 'react';
import { CelestialCoordinates, SunTimes, MoonTimes, MoonPhaseInfo, getZodiacSign, calculateMoon } from '../utils/astronomy';
import { MoonPhaseRenderer } from './MoonPhaseRenderer';
import { Sunrise, Sunset, Sun, Moon, Clock, Compass, Eye, Sparkles } from 'lucide-react';

interface CelestialTelemetryProps {
  currentTime: Date;
  sunPos: CelestialCoordinates & { eclipticLon: number };
  moonPos: CelestialCoordinates & { eclipticLon: number };
  sunTimes: SunTimes;
  moonTimes: MoonTimes;
  moonPhase: MoonPhaseInfo;
}

export const CelestialTelemetry: React.FC<CelestialTelemetryProps> = ({
  currentTime,
  sunPos,
  moonPos,
  sunTimes,
  moonTimes,
  moonPhase,
}) => {
  const sunZodiac = getZodiacSign(sunPos.eclipticLon);
  const moonZodiac = getZodiacSign(moonPos.eclipticLon);

  // Format time helper
  const fmtTime = (d: Date | null) => {
    if (!d) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  // Convert decimal hours to HHh MMm
  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Daylight progress percentage
  const daylightProgress = (() => {
    if (!sunTimes.sunrise || !sunTimes.sunset) return 0;
    const nowMs = currentTime.getTime();
    const riseMs = sunTimes.sunrise.getTime();
    const setMs = sunTimes.sunset.getTime();
    if (nowMs < riseMs) return 0;
    if (nowMs > setMs) return 100;
    return Math.round(((nowMs - riseMs) / (setMs - riseMs)) * 100);
  })();

  // Azimuth to Cardinal direction helper
  const getCardinal = (az: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(az / 22.5) % 16;
    return directions[idx];
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* 2-Column Split: Solar Ephemeris vs Lunar Ephemeris */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* SOLAR EPHEMERIS PANEL */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Solar Ephemeris</h3>
                <p className="text-xs text-slate-400">Diurnal Cycle &amp; Daylight Parameters</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-amber-400">
                {sunZodiac.symbol} {sunZodiac.name}
              </span>
              <span className="block text-[11px] font-mono text-slate-400">
                {sunPos.apparentAltitude > 0 ? 'Daylight' : 'Below Horizon'}
              </span>
            </div>
          </div>

          {/* Primary Metric: Sunrise & Sunset */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 p-3 sm:p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-amber-400/80 font-mono mb-1">
                <Sunrise className="w-3.5 h-3.5 shrink-0" />
                <span>SUNRISE</span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tabular-nums">
                {sunTimes.sunrise ? sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                Azimuth ~ {sunTimes.sunrise ? `${getCardinal(90)} (East)` : '--'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-orange-400/80 font-mono mb-1">
                <Sunset className="w-3.5 h-3.5 shrink-0" />
                <span>SUNSET</span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tabular-nums">
                {sunTimes.sunset ? sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                Azimuth ~ {sunTimes.sunset ? `${getCardinal(270)} (West)` : '--'}
              </div>
            </div>
          </div>

          {/* Daylight Progress Bar */}
          <div className="mb-5 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Day Length: {formatDuration(sunTimes.dayLengthHours)}</span>
              <span className="text-amber-400 tabular-nums">
                {sunPos.apparentAltitude > 0 ? `${daylightProgress}% elapsed` : 'Night in progress'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 transition-all duration-300"
                style={{ width: `${daylightProgress}%` }}
              />
            </div>
          </div>

          {/* Detailed Solar Event Timetable */}
          <div className="space-y-2 text-xs font-mono border-t border-slate-800/60 pt-4">
            <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-800/40">
              <span className="text-slate-400 truncate">Astronomical Dawn (-18°)</span>
              <span className="text-slate-200 tabular-nums shrink-0">{fmtTime(sunTimes.astronomicalDawn)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-800/40">
              <span className="text-slate-400 truncate">Nautical Dawn (-12°)</span>
              <span className="text-slate-200 tabular-nums shrink-0">{fmtTime(sunTimes.nauticalDawn)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-800/40">
              <span className="text-slate-400 truncate">Civil Dawn (-6°)</span>
              <span className="text-slate-200 tabular-nums shrink-0">{fmtTime(sunTimes.civilDawn)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-800/40">
              <span className="text-slate-400 truncate">Solar Noon (Culmination)</span>
              <span className="text-amber-300 font-semibold tabular-nums shrink-0">{fmtTime(sunTimes.solarNoon)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-800/40">
              <span className="text-slate-400 truncate">Civil Dusk (-6°)</span>
              <span className="text-slate-200 tabular-nums shrink-0">{fmtTime(sunTimes.civilDusk)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 py-1 border-b border-slate-800/40">
              <span className="text-slate-400 truncate">Astronomical Dusk (-18°)</span>
              <span className="text-slate-200 tabular-nums shrink-0">{fmtTime(sunTimes.astronomicalDusk)}</span>
            </div>
            <div className="flex justify-between items-center gap-2 py-1 pt-2">
              <span className="text-slate-400 truncate">Current Altitude / Azimuth</span>
              <span className="text-slate-100 font-bold tabular-nums shrink-0">
                {sunPos.apparentAltitude >= 0 ? `+${sunPos.apparentAltitude.toFixed(2)}°` : `${sunPos.apparentAltitude.toFixed(2)}°`} / {sunPos.azimuth.toFixed(1)}° {getCardinal(sunPos.azimuth)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2 py-1">
              <span className="text-slate-400 truncate">Solar Distance</span>
              <span className="text-slate-300 tabular-nums shrink-0">
                {(sunPos.distanceKm / 1e6).toFixed(3)}M km ({(sunPos.distanceKm / 149597870.7).toFixed(3)} AU)
              </span>
            </div>
          </div>
        </div>

        {/* LUNAR EPHEMERIS PANEL */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-300 shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Lunar Ephemeris</h3>
                <p className="text-xs text-slate-400">Orbital Phase &amp; Rise/Set Coordinates</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-sky-300">
                {moonZodiac.symbol} {moonZodiac.name}
              </span>
              <span className="block text-[11px] font-mono text-slate-400">
                {moonPos.apparentAltitude > 0 ? 'Above Horizon' : 'Below Horizon'}
              </span>
            </div>
          </div>

          {/* Primary Metric: Moonrise & Moonset */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 p-3 sm:p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-sky-400/80 font-mono mb-1">
                <Moon className="w-3.5 h-3.5 rotate-45 shrink-0" />
                <span>MOONRISE</span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tabular-nums">
                {moonTimes.moonrise ? moonTimes.moonrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (moonTimes.alwaysUp ? 'Always Up' : 'No Rise Today')}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                {moonTimes.moonrise ? `Azimuth ~ ${getCardinal(calculateMoon(moonTimes.moonrise, 0, 0).azimuth)}` : 'Circumpolar'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-indigo-400/80 font-mono mb-1">
                <Moon className="w-3.5 h-3.5 -rotate-45 shrink-0" />
                <span>MOONSET</span>
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 tabular-nums">
                {moonTimes.moonset ? moonTimes.moonset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (moonTimes.alwaysDown ? 'Always Down' : 'No Set Today')}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                {moonTimes.moonset ? `Azimuth ~ ${getCardinal(calculateMoon(moonTimes.moonset, 0, 0).azimuth)}` : 'Circumpolar'}
              </div>
            </div>
          </div>

          {/* Moon Phase Visual & Illumination Status */}
          <div className="mb-5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MoonPhaseRenderer
                phase={moonPhase.phase}
                fraction={moonPhase.fraction}
                waxing={moonPhase.waxing}
                size={48}
                interactiveModal={true}
              />
              <div>
                <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <span>{moonPhase.phaseName}</span>
                  <span className="text-[10px] text-amber-400 font-mono font-normal">· Real-Time Face</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {moonPhase.waxing ? 'Waxing' : 'Waning'} · Age {moonPhase.ageDays.toFixed(1)}d · Click face to inspect
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono text-slate-400">Illumination</span>
              <div className="text-xl font-mono font-bold text-sky-200 tabular-nums">
                {(moonPhase.fraction * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Detailed Lunar Event Timetable */}
          <div className="space-y-2 text-xs font-mono border-t border-slate-800/60 pt-4">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Lunar Transit (Highest Point)</span>
              <span className="text-sky-300 font-semibold tabular-nums">{fmtTime(moonTimes.moonTransit)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Moon Face Zenith Tilt</span>
              <span className="text-amber-300 tabular-nums">{moonPhase.brightLimbZenithDeg.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Parallactic Angle (q)</span>
              <span className="text-slate-200 tabular-nums">{moonPhase.parallacticAngleDeg.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Lunar Elongation (Sun Angle)</span>
              <span className="text-slate-200 tabular-nums">{moonPhase.angleToSunDeg.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Right Ascension (RA)</span>
              <span className="text-slate-200 tabular-nums">{moonPos.rightAscension.toFixed(2)}° ({(moonPos.rightAscension / 15).toFixed(2)}h)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Declination (Dec)</span>
              <span className="text-slate-200 tabular-nums">{moonPos.declination > 0 ? `+${moonPos.declination.toFixed(2)}°` : `${moonPos.declination.toFixed(2)}°`}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Current Altitude / Azimuth</span>
              <span className="text-slate-100 font-bold tabular-nums">
                {moonPos.apparentAltitude >= 0 ? `+${moonPos.apparentAltitude.toFixed(2)}°` : `${moonPos.apparentAltitude.toFixed(2)}°`} / {moonPos.azimuth.toFixed(1)}° {getCardinal(moonPos.azimuth)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 pt-1">
              <span className="text-slate-400">Earth-Moon Distance</span>
              <span className="text-slate-300 tabular-nums">
                {Math.round(moonPos.distanceKm).toLocaleString()} km ({moonPos.distanceKm < 365000 ? 'Near Perigee' : moonPos.distanceKm > 400000 ? 'Near Apogee' : 'Mean Orbit'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TWILIGHT BANDS EXPLAINER / REFERENCE STRIP */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
        <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3">
          Astronomical Twilight & Illumination Classifications
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="font-semibold text-amber-300 block">Golden Hour (-4° to +6°)</span>
            <span className="text-slate-400 text-[11px] leading-relaxed block mt-1">
              Warm, diffused sunlight; ideal for photography. Long soft shadows and high horizontal illumination.
            </span>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <span className="font-semibold text-rose-300 block">Civil Twilight (0° to -6°)</span>
            <span className="text-slate-400 text-[11px] leading-relaxed block mt-1">
              Horizon is clearly defined; brightest stars (Venus, Jupiter, Sirius) become visible without artificial lighting.
            </span>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <span className="font-semibold text-indigo-300 block">Nautical Twilight (-6° to -12°)</span>
            <span className="text-slate-400 text-[11px] leading-relaxed block mt-1">
              Sea horizon becomes indistinct; navigational stars visible for celestial sextant positioning.
            </span>
          </div>
          <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <span className="font-semibold text-sky-300 block">Astronomical Twilight (-12° to -18°)</span>
            <span className="text-slate-400 text-[11px] leading-relaxed block mt-1">
              Sky darkens to true astronomical black. Beyond -18°, sky is fully dark for deep-space telescopes and nebulae.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
