-- ============================================
-- 可孚AI数字人 v2.1 - Supabase 数据库建表脚本
-- ============================================
-- 使用方式：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴此脚本并运行
-- ============================================

-- ============================================
-- 1. 用户扩展表（Supabase Auth 自带 auth.users）
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  phone TEXT UNIQUE,
  credits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', '用户' || LEFT(NEW.id::text, 6)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. 任务表
-- ============================================
CREATE TYPE task_status AS ENUM (
  'pending', 'uploading', 'extracting', 'cloning',
  'synthesizing', 'generating', 'completed', 'failed'
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status task_status DEFAULT 'pending',

  -- 输入
  source_video_url TEXT,
  source_video_duration FLOAT,
  source_video_thumbnail TEXT,
  script_text TEXT NOT NULL,

  -- 中间产物
  extracted_audio_url TEXT,
  cloned_voice_id TEXT,
  synthesized_audio_url TEXT,

  -- 输出
  result_video_url TEXT,

  -- 元数据
  credits_cost INT DEFAULT 0,
  error_message TEXT,
  retry_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tasks"
  ON public.tasks FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- ============================================
-- 3. 订单表（支付）
-- ============================================
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  product_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  credits_amount INT NOT NULL,
  out_trade_no TEXT UNIQUE NOT NULL,
  trade_no TEXT,
  pay_type TEXT,
  status order_status DEFAULT 'pending',
  callback_raw JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 4. CDKey 兑换表
-- ============================================
CREATE TABLE public.cdkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  credits_amount INT NOT NULL,
  redeemed_by UUID REFERENCES public.profiles(id),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. 算力变动日志
-- ============================================
CREATE TABLE public.credit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  change_amount INT NOT NULL,
  balance_after INT NOT NULL,
  reason TEXT NOT NULL,
  ref_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs"
  ON public.credit_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 6. RPC 函数：支付到账处理（事务安全）
-- ============================================
CREATE OR REPLACE FUNCTION process_payment(
  p_out_trade_no TEXT,
  p_trade_no TEXT,
  p_pay_type TEXT,
  p_callback_raw JSONB
) RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_new_balance INT;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE out_trade_no = p_out_trade_no FOR UPDATE;

  IF v_order.status = 'paid' THEN RETURN; END IF;

  UPDATE public.orders SET
    status = 'paid', trade_no = p_trade_no,
    pay_type = p_pay_type, callback_raw = p_callback_raw, paid_at = now()
  WHERE id = v_order.id;

  UPDATE public.profiles SET
    credits = credits + v_order.credits_amount, updated_at = now()
  WHERE id = v_order.user_id
  RETURNING credits INTO v_new_balance;

  INSERT INTO public.credit_logs (user_id, change_amount, balance_after, reason, ref_id)
  VALUES (v_order.user_id, v_order.credits_amount, v_new_balance, 'purchase', v_order.id);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. RPC 函数：扣减算力（事务安全）
-- ============================================
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INT,
  p_task_id UUID
) RETURNS INT AS $$
DECLARE
  v_current INT;
  v_new INT;
BEGIN
  SELECT credits INTO v_current FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;

  IF v_current < p_amount THEN
    RAISE EXCEPTION '算力不足: 当前 %, 需要 %', v_current, p_amount;
  END IF;

  v_new := v_current - p_amount;
  UPDATE public.profiles SET credits = v_new, updated_at = now() WHERE id = p_user_id;

  INSERT INTO public.credit_logs (user_id, change_amount, balance_after, reason, ref_id)
  VALUES (p_user_id, -p_amount, v_new, 'task_consume', p_task_id);

  UPDATE public.tasks SET credits_cost = p_amount WHERE id = p_task_id;
  RETURN v_new;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. 开启 Realtime（前端实时订阅）
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
