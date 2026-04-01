import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const DEFAULT_BASE_URL = process.env['SEEDHAPE_BASE_URL'] ?? 'https://seedhape.onrender.com';
const DEFAULT_API_KEY = process.env['SEEDHAPE_API_KEY'];

const commonInputShape = {
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
};

const paginationInputShape = {
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
};

const createOrderInputSchema = {
  ...commonInputShape,
  amount: z.number().int().positive(),
  description: z.string().max(100).optional(),
  externalOrderId: z.string().max(128).optional(),
  expectedSenderName: z.string().min(2).max(100).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(7).max(20).optional(),
  expiresInMinutes: z.number().int().positive().max(1440).optional(),
  metadata: z.record(z.unknown()).optional(),
};

const getOrderInputSchema = {
  ...commonInputShape,
  orderId: z.string().min(1),
};

const createPaymentLinkInputSchema = {
  ...commonInputShape,
  title: z.string().trim().min(1).max(255),
  description: z.string().max(1000).optional(),
  linkType: z.enum(['REUSABLE', 'ONE_TIME']).optional(),
  amount: z.number().int().positive().max(10_000_000).optional(),
  minAmount: z.number().int().positive().optional(),
  maxAmount: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  customerName: z.string().trim().min(2).max(100).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
};

const updatePaymentLinkInputSchema = {
  ...commonInputShape,
  linkId: z.string().min(1),
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
};

interface SeedhapeErrorShape {
  error?: string;
  code?: string;
}

async function callSeedhapeApi<TResponse>(params: {
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown | undefined;
  requireAuth?: boolean;
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
}): Promise<TResponse> {
  const {
    path,
    method = 'GET',
    body,
    requireAuth = true,
    baseUrl = DEFAULT_BASE_URL,
    apiKey = DEFAULT_API_KEY,
  } = params;

  if (requireAuth && !apiKey) {
    throw new Error(
      'Missing API key. Set SEEDHAPE_API_KEY in MCP env or pass apiKey in tool input.',
    );
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (requireAuth && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };
  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, requestInit);

  const raw = await response.text();
  const parsed = raw.length > 0 ? (safeJsonParse(raw) as unknown) : null;

  if (!response.ok) {
    const errorBody = (parsed ?? {}) as SeedhapeErrorShape;
    const errorMessage =
      errorBody.error ?? `SeedhaPe API call failed with status ${response.status}`;
    const errorCode = errorBody.code ? ` (${errorBody.code})` : '';
    throw new Error(`${errorMessage}${errorCode}`);
  }

  return parsed as TResponse;
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return { raw: input };
  }
}

function jsonResult(data: unknown) {
  const structuredContent =
    data !== null && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { result: data };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent,
  };
}

function pickDefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function mergeAuthConfig(input: { baseUrl?: string | undefined; apiKey?: string | undefined }) {
  return {
    ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
    ...(input.apiKey ? { apiKey: input.apiKey } : {}),
  };
}

