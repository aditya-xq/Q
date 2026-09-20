export function startOfDay(d: Date): Date {
    const x = new Date(d.getTime())
    x.setHours(0, 0, 0, 0)
    return x
}

export function startOfWeek(d: Date): Date {
    const x = startOfDay(d)
    const day = x.getDay() // 0 (Sun) - 6
    const diff = (day + 6) % 7 // make Monday start of week
    x.setDate(x.getDate() - diff)
    return x
}

export function isToday(date: Date, now: Date = new Date()): boolean {
    return date.getTime() >= startOfDay(now).getTime()
}

export function isThisWeek(date: Date, now: Date = new Date()): boolean {
    return date.getTime() >= startOfWeek(now).getTime()
}

export function formatRelative(date: Date, now: Date = new Date()): string {
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function formatAutosaveTime(d: Date | null): string {
    if (!d) return ''
    const day = ordinal(d.getDate())
    const month = d.toLocaleString(undefined, { month: 'short' })
    const year = d.getFullYear()
    const time = d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${day} ${month} ${year}, ${time}`
}
