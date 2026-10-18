import { callTool, ToolError } from '../../src/lib/tools.js'

// GET /api/deals?place=Vancouver&mode=rent&beds=2&maxPrice=3000&type=condo&sort=deal&limit=10
// Or ?q=2 bed under 2500, best value  (plain words, same as the ask bar).
export async function onRequestGet({ request, env }) {
  const q = Object.fromEntries(new URL(request.url).searchParams)
  try {
    const out = q.q ? await callTool(env, 'ask_atlin', { ...q, question: q.q }) : await callTool(env, 'search_deals', q)
    return Response.json(out, { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } })
  } catch (err) {
    if (err instanceof ToolError) return Response.json({ error: err.message }, { status: 400 })
    throw err
  }
}
