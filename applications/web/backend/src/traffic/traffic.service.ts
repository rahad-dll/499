import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LatLng {
  latitude: number;
  longitude: number;
}

export interface SpaceLocation {
  id: string;
  latitude: number;
  longitude: number;
}

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const CACHE_MS = 10 * 60 * 1000;
const BASELINE_CACHE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LEAD_MS = 30 * 60 * 1000;
const MIN_LEAD_MS = 60 * 1000;
const ROUND_MS = 10 * 60 * 1000;
const DEFAULT_SLOW_RATIO = 1.3;
const DEFAULT_JAM_RATIO = 1.8;
const APPROACH_KM = 2;
const KM_PER_DEGREE = 111;
const BASELINE_UTC_HOUR = 21;
const APPROACHES = [
  { direction: 'north', north: 1, east: 0 },
  { direction: 'east', north: 0, east: 1 },
  { direction: 'south', north: -1, east: 0 },
  { direction: 'west', north: 0, east: -1 },
];

@Injectable()
export class TrafficService {

}

export interface ApproachForecast {
  direction: string;
  origin: LatLng;
  destination: LatLng;
  predicted_seconds: number | null;
  baseline_seconds: number | null;
  delay_ratio: number | null;
  level: 'normal' | 'slow' | 'jam' | 'unknown';
}

export interface SpaceForecast {
  space_id: string;
  predicted_for: string;
  jam_expected: boolean;
  routes: ApproachForecast[];
}
