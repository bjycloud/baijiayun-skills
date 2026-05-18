# 大班课直播服务端API接口

## 概述

本文档为百家云大班课直播服务端的API文档，用户可以通过文档中提供的API接口创建及管理直播间，导出直播数据信息等。

> 注：百家云API仅提供基础数据，客户须将数据同步到自己数据库（DB）后，通过自己的数据库（DB）来实现业务需求。单个账号和单个服务器ip所有 openapi 接口 10s 内的请求不可超过 200 次，否则会触发请求频率限制导致请求失败，请设置合理的缓存机制降低接口调用频率

### 基本约定


常见基本约定以及平台术语见下表：

| 内容          | 约定       |
|---------------|-----------------------------|
| 请求协议      | HTTPS |
| 请求类型      | `GET`/`POST`|
| 参数提交方式      | `application/x-www-form-urlencoded`或`multipart/form-data`|  
| 返回数据格式      | `json` |
| 字符编码      | `UTF8` |
| 接口域名  | https://`${private_domain}`.at.baijiayun.com/ |
| `${private_domain}` | 个性域名 |
| `partner_id` | 账号的ID, 由百家云平台分配，用户可以登录百家云网站后台查看 |
| `partner_key` | 账号的密钥，由百家云平台分配，用于计算服务端API接口的签名，用户可以登录百家云网站后台获取 |



> 说明：文档中的数字统一用`int`表示，即无符号的64位整数，取值范围是`2^0~2^63`;


### 使用流程

合作方接入百家云开放平台直播有如下几个步骤：

1. *注册账号*
    - 注册后可以登录百家云后台获取`partner_id`和`partner_key`
2. *创建房间*
    - 根据百家云提供的API接口创建和管理房间
3. *进入房间*
    - 根据百家云提供的地址或接入百家云SDK进入教室
4. *获取统计数据*
	- 使用数据统计相关的接口可以导出直播用户的统计数据


### 接口规范


公共请求参数：

| 参数         | 类型   | 示例                             | 参数说明                                                    |
|--------------|--------|----------------------------------|-------------------------------------------------------------|
| `partner_id` | int    | 12345678                           | 合作方账号ID                                                |
| `timestamp`  | int    | 1505372499                       | unix时间戳，当前的秒数，10位长的数字（注：不是毫秒）                      |
| `sign`       | string | e10adc3949ba59abbe56e057f20f883e | 根据`partner_key`和请求参数计算的签名，32位的小写字母或数字 |


公共返回参数如下:

| 参数   | 类型   | 示例     | 参数说明                           |
|--------|--------|----------|------------------------------------|
| `code` | int    | 1001     | 错误码，对应的错误原因参见错误码表 |
| `msg`  | string | 签名错误 | 错误原因描述                       |
| `data` | json   |          | 返回的数据，出错时返回的data为null |


### 个性域名

百家云给每个账号都分配了一个个性域名，客户调用服务端API接口、对接客户端SDK的时候，都需要用到这个个性域名。

个性域名可以登录百家云后台，在账号信息页面查看。

成为付费客户后，可以申请修改该个性域名（只能个性一次，修改后不可再更改）。

以下服务端的接口，都是调自己个性域名下的接口。

例如：个性域名是`demo123`，则所有的服务端API请求的域名为：`https://demo123.at.baijiayun.com/`

为方便理解，以下接口中的个性域名，都用`${private_domain}`表示，在使用的时候请将该变量替换成自己的个性域名。


### 签名规则

#### 签名计算方式

直播服务端每个接口除了传递业务参数外，还有一个用于校验的sign参数。

sign的生成规则如下：

- 将请求参数按key字典顺序(ASCII值大小)升序排序。
- 将排好序的参数拼成 `key1=value1&key2=value2&...&keyN=valueN` 。
- 将以上拼好的串后面再拼上 `&partner_key=<partner_key>` ，其中 `<partner_key>` 替换成具体值。
- 对以上拼好的串算一个32位md5值（小写），即得到了签名。

注：  

