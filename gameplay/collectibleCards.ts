import type {CharacterId} from '../types';

export const COLLECTIBLE_CARDS = [
  {id:'xgod-harvest',hero:'xgod',name:'Harvest Hero',series:'Harvest Party',style:'Storybook illustration',value:650,description:'X God dresses up in his autumn best for a Thanksgiving feast.'},
  {id:'kai-turkey',hero:'killer_kai',name:'Gobble Gobble Kai',series:'Harvest Party',style:'Storybook illustration',value:650,description:'The arm cannon stays. Everything else is a wonderfully ridiculous turkey suit.'},
  {id:'nico-pixel',hero:'nico',name:'8-Bit Blastoff',series:'Style Switch',style:'Pixel art',value:200,description:'Nico takes his big launcher into a tiny, colorful arcade universe.'},
  {id:'zgod-watercolor',hero:'zgod',name:'Starlight Daydream',series:'Style Switch',style:'Watercolor',value:300,description:'Z-God skips across a sky washed in pink, gold, and painted stars.'},
  {id:'barrett-noir',hero:'barrett',name:'The Midnight Bear',series:'Style Switch',style:'Noir comic',value:350,description:'A rain-soaked rooftop. A flash of gold. The Bear watches over the city.'},
  {id:'ezra-ink',hero:'ezra',name:'Fire & Brush',series:'Style Switch',style:'Ink wash',value:600,description:'Ezra’s living flames become sweeping vermilion strokes on rice paper.'},
  {id:'xgod-3d',hero:'xgod',name:'X God · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'Lime spikes, crossed eyes, and a blazing blade, brought into a sculpted new dimension.'},
  {id:'kai-3d',hero:'killer_kai',name:'Kai · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'Blue armor and a glowing cyan cannon in a cinematic workshop diorama.'},
  {id:'barrett-3d',hero:'barrett',name:'Barrett · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'The Bear’s enormous claws and wild grin, sculpted in glorious detail.'},
  {id:'nico-3d',hero:'nico',name:'Nico · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'A heroic launcher pose on a miniature city rooftop.'},
  {id:'ezra-3d',hero:'ezra',name:'Ezra · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'Obsidian armor, molten cracks, and a fireball that lights up the third dimension.'},
  {id:'c-3d',hero:'teleportation_c',name:'C · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'A glossy shadow ally steps through a swirling violet portal.'},
  {id:'zgod-3d',hero:'zgod',name:'Z-God · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'The little star-powered sister takes a giant leap into a candy-colored diorama.'},
  {id:'kaden-3d',hero:'elytron',name:'Kaden · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'A masked electric ninja sends golden pulses through a neon-lit alley.'},
  {id:'shadow-3d',hero:'shadow_kid',name:'Shadow Kid · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'A mysterious shadow boy holds a tiny universe in the palm of his hand.'},
  {id:'king-3d',hero:'turkey_king',name:'Turkey King · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'The autumn monarch poses with his royal staff and a most dignified turkey.'},
  {id:'klause-3d',hero:'killer_klause',name:'Klause · Beyond the Page',series:'Beyond the Page',style:'3D render',value:1000,description:'Santa’s toughest field medic brings a gift-wrapped launcher to a snowy diorama.'},
  {"id":"xgod-surf","hero":"xgod","name":"Surf’s Up, X God","series":"Off Duty","style":"Surf poster","value":350,"description":"X God balances on a lime surfboard, grinning as a turquoise wave curls behind him."},
  {"id":"xgod-family","hero":"xgod","name":"Game Night Champions","series":"Family Album","style":"Storybook illustration","value":600,"description":"X God and his little sister Z-God turn family game night into a heroic adventure."},
  {"id":"xgod-academy","hero":"xgod","name":"Class of X","series":"Hero Academy","style":"Superhero comic","value":650,"description":"X God strikes a dramatic landing pose in a blue-and-gold academy uniform."},
  {"id":"xgod-city","hero":"xgod","name":"Sunset Boulevard Hero","series":"City Legends","style":"Urban cover art","value":650,"description":"X God poses beside his custom lime ride under sunset palms."},
  {"id":"xgod-chef","hero":"xgod","name":"Pancake Power","series":"Family Album","style":"Clay animation render","value":400,"description":"An airborne pancake and a very determined little chef."},
  {"id":"xgod-cosmos","hero":"xgod","name":"One Small Leap for X","series":"Off Duty","style":"Retro space illustration","value":1000,"description":"X God bounces across a tiny moon with a spectacular view of home."},
  {"id":"kai-sandcastle","hero":"killer_kai","name":"Sandcastle Engineer","series":"Off Duty","style":"3D beach diorama","value":400,"description":"Kai uses his engineering skills to build the beach’s most overcomplicated sandcastle."},
  {"id":"barrett-camp","hero":"barrett","name":"The Marshmallow Bear","series":"Off Duty","style":"Painted storybook","value":350,"description":"Barrett discovers that enormous claws are excellent marshmallow holders."},
  {"id":"nico-street","hero":"nico","name":"Courtside Confidence","series":"City Legends","style":"Urban cover art","value":600,"description":"Nico trades the battlefield for a sunset neighborhood basketball court."},
  {"id":"ezra-bbq","hero":"ezra","name":"Grill Master Ezra","series":"Family Album","style":"Clay animation render","value":350,"description":"The family cookout has never had better temperature control."},
  {"id":"c-garden","hero":"teleportation_c","name":"Portal to Playtime","series":"Off Duty","style":"Paper-cut illustration","value":400,"description":"Teleportation C finds that portals make a wonderful garden game."},
  {"id":"zgod-kite","hero":"zgod","name":"A Sky Full of Stars","series":"Off Duty","style":"Watercolor","value":300,"description":"Z-God races along the beach beneath a golden star-shaped kite."},
  {"id":"kaden-academy","hero":"elytron","name":"Golden Hour Training","series":"Hero Academy","style":"Superhero comic","value":650,"description":"Kaden practices his electric moves in the academy’s training yard."},
  {"id":"shadow-arcade","hero":"shadow_kid","name":"High Score, Unknown","series":"City Legends","style":"Neon graphic novel","value":600,"description":"Shadow Kid bends a tiny black hole into an unbeatable arcade trick shot."},
  {"id":"king-holiday","hero":"turkey_king","name":"Royal Beach Day","series":"Off Duty","style":"3D beach diorama","value":450,"description":"Even the Turkey King deserves a little time under an umbrella."},
  {"id":"klause-toys","hero":"killer_klause","name":"After Hours at the Workshop","series":"Family Album","style":"Cozy painted illustration","value":450,"description":"Klause swaps his launcher for a paintbrush to finish a very special toy."},
] as const satisfies readonly {id:string;hero:CharacterId;name:string;series:string;style:string;value:number;description:string}[];

export type CollectibleCard = typeof COLLECTIBLE_CARDS[number];
export type CardId = CollectibleCard['id'];
export const isCardId = (id:unknown):id is CardId => COLLECTIBLE_CARDS.some(card=>card.id===id);
export const cardArt = (id:CardId) => `/workshop/crates-v2/cards/${id}.webp`;
