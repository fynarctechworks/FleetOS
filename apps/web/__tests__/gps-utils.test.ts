import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  haversineDistance,
  isWithinRadius,
  msToKmh,
  shouldSendSpeedAlert,
  isStationary,
  getDriverActionButtons,
  SPEED_LIMIT_KMPH,
  STATIONARY_RADIUS_KM,
  SPEED_ALERT_DEBOUNCE_MINUTES,
} from '@fleetos/shared';

// ─── Haversine Distance ───

describe('haversineDistance', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistance(17.385, 78.4867, 17.385, 78.4867)).toBe(0);
  });

  it('calculates distance between Hyderabad and Mumbai (~620km)', () => {
    const dist = haversineDistance(17.385, 78.4867, 19.076, 72.8777);
    expect(dist).toBeGreaterThan(600);
    expect(dist).toBeLessThan(650);
  });

  it('identifies two points 0.4km apart as within 0.5km radius', () => {
    // ~0.4km apart (roughly same latitude, slight longitude diff)
    const lat1 = 17.385;
    const lon1 = 78.4867;
    // Move ~0.4km east (approx 0.004 degrees at this latitude)
    const lon2 = 78.4905;
    const dist = haversineDistance(lat1, lon1, lat1, lon2);
    expect(dist).toBeLessThan(0.5);
    expect(isWithinRadius(lat1, lon1, lat1, lon2, 0.5)).toBe(true);
  });

  it('calculates Delhi to Chennai (~1750km)', () => {
    const dist = haversineDistance(28.7041, 77.1025, 13.0827, 80.2707);
    expect(dist).toBeGreaterThan(1700);
    expect(dist).toBeLessThan(1800);
  });

  it('handles crossing the equator', () => {
    const dist = haversineDistance(1, 78, -1, 78);
    expect(dist).toBeGreaterThan(200);
    expect(dist).toBeLessThan(250);
  });
});

// ─── isWithinRadius ───

describe('isWithinRadius', () => {
  it('returns true for points within radius', () => {
    // Same point
    expect(isWithinRadius(17.385, 78.486, 17.385, 78.486, 0.5)).toBe(true);
  });

  it('returns false for points outside radius', () => {
    // Hyderabad to Mumbai is ~620km — well outside 0.5km
    expect(isWithinRadius(17.385, 78.4867, 19.076, 72.8777, 0.5)).toBe(false);
  });
});

// ─── msToKmh ───

describe('msToKmh', () => {
  it('converts 0 m/s to 0 km/h', () => {
    expect(msToKmh(0)).toBe(0);
  });

  it('converts 10 m/s to 36 km/h', () => {
    expect(msToKmh(10)).toBe(36);
  });

  it('converts 22.22 m/s to ~80 km/h', () => {
    const result = msToKmh(22.22);
    expect(result).toBeCloseTo(80, 0);
  });

  it('converts 27.78 m/s to ~100 km/h', () => {
    const result = msToKmh(27.78);
    expect(result).toBeCloseTo(100, 0);
  });

  it('rounds to one decimal place', () => {
    // 1.234 m/s * 3.6 = 4.4424 → rounded to 4.4
    expect(msToKmh(1.234)).toBe(4.4);
  });
});

// ─── shouldSendSpeedAlert (debounce) ───

