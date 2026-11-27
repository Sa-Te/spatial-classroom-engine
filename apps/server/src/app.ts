import Fastify, { type FastifyInstance } from 'fastify';
import type { HealthResponse } from '@sce/contracts';

export interface BuildAppOptions {
  isReady: () => Promise<boolean>;
}

const SERVICE_NAME = 'sce-server';
const SERVICE_VERSION = process.env.APP_VERSION ?? '0.0.0';

export function buildApp({ isReady }: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health/live', async (): Promise<HealthResponse> => {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
    };
  });

  app.get('/health/ready', async (_request, reply): Promise<HealthResponse> => {
    let database: 'up' | 'down' = 'down';

    try {
      database = (await isReady()) ? 'up' : 'down';
    } catch {
      database = 'down';
    }

    if (database === 'down') {
      reply.code(503);
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      database,
    };
  });

  return app;
}
