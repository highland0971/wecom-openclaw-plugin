# 企业微信回调集成测试验证方案

> 基于 PVE + LXC + 阿里云ECS 的网络环境设计

---

## 🌐 网络环境分析

### 当前环境

```
┌─────────────────────────────────────────────────────────────┐
│                        网络拓扑图                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  阿里云ECS                                                   │
│  ├─ 固定公网IP: xxx.xxx.xxx.xxx                             │
│  ├─ 域名: your-domain.com                                   │
│  └─ 作用: 提供公网访问入口                                   │
│                                                             │
│  Internet                                                   │
│     │                                                       │
│     │ (动态公网IP)                                          │
│  上联路由器                                                  │
│     │                                                       │
│     │ (内网网段: 192.168.x.x)                               │
│  PVE宿主机                                                   │
│     │                                                       │
│     ├─ LXC容器 (当前开发环境)                               │
│     │  └─ 内网IP: 192.168.x.y                               │
│     │                                                       │
│     └─ OpenClaw部署环境                                     │
│        └─ 内网IP: 192.168.x.z                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 网络特点

| 环境 | IP类型 | 访问方式 | 用途 |
|------|--------|---------|------|
| 阿里云ECS | 固定公网IP | 直接访问 | 提供公网入口 |
| 上联路由器 | 动态公网IP | 不稳定 | 不适合生产使用 |
| PVE宿主机 | 内网IP | 内网访问 | 容器宿主 |
| LXC容器 | 内网IP | 内网访问 | 开发环境 |
| OpenClaw部署 | 内网IP | 内网访问 | 生产环境 |

### 推荐方案

**使用阿里云ECS作为公网入口，建立到内网OpenClaw的隧道**

---

## 🧪 测试验证方案

### 阶段1：本地单元测试

#### 目标
- 验证加密/解密功能
- 验证签名验证功能
- 验证XML解析功能

#### 步骤

```bash
# 1. 创建测试脚本
cd /home/highland/projects/wecom-openclaw-plugin
mkdir -p tests
```

创建 `tests/callback.test.ts`:

```typescript
import { decodeEncodingAESKey, decryptMessage, encryptMessage } from '../src/callback/crypto.js';
import { verifySignature, generateSignature } from '../src/callback/signature.js';
import { parseCallbackXml, extractEncryptField } from '../src/callback/parser.js';

// 测试数据
const testToken = 'test_token_123';
const testEncodingAESKey = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';
const testCorpId = 'wx1234567890abcdef';

console.log('=== 测试加密/解密 ===');
const aesKey = decodeEncodingAESKey(testEncodingAESKey);
console.log('AESKey长度:', aesKey.length);

const testMsg = '<xml><Content>测试消息</Content></xml>';
const encrypted = encryptMessage(testMsg, aesKey, testCorpId);
console.log('加密成功:', encrypted.length);

const decrypted = decryptMessage(encrypted, aesKey);
console.log('解密成功:', decrypted.msg === testMsg);
console.log('receiveId:', decrypted.receiveId);

console.log('\n=== 测试签名验证 ===');
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = 'test_nonce';
const signature = generateSignature(testToken, timestamp, nonce, encrypted);
console.log('签名:', signature);

const valid = verifySignature(signature, testToken, timestamp, nonce, encrypted);
console.log('验证通过:', valid);

console.log('\n=== 测试XML解析 ===');
const testXml = `<xml>
  <ToUserName><![CDATA[${testCorpId}]]></ToUserName>
  <FromUserName><![CDATA[user123]]></FromUserName>
  <CreateTime>${timestamp}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[测试消息]]></Content>
  <MsgId>123456</MsgId>
</xml>`;

const parsed = await parseCallbackXml(testXml);
console.log('解析成功:', parsed.MsgType, parsed.Content);

const encryptXml = `<xml>
  <Encrypt><![CDATA[${encrypted}]]></Encrypt>
</xml>`;

const extracted = extractEncryptField(encryptXml);
console.log('提取Encrypt:', extracted === encrypted);

console.log('\n✅ 所有测试通过！');
```

```bash
# 2. 运行测试
export PATH=/tmp/node-v20.19.0-linux-x64/bin:$PATH
node --experimental-strip-types tests/callback.test.ts
```

---

### 阶段2：内网部署测试

#### 目标
- 在OpenClaw上部署插件
- 验证路由注册
- 测试本地HTTP请求

#### 步骤

##### 2.1 部署插件到OpenClaw

```bash
# 方法1: 直接复制到OpenClaw插件目录
# 假设OpenClaw安装在 /opt/openclaw
PLUGIN_DIR="/opt/openclaw/extensions/wecom-openclaw-plugin"

