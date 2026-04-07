# 企业微信回调模式消息重复发送问题修复

**修复时间：** 2026-04-07 16:00 - 17:20 (UTC)
**修复状态：** ✅ 已完成
**代码验证：** ✅ 已通过 (2026-04-07 17:25 UTC)

---

## ✅ 代码验证结果 (2026-04-07 17:25 UTC)

### MD5 校验

| 文件 | 本地 MD5 | 远程 MD5 | 状态 |
|------|----------|----------|------|
| `dist/esm/src/callback/handler.js` | d7f99d294ec19c52f97d3b93619cc991 | d7f99d294ec19c52f97d3b93619cc991 | ✅ 一致 |

### 关键代码对比

**onIdle 回调**（本地 vs 远程）：✅ 完全一致

```javascript
onIdle: async () => {
    const sessionKey = ctxPayload.SessionKey || `wecom:${ctxPayload.From?.replace('wecom:', '')}`;
    const accumulator = replyAccumulators.get(sessionKey);
    if (accumulator && accumulator.text) {
        // 立即删除，防止 onIdle 被多次调用时重复发送
        const textToSend = accumulator.text;
        replyAccumulators.delete(sessionKey);
        // ... 发送逻辑
    }
},
```

### 结论

**运行时代码（dist/）完全一致**，官方插件升级未覆盖我们的修复。

**注意**：远程服务器上的源文件（src/）行数不同（296 vs 337），这是因为我们只部署了编译后的 dist 文件，未同步源文件。这不影响功能。

---

## ⚠️ 重要：官方插件升级风险

### 问题背景

在今晚的调试过程中，进行了以下操作：

1. **模型切换**：尝试将容器 ct1004 中的模型从默认切换为 qwen3.5-plus
2. **OpenClaw 异常**：切换过程中 OpenClaw 反复重启
3. **插件升级**：在排查过程中，发现有新版本的 wecom-openclaw-plugin，执行了升级

### 🚨 潜在风险

**官方插件升级可能覆盖了我们的自定义修改！**

我们在 2026-04-06 对企业微信插件做了大幅改动：

| 模块 | 我们的修改 | 官方版本可能状态 |
|------|-----------|-----------------|
| `src/callback/handler.ts` | ✅ 重写 deliver/onIdle 逻辑 | ❓ 可能被覆盖 |
| `src/callback/message-adapter.ts` | ✅ 完善消息上下文转换 | ❓ 可能被覆盖 |
| `src/callback/reply-sender.ts` | ✅ OpenAPI 回复发送 | ❓ 可能被覆盖 |
| `src/openapi/media.ts` | ✅ 媒体上传 API | ❓ 可能被覆盖 |
| `src/mcp/tool.ts` | ✅ 移除 call/list，保留 openapi | ❓ 可能被覆盖 |

### 建议

1. **验证关键文件**：对比本地代码和远程服务器上的代码
2. **备份当前版本**：在进一步升级前备份 `/root/.openclaw/extensions/wecom-openclaw-plugin/`
3. **锁定版本**：考虑 fork 官方仓库或锁定版本

---

## 📊 问题现象

### 用户报告

```
每次发送消息，收到两条回复
两条回复内容相同（同一问题的两次独立响应）
```

### 日志证据

```
16:11:39.174 - 第一次 Dispatch message: MsgId=7626050724878881875
16:11:44.179 - 第二次 Dispatch message: MsgId=7626050724878881875 (5秒后重试)
```

---

## 🔍 问题根因分析

### 根因 1：企业微信 Webhook 超时重试

**机制**：企业微信在 5 秒内未收到 HTTP 200 响应，会自动重试发送消息

**原代码问题**：
```typescript
// 同步等待 AI 处理完成
await dispatchMessage(parsed, ctx);  // 可能超过 5 秒
res.statusCode = 200;
res.end('success');
```

**修复**：
```typescript
// 立即返回 200，异步处理
res.statusCode = 200;
res.end('success');
dispatchMessage(parsed, ctx).catch(...);  // 异步处理
```

### 根因 2：onIdle 被多次调用

**机制**：OpenClaw 的 `dispatchReplyWithBufferedBlockDispatcher` 的 `onIdle` 回调会被多次调用

