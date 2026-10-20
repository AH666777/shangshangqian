-- ============================================
-- 一键上上签 - 会员系统数据库Schema
-- 数据库: Supabase PostgreSQL
-- ============================================

-- ==================== 1. 用户资料表 ====================
-- 扩展 Supabase auth.users，存储用户额外信息
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname      VARCHAR(50) DEFAULT '匿名用户',
  avatar_url    TEXT,
  total_draws   INTEGER DEFAULT 0,           -- 累计抽签次数
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 用户只能读写自己的资料
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ==================== 2. 会员方案表 ====================
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id            SERIAL PRIMARY KEY,
  plan_key      VARCHAR(50) UNIQUE NOT NULL,  -- 'free' | 'premium_monthly' | 'premium_yearly'
  name          VARCHAR(100) NOT NULL,         -- '普通用户' | '高级会员(月)' | '高级会员(年)'
  level         VARCHAR(20) NOT NULL,          -- 'free' | 'premium'
  price_cents   INTEGER DEFAULT 0,             -- 价格（分），0=免费
  duration_days INTEGER DEFAULT NULL,           -- 有效天数，NULL=永久
  benefits      JSONB DEFAULT '{}',            -- 权益配置JSON
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认会员方案
INSERT INTO public.membership_plans (plan_key, name, level, price_cents, duration_days, benefits) VALUES
('free', '普通用户', 'free', 0, NULL, '{
  "daily_draws": 3,
  "premium_fortunes": false,
  "deep_analysis": false,
  "ad_free": false,
  "cloud_history": false,
  "poster_watermark": true,
  "priority_support": false
}'::jsonb),
('premium_monthly', '高级会员(月卡)', 'premium', 1800, 30, '{
  "daily_draws": 999,
  "premium_fortunes": true,
  "deep_analysis": true,
  "ad_free": true,
  "cloud_history": true,
  "poster_watermark": false,
  "priority_support": false
}'::jsonb),
('premium_yearly', '高级会员(年卡)', 'premium', 12800, 365, '{
  "daily_draws": 999,
  "premium_fortunes": true,
  "deep_analysis": true,
  "ad_free": true,
  "cloud_history": true,
  "poster_watermark": false,
  "priority_support": true
}'::jsonb);

-- RLS: 所有人可查看激活的方案
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.membership_plans FOR SELECT
  USING (is_active = true);


-- ==================== 3. 用户会员记录表 ====================
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key      VARCHAR(50) NOT NULL REFERENCES public.membership_plans(plan_key),
  status        VARCHAR(20) DEFAULT 'active',  -- 'active' | 'expired' | 'cancelled'
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,                    -- NULL=永久
  auto_renew    BOOLEAN DEFAULT false,
  payment_id    TEXT,                            -- 支付平台订单号
  payment_platform VARCHAR(30),                  -- 'alipay' | 'wechat' | 'stripe' | 'manual'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：加速用户会员查询
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON public.user_memberships(status);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expires ON public.user_memberships(expires_at);

-- RLS: 用户只能查看自己的会员记录
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships"
  ON public.user_memberships FOR SELECT
  USING (auth.uid() = user_id);


-- ==================== 4. 签文历史表（云端同步） ====================
CREATE TABLE IF NOT EXISTS public.draw_history (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fortune_id    VARCHAR(50) NOT NULL,
  fortune_level VARCHAR(20) NOT NULL,
  fortune_title VARCHAR(100) NOT NULL,
  fortune_poem  TEXT,
  scene         VARCHAR(20) NOT NULL,
  source        VARCHAR(20) DEFAULT 'free',     -- 'free' | 'premium' | 'extra'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draw_history_user_id ON public.draw_history(user_id);
CREATE INDEX IF NOT EXISTS idx_draw_history_created ON public.draw_history(created_at DESC);

ALTER TABLE public.draw_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own draw history"
  ON public.draw_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own draw history"
  ON public.draw_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ==================== 5. 每日抽签计数表 ====================
CREATE TABLE IF NOT EXISTS public.daily_draw_count (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draw_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  count         INTEGER DEFAULT 0,
  UNIQUE(user_id, draw_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_draw_count_user_date ON public.daily_draw_count(user_id, draw_date);

ALTER TABLE public.daily_draw_count ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily count"
  ON public.daily_draw_count FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own daily count"
  ON public.daily_draw_count FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily count"
  ON public.daily_draw_count FOR UPDATE
  USING (auth.uid() = user_id);


-- ==================== 6. 自动创建用户资料触发器 ====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户资料
  INSERT INTO public.user_profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', '匿名用户'));

  -- 赠送免费会员
  INSERT INTO public.user_memberships (user_id, plan_key, status, expires_at)
  VALUES (NEW.id, 'free', 'active', NULL);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 当有用户注册时自动触发
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==================== 7. 获取用户当前有效会员的便捷函数 ====================
CREATE OR REPLACE FUNCTION public.get_active_membership(uid UUID)
RETURNS TABLE (
  plan_key      VARCHAR(50),
  level         VARCHAR(20),
  benefits      JSONB,
  expires_at    TIMESTAMPTZ,
  status        VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.plan_key,
    mp.level,
    mp.benefits,
    um.expires_at,
    um.status
  FROM public.user_memberships um
  JOIN public.membership_plans mp ON um.plan_key = mp.plan_key
  WHERE um.user_id = uid
    AND um.status = 'active'
    AND (um.expires_at IS NULL OR um.expires_at > NOW())
  ORDER BY
    -- 优先返回高级会员，且未过期的
    CASE mp.level WHEN 'premium' THEN 1 WHEN 'free' THEN 2 END,
    um.expires_at DESC NULLS FIRST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================== 8. 定期清理过期会员状态 ====================
CREATE OR REPLACE FUNCTION public.cleanup_expired_memberships()
RETURNS void AS $$
BEGIN
  UPDATE public.user_memberships
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 可通过 Supabase Cron Extension 或 pg_cron 定时执行
-- SELECT cron.schedule('cleanup-memberships', '0 * * * *', 'SELECT public.cleanup_expired_memberships();');
