<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWeek, type WeekDay, toDateKey } from '$lib/dateUtils';
  import { supabase } from '$lib/supabaseClient';

  type Selection = { day: string; user_id: string };
  type PublicProfile = { id: string; first_name: string | null; last_name: string | null; avatar_id: string | null };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const avatarMap: Record<string, string> = {
    fox: '🦊',
    owl: '🦉',
    cat: '🐱',
    bear: '🐻',
    rabbit: '🐰',
    tiger: '🐯'
  };

  let referenceDate = new Date();
  let week: WeekDay[] = getCurrentWeek(referenceDate);
  let selections: Selection[] = [];
  let closureDays = new Set<string>();
  let profiles = new Map<string, PublicProfile>();
  let warning = '';
  let currentUserId = '';
  let loading = true;
  let errorMessage = '';

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    errorMessage = '';
    week = getCurrentWeek(referenceDate);

    const { data: userData } = await supabase.auth.getUser();
    currentUserId = userData.user?.id ?? '';
    const days = week.map((d) => d.key);

    const [selectionsRes, closuresRes, warningRes] = await Promise.all([
      supabase.from('day_selections').select('day,user_id').in('day', days),
      supabase.from('closures').select('day').in('day', days),
      supabase.from('app_config').select('value').eq('key', 'homepage_warning').maybeSingle()
    ]);

    if (selectionsRes.error || closuresRes.error || warningRes.error) {
      errorMessage = selectionsRes.error?.message || closuresRes.error?.message || warningRes.error?.message || 'Errore caricamento';
      loading = false;
      return;
    }

    selections = (selectionsRes.data as Selection[]) ?? [];
    closureDays = new Set((closuresRes.data ?? []).map((row) => row.day));
    warning = warningRes.data?.value ?? '';

    const ids = [...new Set(selections.map((item) => item.user_id))];
    if (!ids.length) {
      profiles = new Map();
      loading = false;
      return;
    }

    const profileRes = await supabase.from('profiles_public').select('id,first_name,last_name,avatar_id').in('id', ids);

    if (profileRes.error) {
      errorMessage = profileRes.error.message;
    } else {
      profiles = new Map((profileRes.data ?? []).map((profile) => [profile.id, profile as PublicProfile]));
    }

    loading = false;
  }

  function dayMembers(day: string) {
    return selections.filter((item) => item.day === day);
  }

  function isMine(day: string) {
    return selections.some((item) => item.day === day && item.user_id === currentUserId);
  }

  function initials(profile?: PublicProfile) {
    const first = profile?.first_name?.at(0) ?? '';
    const last = profile?.last_name?.at(0) ?? '';
    return `${first}${last}`.toUpperCase() || '?';
  }

  function isWeekend(date: Date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function isPast(day: WeekDay) {
    return day.key < toDateKey(new Date());
  }

  function dayStatus(day: WeekDay) {
    if (isPast(day)) return 'Past date';
    if (isWeekend(day.date) || closureDays.has(day.key)) return 'Weekend';
    return isMine(day.key) ? 'Available' : 'Not set';
  }

  function profileName(profile?: PublicProfile) {
    return `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'User';
  }

  function cardCanToggle(day: WeekDay) {
    return !isPast(day) && !closureDays.has(day.key) && !isWeekend(day.date);
  }

  async function toggle(day: WeekDay) {
    if (!cardCanToggle(day)) return;

    const mine = isMine(day.key);
    const query = supabase.from('day_selections');

    if (mine) {
      const { error } = await query.delete().eq('day', day.key).eq('user_id', currentUserId);
      if (error) {
        errorMessage = error.message;
        return;
      }
    } else {
      const { error } = await query.insert({ day: day.key, user_id: currentUserId });
      if (error) {
        errorMessage = error.message;
        return;
      }
    }

    await loadData();
  }

  function moveWeek(delta: number) {
    const next = new Date(referenceDate);
    next.setDate(next.getDate() + delta * 7);
    referenceDate = next;
    void loadData();
  }

  function weekRangeLabel() {
    const start = week[0]?.date;
    const end = week[6]?.date;
    if (!start || !end) return '';

    const month = new Intl.DateTimeFormat('en-US', { month: 'short' });
    return `${month.format(start)} ${start.getDate()} - ${month.format(end)} ${end.getDate()}`;
  }

  function weekMetaLabel() {
    const start = week[0]?.date;
    if (!start) return '';
    const year = start.getFullYear();
    return `Week ${isoWeekNumber(start)}, ${year}`;
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
  <title>Knowager - Availability</title>
</svelte:head>

<section class="availability-shell">
  <header class="page-header">
    <div>
      <h1>My Availability</h1>
      <p>Plan your week and see when your team is in.</p>
      {#if warning}
        <p class="warning">⚠️ {warning}</p>
      {/if}
    </div>

    <div class="week-selector" aria-label="Week selector">
      <button type="button" onclick={() => moveWeek(-1)} aria-label="Previous week">‹</button>
      <div>
        <strong>{weekRangeLabel()}</strong>
        <span>{weekMetaLabel()}</span>
      </div>
      <button type="button" onclick={() => moveWeek(1)} aria-label="Next week">›</button>
    </div>
  </header>

  {#if loading}
    <p class="load">Caricamento...</p>
  {:else if errorMessage}
    <p class="error">{errorMessage}</p>
  {:else}
    <section class="week-grid">
      {#each week as day, index}
        {@const mine = isMine(day.key)}
        {@const members = dayMembers(day.key)}
        {@const disabled = !cardCanToggle(day)}
        <button
          type="button"
          class="day-card {mine ? 'mine' : ''} {disabled ? 'closed' : ''}"
          onclick={() => toggle(day)}
          disabled={disabled}
          aria-label={`${dayLabels[index]} ${day.dayNumber}`}
        >
          <div class="head-row">
            <div>
              <p class="weekday">{dayLabels[index]}</p>
              <p class="day-number">{day.dayNumber}</p>
            </div>
            <span class="status-dot {mine ? 'active' : ''}"></span>
          </div>

          <div class="content-row">
            <p class="state">{dayStatus(day)}</p>
          </div>

          <div class="members">
            <p>{members.length === 0 ? 'Be the first to join' : `${members.length} colleagues joined`}</p>
            <div class="avatars">
              {#if members.length === 0}
                <span class="avatar empty">＋</span>
              {:else}
                {#each members.slice(0, 4) as member}
                  {@const profile = profiles.get(member.user_id)}
                  <span class="avatar" title={profileName(profile)}>
                    {#if profile?.avatar_id && avatarMap[profile.avatar_id]}
                      {avatarMap[profile.avatar_id]}
                    {:else}
                      {initials(profile)}
                    {/if}
                  </span>
                {/each}
                {#if members.length > 4}
                  <span class="avatar more">+{members.length - 4}</span>
                {/if}
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </section>
  {/if}
</section>

<style>
  .availability-shell {
    padding: 2rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 2.5vw, 3.4rem);
    line-height: 1.1;
    color: #111827;
  }

  .page-header p {
    margin: 0.5rem 0 0;
    color: #376091;
    font-size: 1.2rem;
  }

  .warning {
    margin-top: 0.8rem;
    display: inline-block;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: #fff3cd;
    color: #8a5b00;
    font-size: 0.9rem;
  }

  .week-selector {
    border: 1px solid #d6dee8;
    border-radius: 14px;
    background: #f8fafc;
    min-width: 290px;
    padding: 0.65rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .week-selector button {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 999px;
    border: none;
    font-size: 1.7rem;
    color: #3d6da8;
    background: transparent;
    cursor: pointer;
  }

  .week-selector div {
    display: flex;
    flex-direction: column;
    text-align: center;
    gap: 0.2rem;
  }

  .week-selector strong {
    font-size: 1.8rem;
    color: #111827;
  }

  .week-selector span {
    color: #446f9f;
    font-size: 1rem;
  }

  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .day-card {
    text-align: left;
    border: 1px solid #d2dce8;
    border-radius: 16px;
    background: #f8fafc;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    min-height: 370px;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
  }

  .day-card:hover:enabled {
    border-color: #1f73e0;
  }

  .day-card.mine {
    border-color: #1f73e0;
    box-shadow: inset 0 0 0 1px #1f73e0;
  }

  .day-card.closed {
    background: repeating-linear-gradient(-45deg, #f8fafc, #f8fafc 6px, #f3f6fb 6px, #f3f6fb 12px);
    color: #98a3b4;
    cursor: not-allowed;
  }

  .head-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .weekday {
    margin: 0;
    text-transform: uppercase;
    font-size: 1rem;
    color: #4f79a6;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .day-number {
    margin: 0.15rem 0 0;
    font-size: 3.2rem;
    font-weight: 700;
    line-height: 1;
    color: #0f172a;
  }

  .status-dot {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 50%;
    border: 2px solid #d2dce8;
    background: #fff;
  }

  .status-dot.active {
    border-color: #1f73e0;
    background: #1f73e0;
    position: relative;
  }

  .status-dot.active::after {
    content: '✓';
    position: absolute;
    color: white;
    font-size: 1rem;
    inset: 0;
    display: grid;
    place-items: center;
  }

  .content-row {
    margin-top: 1.1rem;
    min-height: 120px;
  }

  .pill {
    display: inline-block;
    border-radius: 999px;
    background: #d9ebff;
    color: #1f73e0;
    padding: 0.2rem 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .state {
    margin: 0.5rem 0 0;
    font-size: 1.05rem;
    color: #285889;
  }

  .meta {
    margin: 0.5rem 0 0;
    color: #4f79a6;
    font-size: 0.95rem;
  }

  .members {
    border-top: 1px solid #dbe3ef;
    margin-top: auto;
    padding-top: 0.9rem;
  }

  .members p {
    margin: 0;
    color: #4f79a6;
    font-size: 0.95rem;
  }

  .avatars {
    margin-top: 0.65rem;
    display: flex;
    align-items: center;
  }

  .avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 2px solid #f8fafc;
    margin-left: -0.42rem;
    background: #111827;
    color: white;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .avatar:first-child {
    margin-left: 0;
  }

  .avatar.more {
    background: #1f73e0;
  }

  .avatar.empty {
    border: 1px dashed #cad6e7;
    background: transparent;
    color: #9aa8bd;
    margin-left: 0;
  }

  .page-footer {
    border-top: 1px solid #d6dee8;
    margin-top: 1.8rem;
    padding-top: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    color: #3f6288;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .legend i {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    display: inline-block;
    border: 1px solid #d2dce8;
  }

  .legend i.blue {
    background: #1f73e0;
    border-color: #1f73e0;
  }

  .legend i.gray {
    background: #e5e7eb;
    border-color: #e5e7eb;
  }

  .footer-actions {
    display: flex;
    gap: 0.8rem;
    align-items: center;
  }

  .footer-actions button {
    border-radius: 12px;
    border: 1px solid transparent;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    padding: 0.68rem 1rem;
  }

  .footer-actions .link {
    background: transparent;
    color: #1f73e0;
  }

  .footer-actions .primary {
    background: #1f73e0;
    color: white;
    min-width: 140px;
    box-shadow: 0 8px 18px rgba(31, 115, 224, 0.25);
  }

  .error {
    color: #b91c1c;
    font-weight: 600;
  }

  .load {
    color: #356ca5;
  }

  @media (max-width: 1280px) {
    .availability-shell {
      padding: 1rem;
    }

    .week-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
    }

    .week-selector {
      width: 100%;
      min-width: 0;
    }

    .week-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .day-card {
      min-height: 300px;
    }
  }

  @media (max-width: 640px) {
    .week-grid {
      grid-template-columns: 1fr;
    }

    .week-selector strong {
      font-size: 1.2rem;
    }

    .day-number {
      font-size: 2.4rem;
    }
  }
</style>