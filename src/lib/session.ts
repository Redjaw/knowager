import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

export const session = writable<Session | null>(null);
export const user = writable<User | null>(null);
export const isAllowed = writable<boolean>(false);
export const isAdmin = writable<boolean>(false);

async function checkAllowlist(email?: string | null) {
  if (!email) {
    isAllowed.set(false);
    isAdmin.set(false);
    return;
  }

  const { data, error } = await supabase
    .from('allowed_emails')
    .select('email, is_admin')
    .eq('email', email)
    .maybeSingle();

  if (error || !data) {
    isAllowed.set(false);
    isAdmin.set(false);
    return;
  }

  isAllowed.set(true);
  isAdmin.set(Boolean(data.is_admin));
}

export async function initSession() {
  const { data } = await supabase.auth.getSession();
  session.set(data.session);
  user.set(data.session?.user ?? null);
  await checkAllowlist(data.session?.user?.email);

  supabase.auth.onAuthStateChange((_event, nextSession) => {
    session.set(nextSession);
    user.set(nextSession?.user ?? null);

    setTimeout(() => {
      void checkAllowlist(nextSession?.user?.email);
    }, 0);
  });
}

export async function enforceAllowlist() {
  const currentUser = await getCurrentUser();
  const email = currentUser?.email;
  if (!email) {
    return { allowed: false, admin: false };
  }

  const { data: allowlistRow } = await supabase
    .from('allowed_emails')
    .select('email, is_admin')
    .eq('email', email)
    .maybeSingle();

  if (!allowlistRow) {
    await supabase.auth.signOut();
    isAllowed.set(false);
    isAdmin.set(false);
    return { allowed: false, admin: false };
  }

  isAllowed.set(true);
  isAdmin.set(Boolean(allowlistRow.is_admin));
  return { allowed: true, admin: Boolean(allowlistRow.is_admin) };
}

export async function getCurrentUser() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData.user) {
    return userData.user;
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return null;
  }

  return refreshData.user ?? null;
}
