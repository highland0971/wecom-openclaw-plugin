import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { emptyPluginConfigSchema } from "./src/openclaw-compat.js";
import { wecomPlugin } from "./src/channel.js";
import { createWeComMcpTool } from "./src/mcp";
import { setWeComRuntime } from "./src/runtime.js";
import { CHANNEL_ID } from "./src/const.js";
import { initOpenApiService } from "./src/openapi/index.js";
import { resolveWeComAccount } from "./src/utils.js";
import { handleWeComCallback } from "./src/callback/index.js";

// ============================================================================
// 需要自动注入 tools.alsoAllow 的工具名列表
// ============================================================================

const REQUIRED_ALSO_ALLOW_TOOLS = ["wecom_mcp"] as const;

/**
 * 确保 tools.alsoAllow 中包含插件所需的工具名。
 *
 * 逻辑：
 *  1. 读取当前配置
 *  2. 检查 tools.alsoAllow 中是否已包含所需工具
 *  3. 如有缺失，合并写入配置文件
 *
 * 幂等操作——重复调用不会产生副作用。
 * 若 tools.allow 已显式设置（与 alsoAllow 互斥），则跳过注入并打印提示。
 */
async function ensureToolsAlsoAllow(api: OpenClawPluginApi): Promise<void> {
  try {
    const cfg = api.runtime.config.loadConfig();
    const tools = cfg.tools ?? {};

    // 如果用户显式配置了 tools.allow（全量白名单），则 alsoAllow 与之互斥，
    // 此时不应自动追加 alsoAllow，避免产生校验冲突
    if (tools.allow && tools.allow.length > 0) {
      const missing = REQUIRED_ALSO_ALLOW_TOOLS.filter(
        (t) => !tools.allow!.includes(t),
      );
      if (missing.length > 0) {
        console.warn(
          `[wecom] tools.allow 已显式设置，无法自动注入 alsoAllow。` +
          `请手动将 ${JSON.stringify(missing)} 加入 tools.allow。`,
        );
      }
      return;
    }

    const existing = tools.alsoAllow ?? [];
    const missing = REQUIRED_ALSO_ALLOW_TOOLS.filter(
      (t) => !existing.includes(t),
    );

    if (missing.length === 0) {
      // 所有工具已在白名单中，无需操作
      return;
    }

    const merged = [...existing, ...missing];
    const nextConfig = {
      ...cfg,
      tools: {
        ...tools,
        alsoAllow: merged,
      },
    };

    await api.runtime.config.writeConfigFile(nextConfig);
    console.log(
      `[wecom] 已自动将 ${JSON.stringify(missing)} 加入 tools.alsoAllow`,
    );
  } catch (err) {
    // 配置写入失败不应阻断 Gateway 启动
    console.error(
      `[wecom] 自动注入 tools.alsoAllow 失败:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

const plugin = {
  id: "wecom-openclaw-plugin",
  name: "企业微信",
  description: "企业微信 OpenClaw 插件",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {

    setWeComRuntime(api.runtime);
    api.registerChannel({ plugin: wecomPlugin });

    api.registerTool(createWeComMcpTool(), { name: "wecom_mcp" });

    const cfg = api.runtime.config.loadConfig();
    const account = resolveWeComAccount(cfg);

    if (account.corpId && account.agentSecret) {
      initOpenApiService(
        {
          getCorpId: () => account.corpId,
          getAgentId: () => account.agentId,
          getAgentSecret: () => account.agentSecret,
        },
        api.runtime as unknown as RuntimeEnv
      );
      console.log("[wecom] OpenAPI 服务已初始化");
    } else {
      console.log("[wecom] OpenAPI 服务未启用（需要配置 corpId 和 agentSecret）");
    }

    // 注册企业微信回调路由（如果配置了回调参数）
    const callbackConfig = (cfg as any).channels?.wecom?.callback;
    if (callbackConfig && callbackConfig.token && callbackConfig.encodingAESKey) {
      const callbackPath = callbackConfig.path || "/wecom/callback";
      
      api.registerHttpRoute({
        path: callbackPath,
        handler: async (req, res) => {
          return handleWeComCallback(req, res, {
            callback: callbackConfig,
            runtime: api.runtime as any,
            accountId: account.accountId || "default",
            corpId: account.corpId || callbackConfig.corpId,
            agentId: account.agentId,
            agentSecret: account.agentSecret,
            config: cfg
          });
        },
        auth: "plugin",
        match: "exact"
      });
      
      console.log(`[wecom] 回调路由已注册: ${callbackPath}`);
    }

    const hasWebSocketMode = Boolean(account.botId && account.secret);
    const hasCallbackMode = Boolean(
      callbackConfig?.token &&
      callbackConfig?.encodingAESKey &&
      account.corpId &&
      account.agentSecret
    );

    if (hasWebSocketMode && hasCallbackMode) {
      console.warn(
        `[wecom] 警告：同时配置了 WebSocket Bot 模式和 HTTP 回调模式。\n` +
        `  - WebSocket 模式: botId=${account.botId}\n` +
        `  - 回调模式: corpId=${account.corpId}\n` +
        `这可能导致每条消息被处理两次。建议只使用一种模式。\n` +
        `参考文档: docs/DUAL_MODE_ARCHITECTURE.md`
      );
    }

    // 注入媒体发送指令和文件大小限制提示词（仅对企业微信 channel 生效）
    api.on("before_prompt_build", (_event, ctx) => {
      // 只在企业微信 channel 的会话中注入，避免影响其他 channel 插件
      if (ctx?.channelId !== CHANNEL_ID) {
        return;
      }
      return {
        appendSystemContext: [
          "重要：涉及发送图片/视频/语音/文件给用户时，请务必使用 `MEDIA:` 指令。详见  wecom-send-media 这个 skill（技能）。",
          "重要：当需要向用户发送结构化卡片消息（如通知、投票、按钮选择等）时，请在回复中直接输出 JSON 代码块（```json ... ```），其中 card_type 字段标明卡片类型。详见 wecom-send-template-card 技能。"
        ].join("\n"),
      };
    });
  },
};

export default plugin;
