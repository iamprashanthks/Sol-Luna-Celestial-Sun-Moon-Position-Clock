import React, { useState } from 'react';
import { LocationInfo, PRESET_LOCATIONS } from '../utils/astronomy';
import { MapPin, Navigation, ChevronDown, Check, Globe } from 'lucide-react';

interface LocationBarProps {
  currentLocation: LocationInfo;
  onSelectLocation: (loc: LocationInfo) => void;
}

export const LocationBar: React.FC<LocationBarProps> = ({
  currentLocation,
  onSelectLocation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [customLat, setCustomLat] = useState(currentLocation.lat.toString());
  const [customLon, setCustomLon] = useState(currentLocation.lon.toString());
  const [customName, setCustomName] = useState('Custom Coordinates');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Request browser geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetecting(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetecting(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        onSelectLocation({
          name: 'My Current Location (GPS)',
          lat,
          lon,
          elevationMeters: Math.round(pos.coords.altitude || 0),
        });
        setIsOpen(false);
      },
      (err) => {
        setIsDetecting(false);
        setGeoError(`Unable to retrieve GPS: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Submit custom location
  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Latitude must be between -90 and 90 degrees.');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      alert('Longitude must be between -180 and 180 degrees.');
      return;
    }

    onSelectLocation({
      name: customName || 'Custom Location',
      lat,
      lon,
    });
    setShowCustomModal(false);
    setIsOpen(false);
  };

  // Format coordinates string
  const latStr = `${Math.abs(currentLocation.lat).toFixed(2)}° ${currentLocation.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(currentLocation.lon).toFixed(2)}° ${currentLocation.lon >= 0 ? 'E' : 'W'}`;

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 hover:text-white transition-colors text-xs font-mono"
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium truncate max-w-[130px] xs:max-w-[170px] sm:max-w-[220px] md:max-w-[260px]">
            {currentLocation.name}
          </span>
          <span className="text-slate-400 hidden lg:inline">
            ({latStr}, {lonStr})
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        <button
          onClick={handleDetectLocation}
          disabled={isDetecting}
          title="Detect GPS Location"
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700 transition-colors disabled:opacity-50 shrink-0"
        >
          <Navigation className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {geoError && (
        <div className="absolute right-0 mt-2 p-2 w-[calc(100vw-2rem)] max-w-xs sm:w-64 bg-red-950/90 border border-red-800 text-red-200 text-xs rounded-lg shadow-xl z-50">
          {geoError}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 backdrop-blur-md">
          <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Select Observer Location
            </span>
            <button
              onClick={() => {
                setShowCustomModal(true);
                setIsOpen(false);
              }}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-mono"
            >
              + Custom Lat/Lon
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-800/40 text-xs font-mono">
            {PRESET_LOCATIONS.map((loc) => {
              const isSelected = loc.name === currentLocation.name;
              return (
                <button
                  key={loc.name}
                  onClick={() => {
                    onSelectLocation(loc);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between rounded-lg transition-colors ${
                    isSelected ? 'bg-amber-500/10 text-amber-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-medium text-slate-200 truncate">{loc.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {Math.abs(loc.lat).toFixed(2)}°{loc.lat >= 0 ? 'N' : 'S'}, {Math.abs(loc.lon).toFixed(2)}°{loc.lon >= 0 ? 'E' : 'W'}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Coordinates Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              Set Geographic Coordinates
            </h3>

            <form onSubmit={handleApplyCustom} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Location Label</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="e.g. My Backyard"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Latitude (-90 to +90)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Longitude (-180 to +180)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
                >
                  Apply Coordinates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
