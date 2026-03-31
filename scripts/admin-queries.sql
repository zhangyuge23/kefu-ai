-- ============================================
-- 可孚AI数字人平台 - 管理员脚本集合
-- ============================================
-- 使用方式：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 选择需要执行的脚本
-- 4. 点击 Run 执行
-- ============================================


-- ============================================
-- 第1部分：CDKey 管理
-- ============================================

-- 1.1 查看所有CDKey（按状态分类）
SELECT 
  code,
  credits_amount,
  expires_at,
  created_at,
  CASE 
    WHEN redeemed_by IS NOT NULL THEN '已使用'
    ELSE '未使用'
  END as status,
  redeemed_at
FROM public.cdkeys
ORDER BY created_at DESC
LIMIT 100;

-- 1.2 查看已使用的CDKey
SELECT 
  c.code,
  c.credits_amount,
  c.redeemed_at,
  p.nickname,
  p.credits as user_credits
FROM public.cdkeys c
LEFT JOIN public.profiles p ON c.redeemed_by = p.id
WHERE c.redeemed_by IS NOT NULL
ORDER BY c.redeemed_at DESC
LIMIT 100;

-- 1.3 查看未使用的CDKey
SELECT 
  code,
  credits_amount,
  expires_at,
  created_at
FROM public.cdkeys
WHERE redeemed_by IS NULL
ORDER BY created_at DESC;

