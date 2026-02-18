const formatter = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long'
});

export type WeekDay = {
  date: Date;
  key: string;
  dayNumber: number;
  label: string;
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentWeek(reference = new Date()): WeekDay[] {
  const date = new Date(reference);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(date);
    current.setDate(date.getDate() + index);
    const weekday = formatter.format(current);
    return {
      date: current,
      key: toDateKey(current),
      dayNumber: current.getDate(),
      label: weekday.charAt(0).toUpperCase() + weekday.slice(1)
    };
  });
}
