<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { enforceAllowlist, getCurrentUser } from '$lib/session';

  type ClosureColor = 'gray' | 'yellow' | 'red';
  type Closure = { day: string; note: string | null; color: ClosureColor | null };

  let closures: Closure[] = [];
  let newDay = '';
  let newNote = '';
  let newColor: ClosureColor = 'gray';
  let warning = '';
  let message = '';
  let error = '';
  let loading = true;

  onMount(async () => {
    const allow = await enforceAllowlist();
    if (!allow.admin) {
      await goto(`${base}/app`);
      return;
    }
    await loadAll();
  });

  async function loadAll() {
    loading = true;
    const [closuresRes, warningRes] = await Promise.all([
      supabase.from('closures').select('day,note,color').order('day', { ascending: true }),
      supabase.from('app_config').select('value').eq('key', 'homepage_warning').maybeSingle()
    ]);

    if (closuresRes.error || warningRes.error) {
      error = closuresRes.error?.message || warningRes.error?.message || 'Errore di caricamento';
      loading = false;
      return;
    }

    closures = closuresRes.data ?? [];
    warning = warningRes.data?.value ?? '';
    loading = false;
  }

  async function addClosure() {
    message = '';
    error = '';
    if (!newDay) return;

    const { error: insertError } = await supabase.from('closures').upsert({ day: newDay, note: newNote || null, color: newColor });
    if (insertError) {
      error = insertError.message;
      return;
    }

    message = 'Chiusura salvata.';
    newDay = '';
    newNote = '';
    newColor = 'gray';
    await loadAll();
  }

  async function removeClosure(day: string) {
    const { error: deleteError } = await supabase.from('closures').delete().eq('day', day);
    if (deleteError) {
      error = deleteError.message;
      return;
    }
    await loadAll();
  }


  function colorLabel(color: ClosureColor | null) {
    if (color === 'yellow') return 'Giallo';
    if (color === 'red') return 'Rosso';
    return 'Grigio';
  }

  function colorBadgeClass(color: ClosureColor | null) {
    if (color === 'yellow') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (color === 'red') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  async function saveWarning() {
    const currentUser = await getCurrentUser();
    const updated_by = currentUser?.id;

    if (!warning.trim()) {
      const { error: deleteError } = await supabase.from('app_config').delete().eq('key', 'homepage_warning');
      if (deleteError) {
        error = deleteError.message;
        return;
      }
      message = 'Avviso rimosso.';
      await loadAll();
      return;
    }

    const { error: warningError } = await supabase.from('app_config').upsert({
      key: 'homepage_warning',
      value: warning,
      updated_by
    });

    if (warningError) {
      error = warningError.message;
      return;
    }

    message = 'Avviso aggiornato.';
    await loadAll();
  }
</script>

<svelte:head><title>Knowager - Amministrazione</title></svelte:head>

<section class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
  <header class="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 class="text-4xl font-bold tracking-tight text-slate-900">Impostazioni amministrazione</h1>
      <p class="mt-2 text-slate-600">Gestisci avvisi globali e vincoli di calendario per tutta l'organizzazione.</p>
    </div>
    <button class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700" type="button" on:click={saveWarning}>Salva modifiche</button>
  </header>

  {#if loading}
    <p class="text-slate-600">Caricamento...</p>
  {:else}
    <div class="space-y-6">
      <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-2xl font-semibold text-slate-900">Avviso globale</h2>
            <p class="text-slate-600">Questo messaggio sarà mostrato in evidenza nella pagina disponibilità.</p>
          </div>
          <span class={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${warning.trim() ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            {warning.trim() ? 'Attivo' : 'Disattivo'}
          </span>
        </div>
        <label class="mb-2 block text-sm font-medium text-slate-700" for="warning">Contenuto messaggio</label>
        <textarea
          id="warning"
          rows="4"
          bind:value={warning}
          placeholder="Es: L'ufficio sarà chiuso dal 10 al 12 agosto."
          class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
        ></textarea>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 class="text-2xl font-semibold text-slate-900">Chiusure calendario</h2>
        <p class="mb-4 text-slate-600">Aggiungi i giorni non selezionabili, includendo il motivo da mostrare agli utenti.</p>

        <form class="mb-4 grid gap-3 md:grid-cols-[180px_1fr_150px_auto]" on:submit|preventDefault={addClosure}>
          <input class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" type="date" bind:value={newDay} required />
          <input class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" placeholder="Motivo (es. Ferragosto)" bind:value={newNote} />
          <select class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" bind:value={newColor}>
            <option value="gray">Grigio</option>
            <option value="yellow">Giallo</option>
            <option value="red">Rosso</option>
          </select>
          <button class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700" type="submit">Aggiungi</button>
        </form>

        <ul class="divide-y divide-slate-100">
          {#if closures.length === 0}
            <li class="py-3 text-slate-500">Nessuna chiusura impostata.</li>
          {:else}
            {#each closures as closure}
              <li class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="font-medium text-slate-900">{closure.day}</p>
                  <p class="text-sm text-slate-600">{closure.note?.trim() ? closure.note : 'Nessun motivo specificato'}</p>
                  <span class={`mt-1 inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${colorBadgeClass(closure.color)}`}>Colore: {colorLabel(closure.color)}</span>
                </div>
                <button class="w-fit rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50" on:click={() => removeClosure(closure.day)}>Rimuovi</button>
              </li>
            {/each}
          {/if}
        </ul>
      </article>
    </div>
  {/if}

  {#if message}<p class="mt-4 text-sm font-medium text-green-700">{message}</p>{/if}
  {#if error}<p class="mt-4 text-sm font-medium text-red-700">{error}</p>{/if}
</section>