- partner_key总是拼在字符串最后面，并不参与key的排序。  
- partner_key只是计算签名时需要，在发送请求时不需要发partner_key


例如，创建房间的接口需要以下参数：

```
partner_id=12345678
title=测试教室
start_time=1501575608
end_time=1501579208
type=2

partner_key=rLkIPaQjxSwRQmC/ITnHh8i2rifmmbFIVsYw03SSi24zAnkrAd0ZNb2rcTzI2avy7+AmNJDdLmzU89zKUAP3Xg==
```

以上参数排序后的顺序为：

```
end_time=1501579208
partner_id=12345678
start_time=1501575608
timestamp=1501572288
title=测试教室
type=2
```

按以上顺序拼接的字符串为： 

```
end_time=1501579208&partner_id=12345678&start_time=1501575608&timestamp=1501572288&title=测试教室&type=2
```

再拼上`partner_key`后的字符串为：

```
end_time=1501579208&partner_id=12345678&start_time=1501575608&timestamp=1501572288&title=测试教室&type=2&partner_key=rLkIPaQjxSwRQmC/ITnHh8i2rifmmbFIVsYw03SSi24zAnkrAd0ZNb2rcTzI2avy7+AmNJDdLmzU89zKUAP3Xg==
```

最后算出来32位的小写的md5值为：

```
5b78486597c679b0c6256da014af1260
```

#### 示例代码（php）

``` php
<?php

/**
 * 生成签名参数
 * 
 * @param array $params 请求的参数
 * @param string $partner_key 
 * @return string 生成的签名
 */
function getSign($params, $partner_key) {
    ksort($params);//将参数按key进行排序
    $str = '';
    foreach ($params as $k => $val) {
        $str .= "{$k}={$val}&"; //拼接成 key1=value1&key2=value2&...&keyN=valueN& 的形式
    }
    $str .= "partner_key=" . $partner_key; //结尾再拼上 partner_key=$partner_key
    $sign = md5($str); //计算md5值
    return $sign;
}

$params =  [
    "partner_id" => 12345678,
    "title" => "测试教室",
    "start_time" => 1501575608,
    "end_time" => 1501579208,
    "type" => 2,
    "timestamp" => 1501572288,
]

$partner_key = 'rLkIPaQjxSwRQmC/ITnHh8i2rifmmbFIVsYw03SSi24zAnkrAd0ZNb2rcTzI2avy7+AmNJDdLmzU89zKUAP3Xg==';
$sign = getSign($params, $partner_key);
```

## API列表


### API 1 : 获取/重置partner_key


#### 【功能描述】

初始的`partner_key`和`secret_key`都可登录百家云后台获取。

此接口可用于重置`partner_key`。

#### 【请求类型】
POST

#### 【请求地址】

```
https://${private_domain}.at.baijiayun.com/openapi/partner/createkey
```

#### 【请求参数】

| 参数         | 类型   | 是否必填 | 默认值 | 参数说明                                                                        |
|--------------|--------|----------|--------|---------------------------------------------------------------------------------|
| `partner_id` | int    | 是       |        | 合作方账号ID，在百家云账号后台可以查询                                                                   |
| `secret_key` | string | 是       |        | 合作方用于更新partner_key的密钥（由开放平台提供给合作方）                       |
| `regenerate` | int    | 否       | 0      | 为1时表示强制重新生成`partner_key`（默认情况下返回当前已经存在的`partner_key`） |
| `timestamp`                  | int    | 是       |        | 当前unix时间戳（秒）|
| `sign`                       | string | 是       |        | 签名              |


#### 【返回参数】

| 参数          | 类型   | 示例 | 说明                         |
|---------------|--------|------|------------------------------|
| `partner_key` | string |      | `partner_key`长度不超过128位 |


#### 【请求示例】
```
curl -d "partner_id=12345678&secret_key=e10adc3949ba59abbe56e057f20f883e" https://${private_domain}.at.baijiayun.com/openapi/partner/createkey
```

