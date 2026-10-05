/**
 * Astronomy Engine: High-precision NOAA & Meeus Algorithms
 * Calculates Sun & Moon positions, Rise/Set/Transit times, Twilights, Phases & Ephemeris
 */

// Math helpers
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function sinDeg(deg: number): number {
  return Math.sin(deg * DEG2RAD);
}

export function cosDeg(deg: number): number {
  return Math.cos(deg * DEG2RAD);
}

export function tanDeg(deg: number): number {
  return Math.tan(deg * DEG2RAD);
}

export function asinDeg(val: number): number {
  return Math.asin(Math.max(-1, Math.min(1, val))) * RAD2DEG;
}

export function acosDeg(val: number): number {
  return Math.acos(Math.max(-1, Math.min(1, val))) * RAD2DEG;
}

export function atan2Deg(y: number, x: number): number {
  return Math.atan2(y, x) * RAD2DEG;
}

export function normalizeDeg(deg: number): number {
  const norm = deg % 360;
  return norm < 0 ? norm + 360 : norm;
}

export function normalizeHours(h: number): number {
  const norm = h % 24;
  return norm < 0 ? norm + 24 : norm;
}

export function getJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

// Atmospheric refraction correction for true visual altitude
export function getRefractionCorrection(altDeg: number): number {
  if (altDeg < -1.5) return 0;
  // Saemundsson / Bennett formula approximation
  const r = 1.02 / (tanDeg(altDeg + 10.3 / (altDeg + 5.11)) + 0.001) / 60; // in degrees
  return Math.max(0, Math.min(0.6, r));
}

export interface CelestialCoordinates {
  altitude: number; // degrees (-90 to +90)
  azimuth: number;  // degrees (0 = North, 90 = East, 180 = South, 270 = West)
  rightAscension: number; // degrees
  declination: number; // degrees
  distanceKm: number;
  apparentAltitude: number;
}

export interface SunTimes {
  astronomicalDawn: Date | null;
  nauticalDawn: Date | null;
  civilDawn: Date | null;
  goldenHourMorningStart: Date | null;
  sunrise: Date | null;
  goldenHourMorningEnd: Date | null;
  solarNoon: Date;
  goldenHourEveningStart: Date | null;
  sunset: Date | null;
  goldenHourEveningEnd: Date | null;
  civilDusk: Date | null;
  nauticalDusk: Date | null;
  astronomicalDusk: Date | null;
  dayLengthHours: number;
  isPolarDay: boolean;
  isPolarNight: boolean;
}

export interface MoonTimes {
  moonrise: Date | null;
  moonTransit: Date | null;
  moonset: Date | null;
  alwaysUp: boolean;
  alwaysDown: boolean;
}

export interface MoonPhaseInfo {
  phase: number; // 0 to 1 (0 = New, 0.25 = First Quarter, 0.5 = Full, 0.75 = Last Quarter)
  fraction: number; // Illumination 0 to 1 (0% to 100%)
  phaseName: string;
  ageDays: number;
  waxing: boolean;
  angleToSunDeg: number;
  parallacticAngleDeg: number;
  brightLimbZenithDeg: number;
}

export interface LocationInfo {
  name: string;
  lat: number;
  lon: number;
  elevationMeters?: number;
  timezoneOffset?: number; // in hours from UTC
}

// Zodiac calculations
const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', startDeg: 0 },
  { name: 'Taurus', symbol: '♉', startDeg: 30 },
  { name: 'Gemini', symbol: '♊', startDeg: 60 },
  { name: 'Cancer', symbol: '♋', startDeg: 90 },
  { name: 'Leo', symbol: '♌', startDeg: 120 },
  { name: 'Virgo', symbol: '♍', startDeg: 150 },
  { name: 'Libra', symbol: '♎', startDeg: 180 },
  { name: 'Scorpio', symbol: '♏', startDeg: 210 },
  { name: 'Sagittarius', symbol: '♐', startDeg: 240 },
  { name: 'Capricorn', symbol: '♑', startDeg: 270 },
  { name: 'Aquarius', symbol: '♒', startDeg: 300 },
  { name: 'Pisces', symbol: '♓', startDeg: 330 },
];

