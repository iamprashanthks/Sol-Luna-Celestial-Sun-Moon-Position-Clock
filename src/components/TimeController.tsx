import React from 'react';
import { SunTimes, MoonTimes } from '../utils/astronomy';
import { Play, Pause, RotateCcw, FastForward, Sunrise, Sunset, Moon, Sun, Calendar } from 'lucide-react';

interface TimeControllerProps {
  currentTime: Date;
  isLive: boolean;
  isPlaying: boolean;
  playbackSpeed: number;
  sunTimes: SunTimes;
  moonTimes: MoonTimes;
  onTimeChange: (time: Date) => void;
  onToggleLive: () => void;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  onJumpTo: (targetDate: Date | null) => void;
}

export const TimeController: React.FC<TimeControllerProps> = ({
  currentTime,
  isLive,
  isPlaying,
  playbackSpeed,
  sunTimes,
  moonTimes,
  onTimeChange,
  onToggleLive,
  onTogglePlay,
  onChangeSpeed,
  onJumpTo,
}) => {
  // Current time in decimal minutes from midnight
  const minutesSinceMidnight = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;

  // Handle slider scrub
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalMinutes = parseFloat(e.target.value);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes * 60) % 60);

    const newDate = new Date(currentTime);
    newDate.setHours(hours, minutes, seconds);
    onTimeChange(newDate);
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(currentTime);
    newDate.setFullYear(year, month - 1, day);
    onTimeChange(newDate);
  };

  const formattedDate = currentTime.toISOString().split('T')[0];

  // Helper to step minutes
  const stepTime = (deltaMinutes: number) => {
    const newDate = new Date(currentTime.getTime() + deltaMinutes * 60000);
    onTimeChange(newDate);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xl backdrop-blur-md">
      {/* Top Controller Bar: Time & Mode & Speed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800/80 pb-3">
        {/* Date Selector & Step Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-amber-400 absolute left-2.5 pointer-events-none z-10" />
            <input
              type="date"
              value={formattedDate}
              onChange={handleDateChange}
              style={{ colorScheme: 'dark' }}
              className="bg-slate-950 border border-slate-700 hover:border-amber-500/70 focus:border-amber-400 rounded-lg pl-8 pr-2 py-1.5 text-xs sm:text-sm font-mono font-semibold text-white tracking-wide focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-colors w-[152px] sm:w-[164px]"
            />
          </div>

          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs font-mono">
            <button
              onClick={() => stepTime(-60)}
              title="-1 Hour"
              className="px-1.5 sm:px-2 py-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            >
              -1h
            </button>
            <button
              onClick={() => stepTime(-15)}
              title="-15 Minutes"
              className="px-1.5 sm:px-2 py-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            >
              -15m
            </button>
            <button
              onClick={() => stepTime(15)}
              title="+15 Minutes"
              className="px-1.5 sm:px-2 py-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            >
              +15m
            </button>
            <button
              onClick={() => stepTime(60)}
              title="+1 Hour"
              className="px-1.5 sm:px-2 py-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
            >
              +1h
            </button>
          </div>
        </div>

        {/* Live / Real-Time Toggle & Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Real-time button */}
          <button
            onClick={onToggleLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              isLive
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{isLive ? 'Live Sync' : 'Sync Now'}</span>
          </button>

          {/* Simulation Play / Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Simulate'}</span>
          </button>

          {/* Playback speed selector */}
          {isPlaying && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              {[60, 360, 1440].map((spd) => (
                <button
                  key={`spd-${spd}`}
                  onClick={() => onChangeSpeed(spd)}
                  className={`px-1.5 sm:px-2 py-1 rounded transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-slate-800 text-amber-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd === 60 ? '1m/s' : spd === 360 ? '6m/s' : '24m/s'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 24-Hour Timeline Scrubber Slider */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">00:00 (Midnight)</span>
          <span className="text-amber-400 font-semibold text-sm tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
          <span className="text-slate-400">24:00</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="1440"
            step="0.5"
            value={minutesSinceMidnight}
            onChange={handleSliderChange}
            className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none border border-slate-800"
          />
        </div>
      </div>

      {/* Quick Jump Buttons to Solar & Lunar Milestones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
          Jump to Event:
        </span>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => onJumpTo(sunTimes.sunrise)}
            disabled={!sunTimes.sunrise}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
          >
            <Sunrise className="w-3 h-3 shrink-0" />
            <span>Sunrise</span>
            <span className="text-amber-400/70 ml-1 tabular-nums">
              {sunTimes.sunrise ? sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
            </span>
          </button>

          <button
            onClick={() => onJumpTo(sunTimes.solarNoon)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <Sun className="w-3 h-3 shrink-0" />
            <span>Noon</span>
            <span className="text-amber-400/70 ml-1 tabular-nums">
              {sunTimes.solarNoon.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>

          <button
            onClick={() => onJumpTo(sunTimes.sunset)}
            disabled={!sunTimes.sunset}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-300 hover:bg-orange-500/20 transition-colors disabled:opacity-40"
          >
            <Sunset className="w-3 h-3 shrink-0" />
            <span>Sunset</span>
            <span className="text-orange-400/70 ml-1 tabular-nums">
              {sunTimes.sunset ? sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
            </span>
          </button>

          <button
            onClick={() => onJumpTo(moonTimes.moonrise)}
            disabled={!moonTimes.moonrise}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 hover:bg-sky-500/20 transition-colors disabled:opacity-40"
          >
            <Moon className="w-3 h-3 shrink-0" />
            <span>Moonrise</span>
            <span className="text-sky-400/70 ml-1 tabular-nums">
              {moonTimes.moonrise ? moonTimes.moonrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
            </span>
          </button>

          <button
            onClick={() => onJumpTo(moonTimes.moonset)}
            disabled={!moonTimes.moonset}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-mono rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-colors disabled:opacity-40"
          >
            <Moon className="w-3 h-3 shrink-0" />
            <span>Moonset</span>
            <span className="text-indigo-400/70 ml-1 tabular-nums">
              {moonTimes.moonset ? moonTimes.moonset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
