import crypto from 'crypto';

const ZPAY_PID = process.env.ZPAY_PID!;
const ZPAY_KEY = process.env.ZPAY_KEY!;
const ZPAY_SUBMIT_URL = 'https://zpayz.cn/submit.php';

/**
 * ZPAY MD5 签名算法
 * 1. 参数名 ASCII 升序排列
 * 2. 拼接为 a=b&c=d（排除 sign、sign_type、空值）
 * 3. 末尾追加 KEY，MD5 小写
 */
export function generateSign(params: Record<string, string>): string {
  const filtered = Object.entries(params)
    .filter(([key, val]) => key !== 'sign' && key !== 'sign_type' && val !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  const str = filtered.map(([k, v]) => `${k}=${v}`).join('&');
  return crypto.createHash('md5').update(str + ZPAY_KEY).digest('hex');
}

/** 验证回调签名 */
export function verifySign(params: Record<string, string>): boolean {
  const receivedSign = params.sign;
  const expectedSign = generateSign(params);
  return receivedSign === expectedSign;
}

/** 生成商户订单号 */
export function generateOutTradeNo(): string {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 10);
  return `${ts}${rand}`;
}

/** 创建页面跳转支付 URL */
export function createPayUrl(options: {
  name: string;
  money: string;
  outTradeNo: string;
  type: 'alipay' | 'wxpay';
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const params: Record<string, string> = {
    pid: ZPAY_PID,
    type: options.type,
    out_trade_no: options.outTradeNo,
    notify_url: `${appUrl}/api/pay/notify`,
    return_url: `${appUrl}/api/pay/return`,
    name: options.name,
    money: options.money,
    sign_type: 'MD5',
  };
  params.sign = generateSign(params);

  const query = new URLSearchParams(params).toString();
  return `${ZPAY_SUBMIT_URL}?${query}`;
}