export function getZodiacSign(eclipticLon: number): { name: string; symbol: string } {
  const norm = normalizeDeg(eclipticLon);
  for (let i = ZODIAC_SIGNS.length - 1; i >= 0; i--) {
    if (norm >= ZODIAC_SIGNS[i].startDeg) {
      return { name: ZODIAC_SIGNS[i].name, symbol: ZODIAC_SIGNS[i].symbol };
    }
  }
  return { name: ZODIAC_SIGNS[0].name, symbol: ZODIAC_SIGNS[0].symbol };
}

// Greenwich Mean Sidereal Time in degrees
export function getGMST(jd: number): number {
  const d = jd - 2451545.0;
  return normalizeDeg(280.46061837 + 360.98564736629 * d);
}

// Local Sidereal Time in degrees
export function getLST(jd: number, lon: number): number {
  return normalizeDeg(getGMST(jd) + lon);
}

// --- SUN POSITION CALCULATIONS (NOAA) ---
export function calculateSun(date: Date, lat: number, lon: number): CelestialCoordinates & { eclipticLon: number } {
  const jd = getJulianDay(date);
  const n = jd - 2451545.0; // days since J2000.0

  // Mean longitude of the Sun
  const L = normalizeDeg(280.460 + 0.9856474 * n);
  // Mean anomaly of the Sun
  const g = normalizeDeg(357.528 + 0.9856003 * n);
  // Ecliptic longitude of the Sun
  const lambda = normalizeDeg(L + 1.915 * sinDeg(g) + 0.020 * sinDeg(2 * g));

  // Distance in AU
  const R = 1.00014 - 0.01671 * cosDeg(g) - 0.00014 * cosDeg(2 * g);
  const distanceKm = R * 149597870.7;

  // Obliquity of the ecliptic
  const epsilon = 23.439 - 0.0000004 * n;

  // Right ascension and Declination
  const alpha = atan2Deg(cosDeg(epsilon) * sinDeg(lambda), cosDeg(lambda));
  const delta = asinDeg(sinDeg(epsilon) * sinDeg(lambda));

  // Local Sidereal Time & Hour Angle
  const lst = getLST(jd, lon);
  const H = normalizeDeg(lst - alpha);

  // Altitude & Azimuth
  const sinAlt = sinDeg(lat) * sinDeg(delta) + cosDeg(lat) * cosDeg(delta) * cosDeg(H);
  const alt = asinDeg(sinAlt);

  const cosAz = (sinDeg(delta) - sinDeg(lat) * sinAlt) / (cosDeg(lat) * cosDeg(alt));
  let az = acosDeg(cosAz);
  if (sinDeg(H) > 0) {
    az = 360 - az;
  }

  const apparentAlt = alt + getRefractionCorrection(alt);

  return {
    altitude: alt,
    apparentAltitude: apparentAlt,
    azimuth: az,
    rightAscension: normalizeDeg(alpha),
    declination: delta,
    distanceKm,
    eclipticLon: lambda,
  };
}

