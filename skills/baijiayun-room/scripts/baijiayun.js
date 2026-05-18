#!/usr/bin/env node

/**
 * baijiayun-skills CLI Tool
 * 百家云大班课直播 API Skills
 *
 * 支持:
 * - create-room:   创建直播间
 * - update-room:   更新房间信息
 * - delete-room:   删除房间
 * - get-room:      获取房间信息
 * - sign-test:     签名调试
 * - help:          帮助信息
 *
 * 配置优先级: CLI参数 > 环境变量 > 配置文件
 * - 环境变量: BAIJIAYUN_PARTNER_ID, BAIJIAYUN_PARTNER_KEY, BAIJIAYUN_PRIVATE_DOMAIN
 * - 配置文件: ~/.baijiayun-skills/config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// ============================================
// Constants
// ============================================
const CONFIG_DIR_NAME = '.baijiayun-skills';
const CONFIG_FILE_NAME = 'config.json';
const ENV_PARTNER_ID = 'BAIJIAYUN_PARTNER_ID';
const ENV_PARTNER_KEY = 'BAIJIAYUN_PARTNER_KEY';
const ENV_PRIVATE_DOMAIN = 'BAIJIAYUN_PRIVATE_DOMAIN';
const ENV_DEBUG = 'BAIJIAYUN_DEBUG';
const API_BASE_URL_FMT = 'https://{domain}.at.baijiayun.com';
const DEFAULT_TIMEOUT = 5000;
const CLI_VERSION = '1.0.0';

// ============================================
// Error codes
// ============================================
const ERROR_CODE_MESSAGES = {
  0: '成功',
  1: '普通错误',
  404: '请求路径不存在',
  1001: '参数错误',
  1002: '签名计算错误',
  2001: '账号不存在',
  2002: '账号权限错误',
  2003: '直播账号未开或服务停止',
  3001: '房间号不存在',
  3002: '该房间已删除',
  4001: '文件上传失败',
};

const ERROR_CODE_HINTS = {
  1001: '检查必填参数是否完整',
  1002: '检查 partner_id 和 partner_key 是否正确',
  2001: '检查 partner_id 是否正确',
  2002: '检查账号是否有对应功能权限',
  2003: '检查账号状态是否正常',
  3001: '检查 room_id 是否正确',
  3002: '房间已被删除，无需重复操作',
  4001: '请稍后重试',
};

// ============================================
// Config helpers
// ============================================
function getConfigPath(customHome) {
  return path.join(customHome || os.homedir(), CONFIG_DIR_NAME, CONFIG_FILE_NAME);
}

function debug(message, data) {
  if (process.env[ENV_DEBUG]) {
    const ts = new Date().toISOString();
    if (data) {
      console.error(`[DEBUG ${ts}] ${message} ${JSON.stringify(maskSensitive(data))}`);
    } else {
      console.error(`[DEBUG ${ts}] ${message}`);
    }
  }
}

function maskSensitive(data) {
  if (!data || typeof data !== 'object') return data;
  const masked = { ...data };
  if (masked.partner_key) {
    const k = String(masked.partner_key);
    masked.partner_key = k.length > 4 ? k.slice(0, 2) + '****' + k.slice(-2) : '****';
  }
  return masked;
}

function formatError(code, message, hint) {
  let err = `❌ [BAIJIAYUN-${code}] ${message}`;
  if (hint) err += `\n   提示：${hint}`;
  return err;
}

function validateConfig(config) {
  const missing = [];
  if (!config?.partner_id) missing.push('partner_id');
  if (!config?.partner_key) missing.push('partner_key');
  if (!config?.private_domain) missing.push('private_domain');
  if (missing.length === 0) return null;
  const msg = missing.length === 1
    ? `缺少 ${missing[0]} 配置`
    : `缺少 ${missing.join(' 和 ')} 配置`;
  let hint;
  if (missing.includes('partner_id') && missing.includes('partner_key') && missing.includes('private_domain')) {
    hint = '请设置环境变量或创建 ~/.baijiayun-skills/config.json';
  } else {
    hint = `请设置 ${missing.map(v => `BAIJIAYUN_${v.toUpperCase()}`).join(' 或 ')} 环境变量`;
  }
  return { code: 'CONFIG_MISSING', message: msg, hint };
}

function readConfigFile(customHome) {
  const p = getConfigPath(customHome);
  try {
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return {};
  }
}

function readConfigEnv() {
  return {
    partner_id: process.env[ENV_PARTNER_ID],
    partner_key: process.env[ENV_PARTNER_KEY],
    private_domain: process.env[ENV_PRIVATE_DOMAIN],
  };
}

function parseCliArgs(args) {
  const config = {};
  const params = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--partnerId' && args[i + 1]) config.partner_id = args[++i];
    else if (arg === '--partnerKey' && args[i + 1]) config.partner_key = args[++i];
    else if (arg === '--domain' && args[i + 1]) config.private_domain = args[++i];
    else if (arg.startsWith('--partnerId=')) config.partner_id = arg.split('=')[1];
    else if (arg.startsWith('--partnerKey=')) config.partner_key = arg.split('=')[1];
    else if (arg.startsWith('--domain=')) config.private_domain = arg.split('=')[1];
    else if (arg === '--roomId' && args[i + 1]) params.room_id = args[++i];
    else if (arg.startsWith('--roomId=')) params.room_id = arg.split('=')[1];
    else if (arg === '--title' && args[i + 1]) params.title = args[++i];
    else if (arg.startsWith('--title=')) params.title = arg.split('=')[1];
    else if (arg === '--startTime' && args[i + 1]) params.start_time = parseInt(args[++i], 10);
    else if (arg.startsWith('--startTime=')) params.start_time = parseInt(arg.split('=')[1], 10);
    else if (arg === '--endTime' && args[i + 1]) params.end_time = parseInt(args[++i], 10);
    else if (arg.startsWith('--endTime=')) params.end_time = parseInt(arg.split('=')[1], 10);
    else if (arg === '--type' && args[i + 1]) params.type = parseInt(args[++i], 10);
    else if (arg.startsWith('--type=')) params.type = parseInt(arg.split('=')[1], 10);
    else if (arg === '--maxUsers' && args[i + 1]) params.max_users = parseInt(args[++i], 10);
    else if (arg.startsWith('--maxUsers=')) params.max_users = parseInt(arg.split('=')[1], 10);
    else if (arg === '--templateName' && args[i + 1]) params.template_name = args[++i];
    else if (arg.startsWith('--templateName=')) params.template_name = arg.split('=')[1];
    else if (arg === '--appTemplate' && args[i + 1]) params.app_template = parseInt(args[++i], 10);
    else if (arg.startsWith('--appTemplate=')) params.app_template = parseInt(arg.split('=')[1], 10);
    else if (arg === '--preEnterTime' && args[i + 1]) params.pre_enter_time = parseInt(args[++i], 10);
    else if (arg.startsWith('--preEnterTime=')) params.pre_enter_time = parseInt(arg.split('=')[1], 10);
    else if (arg === '--isLongTerm' && args[i + 1]) params.is_long_term = parseInt(args[++i], 10);
    else if (arg.startsWith('--isLongTerm=')) params.is_long_term = parseInt(arg.split('=')[1], 10);
    else if (arg === '--isVideoMain' && args[i + 1]) params.is_video_main = parseInt(args[++i], 10);
    else if (arg.startsWith('--isVideoMain=')) params.is_video_main = parseInt(arg.split('=')[1], 10);
    else if (arg === '--mIsVideoMain' && args[i + 1]) params.m_is_video_main = parseInt(args[++i], 10);
    else if (arg.startsWith('--mIsVideoMain=')) params.m_is_video_main = parseInt(arg.split('=')[1], 10);
    else if (arg === '--isMockLive' && args[i + 1]) params.is_mock_live = parseInt(args[++i], 10);
    else if (arg.startsWith('--isMockLive=')) params.is_mock_live = parseInt(arg.split('=')[1], 10);
    else if (arg === '--mockRoomId' && args[i + 1]) params.mock_room_id = parseInt(args[++i], 10);
    else if (arg.startsWith('--mockRoomId=')) params.mock_room_id = parseInt(arg.split('=')[1], 10);
    else if (arg === '--mockVideoId' && args[i + 1]) params.mock_video_id = parseInt(args[++i], 10);
    else if (arg.startsWith('--mockVideoId=')) params.mock_video_id = parseInt(arg.split('=')[1], 10);
    else if (arg === '--isPushLive' && args[i + 1]) params.is_push_live = parseInt(args[++i], 10);
    else if (arg.startsWith('--isPushLive=')) params.is_push_live = parseInt(arg.split('=')[1], 10);
    else if (arg === '--newGroupLive' && args[i + 1]) params.new_group_live = parseInt(args[++i], 10);
    else if (arg.startsWith('--newGroupLive=')) params.new_group_live = parseInt(arg.split('=')[1], 10);
    else if (arg === '--isDiscussLive' && args[i + 1]) params.is_discuss_live = parseInt(args[++i], 10);
    else if (arg.startsWith('--isDiscussLive=')) params.is_discuss_live = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableLiveSell' && args[i + 1]) params.enable_live_sell = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableLiveSell=')) params.enable_live_sell = parseInt(arg.split('=')[1], 10);
    else if (arg === '--autoPlaybackRecord' && args[i + 1]) params.auto_playback_record = parseInt(args[++i], 10);
    else if (arg.startsWith('--autoPlaybackRecord=')) params.auto_playback_record = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableBeauty' && args[i + 1]) params.enable_beauty = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableBeauty=')) params.enable_beauty = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableSticker' && args[i + 1]) params.enable_sticker = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableSticker=')) params.enable_sticker = parseInt(arg.split('=')[1], 10);
    else if (arg === '--hasStudentRaise' && args[i + 1]) params.has_student_raise = parseInt(args[++i], 10);
    else if (arg.startsWith('--hasStudentRaise=')) params.has_student_raise = parseInt(arg.split('=')[1], 10);
    else if (arg === '--endDelayTime' && args[i + 1]) params.end_delay_time = parseInt(args[++i], 10);
    else if (arg.startsWith('--endDelayTime=')) params.end_delay_time = parseInt(arg.split('=')[1], 10);
    else if (arg === '--forbiddenEndTypes' && args[i + 1]) params.forbidden_end_types = args[++i];
    else if (arg.startsWith('--forbiddenEndTypes=')) params.forbidden_end_types = arg.split('=')[1];
    else if (arg === '--switchRoomRole' && args[i + 1]) params.switch_room_role = parseInt(args[++i], 10);
    else if (arg.startsWith('--switchRoomRole=')) params.switch_room_role = parseInt(arg.split('=')[1], 10);
    else if (arg === '--speakCameraTurnon' && args[i + 1]) params.speak_camera_turnon = parseInt(args[++i], 10);
    else if (arg.startsWith('--speakCameraTurnon=')) params.speak_camera_turnon = parseInt(arg.split('=')[1], 10);
    else if (arg === '--isPrivate' && args[i + 1]) params.is_private = parseInt(args[++i], 10);
    else if (arg.startsWith('--isPrivate=')) params.is_private = parseInt(arg.split('=')[1], 10);
    else if (arg === '--mockLiveRecord' && args[i + 1]) params.mock_live_record = parseInt(args[++i], 10);
    else if (arg.startsWith('--mockLiveRecord=')) params.mock_live_record = parseInt(arg.split('=')[1], 10);
    else if (arg === '--pushLiveRecord' && args[i + 1]) params.push_live_record = parseInt(args[++i], 10);
    else if (arg.startsWith('--pushLiveRecord=')) params.push_live_record = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableMockSyncChatMessage' && args[i + 1]) params.enable_mock_sync_chat_message = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableMockSyncChatMessage=')) params.enable_mock_sync_chat_message = parseInt(arg.split('=')[1], 10);
    else if (arg === '--industryType' && args[i + 1]) params.industry_type = parseInt(args[++i], 10);
    else if (arg.startsWith('--industryType=')) params.industry_type = parseInt(arg.split('=')[1], 10);
    else if (arg === '--studentNeedDetectDevice' && args[i + 1]) params.student_need_detect_device = parseInt(args[++i], 10);
    else if (arg.startsWith('--studentNeedDetectDevice=')) params.student_need_detect_device = parseInt(arg.split('=')[1], 10);
    else if (arg === '--teacherNeedDetectDevice' && args[i + 1]) params.teacher_need_detect_device = parseInt(args[++i], 10);
    else if (arg.startsWith('--teacherNeedDetectDevice=')) params.teacher_need_detect_device = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableShare' && args[i + 1]) params.enable_share = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableShare=')) params.enable_share = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableGroupUsersPublic' && args[i + 1]) params.enable_group_users_public = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableGroupUsersPublic=')) params.enable_group_users_public = parseInt(arg.split('=')[1], 10);
    else if (arg === '--groupAdminPermission' && args[i + 1]) params.group_admin_permission = parseInt(args[++i], 10);
    else if (arg.startsWith('--groupAdminPermission=')) params.group_admin_permission = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableGroupChatPublic' && args[i + 1]) params.enable_group_chat_public = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableGroupChatPublic=')) params.enable_group_chat_public = parseInt(arg.split('=')[1], 10);
    else if (arg === '--sellGoodsInLargeClass' && args[i + 1]) params.sell_goods_in_large_class = parseInt(args[++i], 10);
    else if (arg.startsWith('--sellGoodsInLargeClass=')) params.sell_goods_in_large_class = parseInt(arg.split('=')[1], 10);
    else if (arg === '--studentPrivateChatRole' && args[i + 1]) params.student_private_chat_role = parseInt(args[++i], 10);
    else if (arg.startsWith('--studentPrivateChatRole=')) params.student_private_chat_role = parseInt(arg.split('=')[1], 10);
    else if (arg === '--isLiveAndMockLive' && args[i + 1]) params.is_live_and_mock_live = parseInt(args[++i], 10);
    else if (arg.startsWith('--isLiveAndMockLive=')) params.is_live_and_mock_live = parseInt(arg.split('=')[1], 10);
    else if (arg === '--mockSessionId' && args[i + 1]) params.mock_session_id = parseInt(args[++i], 10);
    else if (arg.startsWith('--mockSessionId=')) params.mock_session_id = parseInt(arg.split('=')[1], 10);
    else if (arg === '--systemAutoAllocateName' && args[i + 1]) params.system_auto_allocate_name = parseInt(args[++i], 10);
    else if (arg.startsWith('--systemAutoAllocateName=')) params.system_auto_allocate_name = parseInt(arg.split('=')[1], 10);
    else if (arg === '--enableWeixinAuth' && args[i + 1]) params.enable_weixin_auth = parseInt(args[++i], 10);
    else if (arg.startsWith('--enableWeixinAuth=')) params.enable_weixin_auth = parseInt(arg.split('=')[1], 10);
    i++;
  }
  return { config, params };
}

function loadConfig(cliConfig, options = {}) {
  const fileConfig = readConfigFile(options.customHome);
  const envConfig = readConfigEnv();
  return {
    partner_id: cliConfig.partner_id || envConfig.partner_id || fileConfig.partner_id,
    partner_key: cliConfig.partner_key || envConfig.partner_key || fileConfig.partner_key,
    private_domain: cliConfig.private_domain || envConfig.private_domain || fileConfig.private_domain,
  };
}

// ============================================
// Signature
// ============================================
function generateTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function validateTimestamp(ts) {
  if (String(ts).length !== 10) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) < 5 * 60;
}

function buildSignatureString(params) {
  return Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
}

function generateSign(params, partnerKey) {
  const str = buildSignatureString(params) + `&partner_key=${partnerKey}`;
  debug('签名原文', { raw: str });
  return crypto.createHash('md5').update(str).digest('hex');
}

// ============================================
// API client
// ============================================
function buildApiUrl(privateDomain, endpoint) {
  return `https://${privateDomain}.at.baijiayun.com${endpoint}`;
}

function buildRequestBody(config, businessParams) {
  const timestamp = generateTimestamp();
  const { partner_id, partner_key, ...rest } = config;
  const signParams = { partner_id, timestamp };
  for (const [k, v] of Object.entries(businessParams)) {
    if (v !== undefined) signParams[k] = v;
  }
  const sign = generateSign(signParams, partner_key);
  const body = new URLSearchParams({ partner_id, timestamp: String(timestamp), sign });
  for (const [k, v] of Object.entries(businessParams)) {
    if (v !== undefined) body.append(k, String(v));
  }
  return body;
}

function parseApiError(code, msg) {
  return {
    code,
    message: msg || ERROR_CODE_MESSAGES[code] || '未知错误',
    hint: ERROR_CODE_HINTS[code] || '请稍后重试',
    isRateLimit: code === 429,
  };
}

function handleNetworkError(err) {
  if (err.message?.includes('ENOTFOUND') || err.message?.includes('DNS')) {
    return { code: 'NETWORK_ERROR', message: 'DNS 解析失败', hint: '检查网络连接或 DNS 配置' };
  }
  if (err.message?.includes('ECONNREFUSED')) {
    return { code: 'NETWORK_ERROR', message: '连接被拒绝', hint: '服务器不可用，请稍后重试' };
  }
  if (err.message?.includes('ETIMEDOUT') || err.message?.includes('timeout')) {
    return { code: 'NETWORK_ERROR', message: '请求超时', hint: '服务器响应超时，请稍后重试' };
  }
  return { code: 'NETWORK_ERROR', message: '网络请求失败', hint: '请检查网络连接' };
}

async function apiRequest(config, endpoint, businessParams, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const body = buildRequestBody(config, businessParams);
  const url = buildApiUrl(config.private_domain, endpoint);
  debug('请求信息', { url, body: Object.fromEntries(body) });
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
    clearTimeout(tid);
    const data = await resp.json();
    debug('API 响应', data);
    if (data.code === 0) return data;
    const err = parseApiError(data.code, data.msg);
    const e = new Error(err.message);
    e.code = err.code;
    e.apiCode = data.code;
    e.hint = err.hint;
    e.isRateLimit = err.isRateLimit;
    throw e;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('请求超时');
      e.code = 'API_ERROR';
      e.apiCode = 'TIMEOUT';
      throw e;
    }
    if (err.code === 'API_ERROR') throw err;
    const ne = handleNetworkError(err);
    const e = new Error(ne.message);
    e.code = ne.code;
    e.hint = ne.hint;
    throw e;
  }
}

// ============================================
// API methods
// ============================================
async function createRoom(config, params) {
  const { title, start_time, end_time } = params;
  const { room_id: _r, teacher_code: _t, admin_code: _a, student_code: _s, ...biz } = params;
  return apiRequest(config, '/openapi/room/create', { title, start_time, end_time, ...biz });
}

async function updateRoom(config, params) {
  const { room_id } = params;
  const { room_id: _r, title: _t, ...biz } = params;
  if (!room_id) throw Object.assign(new Error('缺少 room_id'), { code: 'MISSING_PARAM' });
  return apiRequest(config, '/openapi/room/update', { room_id, ...biz });
}

async function deleteRoom(config, params) {
  const { room_id } = params;
  if (!room_id) throw Object.assign(new Error('缺少 room_id'), { code: 'MISSING_PARAM' });
  return apiRequest(config, '/openapi/room/delete', { room_id });
}

async function getRoom(config, params) {
  const { room_id } = params;
  if (!room_id) throw Object.assign(new Error('缺少 room_id'), { code: 'MISSING_PARAM' });
  return apiRequest(config, '/openapi/room/info', { room_id });
}

// ============================================
// CLI
// ============================================
function printHelp() {
  console.log(`
baijiayun-skills CLI v${CLI_VERSION}

用法:
  baijiayun [command] [options]

命令:
  create-room    创建直播间
  update-room    更新房间信息
  delete-room    删除房间
  get-room       获取房间信息
  sign-test      测试签名生成
  help           显示帮助信息

公共选项:
  --partnerId=<id>    partner_id（会覆盖环境变量）
  --partnerKey=<key>   partner_key（会覆盖环境变量）
  --domain=<domain>    private_domain（会覆盖环境变量）
  --debug              启用调试模式（输出完整请求/响应）

创建房间选项:
  --title "<标题>"           必填，房间标题（不超过50字符）
  --startTime <unix秒>       必填，开课时间
  --endTime <unix秒>         必填，下课时间
  --type <数字>              1:一对一 2:大班课(默认) 3:小班课
  --maxUsers <数字>          最大人数，0或不传表示不限制
  --templateName <名称>      triple(默认)/doubleCamera/classic/liveWall/video
  --appTemplate <数字>        1:横屏 2:竖屏
  --preEnterTime <秒>        学生可提前进入的时间
  --isLongTerm <0|1>         0:普通房间 1:长期房间

更新/获取/删除房间选项:
  --roomId <id>              必填，房间ID（14位）

环境变量:
  BAIJIAYUN_PARTNER_ID       合作方账号ID
  BAIJIAYUN_PARTNER_KEY       合作方密钥
  BAIJIAYUN_PRIVATE_DOMAIN   个性域名
  BAIJIAYUN_DEBUG             启用调试模式

配置文件:
  ~/.baijiayun-skills/config.json

配置优先级: CLI参数 > 环境变量 > 配置文件
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  if (args.includes('--version') || args.includes('-v')) {
    console.log(CLI_VERSION);
    process.exit(0);
  }

  const command = args.find(a => !a.startsWith('--'));
  if (command === 'help') {
    printHelp();
    process.exit(0);
  }

  const { config: cliConfig, params } = parseCliArgs(args);
  const config = loadConfig(cliConfig);
  const err = validateConfig(config);
  if (err) {
    console.error(formatError(err.code, err.message, err.hint));
    process.exit(1);
  }

  try {
    let result;
    switch (command) {
      case 'create-room':
        if (!params.title || !params.start_time || !params.end_time) {
          console.error(formatError('MISSING_PARAM', '缺少必填参数', '--title、--startTime、--endTime 均为必填'));
          process.exit(1);
        }
        result = await createRoom(config, params);
        console.log(JSON.stringify({ success: true, data: result.data }, null, 2));
        break;

      case 'update-room':
        if (!params.room_id) {
          console.error(formatError('MISSING_PARAM', '缺少必填参数', '--roomId 为必填'));
          process.exit(1);
        }
        result = await updateRoom(config, params);
        console.log(JSON.stringify({ success: true, data: result.data }, null, 2));
        break;

      case 'delete-room':
        if (!params.room_id) {
          console.error(formatError('MISSING_PARAM', '缺少必填参数', '--roomId 为必填'));
          process.exit(1);
        }
        result = await deleteRoom(config, params);
        console.log(JSON.stringify({ success: true }, null, 2));
        break;

      case 'get-room':
        if (!params.room_id) {
          console.error(formatError('MISSING_PARAM', '缺少必填参数', '--roomId 为必填'));
          process.exit(1);
        }
        result = await getRoom(config, params);
        console.log(JSON.stringify({ success: true, data: result.data }, null, 2));
        break;

      case 'sign-test':
        console.log(JSON.stringify({
          config: maskSensitive(config),
          signDemo: generateSign({ partner_id: '12345678', timestamp: '1501572288', title: '测试教室', start_time: '1501575608', end_time: '1501579208', type: '2' }, config.partner_key || 'demo-key')
        }, null, 2));
        break;

      default:
        console.error(formatError('UNKNOWN_COMMAND', `未知命令: ${command}`, '可用命令: create-room / update-room / delete-room / get-room / sign-test'));
        process.exit(1);
    }
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: {
        code: error.apiCode || error.code,
        message: error.message,
        hint: error.hint,
      }
    }, null, 2));
    process.exit(1);
  }
}

module.exports = {
  loadConfig, validateConfig, formatError, parseCliArgs,
  generateSign, buildSignatureString, generateTimestamp, validateTimestamp,
  createRoom, updateRoom, deleteRoom, getRoom,
  ERROR_CODE_MESSAGES, ERROR_CODE_HINTS,
};

if (require.main === module) main();
