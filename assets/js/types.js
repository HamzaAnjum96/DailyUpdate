// Card types, in the order the deck and the cover contents list them.
// code: header badge · section: cover/section name · meter: default label for a 0–5 meter · icon: 14x14 SVG
export const TYPES = {
  transport: { code: 'TRN', section: 'Transport', meter: 'IMPACT', icon: '<path d="M3 3l8 8M11 5v6H5" class="i-s"/>' },
  news: { code: 'NWS', section: 'News', meter: 'SIGNAL', icon: '<path d="M2 12h2V9H2zM6 12h2V6H6zM10 12h2V3h-2z" class="i-f"/>' },
  sale: { code: 'SAL', section: 'Sales', meter: 'DEPTH', icon: '<path d="M3 11l8-8" class="i-s"/><circle cx="4" cy="4" r="1.6" class="i-s"/><circle cx="10" cy="10" r="1.6" class="i-s"/>' },
  event: { code: 'EVT', section: 'Events', meter: 'PULL', icon: '<path d="M2.5 4.5h9v7h-9zM2.5 7h9M5 2.5v3M9 2.5v3" class="i-s"/>' },
};

export const TYPE_ORDER = Object.keys(TYPES);