// Calculate Sun Times for a specific day
export function calculateSunTimes(date: Date, lat: number, lon: number): SunTimes {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const jd0 = getJulianDay(startOfDay);
  const n0 = jd0 - 2451545.0;
  const L0 = normalizeDeg(280.460 + 0.9856474 * n0);
  const g0 = normalizeDeg(357.528 + 0.9856003 * n0);
  const lambda0 = normalizeDeg(L0 + 1.915 * sinDeg(g0) + 0.020 * sinDeg(2 * g0));
  const epsilon0 = 23.439 - 0.0000004 * n0;
  const delta0 = asinDeg(sinDeg(epsilon0) * sinDeg(lambda0));

  // Equation of Time in minutes
  const y = Math.tan(epsilon0 * DEG2RAD / 2) ** 2;
  const eqTimeMin = 4 * RAD2DEG * (
    y * sinDeg(2 * L0) -
    2 * 0.0167 * sinDeg(g0) +
    4 * 0.0167 * y * sinDeg(g0) * cosDeg(2 * L0) -
    0.5 * y * y * sinDeg(4 * L0) -
    1.25 * 0.0167 * 0.0167 * sinDeg(2 * g0)
  );

  // Solar noon in UTC hours
  const solarNoonUtcHours = (720 - 4 * lon - eqTimeMin) / 60;
  const solarNoonMs = startOfDay.getTime() - (startOfDay.getTimezoneOffset() * 60000) + (solarNoonUtcHours * 3600000);
  const solarNoonDate = new Date(solarNoonMs);

  function getTimeForAltitude(targetAltDeg: number): { rise: Date | null; set: Date | null; isAlwaysUp: boolean; isAlwaysDown: boolean } {
    const cosH0 = (sinDeg(targetAltDeg) - sinDeg(lat) * sinDeg(delta0)) / (cosDeg(lat) * cosDeg(delta0));

    if (cosH0 > 1) {
      // Never reaches this altitude (always below)
      return { rise: null, set: null, isAlwaysUp: false, isAlwaysDown: true };
    }
    if (cosH0 < -1) {
      // Always above this altitude
      return { rise: null, set: null, isAlwaysUp: true, isAlwaysDown: false };
    }

    const H0Deg = acosDeg(cosH0);
    const H0Hours = H0Deg / 15;

    const riseUtcHours = solarNoonUtcHours - H0Hours;
    const setUtcHours = solarNoonUtcHours + H0Hours;

    const baseMs = startOfDay.getTime() - (startOfDay.getTimezoneOffset() * 60000);
    const riseDate = new Date(baseMs + riseUtcHours * 3600000);
    const setDate = new Date(baseMs + setUtcHours * 3600000);

    return { rise: riseDate, set: setDate, isAlwaysUp: false, isAlwaysDown: false };
  }

  // Sunrise/Sunset uses geometric center at -0.833° (34' refraction + 16' solar disk radius)
  const sunDisk = getTimeForAltitude(-0.833);
  const civil = getTimeForAltitude(-6.0);
  const nautical = getTimeForAltitude(-12.0);
  const astronomical = getTimeForAltitude(-18.0);
  const goldenMorning = getTimeForAltitude(6.0);
  const goldenStart = getTimeForAltitude(-4.0);

  let dayLengthHours = 0;
  if (sunDisk.isAlwaysUp) {
    dayLengthHours = 24;
  } else if (sunDisk.isAlwaysDown) {
    dayLengthHours = 0;
  } else if (sunDisk.rise && sunDisk.set) {
    dayLengthHours = (sunDisk.set.getTime() - sunDisk.rise.getTime()) / 3600000;
  }

  return {
    astronomicalDawn: astronomical.rise,
    nauticalDawn: nautical.rise,
    civilDawn: civil.rise,
    goldenHourMorningStart: goldenStart.rise,
    sunrise: sunDisk.rise,
    goldenHourMorningEnd: goldenMorning.rise,
    solarNoon: solarNoonDate,
    goldenHourEveningStart: goldenMorning.set,
    sunset: sunDisk.set,
    goldenHourEveningEnd: goldenStart.set,
    civilDusk: civil.set,
    nauticalDusk: nautical.set,
    astronomicalDusk: astronomical.set,
    dayLengthHours,
    isPolarDay: sunDisk.isAlwaysUp,
    isPolarNight: sunDisk.isAlwaysDown,
  };
}

