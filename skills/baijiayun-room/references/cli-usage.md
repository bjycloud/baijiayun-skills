# CLI 使用参考

本文件包含 baijiayun-room skill 的完整 CLI 调用示例，供 agent 在需要时查阅。

## 基本用法

```bash
node skills/baijiayun-room/scripts/baijiayun.js <command> [options]
```

## 命令列表

| 命令 | 说明 | 必填参数 |
|------|------|---------|
| `create-room` | 创建直播间 | title, start_time, end_time |
| `update-room` | 更新房间信息 | room_id |
| `delete-room` | 删除房间 | room_id |
| `get-room` | 获取房间信息 | room_id |
| `sign-test` | 测试签名生成 | 无 |

## 创建房间

```bash
node skills/baijiayun-room/scripts/baijiayun.js create-room \
  --title "产品发布会" \
  --startTime 1735689600 \
  --endTime 1735693200
```

常用可选参数：

| 参数 | 说明 |
|------|------|
| `--type` | 1:一对一 2:大班课(默认) 3:小班课 |
| `--maxUsers` | 最大人数，0或不传表示不限制 |
| `--templateName` | triple(默认)/doubleCamera/classic/liveWall/video |
| `--appTemplate` | 1:横屏 2:竖屏 |
| `--isLongTerm` | 0:普通房间 1:长期房间 |
| `--preEnterTime` | 学生可提前进入的时间（秒）|
| `--isVideoMain` | PC端以视频为主：1:视频 2:PPT |
| `--mIsVideoMain` | 手机H5以视频为主：1:视频 2:PPT |
| `--isMockLive` | 伪直播：0:否 1:是 |
| `--newGroupLive` | 0:常规 1:分组课堂 2:线上双师 |
| `--enableLiveSell` | 0:不使用 1:纯视频带货 2:ppt带货 |
| `--autoPlaybackRecord` | 自动录制：0:默认 1:开 2:关 |

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

## 更新房间

```bash
node skills/baijiayun-room/scripts/baijiayun.js update-room \
  --roomId 12345678901234 \
  --title "新课程名称" \
  --maxUsers 500
```

## 删除房间

```bash
node skills/baijiayun-room/scripts/baijiayun.js delete-room --roomId 12345678901234
```

## 获取房间信息

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

## 签名调试

```bash
BAIJIAYUN_DEBUG=true node skills/baijiayun-room/scripts/baijiayun.js sign-test
```

## 配置认证参数

配置优先级：**CLI 参数 > 环境变量 > 配置文件**

### 环境变量

```bash
BAIJIAYUN_PARTNER_ID=12345678
BAIJIAYUN_PARTNER_KEY=你的partner_key
BAIJIAYUN_PRIVATE_DOMAIN=你的个性域名
```

### 配置文件

```bash
mkdir -p ~/.baijiayun-skills
cp config/baijiayun.example.json ~/.baijiayun-skills/config.json
```

编辑 `~/.baijiayun-skills/config.json`，填入凭证：

```json
{
  "partner_id": "12345678",
  "partner_key": "你的partner_key",
  "private_domain": "你的个性域名"
}
```

### CLI 参数直接指定

```bash
node skills/baijiayun-room/scripts/baijiayun.js create-room \
  --partnerId 12345678 \
  --partnerKey 你的partner_key \
  --domain 你的个性域名 \
  --title "测试直播" \
  --startTime 1735689600 \
  --endTime 1735693200
```

## 调试模式

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

## 常见问题

**Q: 怎么获取 unix 时间戳？**

```bash
# Linux / Mac
date +%s

# 未来某个时间（如 2025-12-25 09:00:00）
date -j -f "%Y-%m-%d %H:%M:%S" "2025-12-25 09:00:00" +%s
```

**Q: API 调用返回认证失败？**

A: 检查 partner_id 和 partner_key 是否正确，注意大小写

**Q: 如何查看详细的请求日志？**

A: 设置 `BAIJIAYUN_DEBUG=true` 环境变量
