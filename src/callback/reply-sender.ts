import type { RuntimeEnv } from 'openclaw/plugin-sdk/runtime-env';
import { getOpenApiService, type MediaType } from '../openapi/index.js';

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

export interface SendMediaReplyOptions {
  toUser: string;
  buffer: Buffer;
  mediaType: MediaType;
  filename?: string;
  contentType?: string;
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

export async function sendCallbackMediaReply(
  params: ReplySenderContext & SendMediaReplyOptions
): Promise<{ messageId: string; mediaId: string }> {
  const { corpId, agentId, runtime, accountId, toUser, buffer, mediaType, filename, contentType } = params;

  runtime.log?.(`[wecom][callback][${accountId}] Uploading ${mediaType} media for ${toUser}`);

  const openApi = getOpenApiService();
  if (!openApi) {
    runtime.error?.(`[wecom][callback][${accountId}] OpenAPI service not initialized`);
    throw new Error('OpenAPI service not initialized');
  }

  try {
    const uploadResult = await openApi.media.upload({
      buffer,
      type: mediaType,
      filename,
      contentType,
    });

    runtime.log?.(`[wecom][callback][${accountId}] Media uploaded: media_id=${uploadResult.media_id}`);

    const sendResult = await openApi.message.send({
      touser: toUser,
      msgtype: mediaType,
      agentid: agentId,
      [mediaType]: {
        media_id: uploadResult.media_id
      }
    });

    if (sendResult.errcode !== 0) {
      runtime.error?.(
        `[wecom][callback][${accountId}] Send media failed: errcode=${sendResult.errcode}, errmsg=${sendResult.errmsg}`
      );
      throw new Error(`Send media message failed: ${sendResult.errmsg}`);
    }

    runtime.log?.(`[wecom][callback][${accountId}] Media reply sent successfully`);

    return {
      messageId: sendResult.msgid || '',
      mediaId: uploadResult.media_id
    };

  } catch (err) {
    runtime.error?.(
      `[wecom][callback][${accountId}] Send media reply error: ${String(err)}`
    );
    throw err;
  }
}

export function formatReplyContent(text: string): string {
  return text.trim();
}