// --- MOON POSITION CALCULATIONS (Meeus truncated orbital elements with topocentric parallax) ---
export function calculateMoon(date: Date, lat: number, lon: number): CelestialCoordinates & { eclipticLon: number; eclipticLat: number; phase: MoonPhaseInfo } {
  const jd = getJulianDay(date);
  const d = jd - 2451543.5;

  // Orbital elements of the Moon
  const N = normalizeDeg(125.1228 - 0.0529538083 * d); // Long asc node
  const i = 5.1454;                                      // Inclination
  const w = normalizeDeg(318.0634 + 0.1643573223 * d); // Arg of periapsis
  const a = 60.2666;                                     // Semi-major axis in Earth radii
  const e = 0.054900;                                    // Eccentricity
  const M = normalizeDeg(115.3654 + 13.0649929509 * d); // Mean anomaly

  // Sun elements for perturbations
  const Ms = normalizeDeg(357.528 + 0.9856003 * d);
  const Ls = normalizeDeg(280.460 + 0.9856474 * d);

  // Eccentric anomaly E
  let E0 = M + e * RAD2DEG * sinDeg(M) * (1.0 + e * cosDeg(M));
  let E = E0;
  for (let iter = 0; iter < 4; iter++) {
    E = E0 - (E0 - e * RAD2DEG * sinDeg(E0) - M) / (1 - e * cosDeg(E0));
    E0 = E;
  }

  // True anomaly v and distance r
  const x = a * (cosDeg(E) - e);
  const y = a * Math.sqrt(1 - e * e) * sinDeg(E);
  const r = Math.sqrt(x * x + y * y);
  const v = atan2Deg(y, x);

  // Mean Moon longitude Lm
  const Lm = normalizeDeg(M + w + N);
  // Mean elongation D
  const D = normalizeDeg(Lm - Ls);
  // Argument of latitude F
  const F = normalizeDeg(Lm - N);

  // Perturbations in longitude (degrees)
  const dLon =
    -1.274 * sinDeg(M - 2 * D) + // Evection
    0.658 * sinDeg(2 * D) -     // Variation
    0.186 * sinDeg(Ms) -        // Yearly equation
    0.059 * sinDeg(2 * M - 2 * D) -
    0.057 * sinDeg(M - 2 * D + Ms) +
    0.053 * sinDeg(M + 2 * D) +
    0.046 * sinDeg(2 * D - Ms) +
    0.041 * sinDeg(M - Ms) -
    0.035 * sinDeg(D) -          // Parallactic equation
    0.031 * sinDeg(M + Ms);

  // Perturbations in latitude (degrees)
  const dLat =
    -0.173 * sinDeg(F - 2 * D) -
    0.055 * sinDeg(M - F - 2 * D) -
    0.046 * sinDeg(M + F - 2 * D) +
    0.033 * sinDeg(F + 2 * D) +
    0.017 * sinDeg(2 * M + F);

  // Perturbations in distance (Earth radii)
  const dR = -0.58 * cosDeg(M - 2 * D) - 0.46 * cosDeg(2 * D);

  // Geocentric coordinates
  const trueR = r + dR;
  const distanceKm = trueR * 6378.137;

  // Geocentric positions in orbital plane
  const xh = trueR * (cosDeg(N) * cosDeg(v + w) - sinDeg(N) * sinDeg(v + w) * cosDeg(i));
  const yh = trueR * (sinDeg(N) * cosDeg(v + w) + cosDeg(N) * sinDeg(v + w) * cosDeg(i));
  const zh = trueR * (sinDeg(v + w) * sinDeg(i));

  let lonMoon = atan2Deg(yh, xh) + dLon;
  let latMoon = atan2Deg(zh, Math.sqrt(xh * xh + yh * yh)) + dLat;
  lonMoon = normalizeDeg(lonMoon);

  // Ecliptic to Equatorial
  const epsilon = 23.439 - 0.0000004 * d;
  const xeq = cosDeg(latMoon) * cosDeg(lonMoon);
  const yeq = cosDeg(latMoon) * sinDeg(lonMoon) * cosDeg(epsilon) - sinDeg(latMoon) * sinDeg(epsilon);
  const zeq = cosDeg(latMoon) * sinDeg(lonMoon) * sinDeg(epsilon) + sinDeg(latMoon) * cosDeg(epsilon);

  let raGeo = atan2Deg(yeq, xeq);
  raGeo = normalizeDeg(raGeo);
  const decGeo = asinDeg(zeq);

  // Topocentric correction (Parallax from observer location on Earth surface)
  const lst = getLST(jd, lon);
  const haGeo = normalizeDeg(lst - raGeo);

  // Observer geocentric coords
  const u = Math.atan(0.996647 * tanDeg(lat)) * RAD2DEG;
  const rhoSinPhiPrime = 0.996647 * sinDeg(u);
  const rhoCosPhiPrime = cosDeg(u);

  // Topocentric RA and Dec
  const piRad = asinDeg(1.0 / trueR); // Horizontal parallax in degrees
  const sinPi = sinDeg(piRad);

  const deltaX = cosDeg(decGeo) * cosDeg(haGeo) - rhoCosPhiPrime * sinPi;
  const deltaY = cosDeg(decGeo) * sinDeg(haGeo);
  const deltaZ = sinDeg(decGeo) - rhoSinPhiPrime * sinPi;

  const haTopo = atan2Deg(deltaY, deltaX);
  const decTopo = atan2Deg(deltaZ, Math.sqrt(deltaX * deltaX + deltaY * deltaY));
  const raTopo = normalizeDeg(lst - haTopo);

  // Altitude & Azimuth
  const sinAlt = sinDeg(lat) * sinDeg(decTopo) + cosDeg(lat) * cosDeg(decTopo) * cosDeg(haTopo);
  const alt = asinDeg(sinAlt);
  const cosAz = (sinDeg(decTopo) - sinDeg(lat) * sinAlt) / (cosDeg(lat) * cosDeg(alt));
  let az = acosDeg(cosAz);
  if (sinDeg(haTopo) > 0) {
    az = 360 - az;
  }

  const apparentAlt = alt + getRefractionCorrection(alt);

  // Calculate Phase and Illumination
  // Phase angle between Sun and Moon as seen from Earth
  // Elongation:
  const sunPos = calculateSun(date, lat, lon);
  const elongation = acosDeg(
    cosDeg(sunPos.declination) * cosDeg(decGeo) * cosDeg(sunPos.rightAscension - raGeo) +
    sinDeg(sunPos.declination) * sinDeg(decGeo)
  );

  // Phase angle:
  const R_sun = sunPos.distanceKm;
  const R_moon = distanceKm;
  const phi = 180 - elongation + (R_moon / R_sun) * RAD2DEG * sinDeg(elongation);

  // Illuminated fraction k = (1 + cos(phi)) / 2
  const k = (1 + cosDeg(phi)) / 2;

  // Waxing vs Waning determination based on relative RA
  let diffRA = normalizeDeg(raGeo - sunPos.rightAscension);
  const waxing = diffRA < 180;

  // Normalized phase from 0 to 1
  let phaseNormalized = 0;
  if (waxing) {
    phaseNormalized = (1 - cosDeg(elongation)) / 4; // 0 to 0.5
  } else {
    phaseNormalized = 1 - (1 - cosDeg(elongation)) / 4; // 0.5 to 1.0
  }

  // Phase name
  let phaseName = 'New Moon';
  if (phaseNormalized < 0.03 || phaseNormalized > 0.97) {
    phaseName = 'New Moon';
  } else if (phaseNormalized < 0.22) {
    phaseName = 'Waxing Crescent';
  } else if (phaseNormalized < 0.28) {
    phaseName = 'First Quarter';
  } else if (phaseNormalized < 0.47) {
    phaseName = 'Waxing Gibbous';
  } else if (phaseNormalized < 0.53) {
    phaseName = 'Full Moon';
  } else if (phaseNormalized < 0.72) {
    phaseName = 'Waning Gibbous';
  } else if (phaseNormalized < 0.78) {
    phaseName = 'Last Quarter';
  } else {
    phaseName = 'Waning Crescent';
  }

  const synodicMonthDays = 29.53058867;
  const ageDays = phaseNormalized * synodicMonthDays;

  // Real-time Parallactic Angle (observer orientation of lunar disk)
  const parallacticAngle = atan2Deg(
    sinDeg(haTopo) * cosDeg(lat),
    sinDeg(lat) * cosDeg(decTopo) - cosDeg(lat) * sinDeg(decTopo) * cosDeg(haTopo)
  );

  // Position angle of the Sun with respect to the Moon (angle of the bright limb towards North)
  const dRA = sunPos.rightAscension - raTopo;
  const brightLimbNorth = atan2Deg(
    cosDeg(sunPos.declination) * sinDeg(dRA),
    sinDeg(sunPos.declination) * cosDeg(decTopo) - cosDeg(sunPos.declination) * sinDeg(decTopo) * cosDeg(dRA)
  );

  // Position angle of the bright limb with respect to local zenith (as seen from observer's eyes)
  const brightLimbZenith = normalizeDeg(brightLimbNorth - parallacticAngle);

  return {
    altitude: alt,
    apparentAltitude: apparentAlt,
    azimuth: az,
    rightAscension: raTopo,
    declination: decTopo,
    distanceKm,
    eclipticLon: lonMoon,
    eclipticLat: latMoon,
    phase: {
      phase: phaseNormalized,
      fraction: Math.max(0, Math.min(1, k)),
      phaseName,
      ageDays,
      waxing,
      angleToSunDeg: elongation,
      parallacticAngleDeg: parallacticAngle,
      brightLimbZenithDeg: brightLimbZenith,
    },
  };
}