describe('shouldSendSpeedAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when no previous alert was sent', () => {
    expect(shouldSendSpeedAlert(null)).toBe(true);
  });

  it('returns false when last alert was sent 10 minutes ago (within 30-min debounce)', () => {
    const now = new Date('2026-03-02T12:00:00Z');
    vi.setSystemTime(now);

    const tenMinAgo = new Date('2026-03-02T11:50:00Z').toISOString();
    expect(shouldSendSpeedAlert(tenMinAgo, 30)).toBe(false);
  });

  it('returns true when last alert was sent 31 minutes ago (outside 30-min debounce)', () => {
    const now = new Date('2026-03-02T12:00:00Z');
    vi.setSystemTime(now);

    const thirtyOneMinAgo = new Date('2026-03-02T11:29:00Z').toISOString();
    expect(shouldSendSpeedAlert(thirtyOneMinAgo, 30)).toBe(true);
  });

  it('blocks second alert within 30 minutes', () => {
    const now = new Date('2026-03-02T12:00:00Z');
    vi.setSystemTime(now);

    // First alert: never sent → should send
    expect(shouldSendSpeedAlert(null, 30)).toBe(true);

    // Simulate first alert sent at now
    const firstAlertTime = now.toISOString();

    // 15 minutes later: should NOT send
    vi.setSystemTime(new Date('2026-03-02T12:15:00Z'));
    expect(shouldSendSpeedAlert(firstAlertTime, 30)).toBe(false);

    // 29 minutes later: should NOT send
    vi.setSystemTime(new Date('2026-03-02T12:29:00Z'));
    expect(shouldSendSpeedAlert(firstAlertTime, 30)).toBe(false);

    // 30 minutes later: should send
    vi.setSystemTime(new Date('2026-03-02T12:30:00Z'));
    expect(shouldSendSpeedAlert(firstAlertTime, 30)).toBe(true);
  });

  it('respects custom debounce duration', () => {
    const now = new Date('2026-03-02T12:00:00Z');
    vi.setSystemTime(now);

    const tenMinAgo = new Date('2026-03-02T11:50:00Z').toISOString();
    // 10 minutes ago with 5-minute debounce → should send
    expect(shouldSendSpeedAlert(tenMinAgo, 5)).toBe(true);
    // 10 minutes ago with 15-minute debounce → should NOT send
    expect(shouldSendSpeedAlert(tenMinAgo, 15)).toBe(false);
  });
});

// ─── isStationary ───

describe('isStationary', () => {
  it('detects stationary vehicle (same location)', () => {
    expect(isStationary(17.385, 78.4867, 17.385, 78.4867)).toBe(true);
  });

  it('detects stationary vehicle within 0.5km', () => {
    // Points ~0.3km apart
    expect(isStationary(17.385, 78.4867, 17.385, 78.490)).toBe(true);
  });

  it('detects moving vehicle beyond 0.5km', () => {
    // Points ~5km apart
    expect(isStationary(17.385, 78.4867, 17.430, 78.4867)).toBe(false);
  });

  it('uses custom radius', () => {
    // Points ~5km apart — within 10km radius
    expect(isStationary(17.385, 78.4867, 17.430, 78.4867, 10)).toBe(true);
    // Same points — outside 1km radius
    expect(isStationary(17.385, 78.4867, 17.430, 78.4867, 1)).toBe(false);
  });
});

// ─── getDriverActionButtons ───

describe('getDriverActionButtons', () => {
  it('enables only DEPART for planned trips', () => {
    const buttons = getDriverActionButtons('planned');
    expect(buttons).toEqual({ depart: true, arrive: false, done: false });
  });

  it('enables only ARRIVE for departed trips', () => {
    const buttons = getDriverActionButtons('departed');
    expect(buttons).toEqual({ depart: false, arrive: true, done: false });
  });

  it('enables only ARRIVE for in_transit trips', () => {
    const buttons = getDriverActionButtons('in_transit');
    expect(buttons).toEqual({ depart: false, arrive: true, done: false });
  });

  it('enables only DONE for arrived trips', () => {
    const buttons = getDriverActionButtons('arrived');
    expect(buttons).toEqual({ depart: false, arrive: false, done: true });
  });

  it('disables all buttons for completed trips', () => {
    const buttons = getDriverActionButtons('completed');
    expect(buttons).toEqual({ depart: false, arrive: false, done: false });
  });

  it('disables all buttons for cancelled trips', () => {
    const buttons = getDriverActionButtons('cancelled');
    expect(buttons).toEqual({ depart: false, arrive: false, done: false });
  });

  it('disables all buttons for unknown status', () => {
    const buttons = getDriverActionButtons('unknown');
    expect(buttons).toEqual({ depart: false, arrive: false, done: false });
  });
});

// ─── Constants ───

describe('GPS constants', () => {
  it('SPEED_LIMIT_KMPH is 80', () => {
    expect(SPEED_LIMIT_KMPH).toBe(80);
  });

  it('STATIONARY_RADIUS_KM is 0.5', () => {
    expect(STATIONARY_RADIUS_KM).toBe(0.5);
  });

  it('SPEED_ALERT_DEBOUNCE_MINUTES is 30', () => {
    expect(SPEED_ALERT_DEBOUNCE_MINUTES).toBe(30);
  });
});