#### 【返回示例】
```
{
      "code": 0,
      "data": {
          "partner_key": "rLkIPaQjxSwRQmC/ITnHh8i2rifmmbFIVsYw03SSi24zAnkrAd0ZNb2rcTzI2avy7+AmNJDdLmzU89zKUAP3Xg=="
      },
      "msg":""
}
```


### API 2 : 创建房间


#### 【功能描述】

创建房间
***此接口 24 小时内的调用次数不可超过 5000 次，如需要大批量提前建课，请注意隔天分批次处理***

#### 【请求类型】
POST

#### 【请求地址】

```
https://${private_domain}.at.baijiayun.com/openapi/room/create
```

#### 【请求参数】

| 参数                         | 类型   | 是否必填 | 默认值 | 描述                                                                    |
|------------------------------|--------|----------|--------|-------------------------------------------------------------------------------------------|
| `partner_id`                 | int    | 是       |        | 合作方id                                                                                                        |
| `title`                      | string | 是       |        | 直播课标题，不超过50个字符或汉字，超过部分将进行截取                                                            |
| `start_time`                 | int    | 是       |        | 开课时间, unix时间戳（秒）                                                                                      |
| `end_time`                   | int    | 是       |        | 下课时间, unix时间戳（秒）                                                                                      
| `timestamp`                  | int    | 是       |        | 当前unix时间戳（秒）                                                      |
| `sign`                       | string | 是       |        | 签名                                                              |
| `type`                       | int    | 否       | 2      | 1:一对一课（老的班型，老账号支持） 2:普通大班课 3:小班课普通版（老的班型，老账号支持）               
| `industry_type`       | int           | 否      |   0           | 0:表示教育|
| `max_users`                  | int    | 否       | 0      | 代表普通大班课最大人数, 不传或传0表示不限制。|
| `pre_enter_time`             | int    | 否       |    | 学生可提前进入的时间，单位为秒                                                                   |
| `is_long_term`               | int    | 否       | 0      | 是否是长期房间，0:普通房间(注：普通房间时长小于24小时) 1:长期房间 默认为普通房间（注：需要给账号开通长期房间权限才可以创建长期房间）        |
| `template_name`               | string    | 否 |       | 可选值，教育直播：doubleCamera(双摄像头)、classic(经典模板)、triple(三分屏)、liveWall(视频墙)、video(纯视频)，默认triple;|
| `app_template`               | int    | 否 |       | 可选值, APP端模板样式，1是横屏，2是竖屏;|
| `speak_camera_turnon`        | int    | 否       |        | 学生发言时是否自动开启摄像头 1:开启 2:不开启 默认会开启                                                         |
| `teacher_need_detect_device` | int    | 否       |        | 老师是否启用设备检测 1:启用  2:不启用 默认不启用                                                                |
| `student_need_detect_device` | int    | 否       |        | 学生是否启用设备检测 1:启用  2:不启用 默认不启用                                                               |
| `is_video_main` | int    | 否       |        |  指定PC端是否以视频为主 1:以视频为主 2:以PPT为主 （默认是以ppt为主，该选项只针对三分屏有效）  |
| `m_is_video_main` | int    | 否       |        |  指定手机H5页面是否以视频为主 1:以视频为主 2:以PPT为主 （默认是以视频为主）  |
| `is_mock_live`     | int |  否  |  0	|	是否是伪直播，0:否 1:是（注：需要给账号开通伪直播权限才可以创建伪直播，选择伪直播时，必须要选择mock_video_id或mock_room_id和mock_session_id；伪直播模式下，不能设置长期教室）|
| `is_push_live`	| int | 否 | 0 |  是否是推流直播，0:常规直播 1:推流直播 默认是常规直播（注：需要给账号开通推流直播的权限，开通后账号默认推流码率需要小于1000kbps，超出1000kbps则直播间无法推流，待10分钟后直播间会解禁，如需提高视频比特率请联系客户经理。）|
| `mock_room_id` |  int | 否 | 0 | 伪直播关联的回放教室号 |
| `mock_session_id` | int | 否 | 0 | 伪直播关联的回放教室session_id（针对长期房间） |
|`mock_video_id` |  int  | 否 | 0 | 伪直播关联的点播视频ID | 
| `switch_room_role` | int | 否 | 2 | 分组直播，大小班切换控制角色  1：大班老师控制，2 小班老师控制|
| `enable_share` | int | 否 | 0 | 是否允许APP分享 1:允许 2:不允许 0或不传则使用默认值，默认是允许|
| `enable_group_users_public` | int | 否 | 0 | 分组课堂/线上双师 成员名单数据权限 0:成员只看组内权限 1:成员可看全部权限 0或不传则使用默认值，默认是成员只看组内权限|
| `group_admin_permission` | int | 否 | 0 | 分组/线上双师 助教查看答题数据权限 0:助教查看组内答题数据 1:助教查看全部数据 0或不传则使用默认值，默认是助教查看组内答题数据|
| `enable_group_chat_public` | int | 否 | 0 | 分组直播/线上双师 成员聊天数据权限 0:成员只看组内权限 1:成员可看全部权限 0或不传则使用默认值，默认是成员只看组内权限|
| `new_group_live`               | int    | 否       | 0      | 是否分组，0:常规直播 1:分组课堂（注：需要给账号开通相关权限才可以创建分组直播，必须同时指定参数type为2）2:线上双师（注：需要权限，参数type须为2）       |
| `is_discuss_live`	| int | 否 | 0 |  研讨会模式，仅在new_group_live为2时支持 |
| `mock_live_record`               | int    | 否       |       | 伪直播自动录制  1：是，0：否 |
| `mock_live_play_times`               | int    | 否       |       | 伪直播设置循环播放次数 |
| `push_live_record`               | int    | 否       |       | 推流直播自动录制  1：是，0：否 |
| `enable_weixin_auth`               | int    | 否       |   1    |微信用户获取昵称  1：启用，2：不启用 |
| `system_auto_allocate_name`               | int    | 否       |   0    |系统自动分配昵称  1：启用，0：不启用 |
| `has_student_raise`               | int    | 否       |   普通大班课默认1,伪直播，推流直播等为0 |有无学生上麦，仅在webrtc班型上使用此参数  0：无，1：有。|
| `end_delay_time`               | int    | 否       |       | 课程预设的结束时间后可以拖堂的时间，到时间会强制下课，单位（秒），0不强制，大于0生效,最大不可超过7200秒（两小时）|
| `enable_live_sell`               |int    | 否       |  0     | 是否使用带货直播模板。0:不使用 1:纯视频带货模板 2:ppt 带货模板 |
| `auto_playback_record`      | int    | 否       |  0     | 普通教室教室级别控制是否自动录制。0：默认，读取后台配置 1：开 2：关 |
| `enable_beauty`               | int    | 否       |       | 是否开启美颜功能，默认读取账号配置。0:不开启，1开启 |
| `enable_sticker`      | int    | 否       |       | 是否开启虚拟背景功能，默认读取账号配置，0不开启，1开启 |
| `sell_goods_in_large_class `      | int    | 否       |       | 是否开启三分屏带货，0不开启，1开启（仅enable_live_sell=0生效） |
| `is_live_and_mock_live`      | int    | 否       |       | 是否是智能直播（真伪直播）（仅线上双师班型生效） |


