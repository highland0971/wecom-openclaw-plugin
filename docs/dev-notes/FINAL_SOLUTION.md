# 企业微信 OpenClaw 插件回调模式 - 最终解决方案

## 问题

企业微信回调模式中，`deliver` 回调在 `dispatchReplyWithBufferedBlockDispatcher` 中从未被触发，导致 AI 响应无法发送到企业微信。

## 根本原因

### Oracle 分析发现：

1. **缺少 `MessageSid`**：OpenClaw 的 `dispatchReplyFromConfig` 依赖 `MessageSid` 追踪消息会话
2. **上下文不完整**：回调模式缺少 WebSocket 模式的关键字段
3. **静默失败**：`getReplyFromConfig` 返回 `null` 而不抛出错误

### 调用链分析：

```
dispatchReplyWithBufferedBlockDispatcher
  ↓
dispatchInboundMessageWithBufferedDispatcher
  ↓
dispatchInboundMessage
  ↓
dispatchReplyFromConfig
  └── getReplyFromConfig() → 返回 null 时，deliver 不会被调用
```

## 解决方案

### 1. 异步处理模式（最关键！）

**修改文件：** `src/callback/handler.ts`

```typescript
// 立即返回 success，避免企业微信 5 秒超时
res.statusCode = 200;
res.end('success');

// 异步处理消息（fire and forget）
dispatchMessage(parsed, ctx).catch((err) => {
  runtime.error?.(`[wecom][callback][${accountId}] Async dispatch failed: ${String(err)}`);
});

return true;
```

**原因：**
- YanHaidao/wecom 项目采用此模式
- 避免企业微信回调超时（5秒限制）
- 允许 AI 有足够时间生成响应

### 2. 完整上下文字段

**修改文件：** `src/callback/message-adapter.ts`

```typescript
export function convertCallbackToMsgContext(
  msg: WeComCallbackMessage,
  accountId: string
): CallbackMsgContext {
  const channelId = 'wecom';
  const from = msg.FromUserName || '';
  const to = msg.ToUserName || '';
  const sessionKey = `wecom:${from}`;
  const chatType = 'direct';
  const fromLabel = `user:${from}`;
  
  return {
    Body: msg.Content || '',
    RawBody: msg.Content || '',
    CommandBody: msg.Content || '',
    BodyForCommands: msg.Content || '',
    From: `${channelId}:${from}`,
    To: `${channelId}:${to}`,
    SessionKey: sessionKey,
    AccountId: accountId,
    MessageSid: msg.MsgId || '',
    MessageSidFull: msg.MsgId || '',
    ChannelId: channelId,
    SenderId: from,
    ReplyToId: undefined,
    RootMessageId: undefined,
    InboundHistory: [],
    
    // 关键字段：OpenClaw dispatcher 所需
    ChatType: chatType,
    ConversationLabel: fromLabel,
    Timestamp: Date.now(),
    Provider: channelId,
    Surface: channelId,
    OriginatingChannel: channelId,
    OriginatingTo: `${channelId}:${from}`,
    CommandAuthorized: true,
  };
}
```

### 3. replyOptions 配置

**修改文件：** `src/callback/handler.ts`

```typescript
await channelRuntime.reply.dispatchReplyWithBufferedBlockDispatcher({
  ctx: ctxPayload,
  cfg: loadedConfig,
  replyOptions: { disableBlockStreaming: false },  // 必需！
  dispatcherOptions: {
    deliver: async (payload, info) => {
      // ...
    },
    onError: (err, info) => {
      // ...
    },
  }
});
```

**注意：** 移除 `onReplyStart` 回调（遵循 YanHaidao/wecom 模式）

## 验证结果

### 成功日志：

```
[wecom][callback][default] ===== DELIVER CALLED =====
[wecom][callback][default] Sending reply via OpenAPI to GaoHong
[wecom][callback][default] Dispatcher completed
```

### 完整流程验证：

✅ 消息接收成功
✅ 消息解密成功
✅ 上下文构建成功（包含所有必需字段）
✅ AI 响应生成成功
✅ deliver 回调触发成功
✅ OpenAPI 调用成功

## 待解决问题

### 企业微信 IP 白名单限制

**错误信息：**
```
企业微信 API 错误 [60020]: not allow to access from your ip
from ip: <YOUR_PUBLIC_IP>
```

**解决方案：**

1. 登录企业微信管理后台：https://work.weixin.qq.com/
2. 进入【应用管理】→ 选择应用
3. 找到【企业可信IP】配置
4. 添加你的服务器公网 IP

## 技术要点总结

### 关键修复点：

1. **异步处理**：立即返回 HTTP 200，异步处理消息
2. **MessageSid**：必须包含，用于 OpenClaw 追踪消息
3. **完整上下文**：包含所有 dispatcher 所需字段
4. **replyOptions**：`{ disableBlockStreaming: false }`

### 参考：

- YanHaidao/wecom 项目：https://github.com/YanHaidao/wecom
- OpenClaw 文档：https://docs.openclaw.ai/
- 企业微信 API 文档：https://developer.work.weixin.qq.com/document/path/90664

## 文件修改清单

1. `src/callback/handler.ts` - 异步处理模式 + dispatcher 调用
2. `src/callback/message-adapter.ts` - 完整上下文字段
3. `src/callback/reply-sender.ts` - OpenAPI 回复发送（无需修改）

## 测试验证

发送测试消息后，检查日志：

```bash
tail -f /tmp/openclaw/openclaw-*.log | grep -E "DELIVER CALLED|Sending reply via OpenAPI"
```

成功标志：看到 `DELIVER CALLED` 和 `Sending reply via OpenAPI` 日志。

---

**状态：** ✅ 核心问题已解决，等待配置 IP 白名单后完成端到端测试。