import { parseAsk, cleanFilters, sorts } from '../../src/lib/ask.js'

// AI mode. Plain words in, browse filters out. The model only ever proposes a
// filter set; cleanFilters throws away anything that is not one, and the rules
// parser answers when the model is missing, slow or wrong.
// ponytail: no auth or rate limit. The Workers AI free daily allowance is the
// ceiling; put Turnstile or a sign-in token check here if it gets hammered.

const SYSTEM = `You turn a home search request into JSON filters. Reply with one JSON object and nothing else.
Keys, all optional: priceMax (number), priceMin (number), beds (minimum bedrooms, number), propertyType ("house" | "condo" | "townhouse"), sort (${sorts.map(s => `"${s}"`).join(' | ')}).
"deal" means best value for the money and is the default sort. Apartments and flats are "condo". Only use a number the request states. Words like cheap or affordable set no price. Omit a key rather than guess.`

export async function onRequestPost({ request, env }) {
  let q = ''
  try { q = String((await request.json()).q || '').slice(0, 200).trim() } catch {}
  if (!q) return Response.json({ error: 'q required' }, { status: 400 })

  const rules = parseAsk(q)
  if (!env.AI) return Response.json({ filters: rules, by: 'rules' })
  try {
    const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: q }],
      max_tokens: 120,
      temperature: 0
    })
    const text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response)
    const ai = cleanFilters(JSON.parse(text.match(/\{[\s\S]*\}/)[0]))
    return Response.json({ filters: { ...rules, ...ai }, by: 'ai' })
  } catch {
    return Response.json({ filters: rules, by: 'rules' })
  }
}