注意:

非长期房间，结束时间与开始时间间隔需大于15分钟并小于24小时，开始时间和结束时间范围必须在当前时间一年以内。


#### 【返回参数】

| 参数           | 类型   | 示例 | 描述                   |
|----------------|-------|----------------|------------------------|
| `room_id`      | string        | 12345678901234    | 房间ID,14位的数字      |
| `admin_code`   | string        | abdce2     | 助教进入房间的参加码 |
| `teacher_code` | string        | 13rlkk     | 老师进入房间的参加码   |
| `student_code` | string        | abc213     | 学生公共参加码，该参加码可以进多个学生，不互踢   |

注意：

1. 参加码是一种快速进入房间的形式，合作方把参加码发给用户，他们就可以通过参加码和昵称直接进入房间。
2. 参加码为6位，由字母和数字组成。

#### 【请求示例】

```
curl -d "end_time=1464343200&partner_id=123456789&start_time=1464314400×tamp=1464313928&title=test&type=2&sign=e10adc3949ba59abbe56e057f20f883e" https://${private_domain}.at.baijiayun.com/openapi/room/create
```

#### 【返回示例】
```
{
    "code": 0,
    "data": {
        "room_id": "12345678901234",
        "admin_code": "213rjl",
        "teacher_code": "232kj1",
        "student_code": "abc213"
    },
    "msg":""
}
```



