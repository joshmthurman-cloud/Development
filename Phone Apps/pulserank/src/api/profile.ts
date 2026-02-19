import { supabase } from '@/lib/supabase';

export async function checkUsernameAvailable(
  username: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  return data === null;
}
