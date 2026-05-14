function toCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function googleCalendarUrl(params: {
  title: string
  start: Date
  durationMinutes?: number
  description?: string
}): string {
  const end = new Date(params.start.getTime() + (params.durationMinutes ?? 60) * 60000)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${toCalDate(params.start)}/${toCalDate(end)}`,
    details: params.description ?? '',
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function downloadICS(params: {
  title: string
  start: Date
  durationMinutes?: number
  description?: string
  filename?: string
}) {
  const end = new Date(params.start.getTime() + (params.durationMinutes ?? 60) * 60000)
  const uid = `bestie-${Date.now()}@bestiehere.com`
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bestie//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${toCalDate(params.start)}`,
    `DTEND:${toCalDate(end)}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${(params.description ?? '').replace(/\n/g, '\\n')}`,
    `DTSTAMP:${toCalDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = params.filename ?? 'session.ics'
  a.click()
  URL.revokeObjectURL(url)
}