### API 3 : 更新房间信息

#### 【功能描述】

更新房间信息

#### 【请求类型】
POST

#### 【请求地址】

```
https://${private_domain}.at.baijiayun.com/openapi/room/update
```

#### 【请求参数】

| 参数             | 类型   | 是否必填 | 默认值 | 描述                             |
|------------------|--------|----------|--------|----------------------------------|
| `partner_id`     | int    | 是       |        | 合作方id                         |
| `room_id`        | int    | 是       |        | 房间ID，14位                     |
| `title`          | string | 否       |        | 房间标题                         |
| `start_time`     | int    | 否       |        | 开课时间, unix时间戳(秒)         |
| `end_time`       | int    | 否       |        | 结束时间, unix时间戳(秒)         |
| `max_users`      | int    | 否       |        | 房间最大人数,代表普通大班课最大人数, 不传或传0表示不限制。|
| `pre_enter_time` | int    | 否       |        | 学生可提前进入的时间，单位为秒   |
| `template_name` | string    | 否       |       | 可选值：doubleCamera(双摄像头)、classic(经典模板)、triple(三分屏) |
| `app_template`               | int    | 否 |       | 可选值, APP端模板样式，1是横屏，2是竖屏;|
| `forbidden_end_types` | string    | 否       |        |  指定屏蔽的端，可选值（web:pc浏览器, h5:手机浏览器）多种以英文逗号分隔  |
| `is_video_main` | int    | 否       |        |  指定PC端是否以视频为主 1:以视频为主 2:以PPT为主 （默认是以ppt为主，该选项只针对三分屏有效）  |
| `m_is_video_main` | int    | 否       |        |  指定手机H5页面是否以视频为主 1:以视频为主 2:以PPT为主 （默认是以视频为主）  |
| `mock_room_id` |  int | 否 | 0 | 伪直播关联的回放教室号 |
| `mock_session_id` | int | 否 | 0 | 伪直播关联的回放教室session_id（针对长期房间） |
|`mock_video_id` |  int  | 否 | 0 | 伪直播关联的点播视频ID | 
| `switch_room_role` | int | 否 | 0 | 分组直播大小班切换，角色控制 1：大班 2：小班 |
| `student_private_chat_role` | int | 否 |  | 学生私聊角色，0：全部，1：老师，2：助教 |
| `enable_live_sell`               | int | 否    | 0  |直播带货模板属性  0：不启用 ，1：是纯视频模板，2：是ppt带货模板 ，请在教室未开始前更新|
| `is_private`               | int | 否    | 0  |0 直接进教室，1 课程私密参加码，2 公开参加码，3 白名单进教室，4 密码观看，5 云端直播白名单，6 手机验证|
| `enable_mock_sync_chat_message `      | int    | 否       |       | 伪直播,是否同步回放聊天消息 0：不同步 1：同步 |
| `timestamp`      | int    | 是       |        | 当前时间，unix时间戳(秒)         |
| `sign`           | string | 是       |        | 请求接口参数签名                 |


#### 【返回参数】

返回code为0时表示更新成功，返回code非0表示更新失败，失败原因在msg中返回。


#### 【返回示例】
成功情况下:

```
{
    "code": 0,
    "data": null,
    "msg": ""
}
```



### API 4 : 删除房间

#### 【功能描述】
删除一个房间

#### 【请求类型】
POST

#### 【请求地址】