// Calculate Moon Rise, Set, Transit for a given date
export function calculateMoonTimes(date: Date, lat: number, lon: number): MoonTimes {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const targetAlt = -0.583; // Moon visual horizon target (semi-diameter + refraction)
  const stepMinutes = 15;
  const totalSteps = (24 * 60) / stepMinutes;

  let moonrise: Date | null = null;
  let moonset: Date | null = null;
  let maxAlt = -999;
  let transitTime: Date | null = null;

  let prevAlt: number | null = null;
  let prevDate: Date | null = null;

  for (let i = 0; i <= totalSteps; i++) {
    const curTime = new Date(startOfDay.getTime() + i * stepMinutes * 60000);
    const moon = calculateMoon(curTime, lat, lon);
    const alt = moon.apparentAltitude;

    if (alt > maxAlt) {
      maxAlt = alt;
      transitTime = curTime;
    }

    if (prevAlt !== null && prevDate !== null) {
      // Crossing target altitude from below (Moonrise)
      if (prevAlt < targetAlt && alt >= targetAlt && !moonrise) {
        const factor = (targetAlt - prevAlt) / (alt - prevAlt);
        const interpolatedMs = prevDate.getTime() + factor * (curTime.getTime() - prevDate.getTime());
        moonrise = new Date(interpolatedMs);
      }
      // Crossing target altitude from above (Moonset)
      if (prevAlt >= targetAlt && alt < targetAlt && !moonset) {
        const factor = (prevAlt - targetAlt) / (prevAlt - alt);
        const interpolatedMs = prevDate.getTime() + factor * (curTime.getTime() - prevDate.getTime());
        moonset = new Date(interpolatedMs);
      }
    }

    prevAlt = alt;
    prevDate = curTime;
  }

  const alwaysUp = !moonrise && !moonset && (prevAlt !== null && prevAlt > targetAlt);
  const alwaysDown = !moonrise && !moonset && (prevAlt !== null && prevAlt <= targetAlt);

  return {
    moonrise,
    moonTransit: transitTime,
    moonset,
    alwaysUp,
    alwaysDown,
  };
}

