import type { RuntimeEnv } from 'openclaw/plugin-sdk/runtime-env';
import { getOpenApiService } from '../openapi/index.js';

export interface ReplySenderContext {
  corpId: string;
  agentId: number;
  runtime: RuntimeEnv;
  accountId: string;
}

export interface SendReplyOptions {
  toUser: string;
  content: string;
  msgType?: 'text' | 'markdown';
}

export async function sendCallbackReply(
  params: ReplySenderContext & SendReplyOptions
): Promise<{ messageId: string }> {
  const { corpId, agentId, runtime, accountId, toUser, content, msgType = 'markdown' } = params;

  runtime.log?.(`[wecom][callback][${accountId}] Sending reply to ${toUser}`);

  const openApi = getOpenApiService();
  if (!openApi) {
    runtime.error?.(`[wecom][callback][${accountId}] OpenAPI service not initialized`);
    throw new Error('OpenAPI service not initialized');
  }

  try {
    const result = await openApi.message.send({
      touser: toUser,
      msgtype: msgType,
      agentid: agentId,
      [msgType]: {
        content: content
      }
    });

    if (result.errcode !== 0) {
      runtime.error?.(
        `[wecom][callback][${accountId}] Send reply failed: errcode=${result.errcode}, errmsg=${result.errmsg}`
      );
      throw new Error(`Send message failed: ${result.errmsg}`);
    }

    runtime.log?.(`[wecom][callback][${accountId}] Reply sent successfully`);

    return {
      messageId: result.msgid || ''
    };

  } catch (err) {
    runtime.error?.(
      `[wecom][callback][${accountId}] Send reply error: ${String(err)}`
    );
    throw err;
  }
}

export function formatReplyContent(text: string): string {
  return text.trim();
}