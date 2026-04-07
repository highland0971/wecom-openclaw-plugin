import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";

interface TokenInfo {
  accessToken: string;
  expiresIn: number;
  obtainedAt: number;
}

interface WeComConfig {
  corpId?: string;
  agentId?: string;
  agentSecret?: string;
}

const TOKEN_URL = "https://qyapi.weixin.qq.com/cgi-bin/gettoken";
const TOKEN_EXPIRE_BUFFER_MS = 5 * 60 * 1000;

const tokenCache = new Map<string, TokenInfo>();

export function createTokenManager(
  getCorpId: () => string | undefined,
  getAgentSecret: () => string | undefined,
  runtime: RuntimeEnv
) {
  const cacheKey = "default";

  async function getAccessToken(): Promise<string> {
    const corpId = getCorpId();
    const secret = getAgentSecret();

    if (!corpId || !secret) {
      throw new Error("企业微信配置不完整: 需要 corpId 和 agentSecret");
    }

    const cached = tokenCache.get(cacheKey);
    if (cached && Date.now() < cached.obtainedAt + cached.expiresIn * 1000 - TOKEN_EXPIRE_BUFFER_MS) {
      return cached.accessToken;
    }

    runtime.log?.("[openapi] 获取新的 access_token...");

    const response = await fetch(`${TOKEN_URL}?corpid=${corpId}&corpsecret=${secret}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json() as { errcode?: number; errmsg?: string; access_token?: string; expires_in?: number };

    if (data.errcode && data.errcode !== 0) {
      throw new Error(`获取 access_token 失败: ${data.errmsg} (${data.errcode})`);
    }

    if (!data.access_token) {
      throw new Error("获取 access_token 失败: 响应中没有 access_token");
    }

    const tokenInfo: TokenInfo = {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 7200,
      obtainedAt: Date.now(),
    };

    tokenCache.set(cacheKey, tokenInfo);
    runtime.log?.(`[openapi] access_token 已缓存，有效期 ${tokenInfo.expiresIn} 秒`);

    return tokenInfo.accessToken;
  }

  function clearCache(): void {
    tokenCache.delete(cacheKey);
    runtime.log?.("[openapi] access_token 缓存已清除");
  }

  return {
    getAccessToken,
    clearCache,
  };
}

export type TokenManager = ReturnType<typeof createTokenManager>;