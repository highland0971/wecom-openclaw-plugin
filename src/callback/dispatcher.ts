import type { RuntimeEnv } from 'openclaw/plugin-sdk/runtime-env';

// MsgContext and FinalizedMsgContext types from openclaw
// Using 'any' to avoid module resolution issues during build
type MsgContext = any;
type FinalizedMsgContext = any;
import { sendCallbackReply } from './reply-sender.js';

export interface CallbackDispatcherOptions {
  corpId: string;
  agentId: number;
  runtime: RuntimeEnv;
  accountId: string;
  config: any;
}

export function createCallbackReplyDispatcher(options: CallbackDispatcherOptions) {
  const { corpId, agentId, runtime, accountId, config } = options;

  return {
    async onTextChunk(params: { text: string; ctx: MsgContext | FinalizedMsgContext }): Promise<void> {
      runtime.log?.(
        `[wecom][callback][${accountId}] Text chunk: ${params.text.substring(0, 50)}...`
      );
    },

    async onBlockReply(params: { text: string; ctx: MsgContext | FinalizedMsgContext }): Promise<void> {
      const { text, ctx } = params;
      
      const fromUser = ctx.From?.replace('wecom:', '') || '';
      
      if (!fromUser) {
        runtime.error?.(`[wecom][callback][${accountId}] Missing From user in context`);
        return;
      }

      runtime.log?.(
        `[wecom][callback][${accountId}] Sending block reply to ${fromUser}: ${text.substring(0, 50)}...`
      );

      try {
        await sendCallbackReply({
          corpId,
          agentId,
          runtime,
          accountId,
          toUser: fromUser,
          content: text,
          msgType: 'markdown'
        });
      } catch (err) {
        runtime.error?.(
          `[wecom][callback][${accountId}] Block reply failed: ${String(err)}`
        );
      }
    },

    async onReplyStart(params: { ctx: MsgContext | FinalizedMsgContext }): Promise<void> {
      runtime.log?.(`[wecom][callback][${accountId}] Reply started`);
    },

    async onReplyEnd(params: { ctx: MsgContext | FinalizedMsgContext }): Promise<void> {
      runtime.log?.(`[wecom][callback][${accountId}] Reply ended`);
    }
  };
}