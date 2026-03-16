import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface ScimClientConfig {
  baseUrl: string;
  token: string;
  customHeaders?: Record<string, string>;
}

export interface ScimRequest {
  method: string;
  url: string;
  body?: unknown;
  params?: Record<string, string | number>;
}

export interface ScimResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
  request: ScimRequest;
  durationMs: number;
}

export function createScimClient(config: ScimClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseUrl,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/scim+json, application/json',
      ...config.customHeaders,
    },
    timeout: 15000,
    validateStatus: () => true, // don't throw on non-2xx
  });
  return client;
}

export async function scimGet(
  client: AxiosInstance,
  path: string,
  params?: Record<string, string | number>
): Promise<ScimResponse> {
  const start = Date.now();
  const res: AxiosResponse = await client.get(path, { params });
  return {
    status: res.status,
    data: res.data,
    headers: res.headers as Record<string, string>,
    request: { method: 'GET', url: path, params },
    durationMs: Date.now() - start,
  };
}

export async function scimPost(
  client: AxiosInstance,
  path: string,
  body: unknown
): Promise<ScimResponse> {
  const start = Date.now();
  const res: AxiosResponse = await client.post(path, body);
  return {
    status: res.status,
    data: res.data,
    headers: res.headers as Record<string, string>,
    request: { method: 'POST', url: path, body },
    durationMs: Date.now() - start,
  };
}

export async function scimPatch(
  client: AxiosInstance,
  path: string,
  body: unknown
): Promise<ScimResponse> {
  const start = Date.now();
  const res: AxiosResponse = await client.patch(path, body);
  return {
    status: res.status,
    data: res.data,
    headers: res.headers as Record<string, string>,
    request: { method: 'PATCH', url: path, body },
    durationMs: Date.now() - start,
  };
}
