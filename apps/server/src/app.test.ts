import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('health routes', () => {
  it('returns 200 from liveness', async () => {
    const app = buildApp({ isReady: async () => true });

    try {
      const response = await app.inject({ method: 'GET', url: '/health/live' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'ok',
        service: 'sce-server',
        version: '0.0.0',
      });
    } finally {
      await app.close();
    }
  });

  it('returns 200 from readiness when the check passes', async () => {
    const app = buildApp({ isReady: async () => true });

    try {
      const response = await app.inject({ method: 'GET', url: '/health/ready' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'ok', database: 'up' });
    } finally {
      await app.close();
    }
  });

  it('returns 503 from readiness when the check returns false', async () => {
    const app = buildApp({ isReady: async () => false });

    try {
      const response = await app.inject({ method: 'GET', url: '/health/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ status: 'degraded', database: 'down' });
    } finally {
      await app.close();
    }
  });

  it('returns 503 from readiness when the check throws', async () => {
    const app = buildApp({
      isReady: async () => {
        throw new Error('database unavailable');
      },
    });

    try {
      const response = await app.inject({ method: 'GET', url: '/health/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ status: 'degraded', database: 'down' });
    } finally {
      await app.close();
    }
  });
});