# 复制构建产物
cp -r /home/highland/projects/wecom-openclaw-plugin/dist "$PLUGIN_DIR/"
cp -r /home/highland/projects/wecom-openclaw-plugin/skills "$PLUGIN_DIR/"
cp /home/highland/projects/wecom-openclaw-plugin/package.json "$PLUGIN_DIR/"
cp /home/highland/projects/wecom-openclaw-plugin/openclaw.plugin.json "$PLUGIN_DIR/"

# 方法2: 使用npm link（开发环境）
cd /home/highland/projects/wecom-openclaw-plugin
export PATH=/tmp/node-v20.19.0-linux-x64/bin:$PATH
npm link

cd /opt/openclaw
npm link @wecom/wecom-openclaw-plugin
```

##### 2.2 配置OpenClaw

编辑 `/opt/openclaw/.openclaw/openclaw.json`:

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "agent": {
        "agentId": 100001,
        "secret": "your_agent_secret",
        "callback": {
          "path": "/wecom/callback",
          "token": "your_test_token",
          "encodingAESKey": "43-char-base64-string",
          "corpId": "wx1234567890abcdef"
        }
      }
    }
  }
}
```

##### 2.3 启动OpenClaw Gateway

```bash
cd /opt/openclaw
openclaw gateway start

# 查看日志
openclaw logs -f
# 应该看到: [wecom] Callback route registered at /wecom/callback
```

##### 2.4 内网HTTP测试

```bash
# 在LXC容器内测试（假设OpenClaw在 192.168.x.z）
OPENCLAW_HOST="192.168.x.z"
OPENCLAW_PORT="18789"

# 测试健康检查
curl "http://${OPENCLAW_HOST}:${OPENCLAW_PORT}/health"

# 测试回调路由（GET - 模拟URL验证）
curl "http://${OPENCLAW_HOST}:${OPENCLAW_PORT}/wecom/callback?msg_signature=test&timestamp=123&nonce=abc&echostr=test"

# 预期: 403 Forbidden (签名验证失败，说明路由已注册)
```

---

### 阶段3：公网回调测试（阿里云ECS）

#### 方案A：SSH反向隧道（推荐，简单快速）

##### 3.1 在阿里云ECS上配置

```bash
# 登录阿里云ECS
ssh root@your-ecs-ip

# 编辑SSH配置
vim /etc/ssh/sshd_config
# 添加:
# GatewayPorts yes
# AllowTcpForwarding yes

# 重启SSH服务
systemctl restart sshd

# 开放端口（假设使用 18443）
firewall-cmd --permanent --add-port=18443/tcp
firewall-cmd --reload

# 阿里云安全组也需要开放 18443 端口
```

##### 3.2 在内网OpenClaw服务器建立隧道

```bash
# 在OpenClaw服务器上执行（192.168.x.z）
# 建立反向隧道：将本地 18789 端口映射到阿里云ECS的 18443 端口

ssh -N -R 18443:localhost:18789 root@your-ecs-ip

# 参数说明:
# -N: 不执行远程命令，只做端口转发
# -R: 反向隧道
# 18443: 阿里云ECS监听端口
# localhost:18789: 本地OpenClaw端口

# 保持隧道运行（使用 nohup 或 systemd）
nohup ssh -N -R 18443:localhost:18789 root@your-ecs-ip > /tmp/ssh-tunnel.log 2>&1 &
```

##### 3.3 测试公网访问

```bash
# 从任意公网机器测试
curl "http://your-ecs-ip:18443/health"

# 测试回调URL
curl "http://your-ecs-ip:18443/wecom/callback?msg_signature=test&timestamp=123&nonce=abc&echostr=test"
```

##### 3.4 配置域名（可选）

在阿里云域名解析中添加：

```
类型: A记录
主机: wecom-callback
记录值: your-ecs-ip
TTL: 600
```

回调URL: `http://wecom-callback.your-domain.com:18443/wecom/callback`

---

#### 方案B：frp内网穿透（稳定可靠）

##### 3.1 在阿里云ECS上部署frps

```bash
# 下载frp
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -xzf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64

# 配置frps
cat > frps.toml <<EOF
bindPort = 7000
vhostHTTPPort = 80
auth.token = "your_auth_token"
EOF

# 启动frps
./frps -c frps.toml

# 或使用systemd管理
cat > /etc/systemd/system/frps.service <<EOF
[Unit]
Description=frp server
After=network.target

[Service]
ExecStart=/opt/frp/frps -c /opt/frp/frps.toml
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable frps
systemctl start frps
```

##### 3.2 在OpenClaw服务器上部署frpc

