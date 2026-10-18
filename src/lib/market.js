// Per-country market shape: what a home costs, what it's priced in, and whether
// the country talks in square feet. Countries missing from a table take the
// default, so browsing an unlisted country still works.
// ponytail: static tables. Swap for a live index when there is a real feed.

// ISO 3166-1 alpha-2 -> ISO 4217. Only the currencies we can plausibly show.
const currencies = {
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', PT: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', GR: 'EUR', FI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SK: 'EUR',
  SI: 'EUR', HR: 'EUR', CY: 'EUR', MT: 'EUR', LU: 'EUR',
  CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', BG: 'BGN', RS: 'RSD', UA: 'UAH', RU: 'RUB', TR: 'TRY',
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', IL: 'ILS', JO: 'JOD',
  EG: 'EGP', MA: 'MAD', TN: 'TND', ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS', TZ: 'TZS',
  IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
  CN: 'CNY', HK: 'HKD', TW: 'TWD', JP: 'JPY', KR: 'KRW', SG: 'SGD', MY: 'MYR', TH: 'THB',
  VN: 'VND', ID: 'IDR', PH: 'PHP', KH: 'KHR',
  AU: 'AUD', NZ: 'NZD', FJ: 'FJD'
}

// Rough cost of a mid-market home relative to a 1.0 baseline (~USD 400k).
// Deliberately coarse: it sets the order of magnitude, not an appraisal.
const priceLevel = {
  US: 1.05, CA: 1.35, MX: 0.35, BR: 0.30, AR: 0.20, CL: 0.35, CO: 0.20, PE: 0.22,
  GB: 1.30, IE: 1.10, FR: 0.95, DE: 1.00, ES: 0.70, PT: 0.70, IT: 0.70, NL: 1.20,
  BE: 0.90, AT: 1.05, GR: 0.50, FI: 0.75, PL: 0.45, CZ: 0.60, HU: 0.40, RO: 0.35,
  BG: 0.30, RS: 0.30, UA: 0.20, RU: 0.30, TR: 0.30, CH: 2.20, NO: 1.20, SE: 0.95,
  DK: 1.05, IS: 1.10,
  AE: 0.90, SA: 0.45, QA: 0.80, KW: 0.90, IL: 1.40, EG: 0.15, MA: 0.20, ZA: 0.20,
  NG: 0.15, KE: 0.15, GH: 0.12,
  IN: 0.18, PK: 0.10, BD: 0.12, LK: 0.12, NP: 0.12,
  CN: 0.90, HK: 3.20, TW: 1.10, JP: 0.85, KR: 1.20, SG: 2.60, MY: 0.25, TH: 0.30,
  VN: 0.25, ID: 0.20, PH: 0.20,
  AU: 1.50, NZ: 1.30
}

// Annual rent as a share of value. Cheap-to-buy markets rent proportionally
// higher, so this is not one global number.
const grossYield = {
  US: 0.062, CA: 0.045, GB: 0.048, DE: 0.035, FR: 0.038, ES: 0.055, IT: 0.050,
  CH: 0.030, JP: 0.045, KR: 0.030, CN: 0.020, HK: 0.024, SG: 0.030, TW: 0.022,
  AU: 0.042, NZ: 0.038, IN: 0.030, PK: 0.045, BR: 0.060, MX: 0.070, AR: 0.055,
  ZA: 0.090, NG: 0.085, KE: 0.080, EG: 0.075, TR: 0.055, RU: 0.055, UA: 0.070,
  PL: 0.055, TH: 0.055, VN: 0.040, ID: 0.055, PH: 0.060, MY: 0.045, AE: 0.075
}

// Countries that quote floor area in square feet rather than square metres.
const imperialArea = new Set(['US', 'CA', 'GB', 'IN', 'HK', 'SG', 'PK', 'BD', 'MY', 'LK', 'NP', 'GH', 'NG'])

const DEFAULT = { currency: 'USD', level: 0.5, yield: 0.06 }

// Landing-page stats, counted off the tables above so they cannot go stale.
export const coverage = {
  countries: Object.keys(currencies).length,
  currencies: new Set(Object.values(currencies)).size
}

export function marketFor(countryCode = '') {
  const cc = countryCode.toUpperCase()
  return {
    countryCode: cc,
    currency: currencies[cc] || DEFAULT.currency,
    level: priceLevel[cc] ?? DEFAULT.level,
    grossYield: grossYield[cc] ?? DEFAULT.yield,
    imperial: imperialArea.has(cc)
  }
}

// Currencies with no minor unit: printing "¥1,200,000.00" is wrong.
const zeroDecimal = new Set(['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'ISK', 'HUF', 'TWD'])

export function formatMoney(amount, currency, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(zeroDecimal.has(currency) ? Math.round(amount) : amount)
}

// Compact price for map pins: "$1.2M", "¥8,500万" style comes free from Intl.
export function formatMoneyCompact(amount, currency, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currencyDisplay: 'narrowSymbol',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount)
}

export function formatArea(sqft, imperial, locale) {
  const value = imperial ? sqft : Math.round(sqft * 0.092903)
  const unit = imperial ? 'foot' : 'meter'
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 0
  }).format(value) + '²'
}
