import { createClient } from './spark-client.js'

// Accounts live in the spark-api Worker (Cloudflare D1), so there is nothing to configure or leave out.
export const spark = createClient(import.meta.env.VITE_API_URL || 'https://api.jaybulb.com')
export const authConfigured = true
