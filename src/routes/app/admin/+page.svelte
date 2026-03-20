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
  let rangeFrom = '';
  let rangeTo = '';
  let selectedDay = '';
  let newNote = '';
  let newColor: ClosureColor = 'gray';
  let warning = '';
  let message = '';
  let error = '';
  let loading = true;
  const initialDate = new Date();
  let calendarCursor = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  let visibleMonthLabel = '';
  let visibleMonthPrefix = '';
  let visibleCalendarCells: { day: string; dateNumber: number; inMonth: boolean; isToday: boolean; closure: Closure | undefined }[] = [];

  $: visibleMonthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(calendarCursor);
  $: visibleMonthPrefix = `${calendarCursor.getFullYear()}-${`${calendarCursor.getMonth() + 1}`.padStart(2, '0')}`;
  $: visibleCalendarCells = buildCalendarCells(calendarCursor, closures);

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

  function getWeekdaysInRange(from: string, to: string): string[] {
    const result: string[] = [];
    const end = new Date(to + 'T00:00:00');
    const cur = new Date(from + 'T00:00:00');
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        result.push(toDateKey(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }

  async function addClosures() {
    message = '';
    error = '';
    if (!rangeFrom) return;

    const days = getWeekdaysInRange(rangeFrom, rangeTo || rangeFrom);
    if (days.length === 0) {
      error = 'Nessun giorno feriale nel range selezionato.';
      return;
    }

    const rows = days.map((day) => ({ day, note: newNote || null, color: newColor }));
    const { error: insertError } = await supabase.from('closures').upsert(rows);
    if (insertError) {
      error = insertError.message;
      return;
    }

    message = days.length === 1 ? 'Chiusura salvata.' : `${days.length} chiusure salvate.`;
    rangeFrom = '';
    rangeTo = '';
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
    if (selectedDay === day) selectedDay = '';
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

  function colorDotClass(color: ClosureColor | null) {
    if (color === 'yellow') return 'bg-amber-500';
    if (color === 'red') return 'bg-red-500';
    return 'bg-slate-500';
  }

  function toDateKey(value: Date) {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    return closures.filter((closure) => closure.day.startsWith(visibleMonthPrefix));
  }

  function selectCalendarDay(day: string) {
    selectedDay = day;
    rangeFrom = day;
    rangeTo = '';
    const closure = closureByDay(day);
    if (closure) {
      newNote = closure.note ?? '';
      newColor = closure.color ?? 'gray';
    }
  }

  function selectListClosure(day: string) {
    selectedDay = day;
    rangeFrom = day;
    rangeTo = '';
    const closure = closureByDay(day);
    if (closure) {
      newNote = closure.note ?? '';
      newColor = closure.color ?? 'gray';
    }
  }

  function buildCalendarCells(cursor: Date, closureList: Closure[]) {
    const currentYear = cursor.getFullYear();
    const currentMonth = cursor.getMonth();
    const firstDay = new Date(currentYear, currentMonth, 1);
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
        inMonth: date.getMonth() === currentMonth,
        isToday: day === toDateKey(new Date()),
        closure: closureList.find((c) => c.day === day)
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
        <p class="mb-4 text-slate-600">Seleziona un giorno o un intervallo di date. I weekend vengono esclusi automaticamente.</p>

        <form class="mb-6 grid gap-3 sm:grid-cols-[auto_auto_1fr_auto_auto]" on:submit|preventDefault={addClosures}>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-slate-600 whitespace-nowrap" for="range-from">Dal</label>
            <input
              id="range-from"
              class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
              type="date"
              bind:value={rangeFrom}
              required
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-slate-600 whitespace-nowrap" for="range-to">Al</label>
            <input
              id="range-to"
              class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
              type="date"
              bind:value={rangeTo}
              min={rangeFrom}
            />
          </div>
          <input class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" placeholder="Motivo (es. Ferragosto)" bind:value={newNote} />
          <select class="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 transition focus:ring-2" bind:value={newColor}>
            <option value="gray">Grigio</option>
            <option value="yellow">Giallo</option>
            <option value="red">Rosso</option>
          </select>
          <button class="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700" type="submit">Aggiungi</button>
        </form>

        <div class="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <!-- Calendario principale -->
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-3 flex items-center justify-between">
              <button class="h-8 w-8 rounded-full text-xl text-blue-700 transition hover:bg-blue-50" type="button" on:click={previousMonth} aria-label="Mese precedente">‹</button>
              <h3 class="text-sm font-semibold capitalize text-slate-900">{visibleMonthLabel}</h3>
              <button class="h-8 w-8 rounded-full text-xl text-blue-700 transition hover:bg-blue-50" type="button" on:click={nextMonth} aria-label="Mese successivo">›</button>
            </div>

            <div class="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
              {#each weekdayLabels as label}
                <span>{label}</span>
              {/each}
            </div>

            <div class="grid grid-cols-7 gap-1">
              {#each visibleCalendarCells as cell}
                {@const isSelected = selectedDay === cell.day}
                <button
                  type="button"
                  class={`relative h-11 rounded-lg border text-xs font-medium transition
                    ${cell.inMonth ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-transparent text-slate-300'}
                    ${cell.isToday && !isSelected ? 'ring-2 ring-blue-300' : ''}
                    ${isSelected ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700' : ''}
                  `}
                  on:click={() => selectCalendarDay(cell.day)}
                >
                  <span>{cell.dateNumber}</span>
                  {#if cell.closure}
                    <span class={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${isSelected ? 'bg-white/80' : colorDotClass(cell.closure.color)}`}></span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Lista chiusure del mese visibile -->
          <div>
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-lg font-semibold capitalize text-slate-900">{visibleMonthLabel}</h3>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{selectedMonthClosures().length} chiusure</span>
            </div>
            <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60 px-3">
              {#if selectedMonthClosures().length === 0}
                <li class="py-4 text-slate-500">Nessuna chiusura nel mese selezionato.</li>
              {:else}
                {#each selectedMonthClosures() as closure}
                  {@const isHighlighted = selectedDay === closure.day}
                  <li
                    class={`flex flex-col gap-2 rounded-lg px-2 py-3 transition sm:flex-row sm:items-center sm:justify-between
                      ${isHighlighted ? 'bg-blue-50 ring-1 ring-blue-200' : ''}
                    `}
                  >
                    <button class="flex items-center gap-3 text-left" type="button" on:click={() => selectListClosure(closure.day)}>
                      <span class={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${colorDotClass(closure.color)}`}></span>
                      <div>
                        <p class={`font-medium ${isHighlighted ? 'text-blue-900' : 'text-slate-900'}`}>{closure.day}</p>
                        <p class="text-sm text-slate-600">{closure.note?.trim() ? closure.note : 'Nessun motivo specificato'}</p>
                        <span class={`mt-1 inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${colorBadgeClass(closure.color)}`}>{colorLabel(closure.color)}</span>
                      </div>
                    </button>
                    <button type="button" class="w-fit rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50" on:click={() => removeClosure(closure.day)}>Rimuovi</button>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>
        </div>
      </article>
    </div>
  {/if}

  {#if message}<p class="mt-4 text-sm font-medium text-green-700">{message}</p>{/if}
  {#if error}<p class="mt-4 text-sm font-medium text-red-700">{error}</p>{/if}
</section>
