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
  private readonly logger = new Logger(TrafficService.name);
  private readonly forecasts = new Map<string, { expires: number; value: unknown }>();
  private readonly baselines = new Map<string, { expires: number; seconds: number }>();

  constructor(private config: ConfigService) { }

  // ── predicted jams on the routes leading to a parking space

  async getSpaceForecast(space: SpaceLocation, leadMs = DEFAULT_LEAD_MS) {
    const departure = this.resolveDeparture(leadMs);
    const key = `${space.id}:${departure.toISOString()}`;

    const cached = this.forecasts.get(key);
    if (cached && cached.expires > Date.now()) return cached.value as SpaceForecast;

    const apiKey = this.config.get<string>('GOOGLE_ROUTES_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('Traffic provider is not configured');

    const slowRatio = this.ratioSetting('TRAFFIC_SLOW_RATIO', DEFAULT_SLOW_RATIO);
    const jamRatio = this.ratioSetting('TRAFFIC_JAM_RATIO', DEFAULT_JAM_RATIO);

    const routes = await Promise.all(
      APPROACHES.map((approach) =>
        this.predictRoute(space, approach, departure, apiKey, slowRatio, jamRatio),
      ),
    );

    const result: SpaceForecast = {
      space_id: space.id,
      predicted_for: departure.toISOString(),
      jam_expected: routes.some((route) => route.level === 'jam'),
      routes,
    };

    // failed routes are retried on the next request instead of being cached
    if (routes.every((route) => route.level !== 'unknown')) {
      this.pruneForecasts();
      this.forecasts.set(key, { expires: Date.now() + CACHE_MS, value: result });
    }
    return result;
  }

  // ── helpers

  private async predictRoute(
    space: SpaceLocation,
    approach: (typeof APPROACHES)[number],
    departure: Date,
    apiKey: string,
    slowRatio: number,
    jamRatio: number,
  ): Promise<ApproachForecast> {
    const destination = { latitude: space.latitude, longitude: space.longitude };
    const origin = this.approachPoint(destination, approach);
    const base = { direction: approach.direction, origin, destination };

    try {
      const [predictedSeconds, baselineSeconds] = await Promise.all([
        this.fetchDuration(origin, destination, departure, apiKey),
        this.getBaseline(`${space.id}:${approach.direction}`, origin, destination, apiKey),
      ]);
      const ratio = predictedSeconds / baselineSeconds;
      return {
        ...base,
        predicted_seconds: predictedSeconds,
        baseline_seconds: baselineSeconds,
        delay_ratio: Math.round(ratio * 100) / 100,
        level: ratio >= jamRatio ? 'jam' : ratio >= slowRatio ? 'slow' : 'normal',
      };
    } catch (error) {
      this.logger.warn(
        `Traffic lookup failed for ${space.id} (${approach.direction}): ${error instanceof Error ? error.message : error}`,
      );
      return {
        ...base,
        predicted_seconds: null,
        baseline_seconds: null,
        delay_ratio: null,
        level: 'unknown',
      };
    }
  }

  private approachPoint(destination: LatLng, approach: (typeof APPROACHES)[number]): LatLng {
    const degrees = APPROACH_KM / KM_PER_DEGREE;
    const longitudeScale = Math.cos((destination.latitude * Math.PI) / 180);
    return {
      latitude: destination.latitude + approach.north * degrees,
      longitude: destination.longitude + (approach.east * degrees) / longitudeScale,
    };
  }

  private async getBaseline(key: string, origin: LatLng, destination: LatLng, apiKey: string) {
    const cached = this.baselines.get(key);
    if (cached && cached.expires > Date.now()) return cached.seconds;

    const seconds = await this.fetchDuration(origin, destination, this.nextQuietHour(), apiKey);
    this.baselines.set(key, { expires: Date.now() + BASELINE_CACHE_MS, seconds });
    return seconds;
  }

  private async fetchDuration(origin: LatLng, destination: LatLng, departure: Date, apiKey: string) {
    const response = await fetch(ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration',
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        trafficModel: 'BEST_GUESS',
        departureTime: departure.toISOString(),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) throw new Error(`Routes API returned ${response.status}`);

    const payload = (await response.json()) as { routes?: { duration?: string }[] };
    const seconds = Number.parseInt(payload.routes?.[0]?.duration ?? '', 10);
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Routes API returned no duration');
    return seconds;
  }

  // rounded up to 10 minutes so calls for the same space share the cache
  private resolveDeparture(leadMs: number) {
    const requested = Date.now() + Math.max(leadMs, MIN_LEAD_MS);
    return new Date(Math.ceil(requested / ROUND_MS) * ROUND_MS);
  }

  private nextQuietHour() {
    const next = new Date();
    next.setUTCHours(BASELINE_UTC_HOUR, 0, 0, 0);
    if (next.getTime() <= Date.now() + MIN_LEAD_MS) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  private ratioSetting(name: string, fallback: number) {
    const value = Number(this.config.get<string>(name));
    return Number.isFinite(value) && value > 1 ? value : fallback;
  }

  private pruneForecasts() {
    const now = Date.now();
    for (const [key, entry] of this.forecasts) {
      if (entry.expires <= now) this.forecasts.delete(key);
    }
  }
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