```bash
# 下载frp
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -xzf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64

# 配置frpc
cat > frpc.toml <<EOF
serverAddr = "your-ecs-ip"
serverPort = 7000
auth.token = "your_auth_token"

[[proxies]]
name = "wecom-callback"
type = "http"
localPort = 18789
customDomains = ["wecom-callback.your-domain.com"]
EOF

# 启动frpc
./frpc -c frpc.toml

# 或使用systemd管理
```

##### 3.3 测试访问

```bash
curl "http://wecom-callback.your-domain.com/wecom/callback?msg_signature=test&timestamp=123&nonce=abc&echostr=test"
```

---

#### 方案C：Nginx反向代理 + VPN（安全可控）

##### 3.1 建立VPN连接

在阿里云ECS和内网之间建立VPN（WireGuard/OpenVPN）

##### 3.2 Nginx配置

```nginx
# /etc/nginx/conf.d/wecom-callback.conf
server {
    listen 80;
    server_name wecom-callback.your-domain.com;

    location /wecom/callback {
        proxy_pass http://192.168.x.z:18789;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### 阶段4：企业微信回调配置

#### 4.1 配置回调URL

登录企业微信管理后台：

1. 应用管理 → 选择应用 → 设置 API 接收
2. 填写回调URL：
   - SSH隧道：`http://your-ecs-ip:18443/wecom/callback`
   - frp：`http://wecom-callback.your-domain.com/wecom/callback`
3. 填写Token和EncodingAESKey（与配置文件一致）
4. 点击保存

#### 4.2 验证URL

企业微信会自动发送GET请求验证URL：

```
GET /wecom/callback?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=ENCRYPTED
```

**预期结果**：
- OpenClaw日志：`[wecom][callback] URL verification successful`
- 企业微信后台：显示"验证成功"

#### 4.3 测试消息接收

在企业微信应用中发送消息：

1. 打开企业微信App
2. 进入应用
3. 发送文本消息："测试"

**预期结果**：
- OpenClaw日志：`[wecom][callback][default] Message received: MsgType=text, From=xxx`
- 企业微信后台：消息记录中显示消息

---

## 📊 测试检查清单

### 本地测试

- [ ] 加密/解密功能正常
- [ ] 签名验证功能正常
- [ ] XML解析功能正常
- [ ] 所有单元测试通过

### 内网测试

- [ ] 插件成功部署到OpenClaw
- [ ] OpenClaw成功启动
- [ ] 回调路由已注册
- [ ] 内网HTTP请求正常

### 公网测试

- [ ] SSH隧道/frp/nginx配置成功
- [ ] 公网可访问回调URL
- [ ] 域名解析正常（如使用）
- [ ] HTTPS配置正常（生产环境）

### 企业微信测试

- [ ] 回调URL配置成功
- [ ] URL验证通过
- [ ] 消息接收正常
- [ ] 日志记录正常

---

## 🚨 故障排查

### 问题1：SSH隧道断开

**症状**：公网访问失败

**解决**：
```bash
# 检查隧道状态
ps aux | grep ssh

# 重启隧道
pkill -f "ssh.*18443"
nohup ssh -N -R 18443:localhost:18789 root@your-ecs-ip > /tmp/ssh-tunnel.log 2>&1 &

# 使用autossh自动重连
autossh -M 0 -f -N -R 18443:localhost:18789 root@your-ecs-ip
```

### 问题2：frp连接失败

**症状**：frpc无法连接frps

**解决**：
```bash
# 检查frps是否运行
netstat -tlnp | grep 7000

# 检查防火墙
firewall-cmd --list-ports

# 检查阿里云安全组
# 确保7000端口已开放
```

### 问题3：企业微信验证失败

**症状**：企业微信提示"URL验证失败"

**解决**：
1. 检查Token是否一致
2. 检查EncodingAESKey是否一致
3. 查看OpenClaw日志：`openclaw logs -f | grep wecom`
4. 手动测试签名算法

---

## 🎯 推荐测试顺序

### 快速验证（1小时）

1. ✅ 本地单元测试
2. ✅ 内网部署测试
3. ✅ SSH隧道公网测试
4. ✅ 企业微信URL验证

### 生产部署（半天）

1. ✅ frp内网穿透部署
2. ✅ 域名解析配置
3. ✅ HTTPS证书配置
4. ✅ 企业微信回调配置
5. ✅ 消息接收测试

---

## 📝 测试记录模板

```
测试时间：2026.04.06
测试人员：____
环境信息：
  - OpenClaw版本：____
  - 插件版本：____
  - 网络方案：SSH隧道 / frp / nginx

测试结果：
  [ ] 本地单元测试
  [ ] 内网部署测试
  [ ] 公网访问测试
  [ ] 企业微信URL验证
  [ ] 消息接收测试

问题记录：
  - 问题描述：____
  - 解决方案：____
  - 验证结果：____
```

---

*文档版本：v1.0*  
*最后更新：2026.04.06*