```
https://${private_domain}.at.baijiayun.com/openapi/room/delete
```

#### 【接口参数】

| 参数         | 类型   | 是否必填 | 默认值 | 描述                 |
|--------------|--------|----------|--------|----------------------|
| `partner_id` | int    | 是       |        | 合作方id             |
| `room_id`    | int    | 是       |        | 房间id               |
| `timestamp`  | int    | 是       |        | 当前时间，unix时间戳 |
| `sign`       | string | 是       |        | 签名                 |

#### 【返回参数】

返回code为0时表示删除成功，返回code非0表示删除失败，失败原因在msg中返回。

#### 【返回示例】

```
{
    "code": 0,
    "data": null,
    "msg": ""
}
```

### API 5 : 获取房间信息

#### 【功能描述】

获取房间信息

#### 【请求类型】

POST

#### 【请求地址】

```
https://${private_domain}.at.baijiayun.com/openapi/room/info
```

#### 【请求参数】

| 参数         | 类型   | 是否必填 | 默认值 | 描述                 |
|--------------|--------|----------|--------|----------------------|
| `partner_id` | int    | 是       |        | 合作方id             |
| `room_id`    | int    | 是       |        | 房间id               |
| `timestamp`  | int    | 是       |        | 当前时间，unix时间戳 |
| `sign`       | string | 是       |        | 签名                 |

#### 【返回参数】

| 参数           | 类型          | 示例 | 描述                   |
|----------------|-------------|----------------|------------------------|
| `room_id`      | int      | 12345612345699 | 房间id               |
| `title`        | string      | 英语语法在线   | 直播课标题             |
| `start_time`   | datetime | 2017-08-18 14:00:00     | 开课时间，格式如：2017-08-18 14:00:00   |
| `end_time`     | datetime | 2017-08-18 15:00:00     | 结束时间，格式如：2017-08-18 14:00:00 |
| `type`         | string     | 2              | 1:一对一课 2:大班课      |
| `is_long_term`         | int     | 0             | 是否是长期房间，0否，1是     |
| `max_users`         | string     | 0              | 直播间允许的最大人数 |
| `admin_code`   | string      | abc123     | 助教进入直播间的参加码 |
| `teacher_code` | string      | 123abc    | 老师进入直播间的参加码   |
| `create_from` | int      | 1    | 教室来源（1:开放平台api接口 2:管理后台 3:直播APP创建 4:DEMO页面创建 5:云端课堂后台 6:双师辅助教室 7:分组母教室 8:小班课后台系统 9:商务直播后台 10:双师辅助非webrtc教室 11:brtc 12:自习室场外辅导）   |
| `is_private`               | int  | 0  |0 直接进教室，1 课程私密参加码，2 公开参加码，3 白名单进教室，4 密码观看，5 云端直播白名单，6 手机验证|
| `new_group_live`               | int    | 0      | 是否分组，0:常规直播 1:分组课堂 2:线上双师  |
| `media_type`         | int     | 0              | 0:视频 1:音频 |
| `enable_share`         | int     | 0              | 是否允许分享 0:默认 1:开启 2:关闭 |
| `pre_enter_time`         | int     | 0              | 可提前进入秒数 |
| `is_mock_live`         | int     | 0              | 是否是伪直播 0：否 1: 是 |
| `is_push_live`         | int     | 0              | 是否是推流直播 0:否 1:是 |
| `max_backup_users`         | string     | 0              | 台下最大人数 |
| `is_discuss_live`         | int     | 0              | 研讨会 |
| `speak_camera_turnon`         | int     | 0              | 发言时摄像头是否默认开启 0:默认 1:开启 2:不开启 |
| `teacher_need_detect_device`         | int     | 0              | 是否自动检测设备 0:默认 1:检测 2:不检测 |
| `student_need_detect_device`         | int     | 0              | 学生是否自动检测设备 0:默认 1:检测 2:不检测 |
| `auto_playback_record`         | int     | 0              | 自动开启云端录制 0:默认 1:开启 2:使用本地配置 |
| `template_name`         | string     | 0              | pc模板名 |
| `is_video_main`         | int     | 0              | 是否视频为主 0:默认 1:是 2:否 |
| `m_is_video_main `         | int     | 0              | 指定手机H5页面是否以视频为主 1:以视频为主 2:以PPT为主 （默认是以视频为主） |
| `m_template`         | int     | 0              | m站是否视频为主 0:默认 1:是 2:否 |
| `enable_weixin_auth`         | int     | 0              | 0:默认 1:是 2:否 |
| `system_auto_allocate_name`         | int     | 0              | 系统自动分配昵称 |
| `has_student_raise`         | int     | 0              | 是否有学生举手上麦 |
| `switch_room_role`         | int     | 0              | 大小班切换控制 1大班老师控制2小班老师控制 |
| `enable_group_users_public`         | int     | 0              | 分组器对其组可见 |
| `group_admin_permission`         | int     | 0              | 助教权限，0只看本组，1能看其他组 |
| `enable_group_chat_public`         | int     | 0              | 分组聊天是不是全员可见,0不可见1可见 |
| `end_delay_time`         | int     | 0              | 拖堂时间，秒 |
| `enable_live_sell`         | int     | 0              | 是否开启直播带货 |
| `app_template`         | int     | 1              | app模版属性（横竖屏） |
| `sell_goods_in_large_class`         | int     | 0              | 大班课支持直播带货	 |
| `enable_mock_sync_chat_message`         | int     | 0              | 是否允许伪直播同步回放聊天消息	 |
| `enable_ppt_page_down`         | int     | 1              | 授权PPT是否允许翻页	 |
| `mock_live_record `         | int     | 0              | 伪直播自动录制 1：是，0：否	 |
| `push_live_record `         | int     | 0             | 推流直播自动录制 1：是，0：否	 |



