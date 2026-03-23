interface MercatorPoint {
  x: number;
  y: number;
}

const EARTH_RADIUS = 6378137; // WGS84 semi-major axis in meters

/**
 * Convert WGS84 (lat/lon in degrees) to Web Mercator (EPSG:3857) coordinates.
 */
export function wgs84ToWebMercator(lat: number, lon: number): MercatorPoint {
  const x = (lon * Math.PI * EARTH_RADIUS) / 180;
  const latRad = (lat * Math.PI) / 180;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return { x, y };
}
