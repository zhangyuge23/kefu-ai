import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 查询用户余额
 */
export async function getCredits(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error) throw new Error(`查询余额失败: ${error.message}`);
  return data.credits;
}

/**
 * 检查余额是否充足
 */
export async function hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
  const credits = await getCredits(userId);
  return credits >= amount;
}

/**
 * 根据视频时长计算消耗算力
 */
export function calculateCreditsCost(durationSeconds: number): number {
  if (durationSeconds <= 30) return 10;
  if (durationSeconds <= 60) return 20;
  if (durationSeconds <= 120) return 35;
  return 50; // >120秒
}
