// Solo mode: the "kopitiam" plays Psychic. Each card has clues placed on a 0–100 scale
// (0 = fully left end, 100 = fully right end). These are house opinions, so argue lah.
export const SOLO_PACK = [
  { card: ['Not spicy at all', 'Chilli padi level'], clues: [['Ice kachang', 2], ['Chilli crab', 45], ['Laksa', 55], ['Sambal stingray', 76], ['Da la mala xiang guo', 95], ['Kaya toast', 4]] },
  { card: ['Healthy', 'Sinful'], clues: [['Thunder tea rice', 8], ['Yong tau foo soup', 18], ['Sliced fish soup', 22], ['Roti prata with curry', 72], ['Black carrot cake', 80], ['Char kway teow', 93]] },
  { card: ['Cheap', 'Wah, so ex'], clues: [['Kopi at a kopitiam', 5], ['Chicken rice', 15], ['Bubble tea', 32], ['Peak-hour taxi with surcharge', 55], ['Chilli crab at a seafood restaurant', 75], ['A COE', 98]] },
  { card: ['Relaxing', 'Stressful'], clues: [['Morning walk at MacRitchie', 8], ['Lepak at the void deck', 10], ['CNY visiting with nosy relatives', 68], ['Waiting for BTO ballot results', 80], ['Finding parking at Orchard on Saturday', 86], ['PSLE results day', 95]] },
  { card: ['Tourist trap', 'Local secret'], clues: [['Merlion Park', 5], ['Gardens by the Bay', 15], ['Clarke Quay bars', 25], ['Haw Par Villa', 55], ['Old-school kopitiam in Tiong Bahru', 62], ['Lim Chu Kang farms', 86]] },
  { card: ['Old Singapore', 'New Singapore'], clues: [['Kampung houses', 3], ['Rediffusion radio', 6], ['Dragon playground', 15], ['Marble-top kopitiam tables', 22], ['Self-checkout at the supermarket', 80], ['Jewel waterfall', 95]] },
  { card: ['Breakfast', 'Supper'], clues: [['Kaya toast and soft-boiled eggs', 5], ['Chwee kueh', 14], ['Fish porridge', 25], ['Nasi lemak', 32], ['Bak kut teh', 50], ['Mee goreng at a mamak stall at 1am', 90]] },
  { card: ['Acceptable on the MRT', 'Unacceptable on the MRT'], clues: [['Giving up your seat to an auntie', 0], ['Reading a book', 4], ['Taking a loud phone call', 65], ['Hugging the pole', 72], ['Drinking bubble tea', 85], ['Watching TikTok without earphones', 92], ['Eating durian', 100]] },
  { card: ['Kiasu', 'Chill'], clues: [['Five tuition classes for a P1 kid', 3], ['Queueing overnight for a new phone', 6], ['Stockpiling toilet paper', 9], ['Choping a seat with a tissue packet', 18], ['Going with the flow on holiday', 82], ['Reaching the airport 30 minutes before the flight', 95]] },
  { card: ['Shiok', 'Sian'], clues: [['Air-con after walking in the sun', 5], ['Friday at 6pm', 10], ['Cold Milo after a run', 12], ['IPPT', 72], ['Monday morning', 88], ['Haze season', 92], ['MRT breakdown during rush hour', 96]] },
  { card: ['Very Singaporean', 'Not Singaporean at all'], clues: [['Saying "can" to everything', 3], ['Choping seats', 4], ['Eating with chopsticks', 40], ['Tipping at a hawker stall', 90], ['Thanksgiving dinner', 94], ['Snowball fight', 98]] },
  { card: ['Good first date spot', 'Bad first date spot'], clues: [['Rooftop bar at sunset', 10], ['Botanic Gardens picnic', 12], ['Movie at the cinema', 30], ['Hawker centre', 45], ['Durian stall', 75], ['Army camp open house', 90]] },
  { card: ['Kopitiam drink', 'Café drink'], clues: [['Kopi O', 0], ['Barley water', 8], ['Bandung', 12], ['Teh tarik', 10], ['Milo Dinosaur', 18], ['Iced long black', 80], ['Matcha latte', 92], ['Oat flat white', 100]] },
  { card: ['Useful at a void deck', 'Useless at a void deck'], clues: [['Stone chess table', 4], ['Wedding tent', 10], ['Mosquito repellent', 18], ['Bicycle', 25], ['Ski boots', 98], ['Surfboard', 96]] },
  { card: ['Ah Ma would love it', 'Ah Ma would scold'], clues: [['Coming home for dinner', 2], ['Bringing her kueh', 5], ['Getting married', 6], ['Spending $8 on coffee', 78], ['Dyeing your hair blue', 85], ['Getting a tattoo', 90], ['Wasting rice', 98]] },
  { card: ['Fragrant', 'Pungent'], clues: [['Pandan cake', 5], ['Fresh kaya', 10], ['Satay on the grill', 20], ['Durian', 68], ['Belacan frying', 85], ['Stinky tofu', 95]] },
  { card: ['Wholesome', 'Chaotic'], clues: [['Sunrise hike at Bukit Timah', 8], ['Family picnic at East Coast', 10], ['Void deck wedding', 48], ['Pasar malam on Saturday night', 62], ['CNY gathering with 40 relatives', 76], ['Club on a Saturday night', 90]] },
  { card: ['Low effort', 'High effort'], clues: [['Ordering food delivery', 4], ['Cooking instant noodles', 8], ['Packing for a holiday', 45], ['Cooking a reunion dinner', 88], ['BTO renovation', 92], ['Kueh lapis from scratch', 95]] },
  { card: ['Can tahan without air-con', 'Must have air-con'], clues: [['Morning jog', 5], ['Kopitiam lunch', 12], ['Hawker centre at noon in May', 50], ['Working from home', 70], ['Sleeping at night', 76], ['Lecture hall', 88], ['Wedding banquet', 95]] },
  { card: ['Wet market', 'Supermarket'], clues: [['Bargaining', 0], ['Live fish', 5], ['Fresh kueh', 20], ['Fish balls', 40], ['Imported strawberries', 85], ['Toilet paper', 90], ['Frozen pizza', 96]] },
  { card: ['Snack', 'Full meal'], clues: [['Kueh', 5], ['Curry puff', 10], ['Ice kachang', 15], ['One plain prata', 35], ['Popiah', 40], ['Chicken rice', 80], ['Nasi padang with four dishes', 95]] },
  { card: ['Real sport', 'Not a sport'], clues: [['Football', 0], ['Dragon boating', 3], ['Sepak takraw', 5], ['Esports', 60], ['Mahjong', 80], ['Running for the bus', 90], ['Choping seats', 98]] },
  { card: ['Childish', 'Mature'], clues: [['Dragon playground', 10], ['Hello Kitty plushie', 15], ['Collecting fast-food toys', 20], ['Playing Pokémon Go', 35], ['Arguing about the best chicken rice', 50], ['Checking your CPF statement', 92], ['Buying insurance', 95]] },
  { card: ['Feels like holiday', 'Feels like Monday'], clues: [['Long weekend', 4], ['Staycation', 10], ['Work-from-home Friday', 25], ['Errands at a government office', 78], ['Reservist call-up', 86], ['MRT on Monday morning', 98]] },
  { card: ['Easy to find parking', 'Good luck finding parking'], clues: [['Industrial estate on Sunday', 5], ['Neighbourhood hawker on a weekday afternoon', 30], ['HDB carpark at midnight', 70], ['Jewel on the weekend', 86], ['Tekka Market on Sunday morning', 90], ['Orchard on Saturday', 96]] },
  { card: ['Romantic', 'Unromantic'], clues: [['Candlelight dinner', 2], ['Sunset at Marina Barrage', 5], ['"Want to BTO together?"', 40], ['Sharing a durian', 55], ['Splitting the bill to the cent', 80], ['Insurance policy as a Valentine\'s gift', 95]] },
  { card: ['Necessity in Singapore', 'Luxury in Singapore'], clues: [['Mobile phone', 3], ['Umbrella', 5], ['Air-con', 15], ['Car', 75], ['Golf club membership', 95], ['Landed property', 97]] },
  { card: ['Fast', 'Slow'], clues: [['Tapping your card at the gantry', 5], ['Hawker auntie taking your order', 10], ['MRT', 25], ['Lift in a 40-storey HDB at 8am', 75], ['Queue at a government counter', 80], ['BTO waiting time', 100]] },
];

export const SOLO_ROUNDS = 10;

export function soloRank(score, max) {
  const p = score / max;
  if (p >= 0.85) return { title: 'Agak Master', line: 'You and the kopitiam think alike. Steady pom pi pi!' };
  if (p >= 0.65) return { title: 'Steady lah', line: 'Very good agak. Almost can read minds.' };
  if (p >= 0.45) return { title: 'Can lah', line: 'Not bad, not bad. Some cards confirm got debate.' };
  if (p >= 0.25) return { title: 'Blur like sotong', line: 'Half the time on the wrong side of the dial. Try again?' };
  return { title: 'Aiyo…', line: 'Are you sure you live here? Kidding lah, one more round.' };
}
