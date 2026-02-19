<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { getCurrentWeek, type WeekDay, toDateKey } from '$lib/dateUtils';
  import { supabase } from '$lib/supabaseClient';
  import { gravatarUrl } from '$lib/gravatar';
  import { getCurrentUser } from '$lib/session';

  type Selection = { day: string; user_id: string };
  type ClosureColor = 'gray' | 'yellow' | 'red';
  type Closure = { day: string; note: string | null; color: ClosureColor | null };
  type PublicProfile = { id: string; first_name: string | null; last_name: string | null; email: string | null; birth_date: string | null };

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  let referenceDate = new Date();
  let week: WeekDay[] = getCurrentWeek(referenceDate);
  let currentWeekStartKey = getCurrentWeek(new Date())[0]?.key ?? '';
  let selections: Selection[] = [];
  let closures: Closure[] = [];
  let profiles = new Map<string, PublicProfile>();
  let warning = '';
  let currentUserId = '';
  let loading = true;
  let refreshing = false;
  let errorMessage = '';
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let polling = false;

  onMount(async () => {
    await loadData();

    pollInterval = setInterval(() => {
      if (polling) return;
      polling = true;
      void loadData({ background: true }).finally(() => {
        polling = false;
      });
    }, 60000);
  });

  onDestroy(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  async function loadData(options: { background?: boolean } = {}) {
    const background = options.background ?? false;
    if (background) {
      refreshing = true;
    } else {
      loading = true;
    }

    errorMessage = '';
    currentWeekStartKey = getCurrentWeek(new Date())[0]?.key ?? '';
    week = getCurrentWeek(referenceDate);

    try {
      const currentUser = await getCurrentUser();
      currentUserId = currentUser?.id ?? '';
      if (!currentUserId) {
        errorMessage = 'Sessione scaduta. Ricarica la pagina per continuare.';
        return;
      }

      const days = week.map((d) => d.key);
      const [selectionsRes, closuresRes, warningRes] = await Promise.all([
        supabase.from('day_selections').select('day,user_id').in('day', days),
        supabase.from('closures').select('day,note,color').in('day', days),
        supabase.from('app_config').select('value').eq('key', 'homepage_warning').maybeSingle()
      ]);

      if (selectionsRes.error || closuresRes.error || warningRes.error) {
        errorMessage = selectionsRes.error?.message || closuresRes.error?.message || warningRes.error?.message || 'Errore durante il caricamento';
        return;
      }

      selections = (selectionsRes.data as Selection[]) ?? [];
      closures = (closuresRes.data as Closure[]) ?? [];
      warning = warningRes.data?.value ?? '';

      const profileRes = await supabase.from('profiles').select('id,first_name,last_name,email,birth_date');
      if (profileRes.error) {
        errorMessage = profileRes.error.message;
        return;
      }

      profiles = new Map((profileRes.data ?? []).map((profile) => [profile.id, profile as PublicProfile]));
    } finally {
      if (background) {
        refreshing = false;
      } else {
        loading = false;
      }
    }
  }

  function dayMembers(day: string) {
    return selections.filter((item) => item.day === day);
  }

  function isMine(day: string) {
    return selections.some((item) => item.day === day && item.user_id === currentUserId);
  }

  function isWeekend(date: Date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function isPast(day: WeekDay) {
    return day.key < toDateKey(new Date());
  }

  function closureFor(day: WeekDay) {
    return closures.find((closure) => closure.day === day.key);
  }

  function closureTone(closure?: Closure) {
    if (!closure || closure.color === 'gray' || !closure.color) {
      return 'border-slate-300 bg-slate-200/50 text-slate-600';
    }

    if (closure.color === 'yellow') {
      return 'border-amber-300 bg-amber-100/60 text-amber-800';
    }

    return 'border-red-300 bg-red-100/60 text-red-800';
  }

  function cardClasses(day: WeekDay, mine: boolean) {
    const closure = closureFor(day);
    if (closure) {
      return `cursor-not-allowed ${closureTone(closure)}`;
    }

    if (isPast(day) || isWeekend(day.date)) {
      return 'cursor-not-allowed border-slate-300 bg-slate-200/50 text-slate-500';
    }

    if (mine) {
      return 'cursor-pointer border-blue-500 bg-blue-50 hover:border-blue-600';
    }

    return 'cursor-pointer border-slate-200 bg-white hover:border-blue-500';
  }

  function indicatorClasses(day: WeekDay, mine: boolean) {
    const closure = closureFor(day);
    if (closure) {
      if (closure.color === 'yellow') return 'border-amber-500 bg-amber-300';
      if (closure.color === 'red') return 'border-red-500 bg-red-300';
      return 'border-slate-400 bg-slate-300';
    }

    if (isPast(day) || isWeekend(day.date)) {
      return 'border-slate-400 bg-slate-300';
    }

    return mine ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white';
  }

  function dayStatus(day: WeekDay) {
    if (isPast(day)) return 'Data passata';
    const closure = closureFor(day);
    if (closure) {
      return closure.note?.trim() ? `${closure.note}` : 'Chiuso (festività/chiusura straordinaria)';
    }
    if (isWeekend(day.date)) return 'Weekend';
    return isMine(day.key) ? 'Disponibile' : 'Non impostato';
  }

  function profileName(profile?: PublicProfile) {
    return `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || profile?.email || 'Utente';
  }

  function birthdaysForDay(day: WeekDay) {
    const month = `${day.date.getMonth() + 1}`.padStart(2, '0');
    const date = `${day.date.getDate()}`.padStart(2, '0');

    return [...profiles.values()]
      .filter((profile): profile is PublicProfile => Boolean(profile.birth_date))
      .filter((profile) => profile.birth_date?.slice(5, 10) === `${month}-${date}`)
      .map((profile) => profileName(profile));
  }

  function cardCanToggle(day: WeekDay) {
    return !isPast(day) && !closureFor(day) && !isWeekend(day.date);
  }

  async function toggle(day: WeekDay) {
    if (!cardCanToggle(day)) return;
    if (!currentUserId) {
      errorMessage = 'Sessione scaduta. Ricarica la pagina per continuare.';
      return;
    }

    const mine = isMine(day.key);
    const previousSelections = selections;

    if (mine) {
      selections = selections.filter((item) => !(item.day === day.key && item.user_id === currentUserId));
    } else {
      selections = [...selections, { day: day.key, user_id: currentUserId }];
    }

    const query = supabase.from('day_selections');
    const result = mine
      ? await query.delete().eq('day', day.key).eq('user_id', currentUserId)
      : await query.insert({ day: day.key, user_id: currentUserId });

    if (result.error) {
      selections = previousSelections;
      errorMessage = result.error.message;
      return;
    }

    void loadData({ background: true });
  }


  function isCurrentWeekVisible() {
    return week[0]?.key === currentWeekStartKey;
  }

  function goToCurrentWeek() {
    if (isCurrentWeekVisible()) return;
    referenceDate = new Date();
    void loadData({ background: false });
  }

  function moveWeek(delta: number) {
    const next = new Date(referenceDate);
    next.setDate(next.getDate() + delta * 7);
    referenceDate = next;
    void loadData({ background: false });
  }

  function weekRangeLabel() {
    const start = week[0]?.date;
    const end = week[6]?.date;
    if (!start || !end) return '';

    const month = new Intl.DateTimeFormat('it-IT', { month: 'short' });
    return `${month.format(start)} ${start.getDate()} - ${month.format(end)} ${end.getDate()}`;
  }

  function weekMetaLabel() {
    const start = week[0]?.date;
    if (!start) return '';
    const year = start.getFullYear();
    return `Settimana ${isoWeekNumber(start)}, ${year}`;
  }

  function isoWeekNumber(date: Date) {
    const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = value.getUTCDay() || 7;
    value.setUTCDate(value.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
    return Math.ceil(((value.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
</script>

<svelte:head>
  <title>Knowager - Presenze in sede</title>
</svelte:head>

<section class="px-4 py-6 sm:px-8">
  <header class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">Presenze settimanali</h1>
      <p class="mt-2 text-slate-600">Pianifica la tua settimana e controlla la presenza del team.</p>
      {#if warning}
        <p class="mt-3 inline-block rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">⚠️ {warning}</p>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <div class="flex min-w-[260px] items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2" aria-label="Selettore settimana">
        <button class="h-9 w-9 rounded-full text-2xl text-blue-700 transition hover:bg-blue-50" type="button" onclick={() => moveWeek(-1)} aria-label="Settimana precedente">‹</button>
        <div class="text-center">
          <strong class="block text-lg font-semibold text-slate-900">{weekRangeLabel()}</strong>
          <span class="text-sm text-slate-500">{weekMetaLabel()}</span>
        </div>
        <button class="h-9 w-9 rounded-full text-2xl text-blue-700 transition hover:bg-blue-50" type="button" onclick={() => moveWeek(1)} aria-label="Settimana successiva">›</button>
      </div>
      <button
        class={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${isCurrentWeekVisible() ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
        type="button"
        onclick={goToCurrentWeek}
        disabled={isCurrentWeekVisible()}
      >
        Oggi
      </button>
    </div>
  </header>

  <div class="relative">
    {#if loading}
      <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7" aria-label="Caricamento disponibilità">
        {#each Array(7) as _, index}
          <article class="min-h-[280px] animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
            <div class="flex items-start justify-between">
              <div class="space-y-2">
                <div class="h-4 w-10 rounded bg-slate-200"></div>
                <div class="h-10 w-12 rounded bg-slate-200"></div>
              </div>
              <div class="h-5 w-5 rounded-full bg-slate-200"></div>
            </div>
            <div class="mt-4 h-4 w-28 rounded bg-slate-200"></div>
            <div class="mt-10 h-4 w-full rounded bg-slate-100"></div>
            <div class="mt-3 flex gap-1">
              <div class="h-8 w-8 rounded-full bg-slate-200"></div>
              <div class="h-8 w-8 rounded-full bg-slate-200"></div>
              <div class="h-8 w-8 rounded-full bg-slate-200"></div>
            </div>
          </article>
        {/each}
      </section>
    {:else if errorMessage}
      <p class="font-semibold text-red-700">{errorMessage}</p>
    {:else}
      <section class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {#each week as day, index}
          {@const mine = isMine(day.key)}
          {@const members = dayMembers(day.key)}
          {@const disabled = !cardCanToggle(day)}
          <button
            type="button"
            class={`flex min-h-[280px] flex-col rounded-2xl border p-4 text-left transition ${cardClasses(day, mine)}`}
            onclick={() => toggle(day)}
            disabled={disabled}
            aria-label={`${dayLabels[index]} ${day.dayNumber}`}
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-wide text-slate-500">{dayLabels[index]}</p>
                <p class="text-4xl font-bold text-slate-900">{day.dayNumber}</p>
              </div>
              <span class={`mt-1 h-5 w-5 rounded-full border-2 ${indicatorClasses(day, mine)}`}></span>
            </div>

            <p class="mt-4 text-sm font-medium text-slate-700">{dayStatus(day)}</p>

            {#if birthdaysForDay(day).length > 0}
              <p class="mt-2 rounded-lg bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700">🎂 {birthdaysForDay(day).join(', ')}</p>
            {/if}

            <div class="mt-auto border-t border-slate-200 pt-3">
              <div class="mt-2 flex items-center">
                {#if members.length === 0 && !disabled}
                  <span class="grid h-8 w-8 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400">+</span>
                {:else if members.length === 0 && disabled}
                  <span class="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-slate-400">-</span>
                {:else}
                  {#each members.slice(0, 4) as member}
                    {@const profile = profiles.get(member.user_id)}
                    <img class="-ml-2 h-8 w-8 rounded-full border-2 border-white first:ml-0" src={gravatarUrl(profile?.email, 64)} alt={profileName(profile)} title={profileName(profile)} />
                  {/each}
                  {#if members.length > 4}
                    <span class="-ml-2 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-blue-600 text-xs font-semibold text-white">+{members.length - 4}</span>
                  {/if}
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </section>
    {/if}

    {#if refreshing}
      <div class="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-white/70 backdrop-blur-[1px]" aria-live="polite" aria-label="Aggiornamento disponibilità in corso">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
      </div>
    {/if}
  </div>
</section>
