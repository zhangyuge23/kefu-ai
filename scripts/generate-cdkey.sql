-- ============================================
-- CDKey 生成脚本
-- ============================================
-- 使用方式：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴此脚本并运行
-- 4. 复制生成的兑换码
-- ============================================

-- 生成 CDKey（可以多次执行生成多个）
INSERT INTO public.cdkeys (code, credits_amount, expires_at)
VALUES 
  ('KEFU2024TEST001', 100, NOW() + INTERVAL '1 year'),  -- 测试码 100点
  ('KEFU2024VIP500', 500, NOW() + INTERVAL '1 year'),   -- VIP码 500点
  ('KEFU2024GIFT1000', 1000, NOW() + INTERVAL '1 year') -- 礼品码 1000点
ON CONFLICT (code) DO NOTHING;

-- 查询生成的 CDKey
SELECT 
  code,
  credits_amount,
  expires_at,
  CASE 
    WHEN redeemed_by IS NOT NULL THEN '已使用'
    ELSE '未使用'
  END as status
FROM public.cdkeys
ORDER BY created_at DESC
LIMIT 10;
