---
name: wecom-media-upload
description: 上传媒体文件到企业微信并获取 media_id，用于后续发送图片、视频、语音、文件等消息。当需要发送媒体消息时使用此技能。
metadata: {"openclaw":{"emoji":"📎","requires":{"config":["channels.wecom"]}}}
---

# 媒体文件上传

上传本地文件到企业微信服务器，获取 `media_id`，用于发送图片、视频、语音、文件等类型的消息。

## 触发条件

- 需要发送图片、视频、语音或文件给用户
- 已有本地文件需要通过企业微信发送

## 使用方式

### 1. 上传媒体文件

```
wecom_mcp openapi media upload '{"filePath": "/path/to/file.png", "type": "image"}'
```

**参数说明：**

| 参数 | 必填 | 说明 |
|------|------|------|
| filePath | 是 | 本地文件的绝对路径 |
| type | 是 | 媒体类型：`image`/`voice`/`video`/`file` |
| filename | 否 | 自定义文件名，默认从路径提取 |
| contentType | 否 | MIME 类型，默认根据扩展名自动识别 |

**返回结果：**

```json
{
  "type": "image",
  "media_id": "3cVpeAXpUGv0EK6HIl_uMrdeiH7cPqwU...",
  "created_at": "1775574009"
}
```

### 2. 发送媒体消息

获取 `media_id` 后，使用消息发送接口：

**发送图片：**
```
wecom_mcp openapi message send '{"touser": "USER_ID", "msgtype": "image", "agentid": AGENT_ID, "image": {"media_id": "MEDIA_ID"}}'
```

**发送视频：**
```
wecom_mcp openapi message send '{"touser": "USER_ID", "msgtype": "video", "agentid": AGENT_ID, "video": {"media_id": "MEDIA_ID"}}'
```

**发送语音：**
```
wecom_mcp openapi message send '{"touser": "USER_ID", "msgtype": "voice", "agentid": AGENT_ID, "voice": {"media_id": "MEDIA_ID"}}'
```

**发送文件：**
```
wecom_mcp openapi message send '{"touser": "USER_ID", "msgtype": "file", "agentid": AGENT_ID, "file": {"media_id": "MEDIA_ID"}}'
```

## 文件大小与格式限制

| 类型 | 大小限制 | 格式要求 |
|------|----------|----------|
| 图片 (image) | 10 MB | JPG, PNG, GIF 等 |
| 视频 (video) | 10 MB | MP4 等 |
| 语音 (voice) | 2 MB | **仅 AMR 格式** |
| 文件 (file) | 20 MB | 不限 |

## 完整示例

```
# 步骤1: 上传图片
wecom_mcp openapi media upload '{"filePath": "/home/user/chart.png", "type": "image"}'

# 返回: {"type": "image", "media_id": "xxx", "created_at": "..."}

# 步骤2: 发送图片消息
wecom_mcp openapi message send '{"touser": "ZhangSan", "msgtype": "image", "agentid": 1000010, "image": {"media_id": "xxx"}}'
```

## 注意事项

1. **media_id 有效期**：上传后的 `media_id` 仅 3 天内有效
2. **语音格式**：语音消息仅支持 AMR 格式，其他格式会发送失败
3. **文件路径**：必须是服务器本地的绝对路径
4. **权限要求**：需要配置 `corpId` 和 `agentSecret`