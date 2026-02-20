<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { gravatarUrl } from '$lib/gravatar';
  import { getCurrentUser } from '$lib/session';
  import { applyThemePreference, normalizeThemePreference, type ThemePreference } from '$lib/theme';

  let first_name = '';
  let last_name = '';
  let birth_date = '';
  let email = '';
  let status = '';
  let error = '';
  let loading = true;
  let theme: ThemePreference = 'light';

  onMount(async () => {
    const user = await getCurrentUser();
    if (!user) {
      error = 'Sessione scaduta. Ricarica la pagina per continuare.';
      loading = false;
      return;
    }

    email = user.email ?? '';

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name,last_name,birth_date,theme')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      error = profileError.message;
      loading = false;
      return;
    }

    if (profile) {
      first_name = profile.first_name ?? '';
      last_name = profile.last_name ?? '';
      birth_date = profile.birth_date ?? '';
      theme = normalizeThemePreference(profile.theme);
    } else {
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, theme: 'light' });
    }

    applyThemePreference(theme);
    loading = false;
  });

  async function save() {
    status = '';
    error = '';

    const user = await getCurrentUser();
    if (!user) {
      error = 'Sessione scaduta. Ricarica la pagina per continuare.';
      loading = false;
      return;
    }

    const { error: saveError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      first_name: first_name || null,
      last_name: last_name || null,
      birth_date: birth_date || null,
      theme
    });

    if (saveError) {
      error = saveError.message;
      return;
    }

    status = 'Profilo salvato con successo.';
  }
</script>

<svelte:head><title>Knowager - Profilo</title></svelte:head>

{#if loading}
  <p class="px-8 py-6 text-slate-600 dark:text-slate-300">Caricamento...</p>
{:else}
  <section class="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6 shadow-sm">
    <div class="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">Profilo</h1>
        <p class="text-sm text-slate-600 dark:text-slate-300">L'avatar è gestito automaticamente da Gravatar in base alla tua email.</p>
      </div>
      <img class="h-16 w-16 rounded-full border border-slate-200" src={gravatarUrl(email, 128)} alt="Avatar Gravatar" />
    </div>

    <form class="grid gap-4" on:submit|preventDefault={save}>
      <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        Nome
        <input class="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none ring-blue-500 transition focus:ring-2" bind:value={first_name} />
      </label>
      <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        Cognome
        <input class="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none ring-blue-500 transition focus:ring-2" bind:value={last_name} />
      </label>
      <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        Data di nascita
        <input class="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none ring-blue-500 transition focus:ring-2" type="date" bind:value={birth_date} />
      </label>

      <label class="grid gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        Tema
        <select class="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none ring-blue-500 transition focus:ring-2" bind:value={theme} on:change={() => applyThemePreference(theme)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <div class="mt-2 flex items-center gap-3">
        <button class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700" type="submit">Salva</button>
        <span class="text-sm text-slate-500 dark:text-slate-300">{email}</span>
      </div>
    </form>

    {#if status}<p class="mt-4 text-sm font-medium text-green-700">{status}</p>{/if}
    {#if error}<p class="mt-4 text-sm font-medium text-red-700">{error}</p>{/if}
  </section>
{/if}
