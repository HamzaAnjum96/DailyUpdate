// Card types.
// code: header badge · section: cover/section name · meter: default label for a 0–5 meter · icon: 14x14 SVG
// square / key: how the type shows in the cover's at-a-glance grid and its legend
export const TYPES = {
  transport: { code: 'TRN', section: 'Transport', meter: 'IMPACT', square: 'f-ink s-hot', key: 'k-trn', icon: '<path d="M3 3l8 8M11 5v6H5" class="i-s"/>' },
  news: { code: 'NWS', section: 'News', meter: 'SIGNAL', square: 'f-paper', key: 'k-nws', icon: '<path d="M2 12h2V9H2zM6 12h2V6H6zM10 12h2V3h-2z" class="i-f"/>' },
  sale: { code: 'SAL', section: 'Sales', meter: 'DEPTH', square: 'f-ink s-stop', key: 'k-sal', icon: '<path d="M3 11l8-8" class="i-s"/><circle cx="4" cy="4" r="1.6" class="i-s"/><circle cx="10" cy="10" r="1.6" class="i-s"/>' },
  event: { code: 'EVT', section: 'Events', meter: 'PULL', square: 'f-hot', key: 'k-evt', icon: '<path d="M2.5 4.5h9v7h-9zM2.5 7h9M5 2.5v3M9 2.5v3" class="i-s"/>' },
};

export const TYPE_ORDER = Object.keys(TYPES);

// Order of the squares within a day of the at-a-glance grid.
export const GLANCE_ORDER = ['event', 'news', 'sale', 'transport'];
