import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { enforceAllowlist, getCurrentUser } from '$lib/session';
import { base } from '$app/paths';
import { normalizeThemePreference } from '$lib/theme';

export async function load() {
  if (!browser) {
    return {};
  }

  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    throw redirect(307, `${base}/login`);
  }

  const allow = await enforceAllowlist();
  if (!allow.allowed) {
    throw redirect(307, `${base}/login`);
  }

  const currentUser = await getCurrentUser();
  const profileRes = currentUser
    ? await supabase.from('profiles').select('theme').eq('id', currentUser.id).maybeSingle()
    : { data: null, error: null };

  const theme = normalizeThemePreference(profileRes.data?.theme);

  return { isAdmin: allow.admin, theme };
}
