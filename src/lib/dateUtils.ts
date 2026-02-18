const weekdayFormatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short'
});

const monthFormatter = new Intl.DateTimeFormat('it-IT', {
  month: 'short'
});

export type WeekDay = {
  date: Date;
  key: string;
  dayNumber: number;
  label: string;
  isWeekend: boolean;
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeek(reference = new Date()): Date {
  const date = new Date(reference);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekByOffset(offset = 0, reference = new Date()): WeekDay[] {
  const firstDay = startOfWeek(reference);
  firstDay.setDate(firstDay.getDate() + offset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(firstDay);
    current.setDate(firstDay.getDate() + index);
    const weekday = weekdayFormatter.format(current).replace('.', '');
    const dayOfWeek = current.getDay();

    return {
      date: current,
      key: toDateKey(current),
      dayNumber: current.getDate(),
      label: weekday.toUpperCase(),
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6
    };
  });
}

export function formatWeekRange(days: WeekDay[]): string {
  if (!days.length) return '';

  const start = days[0].date;
  const end = days[days.length - 1].date;
  const startMonth = monthFormatter.format(start);
  const endMonth = monthFormatter.format(end);

  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} - ${end.getDate()} ${endMonth}`;
  }

  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
}
