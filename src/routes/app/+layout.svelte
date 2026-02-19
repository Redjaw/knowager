<script lang="ts">
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  let { data, children } = $props();

  async function logout() {
    await supabase.auth.signOut();
    await goto(`${base}/login`);
  }
</script>

<div class="min-h-screen">
  <header class="flex min-h-[72px] flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
    <a class="inline-flex items-center no-underline" href={`${base}/app`} aria-label="Vai alla home">
      <picture>
        <source srcset={`${base}/knowager-logo.png`} type="image/png" />
        <img src={`${base}/knowager-logo.svg`} alt="Knowager" class="h-12 w-auto" />
      </picture>
    </a>

    <nav class="flex flex-wrap items-center gap-2">
      <a class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 no-underline transition hover:bg-slate-100" href={`${base}/app/profile`}>Profilo</a>
      {#if data.isAdmin}
        <a class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 no-underline transition hover:bg-slate-100" href={`${base}/app/admin`}>Amministrazione</a>
      {/if}
      <button class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100" onclick={logout}>Esci</button>
    </nav>
  </header>

  <main>{@render children()}</main>
</div>
