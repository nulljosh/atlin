// WebMCP tool registration. Exposes brick's search, favourites and filter
// actions to in-browser agents via document.modelContext.
//
// ponytail: search reuses filterListings, the same function the Listings page
// renders from, so a tool result can never drift from what the user sees.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlace } from '../context/PlaceContext'
import { filterListings } from './filterListings'
import { useFavorites } from '../context/FavoritesContext'
import { useFilters } from '../context/FiltersContext'

const FILTER_KEYS = ['priceMin', 'priceMax', 'beds', 'propertyType', 'sort', 'favoritesOnly']

function buildTools(get) {
  return [
    // ---- read-only -------------------------------------------------------
    {
      name: 'search_listings',
      description: 'Search property listings. Any filter left out falls back to the value currently set in the UI.',
      inputSchema: {
        type: 'object',
        properties: {
          priceMin: { type: 'number', description: 'Minimum price' },
          priceMax: { type: 'number', description: 'Maximum price' },
          beds: { type: 'number', description: 'Minimum bedrooms' },
          propertyType: { type: 'string', description: 'Property type, or "all"' },
          favoritesOnly: { type: 'boolean', description: 'Only listings the user favourited' },
          sort: { type: 'string', enum: ['price-asc', 'price-desc', 'newest', 'sqft-desc'], description: 'Sort order' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
      execute: async ({ limit = 20, ...overrides } = {}) => {
        const { filters, favoriteSet } = get()
        const merged = { ...filters, ...overrides }
        const results = filterListings(ref.current.listings, merged, favoriteSet)
        return { total: results.length, listings: results.slice(0, limit) }
      },
    },
    {
      name: 'get_listing',
      description: 'Get the full record for one listing by id.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Listing id from search_listings' } },
        required: ['id'],
      },
      execute: async ({ id }) => {
        const listing = ref.current.listings.find(l => String(l.id) === String(id))
        if (!listing) return { error: `No listing with id "${id}"` }
        return { ...listing, isFavorite: get().isFavorite(listing.id) }
      },
    },
    {
      name: 'get_favorites',
      description: 'List the listings the user has favourited.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const { favoriteSet } = get()
        return { listings: ref.current.listings.filter(l => favoriteSet.has(l.id)) }
      },
    },
    {
      name: 'get_filters',
      description: 'Get the search filters currently applied in the UI.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => get().filters,
    },

    // ---- reversible state changes ----------------------------------------
    {
      name: 'toggle_favorite',
      description: "Add or remove a listing from the user's favourites.",
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Listing id' } },
        required: ['id'],
      },
      execute: async ({ id }) => {
        const listing = ref.current.listings.find(l => String(l.id) === String(id))
        if (!listing) return { error: `No listing with id "${id}"` }
        get().toggle(listing.id)
        return { id: listing.id, isFavorite: !get().isFavorite(listing.id) }
      },
    },
    {
      name: 'set_filters',
      description: 'Apply search filters to the UI so the user sees the same results.',
      inputSchema: {
        type: 'object',
        properties: {
          priceMin: { type: 'number' },
          priceMax: { type: 'number' },
          beds: { type: 'number', description: 'Minimum bedrooms' },
          propertyType: { type: 'string', description: 'Property type, or "all"' },
          sort: { type: 'string', enum: ['price-asc', 'price-desc', 'newest', 'sqft-desc'] },
          favoritesOnly: { type: 'boolean' },
        },
      },
      execute: async (args = {}) => {
        const { updateFilter } = get()
        const applied = {}
        for (const key of FILTER_KEYS) {
          if (args[key] !== undefined) { updateFilter(key, args[key]); applied[key] = args[key] }
        }
        return { applied }
      },
    },
    {
      name: 'reset_filters',
      description: 'Clear every search filter back to its default.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => { get().resetFilters(); return { reset: true } },
    },
    {
      name: 'open_listing',
      description: 'Navigate the app to a listing detail page so the user is looking at it.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'Listing id' } },
        required: ['id'],
      },
      execute: async ({ id }) => { get().navigate(`/listing/${id}`); return { opened: id } },
    },
  ]
}

export function WebMCP() {
  const { listings } = usePlace()
  const favorites = useFavorites()
  const filters = useFilters()
  const navigate = useNavigate()

  const ref = useRef(null)
  // The tools are registered once; the ref keeps them reading the place the
  // user is browsing right now rather than the one they started on.
  ref.current = { ...favorites, ...filters, navigate, listings }

  useEffect(() => {
    const mc = document.modelContext
    if (!mc?.registerTool) return // browser without WebMCP support
    let cancelled = false
    const registered = []

    ;(async () => {
      for (const tool of buildTools(() => ref.current)) {
        if (cancelled) return
        try {
          registered.push(await mc.registerTool(tool))
        } catch (err) {
          console.warn('[webmcp] failed to register', tool.name, err?.message)
        }
      }
    })()

    return () => {
      cancelled = true
      for (const h of registered) { try { h?.unregister?.() } catch { /* gone already */ } }
    }
  }, [])

  return null
}
