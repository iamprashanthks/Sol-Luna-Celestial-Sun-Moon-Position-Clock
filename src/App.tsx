/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  calculateSun,
  calculateMoon,
  calculateSunTimes,
  calculateMoonTimes,
  PRESET_LOCATIONS,
  LocationInfo,
} from './utils/astronomy';
import { AstronomicalClockDial } from './components/AstronomicalClockDial';
import { SkyDomeView } from './components/SkyDomeView';
import { CelestialTelemetry } from './components/CelestialTelemetry';
import { TimeController } from './components/TimeController';
import { LocationBar } from './components/LocationBar';
import { Sun, Moon, Compass, Eye, Sparkles, Orbit, Clock } from 'lucide-react';

export default function App() {
  // Observer Location State (Default: Greenwich Observatory, UK)
  const [location, setLocation] = useState<LocationInfo>(PRESET_LOCATIONS[0]);

  // Clock & Simulation State
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(60); // 60x default = 1 min per real sec

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'dial' | 'dome' | 'ephemeris'>('dial');

  // Animation frame reference
  const lastTickRef = useRef<number>(performance.now());

  // Real-time synchronization interval
  useEffect(() => {
    if (!isLive || isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 500);

    return () => clearInterval(interval);
  }, [isLive, isPlaying]);

  // Simulation playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    lastTickRef.current = performance.now();

    const loop = (time: number) => {
      const deltaSec = (time - lastTickRef.current) / 1000;
      lastTickRef.current = time;

      // Advance clock by (deltaSec * playbackSpeed) seconds
      setCurrentTime((prev) => {
        const addedMs = deltaSec * playbackSpeed * 1000;
        return new Date(prev.getTime() + addedMs);
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed]);

  // Perform astronomical calculations for current state
  const sunTimes = useMemo(() => {
    return calculateSunTimes(currentTime, location.lat, location.lon);
  }, [currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), location.lat, location.lon]);

  const moonTimes = useMemo(() => {
    return calculateMoonTimes(currentTime, location.lat, location.lon);
  }, [currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), location.lat, location.lon]);

  const sunPos = useMemo(() => {
    return calculateSun(currentTime, location.lat, location.lon);
  }, [currentTime, location.lat, location.lon]);

  const moonPos = useMemo(() => {
    return calculateMoon(currentTime, location.lat, location.lon);
  }, [currentTime, location.lat, location.lon]);

  // Handlers
  const handleTimeChange = (newTime: Date) => {
    setIsLive(false);
    setCurrentTime(newTime);
  };

  const handleToggleLive = () => {
    setIsLive(true);
    setIsPlaying(false);
    setCurrentTime(new Date());
  };

  const handleTogglePlay = () => {
    if (!isPlaying) {
      setIsLive(false);
    }
    setIsPlaying(!isPlaying);
  };

  const handleJumpTo = (targetDate: Date | null) => {
    if (!targetDate) return;
    setIsLive(false);
    setIsPlaying(false);
    setCurrentTime(new Date(targetDate));
  };

  const isSunUp = sunPos.apparentAltitude > 0;
  const isMoonUp = moonPos.apparentAltitude > 0;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. TOP BAR CONTRACT (Strict 3-zone architecture + responsive mobile tab bar) */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="h-16 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-3 sm:gap-4 max-w-6xl mx-auto">
          {/* Zone 1: Single text element wordmark */}
          <a href="/" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-serif flex items-center gap-2 shrink-0">
            <span>Sol &amp; Luna</span>
            <span className="text-xs font-mono font-normal text-amber-400/80 hidden xl:inline">24H ASTRONOMICAL CLOCK</span>
          </a>

          {/* Zone 2: Navigation Links / View Switcher (Visible on Tablet & Desktop) */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-8 text-xs sm:text-sm font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('dial')}
              className={`transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
                activeTab === 'dial' ? 'text-amber-400 border-b-2 border-amber-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="lg:inline hidden">Astrolabe Clock</span>
              <span className="lg:hidden inline">Astrolabe</span>
            </button>
            <button
              onClick={() => setActiveTab('dome')}
              className={`transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
                activeTab === 'dome' ? 'text-amber-400 border-b-2 border-amber-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="lg:inline hidden">Sky Horizon Dome</span>
              <span className="lg:hidden inline">Sky Dome</span>
            </button>
            <button
              onClick={() => setActiveTab('ephemeris')}
              className={`transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
                activeTab === 'ephemeris' ? 'text-amber-400 border-b-2 border-amber-400 font-semibold' : 'hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="lg:inline hidden">Celestial Ephemeris</span>
              <span className="lg:hidden inline">Ephemeris</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <LocationBar
              currentLocation={location}
              onSelectLocation={(newLoc) => setLocation(newLoc)}
            />
          </div>
        </div>

        {/* Dedicated Mobile Navigation Segmented Bar (Visible on mobile screens < md) */}
        <div className="md:hidden border-t border-slate-800/60 px-3 py-1.5 bg-slate-950/90">
          <div className="grid grid-cols-3 gap-1.5 text-xs font-mono max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('dial')}
              className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'dial'
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                  : 'bg-slate-900/50 border border-slate-800/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Astrolabe</span>
            </button>
            <button
              onClick={() => setActiveTab('dome')}
              className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'dome'
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                  : 'bg-slate-900/50 border border-slate-800/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Sky Dome</span>
            </button>
            <button
              onClick={() => setActiveTab('ephemeris')}
              className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ephemeris'
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold shadow-sm'
                  : 'bg-slate-900/50 border border-slate-800/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Ephemeris</span>
            </button>
          </div>
        </div>
      </header>

      {/* QUICK STATUS TICKER & KEY TIMELINE STRIP */}
      <section className="bg-slate-950/40 border-b border-slate-800/60 py-2.5 px-3 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-4 sm:gap-x-6 text-xs font-mono">
          {/* Real-time coordinates & sun state */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-slate-400">Observer:</span>
            <span className="text-slate-200 font-medium truncate max-w-[120px] sm:max-w-none">{location.name}</span>
            <span className="text-slate-500">·</span>
            <span className={isSunUp ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
              {isSunUp ? '● Day' : '○ Night'}
            </span>
            <span className="text-slate-500">·</span>
            <span className={isMoonUp ? 'text-sky-300 font-semibold' : 'text-slate-400'}>
              {isMoonUp ? '● Moon Visible' : '○ Moon Down'}
            </span>
          </div>

          {/* Quick Sunrise / Sunset & Moonrise / Moonset timestamps */}
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-slate-300">
            <div className="flex items-center gap-1">
              <span className="text-amber-400">Rise:</span>
              <span className="font-semibold text-slate-100 tabular-nums">
                {sunTimes.sunrise ? sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-orange-400">Set:</span>
              <span className="font-semibold text-slate-100 tabular-nums">
                {sunTimes.sunset ? sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
              </span>
            </div>
            <div className="flex items-center gap-1 hidden xs:flex">
              <span className="text-sky-300">Moon:</span>
              <span className="font-semibold text-slate-100 tabular-nums">
                {moonTimes.moonrise ? moonTimes.moonrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (moonTimes.alwaysUp ? 'Up' : 'None')}
              </span>
            </div>
            <div className="flex items-center gap-1 hidden md:flex">
              <span className="text-indigo-300">Moonset:</span>
              <span className="font-semibold text-slate-100 tabular-nums">
                {moonTimes.moonset ? moonTimes.moonset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (moonTimes.alwaysDown ? 'Down' : 'None')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN VIEWPORT AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Active Visualization Container */}
        {activeTab === 'dial' && (
          <div className="flex flex-col items-center justify-center">
            <AstronomicalClockDial
              currentTime={currentTime}
              sunPos={sunPos}
              moonPos={moonPos}
              sunTimes={sunTimes}
              moonTimes={moonTimes}
              moonPhase={moonPos.phase}
              lat={location.lat}
              lon={location.lon}
              onTimeChange={handleTimeChange}
            />
          </div>
        )}

        {activeTab === 'dome' && (
          <div className="flex flex-col items-center justify-center">
            <SkyDomeView
              currentTime={currentTime}
              lat={location.lat}
              lon={location.lon}
              sunPos={sunPos}
              moonPos={moonPos}
              sunTimes={sunTimes}
              moonTimes={moonTimes}
              moonPhase={moonPos.phase}
              onTimeChange={handleTimeChange}
            />
          </div>
        )}

        {activeTab === 'ephemeris' && (
          <div>
            <CelestialTelemetry
              currentTime={currentTime}
              sunPos={sunPos}
              moonPos={moonPos}
              sunTimes={sunTimes}
              moonTimes={moonTimes}
              moonPhase={moonPos.phase}
            />
          </div>
        )}

        {/* TIME CONTROLLER (Always accessible scrubber, simulator & jump buttons) */}
        <div className="mt-2">
          <TimeController
            currentTime={currentTime}
            isLive={isLive}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            sunTimes={sunTimes}
            moonTimes={moonTimes}
            onTimeChange={handleTimeChange}
            onToggleLive={handleToggleLive}
            onTogglePlay={handleTogglePlay}
            onChangeSpeed={(spd) => setPlaybackSpeed(spd)}
            onJumpTo={handleJumpTo}
          />
        </div>

        {/* COMPREHENSIVE CELESTIAL TIMETABLE STRIP (when on dial or dome view) */}
        {activeTab !== 'ephemeris' && (
          <div className="w-full max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Solar Transit</span>
              <span className="text-sm font-semibold text-amber-300 tabular-nums">
                {sunTimes.solarNoon.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Highest Altitude Today</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Daylight Duration</span>
              <span className="text-sm font-semibold text-slate-200 tabular-nums">
                {Math.floor(sunTimes.dayLengthHours)}h {Math.round((sunTimes.dayLengthHours % 1) * 60)}m
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Civil Sun Visibility</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Moon Phase</span>
              <span className="text-sm font-semibold text-sky-300 tabular-nums">
                {moonPos.phase.phaseName}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {(moonPos.phase.fraction * 100).toFixed(1)}% Illuminated
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Lunar Transit</span>
              <span className="text-sm font-semibold text-indigo-300 tabular-nums">
                {moonTimes.moonTransit ? moonTimes.moonTransit.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Culmination Altitude</span>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-8 mt-auto text-xs text-slate-400 font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-medium">Sol &amp; Luna Astronomical Clock</span>
            <span>·</span>
            <span>NOAA Solar Algorithm</span>
            <span>·</span>
            <span>Meeus Lunar Topocentric Engine</span>
          </div>

          <div className="text-slate-400">
            Observer Local Sidereal Time synchronized · J2000.0 Ephemeris
          </div>
        </div>
      </footer>
    </div>
  );
}
