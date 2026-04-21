// Portuguese national public holidays (mandatory, per Decreto-Lei 2016)
// US federal holidays
// Local/company holidays are passed in from data/config.json

export interface HolidayInfo {
  date: string // YYYY-MM-DD
  name: string
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function computeEaster(year: number): Date {
  // Meeus/Jones/Butcher algorithm
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Returns the nth weekday (1-based) of a given month. e.g. 3rd Monday of January. */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const d = new Date(year, month, 1)
  let count = 0
  while (true) {
    if (d.getDay() === weekday) {
      count++
      if (count === n) return new Date(d)
    }
    d.setDate(d.getDate() + 1)
  }
}

/** Returns the last weekday of a given month. */
function lastWeekday(year: number, month: number, weekday: number): Date {
  const d = new Date(year, month + 1, 0) // last day of month
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1)
  return d
}

// ── Country holiday maps ──────────────────────────────────────────────────────

function getPortugueseHolidayMap(year: number): Map<string, string> {
  const easter = computeEaster(year)
  return new Map<string, string>([
    [`${year}-01-01`, 'Ano Novo'],
    [toISO(addDays(easter, -2)), 'Sexta-feira Santa'],
    [`${year}-04-25`, 'Dia da Liberdade'],
    [`${year}-05-01`, 'Dia do Trabalhador'],
    [toISO(addDays(easter, 60)), 'Corpo de Deus'],
    [`${year}-06-10`, 'Dia de Portugal'],
    [`${year}-08-15`, 'Assunção de Nossa Senhora'],
    [`${year}-10-05`, 'Implantação da República'],
    [`${year}-11-01`, 'Dia de Todos os Santos'],
    [`${year}-12-01`, 'Restauração da Independência'],
    [`${year}-12-08`, 'Imaculada Conceição'],
    [`${year}-12-25`, 'Natal'],
  ])
}

function getUSHolidayMap(year: number): Map<string, string> {
  const mlk = nthWeekday(year, 0, 1, 3)       // 3rd Monday of January
  const presidents = nthWeekday(year, 1, 1, 3) // 3rd Monday of February
  const memorial = lastWeekday(year, 4, 1)      // Last Monday of May
  const labor = nthWeekday(year, 8, 1, 1)       // 1st Monday of September
  const columbus = nthWeekday(year, 9, 1, 2)    // 2nd Monday of October
  const thanksgiving = nthWeekday(year, 10, 4, 4) // 4th Thursday of November

  return new Map<string, string>([
    [`${year}-01-01`, "New Year's Day"],
    [toISO(mlk), 'Martin Luther King Jr. Day'],
    [toISO(presidents), "Presidents' Day"],
    [toISO(memorial), 'Memorial Day'],
    [`${year}-07-04`, 'Independence Day'],
    [toISO(labor), 'Labor Day'],
    [toISO(columbus), 'Columbus Day'],
    [`${year}-11-11`, 'Veterans Day'],
    [toISO(thanksgiving), 'Thanksgiving Day'],
    [`${year}-12-25`, 'Christmas Day'],
  ])
}

// ── Public API ────────────────────────────────────────────────────────────────

interface LocalHolidayInput {
  date: string  // MM-DD
  name: string
}

function filterToSprint(
  allHolidays: Map<string, string>,
  startDate: string,
  endDate: string
): HolidayInfo[] {
  const start = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')
  const result: HolidayInfo[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const dow = cursor.getUTCDay()
    const iso = cursor.toISOString().slice(0, 10)
    if (dow !== 0 && dow !== 6 && allHolidays.has(iso)) {
      result.push({ date: iso, name: allHolidays.get(iso)! })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

/** Returns weekday holidays for a specific country within [startDate, endDate] (inclusive, YYYY-MM-DD). */
export function getHolidaysInSprintForCountry(
  startDate: string,
  endDate: string,
  country: string,
  localHolidays?: LocalHolidayInput[]
): HolidayInfo[] {
  const start = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')
  const allHolidays = new Map<string, string>()

  for (let y = start.getUTCFullYear(); y <= end.getUTCFullYear(); y++) {
    if (country === 'PT') {
      for (const [date, name] of getPortugueseHolidayMap(y)) allHolidays.set(date, name)
      for (const h of (localHolidays ?? [])) allHolidays.set(`${y}-${h.date}`, h.name)
    } else if (country === 'US') {
      for (const [date, name] of getUSHolidayMap(y)) allHolidays.set(date, name)
    }
    // Unknown country → no national holidays
  }

  return filterToSprint(allHolidays, startDate, endDate)
}

/** Backward-compat shorthand: Portuguese holidays only (no local holidays). */
export function getHolidaysInSprint(startDate: string, endDate: string): HolidayInfo[] {
  return getHolidaysInSprintForCountry(startDate, endDate, 'PT')
}

/** Count only — used by calculations. */
export function countHolidaysInSprint(startDate: string, endDate: string): number {
  return getHolidaysInSprint(startDate, endDate).length
}