function buildQuery(input: { page?: number | undefined; limit?: number | undefined }): string {
  const params = new URLSearchParams();
  if (input.page !== undefined) params.set('page', String(input.page));
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const server = new McpServer({
  name: 'seedhape-mcp-server',
  version: '0.1.0',
});

server.tool(
  'create_order',
  'Create a new SeedhaPe payment order (authenticated).',
  createOrderInputSchema,
  async (input) => {
    const body = pickDefined({
      amount: input.amount,
      description: input.description,
      externalOrderId: input.externalOrderId,
      expectedSenderName: input.expectedSenderName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      expiresInMinutes: input.expiresInMinutes,
      metadata: input.metadata,
    });

    const order = await callSeedhapeApi({
      path: '/v1/orders',
      method: 'POST',
      body,
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(order);
  },
);

server.tool(
  'verify_payment',
  'Poll order status until it becomes terminal (VERIFIED/RESOLVED/EXPIRED/REJECTED) or times out.',
  {
    ...getOrderInputSchema,
    pollIntervalSeconds: z.number().int().positive().max(60).optional(),
    timeoutSeconds: z.number().int().positive().max(3600).optional(),
  },
  async (input) => {
    const pollIntervalSeconds = input.pollIntervalSeconds ?? 3;
    const timeoutSeconds = input.timeoutSeconds ?? 180;
    const startedAt = Date.now();
    const terminalStatuses = new Set(['VERIFIED', 'RESOLVED', 'EXPIRED', 'REJECTED']);

    while (true) {
      const status = await callSeedhapeApi<Record<string, unknown>>({
        path: `/v1/orders/${encodeURIComponent(input.orderId)}/status`,
        ...mergeAuthConfig(input),
        requireAuth: true,
      });

      const currentStatus = String(status['status'] ?? '');
      if (terminalStatuses.has(currentStatus)) {
        return jsonResult({
          done: true,
          reason: 'terminal_status',
          elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          result: status,
        });
      }

      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      if (elapsedSeconds >= timeoutSeconds) {
        return jsonResult({
          done: false,
          reason: 'timeout',
          elapsedSeconds: Math.floor(elapsedSeconds),
          result: status,
        });
      }

      await delay(pollIntervalSeconds * 1000);
    }
  },
);

server.tool(
  'get_order',
  'Get full SeedhaPe order details by order ID (authenticated).',
  getOrderInputSchema,
  async (input) => {
    const order = await callSeedhapeApi({
      path: `/v1/orders/${encodeURIComponent(input.orderId)}`,
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(order);
  },
);

server.tool(
  'get_order_status',
  'Get lightweight SeedhaPe order status by order ID (authenticated).',
  getOrderInputSchema,
  async (input) => {
    const status = await callSeedhapeApi({
      path: `/v1/orders/${encodeURIComponent(input.orderId)}/status`,
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(status);
  },
);

server.tool(
  'get_public_order',
  'Get public SeedhaPe payment-page order data by order ID (no auth required).',
  {
    orderId: z.string().min(1),
    baseUrl: z.string().url().optional(),
  },
  async (input) => {
    const order = await callSeedhapeApi({
      path: `/v1/pay/${encodeURIComponent(input.orderId)}`,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      requireAuth: false,
    });

    return jsonResult(order);
  },
);

server.tool(
  'create_payment_link',
  'Create a payment link through internal API-key endpoint (/internal/device/links).',
  createPaymentLinkInputSchema,
  async (input) => {
    const body = pickDefined({
      title: input.title,
      description: input.description,
      linkType: input.linkType,
      amount: input.amount,
      minAmount: input.minAmount,
      maxAmount: input.maxAmount,
      expiresAt: input.expiresAt,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
    });

    const link = await callSeedhapeApi({
      path: '/internal/device/links',
      method: 'POST',
      body,
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(link);
  },
);

server.tool(
  'list_payment_links',
  'List payment links via internal API-key endpoint (/internal/device/links).',
  {
    ...commonInputShape,
    ...paginationInputShape,
  },
  async (input) => {
    const query = buildQuery({ page: input.page, limit: input.limit });
    const links = await callSeedhapeApi({
      path: `/internal/device/links${query}`,
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(links);
  },
);

server.tool(
  'update_payment_link',
  'Update a payment link via internal API-key endpoint (/internal/device/links/:id).',
  updatePaymentLinkInputSchema,
  async (input) => {
    const body = pickDefined({
      title: input.title,
      description: input.description,
      isActive: input.isActive,
      expiresAt: input.expiresAt,
    });

    const updated = await callSeedhapeApi({
      path: `/internal/device/links/${encodeURIComponent(input.linkId)}`,
      method: 'PATCH',
      body,
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(updated);
  },
);

server.tool(
  'get_public_payment_link',
  'Get public payment-link details (/v1/pay/link/:linkId).',
  {
    baseUrl: z.string().url().optional(),
    linkId: z.string().min(1),
  },
  async (input) => {
    const link = await callSeedhapeApi({
      path: `/v1/pay/link/${encodeURIComponent(input.linkId)}`,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      requireAuth: false,
    });

    return jsonResult(link);
  },
);

server.tool(
  'initiate_payment_link',
  'Initiate payment on a public link and receive order details (/v1/pay/link/:linkId/initiate).',
  {
    baseUrl: z.string().url().optional(),
    linkId: z.string().min(1),
    customerName: z.string().trim().min(2).max(100).optional(),
    amount: z.number().int().positive().max(10_000_000).optional(),
  },
  async (input) => {
    const body = pickDefined({
      customerName: input.customerName,
      amount: input.amount,
    });

    const initiated = await callSeedhapeApi({
      path: `/v1/pay/link/${encodeURIComponent(input.linkId)}/initiate`,
      method: 'POST',
      body,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      requireAuth: false,
    });

    return jsonResult(initiated);
  },
);

server.tool(
  'get_device_profile',
  'Get merchant profile via API-key endpoint (/internal/device/profile).',
  commonInputShape,
  async (input) => {
    const profile = await callSeedhapeApi({
      path: '/internal/device/profile',
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(profile);
  },
);

server.tool(
  'list_transactions',
  'List transactions via API-key endpoint (/internal/device/transactions).',
  {
    ...commonInputShape,
    ...paginationInputShape,
  },
  async (input) => {
    const query = buildQuery({ page: input.page, limit: input.limit });
    const rows = await callSeedhapeApi({
      path: `/internal/device/transactions${query}`,
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(rows);
  },
);

server.tool(
  'list_disputes',
  'List disputes via API-key endpoint (/internal/device/disputes).',
  commonInputShape,
  async (input) => {
    const rows = await callSeedhapeApi({
      path: '/internal/device/disputes',
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(rows);
  },
);

server.tool(
  'resolve_dispute',
  'Resolve a dispute (APPROVED or REJECTED) via API-key endpoint (/internal/device/disputes/:id).',
  {
    ...commonInputShape,
    disputeId: z.string().min(1),
    resolution: z.enum(['APPROVED', 'REJECTED']),
    resolutionNote: z.string().max(1000).optional(),
  },
  async (input) => {
    const resolved = await callSeedhapeApi({
      path: `/internal/device/disputes/${encodeURIComponent(input.disputeId)}`,
      method: 'PUT',
      body: pickDefined({
        resolution: input.resolution,
        resolutionNote: input.resolutionNote,
      }),
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(resolved);
  },
);

server.tool(
  'verify_device_api_key',
  'Validate API key and fetch basic merchant summary (/internal/device/verify).',
  commonInputShape,
  async (input) => {
    const result = await callSeedhapeApi({
      path: '/internal/device/verify',
      ...mergeAuthConfig(input),
      requireAuth: true,
    });

    return jsonResult(result);
  },
);

server.tool(
  'get_device_alerts',
  'Get alert counters via device-token endpoint (/internal/device/alerts). Requires x-device-token and x-device-id in apiKey is not supported.',
  {
    baseUrl: z.string().url().optional(),
  },
  async () => {
    return jsonResult({
      supported: false,
      reason:
        'This endpoint requires x-device-token/x-device-id headers. Current MCP server supports Bearer API key auth only.',
    });
  },
);

server.tool(
  'set_expected_sender_name',
  'Set expected sender name on public order (/v1/pay/:orderId/expectation).',
  {
    orderId: z.string().min(1),
    expectedSenderName: z.string().trim().min(2).max(100),
    baseUrl: z.string().url().optional(),
  },
  async (input) => {
    const result = await callSeedhapeApi({
      path: `/v1/pay/${encodeURIComponent(input.orderId)}/expectation`,
      method: 'POST',
      body: { expectedSenderName: input.expectedSenderName },
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      requireAuth: false,
    });

    return jsonResult(result);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main().catch((error) => {
  process.stderr.write(`Failed to start SeedhaPe MCP server: ${String(error)}\n`);
  process.exit(1);
});
