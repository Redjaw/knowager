<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { enforceAllowlist, getCurrentUser } from '$lib/session';

  type ClosureColor = 'gray' | 'yellow' | 'red';
  type Closure = { day: string; note: string | null; color: ClosureColor | null };

  const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  let closures: Closure[] = [];
  let newDay = '';
  let newNote = '';
  let newColor: ClosureColor = 'gray';
  let warning = '';
  let message = '';
  let error = '';
  let loading = true;
  let calendarCursor = startOfMonth(new Date());

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

  function startOfMonth(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  function toDateKey(value: Date) {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function monthLabel() {
    return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(calendarCursor);
  }

  function monthPrefix() {
    const month = `${calendarCursor.getMonth() + 1}`.padStart(2, '0');
    return `${calendarCursor.getFullYear()}-${month}`;
  }

  function previousMonth() {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  }

  function nextMonth() {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  }

  function closureByDay(day: string) {
    return closures.find((closure) => closure.day === day);
  }

  function selectedMonthClosures() {
    const prefix = monthPrefix();
    return closures.filter((closure) => closure.day.startsWith(prefix));
  }

  function selectCalendarDay(day: string) {
    newDay = day;
    const closure = closureByDay(day);
    if (closure) {
      newNote = closure.note ?? '';
      newColor = closure.color ?? 'gray';
    }
  }

  function calendarCells() {
    const firstDay = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const mondayBasedStart = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - mondayBasedStart);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const day = toDateKey(date);
      return {
        day,
        dateNumber: date.getDate(),
        inMonth: date.getMonth() === calendarCursor.getMonth(),
        isToday: day === toDateKey(new Date()),
        closure: closureByDay(day)
      };
    });
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
        <p class="mb-4 text-slate-600">Puoi selezionare una data dal mini calendario e gestire più facilmente molte chiusure.</p>

        <form class="mb-6 grid gap-3 md:grid-cols-[180px_1fr_150px_auto]" on:submit|preventDefault={addClosure}>
          <input class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" type="date" bind:value={newDay} required />
          <input class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" placeholder="Motivo (es. Ferragosto)" bind:value={newNote} />
          <select class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" bind:value={newColor}>
            <option value="gray">Grigio</option>
            <option value="yellow">Giallo</option>
            <option value="red">Rosso</option>
          </select>
          <button class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700" type="submit">Aggiungi</button>
        </form>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900">Elenco mese corrente</h3>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{selectedMonthClosures().length} chiusure</span>
            </div>
            <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60 px-3">
              {#if selectedMonthClosures().length === 0}
                <li class="py-3 text-slate-500">Nessuna chiusura nel mese selezionato.</li>
              {:else}
                {#each selectedMonthClosures() as closure}
                  <li class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <button class="text-left" type="button" on:click={() => selectCalendarDay(closure.day)}>
                      <p class="font-medium text-slate-900">{closure.day}</p>
                      <p class="text-sm text-slate-600">{closure.note?.trim() ? closure.note : 'Nessun motivo specificato'}</p>
                      <span class={`mt-1 inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${colorBadgeClass(closure.color)}`}>Colore: {colorLabel(closure.color)}</span>
                    </button>
                    <button class="w-fit rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50" on:click={() => removeClosure(closure.day)}>Rimuovi</button>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-3 flex items-center justify-between">
              <button class="h-8 w-8 rounded-full text-xl text-blue-700 transition hover:bg-blue-50" type="button" on:click={previousMonth} aria-label="Mese precedente">‹</button>
              <h3 class="text-sm font-semibold capitalize text-slate-900">{monthLabel()}</h3>
              <button class="h-8 w-8 rounded-full text-xl text-blue-700 transition hover:bg-blue-50" type="button" on:click={nextMonth} aria-label="Mese successivo">›</button>
            </div>

            <div class="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
              {#each weekdayLabels as label}
                <span>{label}</span>
              {/each}
            </div>

            <div class="grid grid-cols-7 gap-1">
              {#each calendarCells() as cell}
                <button
                  type="button"
                  class={`relative h-10 rounded-lg border text-xs font-medium transition ${cell.inMonth ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-transparent text-slate-300'} ${cell.isToday ? 'ring-2 ring-blue-300' : ''} ${newDay === cell.day ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}
                  on:click={() => selectCalendarDay(cell.day)}
                >
                  <span>{cell.dateNumber}</span>
                  {#if cell.closure}
                    <span class={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${cell.closure.color === 'yellow' ? 'bg-amber-500' : cell.closure.color === 'red' ? 'bg-red-500' : 'bg-slate-500'}`}></span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
      </article>
    </div>
  {/if}

  {#if message}<p class="mt-4 text-sm font-medium text-green-700">{message}</p>{/if}
  {#if error}<p class="mt-4 text-sm font-medium text-red-700">{error}</p>{/if}
</section>
