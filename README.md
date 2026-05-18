# baijiayun-skills

百家云大班课直播 Agent Skills，为 Agent 提供与百家云直播平台交互的能力。

## 什么是 Agent Skills？

Agent Skills 是一个开放的、轻量级的格式，用于扩展 AI Agent 的能力。它本质上是一个文件夹，包含一个 `SKILL.md` 文件，定义了技能的元数据和使用说明。详细规范见 [agentskills.io](https://agentskills.io)。

## 功能特性

- `create-room` — 创建直播间
- `update-room` — 更新房间信息
- `delete-room` — 删除房间
- `get-room` — 获取房间详情
- `sign-test` — 签名调试

## 安装方式

### 方式一：npx 安装（推荐）

使用 Claude Code CLI 安装 Skills：

```bash
npx skills add https://github.com/bjycloud/baijiayun-skills
```

### 方式二：复制到 .agents/skills 目录

```bash
git clone https://github.com/bjycloud/baijiayun-skills
cp -r skills/* .agents/skills/
```

### 方式二：Git Submodule

```bash
git submodule add <your-repo-url> .agents/baijiayun-skills
```

### 方式三：手动安装

将 `skills/baijiayun-room` 目录复制到你的 Agent skills 目录。

## 配置

### 方式一：配置文件（推荐）

```bash
mkdir -p ~/.baijiayun-skills
cp config/baijiayun.example.json ~/.baijiayun-skills/config.json
```

编辑 `~/.baijiayun-skills/config.json`，填入你的凭证：

```json
{
  "partner_id": "12345678",
  "partner_key": "你的partner_key",
  "private_domain": "你的个性域名"
}
```

### 方式二：环境变量

```bash
export BAIJIAYUN_PARTNER_ID=12345678
export BAIJIAYUN_PARTNER_KEY=你的partner_key
export BAIJIAYUN_PRIVATE_DOMAIN=你的个性域名
```

### 方式三：CLI 参数直接指定

```bash
node skills/baijiayun-room/scripts/baijiayun.js create-room \
  --partnerId 12345678 \
  --partnerKey 你的partner_key \
  --domain 你的个性域名 \
  --title "测试直播" \
  --startTime 1735689600 \
  --endTime 1735693200
```

配置优先级：**CLI 参数 > 环境变量 > 配置文件**

## 使用方法

### 创建房间

```bash
node skills/baijiayun-room/scripts/baijiayun.js create-room \
  --title "产品发布会" \
  --startTime 1735689600 \
  --endTime 1735693200
```

**常用可选参数：**

| 参数 | 说明 |
|------|------|
| `--type` | 1:一对一 2:大班课(默认) 3:小班课 |
| `--maxUsers` | 最大人数，0或不传表示不限制 |
| `--templateName` | triple(默认)/doubleCamera/classic/liveWall/video |
| `--appTemplate` | 1:横屏 2:竖屏 |
| `--isLongTerm` | 0:普通房间 1:长期房间 |
| `--preEnterTime` | 学生可提前进入的时间（秒）|

**返回示例：**

```json
{
  "success": true,
  "data": {
    "room_id": "12345678901234",
    "admin_code": "213rjl",
    "teacher_code": "232kj1",
    "student_code": "abc213"
  }
}
```

### 更新房间

```bash
node skills/baijiayun-room/scripts/baijiayun.js update-room \
  --roomId 12345678901234 \
  --title "新课程名称" \
  --maxUsers 500
```

### 删除房间

```bash
node skills/baijiayun-room/scripts/baijiayun.js delete-room --roomId 12345678901234
```

### 获取房间信息

```bash
node skills/baijiayun-room/scripts/baijiayun.js get-room --roomId 12345678901234
```

**返回示例：**

```json
{
  "success": true,
  "data": {
    "room_id": 22112449907210,
    "title": "时代风帆大厦",
    "start_time": "2022-11-24 15:40:00",
    "end_time": "2032-11-21 15:40:00",
    "admin_code": "6grtqv",
    "teacher_code": "yff67c",
    "student_code": "abc213",
    "template_name": "singleVideo"
  }
}
```

### 签名调试

```bash
BAIJIAYUN_DEBUG=true node skills/baijiayun-room/scripts/baijiayun.js sign-test
```

## 调试模式

启用调试模式查看完整的请求和响应：

```bash
export BAIJIAYUN_DEBUG=true
node skills/baijiayun-room/scripts/baijiayun.js create-room --title "测试" --startTime 1735689600 --endTime 1735693200
```

调试输出包含：
- 请求 URL 和完整参数
- 签名计算过程（partner_key 脱敏显示为 `ab****yz`）
- API 响应内容

## 获取帮助

```bash
node skills/baijiayun-room/scripts/baijiayun.js --help
```

## 错误处理

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| 1001 | 参数错误 | 检查必填参数是否完整 |
| 1002 | 签名计算错误 | 检查 partner_id / partner_key 是否正确 |
| 2001 | 账号不存在 | 检查 partner_id 是否正确 |
| 2002 | 账号权限错误 | 检查账号是否有对应功能权限 |
| 3001 | 房间号不存在 | 检查 room_id 是否正确 |
| 3002 | 该房间已删除 | 房间已被删除，无需重复操作 |

## 常见问题

**Q: 怎么获取 unix 时间戳？**

```bash
# Linux / Mac
date +%s

# 未来某个时间（如 2025-12-25 09:00:00）
date -j -f "%Y-%m-%d %H:%M:%S" "2025-12-25 09:00:00" +%s
```

**Q: 如何查看个性域名？**

登录百家云后台，在账号信息页面查看。

**Q: 如何获取 partner_id 和 partner_key？**

登录百家云后台，在开放平台或账号信息页面获取。

## 项目结构

```
baijiayun-skills/
├── skills/                       # Skills 目录
│   └── baijiayun-room/           # Skill（房间管理）
│       ├── SKILL.md             # Skill 定义
│       ├── scripts/
│       │   └── baijiayun.js     # CLI 主脚本
│       └── references/
│           ├── api-room.md      # API 详细文档
│           ├── error-codes.md   # 错误码参考
│           └── cli-usage.md     # CLI 用法速查
├── tests/unit/
│   └── config-sign.test.js     # 单元测试
├── config/
│   └── baijiayun.example.json  # 配置模板
├── CLAUDE.md                    # 项目上下文（AI 助手用）
├── README.md                    # 本文件
└── package.json                # npm 脚本配置
```

## 获取 API 凭证

1. 登录百家云后台
2. 在账号信息页面查看个性域名
3. 在开放平台获取 `partner_id` 和 `partner_key`
