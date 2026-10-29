import type { Request, Response } from 'express';

export function getOpenApiSpec(_req: Request, res: Response): void {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'OptiTrader Lab API',
      version: '0.1.0',
      description: 'API for algorithmic strategy backtesting, grid optimization, and Gemini assistant integration.',
    },
    servers: [
      {
        url: '/api',
        description: 'Current environment API server',
      },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Registration successful' },
            '400': { description: 'Validation failed' },
          },
        },
      },
      '/auth/login': {
        post: {
          summary: 'User login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/runs': {
        get: {
          summary: 'List runs with filtering and pagination',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'strategy_type', in: 'query', schema: { type: 'string' } },
            { name: 'dataset_id', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Paginated runs list' },
          },
        },
        post: {
          summary: 'Create and launch an optimization backtest run',
          responses: {
            '200': { description: 'Run initiated' },
          },
        },
      },
      '/runs/{id}/cancel': {
        post: {
          summary: 'Cancel an active run',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Run cancelled successfully' },
            '400': { description: 'Run is not in an active state' },
            '404': { description: 'Run not found' },
          },
        },
      },
      '/runs/{id}/retry': {
        post: {
          summary: 'Retry a failed or completed run',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'New run launched with retried_from set' },
            '404': { description: 'Run not found' },
          },
        },
      },
      '/runs/{id}/logs': {
        get: {
          summary: 'Get execution and diagnostic logs for a run',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Run logs' },
            '404': { description: 'Run not found' },
          },
        },
      },
      '/datasets': {
        get: {
          summary: 'List datasets',
          responses: { '200': { description: 'Dataset list' } },
        },
        post: {
          summary: 'Upload dataset CSV (multipart/form-data)',
          responses: { '200': { description: 'Dataset created' } },
        },
      },
      '/profiles': {
        get: {
          summary: 'List strategy profiles',
          responses: { '200': { description: 'Strategy profiles' } },
        },
        post: {
          summary: 'Create strategy profile',
          responses: { '200': { description: 'Profile created' } },
        },
      },
    },
  };

  res.json(spec);
}

