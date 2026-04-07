# 双模式架构设计文档

> 企业微信插件同时支持 WebSocket Bot 模式和回调模式的架构设计

---

## 📊 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                   wecom-openclaw-plugin                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  配置检测层 (Config Detection)                               │
│  ├─ WebSocket 模式: botId + secret                          │
│  └─ 回调模式: corpId + agentId + agentSecret + callback      │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │  WebSocket 模式      │    │   回调模式            │        │
│  │  (现有实现)          │    │   (新增支持)          │        │
│  ├─────────────────────┤    ├─────────────────────┤        │
│  │ monitor.js           │    │ callback/handler.js  │        │
│  │ ├─ monitorWecomProvider │ │ ├─ handleWeComCallback│        │
│  │ ├─ WebSocket 长连接   │    │ ├─ URL 验证          │        │
│  │ ├─ 消息接收           │    │ ├─ 消息解密          │        │
│  │ └─ 消息分发           │    │ └─ 消息路由          │        │
│  └─────────────────────┘    └─────────────────────┘        │
│           │                           │                      │
│           └───────────┬───────────────┘                      │
│                       │                                      │
│              统一消息上下文转换层                              │
│              (Message Context Adapter)                       │
│                       │                                      │
│                       ↓                                      │
│              OpenClaw Agent Router                           │
│              (dispatchInboundMessage)                        │
│                       │                                      │
│                       ↓                                      │
│              ┌─────────────────────┐                         │
│              │  AI Agent 处理      │                         │
│              └─────────────────────┘                         │
│                       │                                      │
│                       ↓                                      │
│              回复路由层 (Reply Router)                        │
│              ├─ WebSocket: wsClient.replyStream()            │
│              └─ 回调模式: OpenAPI.sendMessage()              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 设计原则

### 1. 双模式并存，互不干扰

- **配置检测**：根据配置自动选择模式
- **独立实现**：两种模式各有独立的接收和处理逻辑
- **统一出口**：最终都路由到 OpenClaw Agent

### 2. 消息上下文统一

无论哪种模式，最终都转换为 OpenClaw 标准的 `MsgContext`：

```typescript
interface UnifiedMsgContext {
  Body: string;
  From: string;
  To: string;
  SessionKey: string;
  AccountId: string;
  MessageSid: string;
  ChannelId: string;
}
```

### 3. 回复通道分离

| 模式 | 回复方式 | 实现 |
|------|---------|------|
| WebSocket | `wsClient.replyStream()` | 流式回复，实时更新 |
| 回调模式 | OpenAPI `sendMessage()` | 主动发送，单次完整消息 |

---

## 🔧 配置模式检测

```typescript
interface WeComConfig {
  // WebSocket 模式配置
  botId?: string;
  secret?: string;
  
  // 回调模式配置
  corpId?: string;
  agentId?: number;
  agentSecret?: string;
  callback?: {
    path: string;
    token: string;
    encodingAESKey: string;
    corpId: string;
  };
}

function detectMode(config: WeComConfig): 'websocket' | 'callback' | 'both' | 'none' {
  const hasWebSocket = Boolean(config.botId && config.secret);
  const hasCallback = Boolean(
    config.corpId && 
    config.agentId && 
    config.agentSecret &&
    config.callback?.token &&
    config.callback?.encodingAESKey
  );
  
  if (hasWebSocket && hasCallback) return 'both';
  if (hasWebSocket) return 'websocket';
  if (hasCallback) return 'callback';
  return 'none';
}
```

---

## 📝 实现计划

### Phase 1: 消息上下文适配器 ✅

**文件**: `src/callback/message-adapter.ts`

**功能**:
- 将回调消息转换为 OpenClaw MsgContext
- 构建会话标识
- 处理用户和群聊消息

### Phase 2: OpenAPI 消息发送器 ✅

**文件**: `src/callback/reply-sender.ts`

**功能**:
- 使用 OpenAPI 主动发送消息
- 支持 Markdown 格式
- 处理发送失败和重试

### Phase 3: 回复分发器 ⏳

**文件**: `src/callback/dispatcher.ts`

**功能**:
- 接收 Agent 回复
- 判断当前模式
- 选择正确的发送通道

### Phase 4: 集成到插件入口 ⏳

**文件**: `index.ts`

**功能**:
- 注册回调 HTTP 路由
- 初始化 OpenAPI 服务
- 配置回复分发器

---

## 🔄 消息流转

### WebSocket 模式流程

```
企业微信服务器 
  ↓ WebSocket
monitor.js (monitorWecomProvider)
  ↓ 解析消息
WebSocket Client
  ↓ recordInboundSession
dispatchInboundMessage
  ↓ AI 处理
Agent Reply
  ↓ wsClient.replyStream
WebSocket Client → 企业微信
```

### 回调模式流程

```
企业微信服务器
  ↓ HTTP POST
callback/handler.js (handleWeComCallback)
  ↓ 验证签名 + 解密
message-adapter.ts (convertToMsgContext)
  ↓ recordInboundSession
dispatchInboundMessage
  ↓ AI 处理
Agent Reply
  ↓ OpenAPI.sendMessage
企业微信服务器
```

---

## 🛡️ 安全考虑

### WebSocket 模式

- ✅ 长连接认证
- ✅ 消息加密传输

### 回调模式

- ✅ 签名验证 (SHA1)
- ✅ 时间戳防重放
-  receiveId 验证
- ✅ AES 消息解密

---

## 📊 性能对比

| 维度 | WebSocket 模式 | 回调模式 |
|------|--------------|---------|
| 实时性 | 高（长连接） | 中（HTTP回调） |
| 流式回复 | ✅ 支持 | ❌ 不支持 |
| 主动发送 | ✅ 支持 | ✅ 支持 |
| 稳定性 | 高（自动重连） | 中（依赖HTTP） |
| 配置复杂度 | 低 | 中 |

---

## 🎨 用户体验

### 配置示例

**WebSocket 模式**:
```json
{
  "channels": {
    "wecom": {
      "botId": "your_bot_id",
      "secret": "your_bot_secret",
      "enabled": true
    }
  }
}
```

**回调模式**:
```json
{
  "channels": {
    "wecom": {
      "corpId": "YOUR_CORP_ID",
      "agentId": YOUR_AGENT_ID,
      "agentSecret": "YOUR_AGENT_SECRET",
      "callback": {
        "path": "/wecom/callback",
        "token": "YOUR_TOKEN",
        "encodingAESKey": "YOUR_ENCODING_AES_KEY"
      },
      "enabled": true
    }
  }
}
```

**双模式并存**:
```json
{
  "channels": {
    "wecom": {
      "botId": "YOUR_BOT_ID",
      "secret": "YOUR_BOT_SECRET",
      "corpId": "YOUR_CORP_ID",
      "agentId": YOUR_AGENT_ID,
      "agentSecret": "YOUR_AGENT_SECRET",
      "callback": {
        "path": "/wecom/callback",
        "token": "YOUR_TOKEN",
        "encodingAESKey": "YOUR_ENCODING_AES_KEY"
      },
      "enabled": true
    }
  }
}
```

---

## 🚀 下一步

1. ✅ 实现消息上下文适配器
2. ✅ 实现 OpenAPI 消息发送器
3. ⏳ 实现回复分发器
4. ⏳ 集成测试
5. ⏳ 文档更新

---

*设计版本: v1.0*  
*设计时间: 2026.04.06*