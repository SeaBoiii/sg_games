// Game registry for the SG Games hub.
// To add a game: drop it in /games/<slug>/ and add an entry here.
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
