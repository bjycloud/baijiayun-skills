---
name: baijiayun-room
description: 百家云大班课直播房间管理。创建、更新、删除、查询直播间。当用户想要创建直播房间、新建房间、修改房间信息、删除直播间、查询房间详情时使用。
---

## 功能说明

百家云大班课直播平台房间管理 Skill，支持以下操作：

| 命令 | 说明 | 必填参数 |
|------|------|---------|
| `create-room` | 创建直播间 | title, start_time, end_time |
| `update-room` | 更新房间信息 | room_id |
| `delete-room` | 删除房间 | room_id |
| `get-room` | 获取房间信息 | room_id |

详细参数说明、CLI 示例、错误处理见 [references/](references/) 目录下的参考文档。

## 快速使用

### 创建房间

**必填参数：** `title`（直播课标题，不超过50字符）、`start_time`（unix时间戳秒）、`end_time`（unix时间戳秒）

**常用可选参数：** `type`（1:一对一 2:大班课 3:小班课，默认2）、`max_users`（最大人数，0不限）、`template_name`（triple默认）、`is_long_term`（0普通 1长期）、`is_video_main`（PC端 1视频 2PPT）、`m_is_video_main`（手机H5 1视频 2PPT）、`is_mock_live`（0否 1伪直播）、`new_group_live`（0常规 1分组 2双师）、`enable_live_sell`（0不用 1纯视频 2PPT带货）

**返回字段：** `room_id`（14位房间ID）、`admin_code`（助教参加码6位）、`teacher_code`（老师参加码6位）、`student_code`（学生公共参加码6位）

```
用户：创建一个直播房间，标题是"产品发布会"，明天上午10点开始，下午2点结束
参数：title="产品发布会", start_time=<明天10点的unix秒时间戳>, end_time=<明天14点的unix秒时间戳>
```

### 更新房间

**必填参数：** `room_id`（房间ID，14位）

可选：title、start_time、end_time、max_users、template_name、app_template、is_video_main、m_is_video_main、is_private、enable_live_sell 等。

```
用户：把房间号12345678901234的标题改成"新课程名称"
参数：room_id=12345678901234, title="新课程名称"
```

### 删除房间

**必填参数：** `room_id`（房间ID，14位）

```
用户：删除房间号12345678901234
参数：room_id=12345678901234
```

### 获取房间信息

**必填参数：** `room_id`（房间ID，14位）

返回房间完整信息：标题、开课时间、结束时间、参加码、模板类型等20+字段。

```
用户：查询房间号12345678901234的详细信息
参数：room_id=12345678901234
```

## 配置

配置优先级：**CLI参数 > 环境变量 > 配置文件**

```bash
# 环境变量
BAIJIAYUN_PARTNER_ID=12345678
BAIJIAYUN_PARTNER_KEY=你的partner_key
BAIJIAYUN_PRIVATE_DOMAIN=你的个性域名

# 配置文件
mkdir -p ~/.baijiayun-skills
cp config/baijiayun.example.json ~/.baijiayun-skills/config.json
```

## 注意事项

1. **时间戳格式**：百家云使用 **秒级 unix 时间戳**（10位），不是毫秒
2. **房间时长**：普通房间开始和结束时间间隔需大于15分钟并小于24小时
3. **创建频率**：24小时内调用次数不可超过5000次
4. **长期房间**：需要账号开通相应权限，普通房间无法修改为长期
5. **参加码**：6位字母数字组合，用于快速进入房间

## 错误处理

| 错误码 | 说明 | 解决方案 |
|--------|------|---------|
| 1001 | 参数错误 | 检查必填参数是否完整 |
| 1002 | 签名计算错误 | 检查 partner_id / partner_key 是否正确 |
| 2001 | 账号不存在 | 检查 partner_id 是否正确 |
| 2002 | 账号权限错误 | 检查账号是否有对应功能权限 |
| 3001 | 房间号不存在 | 检查 room_id 是否正确 |
| 3002 | 该房间已删除 | 房间已被删除，无需重复操作 |

详细错误码和错误处理见 [references/error-codes.md](references/error-codes.md)。