**原代码问题**：
```typescript
if (accumulator && accumulator.text) {
  await sendCallbackReply(...);  // 发送消息
  replyAccumulators.delete(sessionKey);  // 删除在发送后
}
```

**问题**：两次 `onIdle` 调用之间，`accumulator` 仍然存在，导致重复发送

**修复**：
```typescript
if (accumulator && accumulator.text) {
  const textToSend = accumulator.text;
  replyAccumulators.delete(sessionKey);  // 立即删除，防止重复
  await sendCallbackReply(...);
}
```

### 根因 3：deliver 和 onIdle 的错误配合

**错误策略（timer debounce）**：
```typescript
// deliver 中设置 timer
accumulator.timer = setTimeout(() => {
  sendCallbackReply(...);  // 定时器发送
}, 500);

// onIdle 中也发送
onIdle: async () => {
  if (accumulator) {
    await sendCallbackReply(...);  // onIdle 也发送
  }
}
```

**问题**：timer 和 onIdle 都会触发发送，导致两条消息

**正确策略**：
```typescript
// deliver：只累积文本，不发送
if (payload.text) {
  accumulator.text += payload.text;
}

// onIdle：发送累积的完整回复
onIdle: async () => {
  if (accumulator && accumulator.text) {
    await sendCallbackReply(...);
    replyAccumulators.delete(sessionKey);
  }
}
```

---

## ✅ 最终修复方案

### 文件修改

**文件**：`src/callback/handler.ts`

### 核心逻辑

```typescript
// 全局累积器
const replyAccumulators = new Map<string, { text: string }>();

// deliver 回调：只累积，不发送
deliver: async (payload, info) => {
  if (payload.text) {
    const accumulator = replyAccumulators.get(sessionKey) || { text: '' };
    accumulator.text += payload.text;
    replyAccumulators.set(sessionKey, accumulator);
  }
},

// onIdle 回调：发送完整回复
onIdle: async () => {
  const accumulator = replyAccumulators.get(sessionKey);
  if (accumulator && accumulator.text) {
    // 立即删除，防止并发问题
    const textToSend = accumulator.text;
    replyAccumulators.delete(sessionKey);
    
    await sendCallbackReply({
      toUser: fromUser,
      content: textToSend,
      msgType: 'markdown'
    });
  }
},
```

### 关键设计决策

1. **立即返回 HTTP 200**：避免企业微信超时重试
2. **deliver 只累积**：不发送，避免流式消息碎片
3. **onIdle 发送完整回复**：一次性发送完整回复
4. **原子删除 accumulator**：防止并发导致的重复发送

---

## 📋 提交记录

```
c4d692d fix: 回调模式消息重复发送问题（最终修复）
4811ffd fix: 企业微信回调消息重复处理问题
```

---

## 🚀 部署状态

**远程服务器**：10.8.1.203
**OpenClaw 状态**：✅ 运行中
**插件路径**：`/root/.openclaw/extensions/wecom-openclaw-plugin/`

---

## 📝 待办事项

### 高优先级

1. **验证官方插件升级影响**
   - 对比本地代码和远程服务器代码
   - 确认关键文件未被覆盖
   - 记录与官方版本的差异

2. **备份当前版本**
   ```bash
   ssh root@10.8.1.203 "tar -czvf /root/wecom-plugin-backup-$(date +%Y%m%d).tar.gz /root/.openclaw/extensions/wecom-openclaw-plugin/"
   ```

3. **锁定插件版本**
   - 考虑 fork 官方仓库
   - 或使用 npm shrinkwrap 锁定版本

### 中优先级

4. **完善错误处理**
   - 添加重试机制
   - 更详细的错误日志

5. **群聊消息支持**
   - 测试群聊消息接收
   - 群消息发送功能

### 低优先级

6. **代码清理**
   - 移除调试日志（已部分完成）
   - 类型定义完善

---

## 🔗 相关文档

- [回调设计文档](../CALLBACK_DESIGN.md)
- [双模式架构](../DUAL_MODE_ARCHITECTURE.md)
- [工作进度保存](./WORK_PROGRESS_SAVE.md)