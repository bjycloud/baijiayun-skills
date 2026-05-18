const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  loadConfig, validateConfig, formatError, parseCliArgs,
  generateSign, buildSignatureString, generateTimestamp, validateTimestamp,
  ERROR_CODE_MESSAGES, ERROR_CODE_HINTS,
} = require('../../skills/baijiayun-room/scripts/baijiayun.js');

describe('配置管理', () => {
  describe('AC1: 配置优先级正确', () => {
    it('应优先使用 CLI 参数', () => {
      const result = loadConfig({ partner_id: 'cli-id', partner_key: 'cli-key', private_domain: 'cli-domain' });
      assert.strictEqual(result.partner_id, 'cli-id');
      assert.strictEqual(result.partner_key, 'cli-key');
      assert.strictEqual(result.private_domain, 'cli-domain');
    });

    it('应使用环境变量覆盖配置文件', () => {
      process.env.BAIJIAYUN_PARTNER_ID = 'env-id';
      process.env.BAIJIAYUN_PARTNER_KEY = 'env-key';
      process.env.BAIJIAYUN_PRIVATE_DOMAIN = 'env-domain';
      const result = loadConfig({});
      assert.strictEqual(result.partner_id, 'env-id');
      assert.strictEqual(result.partner_key, 'env-key');
      assert.strictEqual(result.private_domain, 'env-domain');
      delete process.env.BAIJIAYUN_PARTNER_ID;
      delete process.env.BAIJIAYUN_PARTNER_KEY;
      delete process.env.BAIJIAYUN_PRIVATE_DOMAIN;
    });

    it('应回退到配置文件', () => {
      const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'baijiayun-test-'));
      const configPath = path.join(fakeHome, '.baijiayun-skills');
      fs.mkdirSync(configPath);
      fs.writeFileSync(path.join(configPath, 'config.json'), JSON.stringify({
        partner_id: 'file-id',
        partner_key: 'file-key',
        private_domain: 'file-domain',
      }));
      const result = loadConfig({}, { customHome: fakeHome });
      assert.strictEqual(result.partner_id, 'file-id');
      fs.rmSync(fakeHome, { recursive: true });
    });
  });

  describe('AC2: 配置验证正确', () => {
    it('应验证通过完整配置', () => {
      const result = validateConfig({ partner_id: '123', partner_key: 'key', private_domain: 'demo' });
      assert.strictEqual(result, null);
    });

    it('应报告缺少的字段', () => {
      const result = validateConfig({});
      assert.strictEqual(result.code, 'CONFIG_MISSING');
      assert.ok(result.message.includes('partner_id'));
      assert.ok(result.message.includes('partner_key'));
      assert.ok(result.message.includes('private_domain'));
    });
  });

  describe('AC3: CLI 参数解析正确', () => {
    it('应解析 --partnerId 和 --partnerKey', () => {
      const { config, params } = parseCliArgs(['--partnerId', 'id', '--partnerKey', 'key', '--domain', 'demo']);
      assert.strictEqual(config.partner_id, 'id');
      assert.strictEqual(config.partner_key, 'key');
      assert.strictEqual(config.private_domain, 'demo');
    });

    it('应解析 --partnerId=value 格式', () => {
      const { config } = parseCliArgs(['--partnerId=short-id', '--partnerKey=secret', '--domain=mydomain']);
      assert.strictEqual(config.partner_id, 'short-id');
    });

    it('应解析业务参数', () => {
      const { params } = parseCliArgs(['--roomId', '12345678901234', '--title', '测试', '--type', '2']);
      assert.strictEqual(params.room_id, '12345678901234');
      assert.strictEqual(params.title, '测试');
      assert.strictEqual(params.type, 2);
    });
  });
});

describe('签名算法', () => {
  describe('AC4: 签名生成正确', () => {
    it('应生成 MD5 小写签名', () => {
      const params = { end_time: '1501579208', partner_id: '12345678', start_time: '1501575608', timestamp: '1501572288', title: '测试教室', type: '2' };
      const partnerKey = 'rLkIPaQjxSwRQmC/ITnHh8i2rifmmbFIVsYw03SSi24zAnkrAd0ZNb2rcTzI2avy7+AmNJDdLmzU89zKUAP3Xg==';
      const sign = generateSign(params, partnerKey);
      assert.strictEqual(sign, '5b78486597c679b0c6256da014af1260');
    });

    it('参数顺序不应影响签名结果', () => {
      const params1 = { a: '1', b: '2', c: '3' };
      const params2 = { c: '3', a: '1', b: '2' };
      const sign1 = generateSign(params1, 'key');
      const sign2 = generateSign(params2, 'key');
      assert.strictEqual(sign1, sign2);
    });

    it('buildSignatureString 应按 ASCII 排序', () => {
      const result = buildSignatureString({ z: '1', a: '2', M: '3' });
      assert.strictEqual(result, 'M=3&a=2&z=1');
    });
  });

  describe('AC5: 时间戳正确', () => {
    it('应生成10位秒级时间戳', () => {
      const ts = generateTimestamp();
      assert.strictEqual(String(ts).length, 10);
      assert.ok(ts > 1000000000);
    });

    it('应拒绝毫秒时间戳', () => {
      assert.strictEqual(validateTimestamp(1501572288000), false);
    });

    it('应拒绝超出5分钟的时间戳', () => {
      const oldTs = Math.floor(Date.now() / 1000) - 400;
      assert.strictEqual(validateTimestamp(oldTs), false);
    });

    it('应接受当前时间戳', () => {
      const now = Math.floor(Date.now() / 1000);
      assert.strictEqual(validateTimestamp(now), true);
    });
  });
});

describe('错误处理', () => {
  describe('AC6: 错误码映射正确', () => {
    it('应返回正确的中文错误消息', () => {
      assert.strictEqual(ERROR_CODE_MESSAGES[1001], '参数错误');
      assert.strictEqual(ERROR_CODE_MESSAGES[1002], '签名计算错误');
      assert.strictEqual(ERROR_CODE_MESSAGES[3001], '房间号不存在');
    });

    it('应返回解决方案提示', () => {
      assert.ok(ERROR_CODE_HINTS[3001].length > 0);
      assert.ok(ERROR_CODE_HINTS[1002].length > 0);
    });
  });

  describe('AC7: formatError 格式正确', () => {
    it('应返回包含代码和消息的格式', () => {
      const msg = formatError('CONFIG_MISSING', '缺少配置', '请设置环境变量');
      assert.ok(msg.includes('CONFIG_MISSING'));
      assert.ok(msg.includes('缺少配置'));
      assert.ok(msg.includes('请设置环境变量'));
    });

    it('应支持无提示的简洁错误', () => {
      const msg = formatError('TEST', '测试错误');
      assert.ok(msg.includes('TEST'));
      assert.ok(msg.includes('测试错误'));
    });
  });
});
