<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';

  const avatars = ['gravatar', 'fox', 'owl', 'cat', 'bear', 'rabbit', 'tiger'];
  const avatarEmojis: Record<string, string> = {
    gravatar: '🧑',
    fox: '🦊',
    owl: '🦉',
    cat: '🐱',
    bear: '🐻',
    rabbit: '🐰',
    tiger: '🐯'
  };

  let first_name = '';
  let last_name = '';
  let birth_date = '';
  let avatar_id = 'gravatar';
  let status = '';
  let error = '';
  let loading = true;

  onMount(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name,last_name,birth_date,avatar_id')
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
      avatar_id = profile.avatar_id ?? 'gravatar';
    } else {
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, avatar_id: 'gravatar' });
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
      birth_date: birth_date || null,
      avatar_id
    });

    if (saveError) {
      error = saveError.message;
      return;
    }

    status = 'Profilo salvato.';
  }
</script>

<svelte:head><title>Knowager - Profilo</title></svelte:head>

{#if loading}
  <p>Caricamento...</p>
{:else}
  <section class="max-w-xl rounded-xl border border-slate-200 bg-white p-4">
    <h2 class="m-0 text-2xl font-bold">Profilo</h2>
    <form class="mt-4 grid gap-3" on:submit|preventDefault={save}>
      <label class="grid gap-1">Nome <input class="rounded-lg border border-slate-300 px-3 py-2" bind:value={first_name} /></label>
      <label class="grid gap-1">Cognome <input class="rounded-lg border border-slate-300 px-3 py-2" bind:value={last_name} /></label>
      <label class="grid gap-1">Data di nascita <input class="rounded-lg border border-slate-300 px-3 py-2" type="date" bind:value={birth_date} /></label>
      <fieldset class="m-0 border-0 p-0">
        <legend class="mb-2 font-semibold">Avatar</legend>
        <div class="flex flex-wrap gap-2">
          {#each avatars as avatar}
            <button
              type="button"
              class="rounded-lg border px-3 py-2 {avatar_id === avatar ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'}"
              onclick={() => (avatar_id = avatar)}
            >
              {avatarEmojis[avatar]} {avatar}
            </button>
          {/each}
        </div>
      </fieldset>
      <button class="rounded-lg border border-slate-900 bg-slate-900 px-3 py-2 text-white" type="submit">Salva</button>
    </form>
    {#if status}<p class="text-green-700">{status}</p>{/if}
    {#if error}<p class="text-red-700">{error}</p>{/if}
  </section>
{/if}