#### 【返回示例】
```
{
	"code": 0,
	"data": {
		"room_id": 22112449907210,
		"title": "时代风帆大厦",
		"type": "2",
		"media_type": "0",
		"max_users": "0",
		"max_backup_users": "0",
		"pre_enter_time": 0,
		"start_time": "2022-11-24 15:40:00",
		"end_time": "2032-11-21 15:40:00",
		"create_time": "2022-11-24 15:39:10",
		"create_from": 9,
		"is_long_term": 1,
		"is_mock_live": 0,
		"is_push_live": 1,
		"is_private": 0,
		"enable_share": 0,
		"new_group_live": 0,
		"is_discuss_live": 0,
		"speak_camera_turnon": 0,
		"teacher_need_detect_device": 0,
		"student_need_detect_device": 0,
		"switch_room_role": 0,
		"is_video_main": 0,
		"enable_group_users_public": 0,
		"group_admin_permission": 0,
		"enable_group_chat_public": 0,
		"template_name": "singleVideo",
		"enable_weixin_auth": 1,
		"system_auto_allocate_name": 0,
		"has_student_raise": 0,
		"end_delay_time": 0,
		"enable_live_sell": 0,
		"auto_playback_record": 0,
		"m_is_video_main": 0,
		"m_template": 0,
		"admin_code": "6grtqv",
		"teacher_code": "yff67c",
		"app_template": 1,
		"sell_goods_in_large_class": 0,
		"enable_mock_sync_chat_message": 0,
		"enable_ppt_page_down": 1,
		"mock_live_record": 0,
		"push_live_record": 0,
	},
	"msg": "",
	"ts": 1694500351
}
```


## 错误码及对应的描述

| code | 描述           |
|------|----------------|
| 0    | 成功           |
| 1    | 普通错误（没有明确code码的错误）       |
| 404  | 请求路径不存在 |
| 1001 | 参数错误       |
| 1002 | 签名计算错误   |
| 2001 | 账号不存在     |
| 2002 | 账号权限错误   |
| 2003 | 直播账号未开或服务停止|
| 3001 | 房间号不存在   |
| 3002 | 该房间已删除   |
| 4001 | 文件上传失败 |