// Email body builders for change-alert notifications.
// Plain text + minimal HTML — keeps deliverability scores high and avoids
// the maintenance cost of a templating engine. Both bodies include the
// project's standard disclaimer (per CLAUDE.md) and an unsubscribe link.

import { signUnsubscribeToken } from '@/lib/unsubscribe-token'

const DISCLAIMER =
  'This summary is for informational purposes only and is not legal advice. ' +
  'Always verify requirements using official municipal sources and consult a ' +
  'qualified attorney for high-stakes decisions.'

interface RuleDiffSummary {
  added: string[]
  removed: string[]
  changed: Array<{ ruleKey: string; field: string; from: string; to: string }>
}

export interface MarketEmailContext {
  appBaseUrl: string                    // e.g. "https://app.example.com" — caller passes
  marketName: string
  marketSlug: string
  diff: RuleDiffSummary
  severity: 'low' | 'medium' | 'high' | string
}

export interface PropertyEmailContext extends MarketEmailContext {
  propertyAddress: string
  propertyHref: string                  // pre-built /property?... URL
}

export interface RenderedEmail {
  subject: string
  text: string
  html: string
}

function unsubscribeUrl(appBaseUrl: string, userId: string, secret: string): string {
  const token = signUnsubscribeToken(userId, secret)
  return `${appBaseUrl}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`
}

function diffLines(diff: RuleDiffSummary): string[] {
  const lines: string[] = []
  if (diff.added.length > 0) lines.push(`Added: ${diff.added.join(', ')}`)
  if (diff.removed.length > 0) lines.push(`Removed: ${diff.removed.join(', ')}`)
  for (const c of diff.changed) {
    lines.push(`Changed (${c.ruleKey}.${c.field}): "${c.from}" → "${c.to}"`)
  }
  if (lines.length === 0) lines.push('Top-level compliance status updated.')
  return lines
}

export function renderMarketEmail(
  ctx: MarketEmailContext,
  userId: string,
  unsubscribeSecret: string
): RenderedEmail {
  const subject = `Compliance update: ${ctx.marketName}`
  const lines = diffLines(ctx.diff)
  const marketUrl = `${ctx.appBaseUrl}/market/${encodeURIComponent(ctx.marketSlug)}?from=alert`
  const unsubUrl = unsubscribeUrl(ctx.appBaseUrl, userId, unsubscribeSecret)

  const text = [
    `Rules changed for ${ctx.marketName} (${ctx.severity} severity):`,
    '',
    ...lines.map((l) => `  • ${l}`),
    '',
    `Open the market view: ${marketUrl}`,
    '',
    DISCLAIMER,
    '',
    `Unsubscribe: ${unsubUrl}`,
  ].join('\n')

  const html = [
    `<p>Rules changed for <strong>${escapeHtml(ctx.marketName)}</strong> (<em>${escapeHtml(ctx.severity)}</em> severity):</p>`,
    `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`,
    `<p><a href="${marketUrl}">Open the market view</a></p>`,
    `<p style="font-size:12px;color:#666;">${escapeHtml(DISCLAIMER)}</p>`,
    `<p style="font-size:11px;color:#999;"><a href="${unsubUrl}">Unsubscribe</a></p>`,
  ].join('')

  return { subject, text, html }
}

export function renderPropertyEmail(
  ctx: PropertyEmailContext,
  userId: string,
  unsubscribeSecret: string
): RenderedEmail {
  const subject = `${ctx.propertyAddress} — compliance update`
  const lines = diffLines(ctx.diff)
  const unsubUrl = unsubscribeUrl(ctx.appBaseUrl, userId, unsubscribeSecret)

  const text = [
    `Rules changed in the market governing ${ctx.propertyAddress} (${ctx.severity} severity):`,
    '',
    ...lines.map((l) => `  • ${l}`),
    '',
    `Open the property view: ${ctx.propertyHref}`,
    '',
    DISCLAIMER,
    '',
    `Unsubscribe: ${unsubUrl}`,
  ].join('\n')

  const html = [
    `<p>Rules changed in the market governing <strong>${escapeHtml(ctx.propertyAddress)}</strong> (<em>${escapeHtml(ctx.severity)}</em> severity):</p>`,
    `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`,
    `<p><a href="${ctx.propertyHref}">Open the property view</a></p>`,
    `<p style="font-size:12px;color:#666;">${escapeHtml(DISCLAIMER)}</p>`,
    `<p style="font-size:11px;color:#999;"><a href="${unsubUrl}">Unsubscribe</a></p>`,
  ].join('')

  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
