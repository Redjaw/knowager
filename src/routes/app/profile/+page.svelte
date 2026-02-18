<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { gravatarUrl } from '$lib/gravatar';

  let first_name = '';
  let last_name = '';
  let birth_date = '';
  let email = '';
  let status = '';
  let error = '';
  let loading = true;

  onMount(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    email = user.email ?? '';

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name,last_name,birth_date')
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
    } else {
      await supabase.from('profiles').upsert({ id: user.id, email: user.email });
    }

    loading = false;
  });

  async function save() {
    status = '';
    error = '';

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const { error: saveError } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      first_name: first_name || null,
      last_name: last_name || null,
      birth_date: birth_date || null
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
  <p class="px-8 py-6 text-slate-600">Caricamento...</p>
{:else}
  <section class="mx-auto mt-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Profilo</h1>
        <p class="text-sm text-slate-600">L'avatar è gestito automaticamente da Gravatar in base alla tua email.</p>
      </div>
      <img class="h-16 w-16 rounded-full border border-slate-200" src={gravatarUrl(email, 128)} alt="Avatar Gravatar" />
    </div>

    <form class="grid gap-4" on:submit|preventDefault={save}>
      <label class="grid gap-1 text-sm font-medium text-slate-700">
        Nome
        <input class="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" bind:value={first_name} />
      </label>
      <label class="grid gap-1 text-sm font-medium text-slate-700">
        Cognome
        <input class="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" bind:value={last_name} />
      </label>
      <label class="grid gap-1 text-sm font-medium text-slate-700">
        Data di nascita
        <input class="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" type="date" bind:value={birth_date} />
      </label>

      <div class="mt-2 flex items-center gap-3">
        <button class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700" type="submit">Salva</button>
        <span class="text-sm text-slate-500">{email}</span>
      </div>
    </form>

    {#if status}<p class="mt-4 text-sm font-medium text-green-700">{status}</p>{/if}
    {#if error}<p class="mt-4 text-sm font-medium text-red-700">{error}</p>{/if}
  </section>
{/if}
