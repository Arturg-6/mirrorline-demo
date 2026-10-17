// Demo data. Everything here is simulated - no live account is touched.

var CHANNELS = [
  {
    id: "abnb", name: "Airbnb", letter: "A", color: "#ff5a5f", mode: "API", delay: 600,
    sub: "Connected via BEDS24 Airbnb API",
    rows: [["Listings mapped", "3 / 3"], ["Rates", "Daily, from hub"], ["Min stay", "Synced"], ["Booking import", "Instant"]]
  },
  {
    id: "exp", name: "Expedia", letter: "E", color: "#ffd166", mode: "API", delay: 900,
    sub: "Expedia EQC through BEDS24",
    rows: [["Room types", "3 / 3"], ["Rate plans", "Standard + NR"], ["Restrictions", "CTA / CTD"], ["Booking import", "Instant"]]
  },
  {
    id: "vrbo", name: "Vrbo", letter: "V", color: "#5aa9ff", mode: "API", delay: 1300,
    sub: "Vrbo channel inside BEDS24",
    rows: [["Units mapped", "3 / 3"], ["Rates", "Daily, from hub"], ["Fees", "Cleaning mapped"], ["Booking import", "Instant"]]
  },
  {
    id: "trip", name: "Trip.com", letter: "T", color: "#9b8cff", mode: "API", delay: 1700,
    sub: "Trip.com connection via BEDS24",
    rows: [["Rooms mapped", "3 / 3"], ["Rates", "Daily, from hub"], ["Currency", "EUR"], ["Booking import", "~1 min"]]
  }
];

var PROPERTIES = [
  { id: "p1", name: "Sea Loft", base: 145, img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ff6a3d'/><stop offset='1' stop-color='%235aa9ff'/></linearGradient></defs><rect width='60' height='60' fill='url(%23g)'/><path d='M14 44V28l16-12 16 12v16z' fill='%23fff4ec' opacity='.9'/><rect x='26' y='33' width='8' height='11' fill='%23ff6a3d'/></svg>" },
  { id: "p2", name: "Garden Villa", base: 230, img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%237cf2c6'/><stop offset='1' stop-color='%232c6e49'/></linearGradient></defs><rect width='60' height='60' fill='url(%23g)'/><path d='M14 44V28l16-12 16 12v16z' fill='%23f2fff9' opacity='.9'/><rect x='26' y='33' width='8' height='11' fill='%237cf2c6'/></svg>" },
  { id: "p3", name: "Old Town Flat", base: 98, img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%239b8cff'/><stop offset='1' stop-color='%23ffd166'/></linearGradient></defs><rect width='60' height='60' fill='url(%23g)'/><path d='M14 44V28l16-12 16 12v16z' fill='%23fbf8ff' opacity='.9'/><rect x='26' y='33' width='8' height='11' fill='%239b8cff'/></svg>" }
];

var RUNBOOK = [
  {
    tag: "Sync",
    q: "A channel shows the wrong price",
    a: [
      "Open the property in BEDS24 and check the daily price for that night first. The hub is always right.",
      "Go to <code>Settings &gt; Channel Manager &gt; [channel]</code> and confirm the rate plan is linked to the correct price row.",
      "Check any channel price multiplier or fixed adjustment set on the channel page.",
      "Use the channel's <code>Sync now</code> / resend option, then reload the OTA extranet after a few minutes."
    ]
  },
  {
    tag: "Sync",
    q: "Nights are open on an OTA but booked in BEDS24",
    a: [
      "Confirm the room is mapped to the right listing ID - an unmapped room never sends availability.",
      "Look for a manual block or override set directly on the OTA extranet and remove it.",
      "If the channel is on iCal (not API), remember iCal only refreshes on a schedule. Move it to API where the channel allows it."
    ]
  },
  {
    tag: "Bookings",
    q: "A booking did not arrive in BEDS24",
    a: [
      "Search BEDS24 bookings by the OTA reference number, including cancelled ones.",
      "Check the channel's error / notification log in BEDS24 for a rejected import (usually unmapped room or rate).",
      "Fix the mapping, then request the booking again from the channel or add it manually with the OTA reference."
    ]
  },
  {
    tag: "Growth",
    q: "Adding a new listing safely",
    a: [
      "Create the room in BEDS24 first, with prices, min stay and max guests filled in.",
      "Create or connect the listing on the OTA, then map it in the BEDS24 channel page. Use one clear name in both places.",
      "Push availability and rates, wait for the OTA to accept, and only then open the listing for sale.",
      "Run one test booking and one cancellation, exactly like the test lab above."
    ]
  },
  {
    tag: "Safety",
    q: "Avoiding double bookings",
    a: [
      "Never edit availability on the OTA side - only change it in BEDS24.",
      "Keep one connection type per channel per room. API and iCal on the same room is the classic cause of overbookings.",
      "Set a sensible booking cut-off for same-day arrivals on slower channels."
    ]
  }
];
