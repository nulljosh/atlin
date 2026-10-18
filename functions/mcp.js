// Stateless MCP over HTTP: JSON-RPC in, JSON-RPC out, no sessions. Same transport as quotestreak.
// The tools live in src/lib/tools.js, shared with /api/deals.

import { callTool, ToolError, TOOLS } from '../src/lib/tools.js'

const VERSION = '1.0.0'
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, mcp-protocol-version',
  'access-control-allow-methods': 'GET, POST, OPTIONS'
}
const json = (body, init = {}) => new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...CORS, ...init.headers } })

export async function onRequest({ request: req, env }) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST JSON-RPC to this endpoint' }, { status: 405 })

  let msg
  try { msg = await req.json() } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 }) }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }, { status: 400 })

  const { id = null, method } = msg
  const params = msg.params && typeof msg.params === 'object' ? msg.params : {}
  const reply = result => json({ jsonrpc: '2.0', id, result })

  switch (method) {
    case 'initialize':
      return reply({ protocolVersion: params.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'atlin', version: VERSION } })
    case 'notifications/initialized':
      return new Response(null, { status: 202, headers: CORS })
    case 'ping':
      return reply({})
    case 'tools/list':
      return reply({ tools: TOOLS })
    case 'tools/call': {
      let result
      try {
        result = await callTool(env, params.name, params.arguments || {})
      } catch (err) {
        if (err instanceof ToolError) return reply({ content: [{ type: 'text', text: `atlin: ${err.message}` }], isError: true })
        throw err
      }
      if (!result) return json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown tool: ${params.name}` } })
      return reply({ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result })
    }
    default:
      return json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } })
  }
}
