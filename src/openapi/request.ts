import type { TokenManager } from "./token-manager.js";

interface RequestOptions {
  timeout?: number;
}

interface ApiResponse<T = unknown> {
  errcode: number;
  errmsg: string;
  [key: string]: unknown;
}

export class OpenApiError extends Error {
  constructor(
    public readonly errcode: number,
    public readonly errmsg: string,
    public readonly data?: unknown
  ) {
    super(`企业微信 API 错误 [${errcode}]: ${errmsg}`);
    this.name = "OpenApiError";
  }
}

export interface UploadMediaOptions {
  filename?: string;
  contentType?: string;
}

export function createOpenApiClient(tokenManager: TokenManager) {
  const baseUrl = "https://qyapi.weixin.qq.com/cgi-bin";
  const defaultTimeout = 30000;

  async function request<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    options: RequestOptions = {}
  ): Promise<T> {
    const accessToken = await tokenManager.getAccessToken();
    const url = `${baseUrl}/${method}?access_token=${accessToken}`;
    const timeout = options.timeout || defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const data = (await response.json()) as ApiResponse<T>;

      if (data.errcode !== 0) {
        throw new OpenApiError(data.errcode, data.errmsg, data);
      }

      return data as T;
    } catch (err) {
      if (err instanceof OpenApiError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`OpenAPI 请求超时 (${timeout}ms)`);
      }
      throw new Error(`OpenAPI 请求失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function get<T = unknown>(
    method: string,
    params: Record<string, string> = {},
    options: RequestOptions = {}
  ): Promise<T> {
    const accessToken = await tokenManager.getAccessToken();
    const queryString = new URLSearchParams({ access_token: accessToken, ...params }).toString();
    const url = `${baseUrl}/${method}?${queryString}`;
    const timeout = options.timeout || defaultTimeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });

      const data = (await response.json()) as ApiResponse<T>;

      if (data.errcode !== 0) {
        throw new OpenApiError(data.errcode, data.errmsg, data);
      }

      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function upload<T = unknown>(
    method: string,
    buffer: Buffer,
    type: string,
    options: UploadMediaOptions = {},
    requestOptions: RequestOptions = {}
  ): Promise<T> {
    const accessToken = await tokenManager.getAccessToken();
    const url = `${baseUrl}/${method}?access_token=${accessToken}&type=${type}`;
    const timeout = requestOptions.timeout || 120000;

    const filename = options.filename || `media_${Date.now()}`;
    const contentType = options.contentType || "application/octet-stream";

    const boundary = `----WebKitFormBoundary${Date.now().toString(16)}`;
    
    const parts: Uint8Array[] = [];
    
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
    parts.push(new TextEncoder().encode(header));
    parts.push(new Uint8Array(buffer));
    parts.push(new TextEncoder().encode(`\r\n--${boundary}--\r\n`));
    
    const body = new Uint8Array(parts.reduce((acc, part) => acc + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      body.set(part, offset);
      offset += part.length;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": `multipart/form-data; boundary=${boundary}` 
        },
        body: body,
        signal: controller.signal,
      });

      const data = (await response.json()) as ApiResponse<T>;

      if (data.errcode !== 0) {
        throw new OpenApiError(data.errcode, data.errmsg, data);
      }

      return data as T;
    } catch (err) {
      if (err instanceof OpenApiError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`OpenAPI 上传超时 (${timeout}ms)`);
      }
      throw new Error(`OpenAPI 上传失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    request,
    get,
    upload,
  };
}

export type OpenApiClient = ReturnType<typeof createOpenApiClient>;