// Preset locations worldwide
export const PRESET_LOCATIONS: LocationInfo[] = [
  { name: 'Chennai (India)', lat: 13.0827, lon: 80.2707, elevationMeters: 6 },
  { name: 'Kottayam (Kerala, India)', lat: 9.5916, lon: 76.5222, elevationMeters: 3 },
  { name: 'Greenwich Observatory (UK)', lat: 51.4769, lon: 0.0005, elevationMeters: 46 },
  { name: 'New York (USA)', lat: 40.7128, lon: -74.0060, elevationMeters: 10 },
  { name: 'San Francisco (USA)', lat: 37.7749, lon: -122.4194, elevationMeters: 16 },
  { name: 'Tokyo (Japan)', lat: 35.6762, lon: 139.6503, elevationMeters: 40 },
  { name: 'Sydney (Australia)', lat: -33.8688, lon: 151.2093, elevationMeters: 19 },
  { name: 'Cairo (Egypt)', lat: 30.0444, lon: 31.2357, elevationMeters: 23 },
  { name: 'Mauna Kea Observatory (Hawaii)', lat: 19.8207, lon: -155.4681, elevationMeters: 4205 },
  { name: 'Atacama ALMA (Chile)', lat: -23.0228, lon: -67.7550, elevationMeters: 5050 },
  { name: 'Reykjavik (Iceland - Arctic)', lat: 64.1466, lon: -21.9426, elevationMeters: 15 },
  { name: 'Quito (Ecuador - Equator)', lat: -0.1807, lon: -78.4678, elevationMeters: 2850 },
  { name: 'Paris (France)', lat: 48.8566, lon: 2.3522, elevationMeters: 35 },
  { name: 'Mumbai (India)', lat: 19.0760, lon: 72.8777, elevationMeters: 14 },
];