-- 1.4 批量生成CDKey（示例：生成10个100点的兑换码）
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO public.cdkeys (code, credits_amount, expires_at)
    VALUES (
      'KEFU' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(i::TEXT, 4, '0'),
      100,
      NOW() + INTERVAL '1 year'
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- 1.5 生成自定义面额的CDKey
-- 示例：生成5个500点的兑换码
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO public.cdkeys (code, credits_amount, expires_at)
    VALUES (
      'KEFU500' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(i::TEXT, 4, '0'),
      500,
      NOW() + INTERVAL '1 year'
    )
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- 1.6 删除过期或未使用的CDKey
DELETE FROM public.cdkeys
WHERE redeemed_by IS NULL 
  AND expires_at < NOW();

-- 1.7 查看CDKey使用统计
SELECT 
  COUNT(*) as 总数,
  COUNT(CASE WHEN redeemed_by IS NULL THEN 1 END) as 未使用,
  COUNT(CASE WHEN redeemed_by IS NOT NULL THEN 1 END) as 已使用,
  SUM(CASE WHEN redeemed_by IS NULL THEN credits_amount ELSE 0 END) as 未使用总额,
  SUM(CASE WHEN redeemed_by IS NOT NULL THEN credits_amount ELSE 0 END) as 已使用总额
FROM public.cdkeys;


-- ============================================
-- 第2部分：用户管理
-- ============================================

-- 2.1 查看所有用户及算力
SELECT 
  p.id,
  p.nickname,
  p.credits,
  p.created_at,
  COUNT(t.id) as task_count,
  SUM(t.credits_cost) as total_spent
FROM public.profiles p
LEFT JOIN public.tasks t ON p.id = t.user_id
GROUP BY p.id, p.nickname, p.credits, p.created_at
ORDER BY p.credits DESC;

-- 2.2 查看算力最多的用户TOP10
SELECT 
  nickname,
  credits,
  created_at
FROM public.profiles
ORDER BY credits DESC
LIMIT 10;

-- 2.3 查看新注册用户（最近7天）
SELECT 
  nickname,
  credits,
  created_at
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 2.4 手动给用户添加算力
-- 把 '用户ID' 替换成实际的用户ID
UPDATE public.profiles
SET credits = credits + 100, updated_at = NOW()
WHERE id = '用户ID';

-- 2.5 手动扣除用户算力
-- 把 '用户ID' 替换成实际的用户ID，100是要扣除的数量
UPDATE public.profiles
SET credits = credits - 100, updated_at = NOW()
WHERE id = '用户ID' AND credits >= 100;

-- 2.6 查询用户详细信息（包含任务统计）
SELECT 
  p.id,
  p.nickname,
  p.credits as 余额,
  COUNT(t.id) FILTER (WHERE t.status = 'completed') as 已完成任务,
  COUNT(t.id) FILTER (WHERE t.status = 'failed') as 失败任务,
  COUNT(t.id) FILTER (WHERE t.status NOT IN ('completed', 'failed')) as 进行中任务,
  SUM(t.credits_cost) as 已消耗算力
FROM public.profiles p
LEFT JOIN public.tasks t ON p.id = t.user_id
GROUP BY p.id, p.nickname, p.credits;

-- 2.7 统计用户总数和算力分布
SELECT 
  COUNT(*) as 用户总数,
  SUM(credits) as 算力总余额,
  AVG(credits)::INT as 平均算力,
  MAX(credits) as 最高算力,
  MIN(credits) as 最低算力
FROM public.profiles;


-- ============================================
-- 第3部分：任务管理
-- ============================================

-- 3.1 查看所有任务（包含用户信息）
SELECT 
  t.id,
  t.name,
  t.status,
  t.credits_cost,
  t.created_at,
  t.completed_at,
  p.nickname as 用户
FROM public.tasks t
LEFT JOIN public.profiles p ON t.user_id = p.id
ORDER BY t.created_at DESC
LIMIT 100;

-- 3.2 查看失败的任务
SELECT 
  t.id,
  t.name,
  t.error_message,
  t.retry_count,
  t.created_at,
  p.nickname as 用户
FROM public.tasks t
LEFT JOIN public.profiles p ON t.user_id = p.id
WHERE t.status = 'failed'
ORDER BY t.created_at DESC
LIMIT 50;

-- 3.3 重试失败的任务
-- 把 '任务ID' 替换成实际的任务ID
UPDATE public.tasks
SET status = 'pending', error_message = NULL, retry_count = retry_count + 1, updated_at = NOW()
WHERE id = '任务ID';

-- 3.4 批量重试失败的任务（最近24小时内的）
UPDATE public.tasks
SET status = 'pending', error_message = NULL, retry_count = retry_count + 1, updated_at = NOW()
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours';

-- 3.5 查看任务状态分布
SELECT 
  status,
  COUNT(*) as 数量,
  AVG(credits_cost)::INT as 平均消耗算力
FROM public.tasks
GROUP BY status
ORDER BY COUNT(*) DESC;

-- 3.6 查看处理中的任务
SELECT 
  t.id,
  t.name,
  t.status,
  t.created_at,
  EXTRACT(EPOCH FROM (NOW() - t.created_at))/60 as 处理分钟数,
  p.nickname as 用户
FROM public.tasks t
LEFT JOIN public.profiles p ON t.user_id = p.id
WHERE t.status IN ('uploading', 'extracting', 'cloning', 'synthesizing', 'generating')
ORDER BY t.created_at ASC;

-- 3.7 删除超过30天的失败任务
DELETE FROM public.tasks
WHERE status = 'failed' 
  AND created_at < NOW() - INTERVAL '30 days';

-- 3.8 统计每日任务数量
SELECT 
  DATE(created_at) as 日期,
  COUNT(*) as 任务总数,
  COUNT(*) FILTER (WHERE status = 'completed') as 已完成,
  COUNT(*) FILTER (WHERE status = 'failed') as 失败,
  SUM(credits_cost) as 总消耗算力
FROM public.tasks
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY 日期 DESC;


-- ============================================
-- 第4部分：财务统计
-- ============================================

-- 4.1 算力消耗报表
SELECT 
  DATE(created_at) as 日期,
  COUNT(*) as 任务数,
  SUM(credits_cost) as 消耗算力
FROM public.tasks
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY 日期 DESC;

-- 4.2 算力兑换统计
SELECT 
  DATE(redeemed_at) as 日期,
  COUNT(*) as 兑换次数,
  SUM(credits_amount) as 兑换算力
FROM public.cdkeys
WHERE redeemed_at IS NOT NULL
  AND redeemed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(redeemed_at)
ORDER BY 日期 DESC;

-- 4.3 今日统计数据
SELECT 
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW()::DATE) as 今日新增用户,
  (SELECT COUNT(*) FROM public.tasks WHERE created_at > NOW()::DATE) as 今日任务数,
  (SELECT SUM(credits_cost) FROM public.tasks WHERE created_at > NOW()::DATE) as 今日消耗算力,
  (SELECT COUNT(*) FROM public.cdkeys WHERE redeemed_at > NOW()::DATE) as 今日兑换次数,
  (SELECT SUM(credits_amount) FROM public.cdkeys WHERE redeemed_at > NOW()::DATE) as 今日兑换算力;


-- ============================================
-- 第5部分：数据维护
-- ============================================

-- 5.1 清理孤立的任务（用户已删除但任务还在）
DELETE FROM public.tasks
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- 5.2 清理过期的兑换码（超过1年的）
DELETE FROM public.cdkeys
WHERE expires_at < NOW() - INTERVAL '1 year';

-- 5.3 查看表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 5.4 优化表（重建索引）
REINDEX TABLE public.profiles;
REINDEX TABLE public.tasks;
REINDEX TABLE public.cdkeys;


-- ============================================
-- 快捷操作说明
-- ============================================
-- 
-- 【生成兑换码】
-- 1. 复制"1.4 批量生成CDKey"脚本
-- 2. 修改 LOOP 范围和 credits_amount 数值
-- 3. 执行即可
--
-- 【给用户加算力】
-- 1. 先运行"2.1 查看所有用户"获取用户ID
-- 2. 复制"2.4 手动给用户添加算力"
-- 3. 替换用户ID和算力数值
-- 4. 执行即可
--
-- 【查看统计数据】
-- 运行"4.3 今日统计数据"查看今日关键指标
--
-- 【清理数据】
-- 运行"5.1-5.3"清理孤立数据和过期数据
-- ============================================
