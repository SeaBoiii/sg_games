// Game registry for the SG Games hub.
// To add a game: drop it in /games/<slug>/ and add an entry here, above the two
// permanent "coming soon" cards at the end.
export const GAMES = [
  {
    slug: 'agak-agak',
    title: 'Agak Agak',
    tagline: 'How close can you agak?',
    blurb:
      'Spin the wheel, give one clue, and get your kakis to guess the hidden spot between Shiok and Sian. Singapore edition, pass-and-play on one screen.',
    tags: ['2 teams', '4–12 players', 'Pass & play', '20–45 min'],
    accent: '#D7263D',
    art: 'dial',
    links: [
      { label: 'Play', href: 'games/agak-agak/', primary: true },
      { label: 'Play in 3D', href: 'games/agak-agak/3d/', badge: 'New' },
    ],
    status: 'live',
  },
  {
    slug: 'chope-wars',
    title: 'Chope Wars',
    tagline: 'One tissue packet at a time',
    blurb:
      'Lunchtime at the hawker centre. Drop tissue packets on stools, win tables under the fan, and call the cleaner auntie when you need to. 2 players on one screen, or solo against Uncle Lim.',
    tags: ['2 players', 'Solo vs CPU', 'Pass & play', '5–10 min'],
    accent: '#E0457B',
    art: 'chope',
    links: [
      { label: 'Play', href: 'games/chope-wars/', primary: true },
      { label: 'Play in 3D', href: 'games/chope-wars/3d/', badge: 'New' },
    ],
    status: 'live',
  },
  {
    slug: 'mrt-rush',
    title: 'MRT Rush',
    tagline: 'Move in, please',
    blurb:
      'Peak hour on a (fictional) MRT line. Pack commuters into the carriage before the doors close, keep the doorway clear, and give the uncles a seat. Three lines, from easy to rush hour.',
    tags: ['Solo', 'Puzzle', 'Short levels', '3–6 min'],
    accent: '#7FA82E',
    art: 'mrt',
    links: [
      { label: 'Play', href: 'games/mrt-rush/', primary: true },
      { label: 'Play in 3D', href: 'games/mrt-rush/3d/', badge: 'New' },
    ],
    status: 'live',
  },
  {
    slug: 'kopi-master',
    title: 'Kopi Master',
    tagline: 'Kopi C siew dai peng!',
    blurb:
      'Run the drinks stall at the kopitiam. Customers order in real kopitiam lingo; build each kopi, teh or Milo before they lose patience. Learn what O, C, siew dai and peng mean along the way.',
    tags: ['Solo', 'Speed', 'Learn the lingo', '2–4 min'],
    accent: '#6B3E26',
    art: 'kopi',
    links: [
      { label: 'Play', href: 'games/kopi-master/', primary: true },
      { label: 'Play in 3D', href: 'games/kopi-master/3d/', badge: 'New' },
    ],
    status: 'live',
  },
  {
    slug: 'pasar-malam',
    title: 'Pasar Malam Haggle',
    tagline: 'Last price, can?',
    blurb:
      'Bargain your way down a night market. Every stallholder has a secret lowest price and only so much patience. Offer, walk away, and grab the deal before they chase you off.',
    tags: ['Solo', '2 players', 'Bargaining', '5–8 min'],
    accent: '#3A2A5E',
    art: 'pasar',
    links: [
      { label: 'Play', href: 'games/pasar-malam/', primary: true },
      { label: 'Play in 3D', href: 'games/pasar-malam/3d/', badge: 'New' },
    ],
    status: 'live',
  },
  {
    slug: 'marina-golf',
    title: 'Marina Mini Golf',
    tagline: 'Fore lah!',
    blurb:
      'Nine holes of mini golf around the island. Putt past the Merlion, through the Supertrees, round the MRT train and under the SkyPark. Fewest strokes wins.',
    tags: ['Solo', '2–4 players', 'Physics', '5–15 min'],
    accent: '#1E9E62',
    art: 'golf',
    links: [
      { label: 'Play', href: 'games/marina-golf/', primary: true },
      { label: 'Play in 3D', href: 'games/marina-golf/3d/', badge: 'New' },
    ],
    status: 'live',
  },
  // The two "coming soon" cards below are permanent: keep them last, after every real game.
  {
    slug: 'coming-soon-1',
    title: 'Next game cooking…',
    tagline: 'Still in the wok',
    blurb: 'More party games for your kopitiam table are on the way. Chope a seat first.',
    tags: ['Coming soon'],
    accent: '#1F8A8A',
    art: 'wok',
    status: 'soon',
  },
  {
    slug: 'coming-soon-2',
    title: 'Got idea?',
    tagline: 'Your game here',
    blurb: 'Every game lives in its own folder under /games, so adding a new one is just one entry in the registry.',
    tags: ['Coming soon'],
    accent: '#F2B134',
    art: 'tissue',
    status: 'soon',
  },
];
