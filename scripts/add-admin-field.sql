-- ============================================
-- 添加管理员字段到 profiles 表
-- ============================================

-- 1. 添加 is_admin 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. 授予权限（如果需要）
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.profiles TO anon;

-- 3. 查看当前用户（运行此SQL获取用户ID）
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 4. 将指定用户设为管理员（替换 '用户ID'）
UPDATE public.profiles SET is_admin = true WHERE id = '用户ID';

-- 5. 验证管理员设置
SELECT id, nickname, is_admin FROM public.profiles WHERE is_admin = true;
