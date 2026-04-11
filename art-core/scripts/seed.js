#!/usr/bin/env node
/**
 * seed.js — Données de test réalistes pour ART-CORE
 * 10 artistes · 100 œuvres · 20 scouts · données cohérentes
 */
const https = require('https');

const PAT = 'sbp_85360682b077f687cb720a83ae40aff699010a0c';
const REF = 'kmmlwuwsahtzgzztcdaj';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbWx3dXdzYWh0emd6enRjZGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzE5MTMsImV4cCI6MjA4OTE0NzkxM30.dcxk_X096vME37_XmeURhW-3bABcbkNC7qEXqYvXgcE';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbWx3dXdzYWh0emd6enRjZGFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU3MTkxMywiZXhwIjoyMDg5MTQ3OTEzfQ.BCE1ZfyTGk58Kdxt1N5I50_5s9JdL45x22XE6xLNFUc';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function createAuthUser(email, username, fullName) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password: 'ArtCore2026!', email_confirm: true, user_metadata: { username, full_name: fullName } });
    const options = {
      hostname: `${REF}.supabase.co`,
      path: '/auth/v1/admin/users',
      method: 'POST',
      headers: { 'apikey': SERVICE, 'Authorization': `Bearer ${SERVICE}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 15000
    };
    const req = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(d) }));
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.write(body); req.end();
  });
}

function sqlExec(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${REF}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    };
    const req = https.request(options, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: (() => { try { return JSON.parse(d); } catch { return d; } })() }));
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.write(body); req.end();
  });
}

function esc(s) { return s ? s.replace(/'/g, "''") : ''; }
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── Données artistes ──────────────────────────────────────────────────────
const ARTISTS = [
  { name: 'Camille Beaumont', username: 'camille_b', email: 'camille@artcore.test', bio: 'Peintre expressionniste basée à Lyon. Ses toiles explorent la mémoire collective et la dualité entre nature et urbanité.', style: 'Expressionnisme contemporain', city: 'Lyon', country: 'France', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' },
  { name: 'Marco Ferretti', username: 'marco_ferretti', email: 'marco@artcore.test', bio: 'Sculpteur milanais travaillant le marbre de Carrare et le bronze. Lauréat du Prix Européen des Arts Plastiques 2023.', style: 'Sculpture néoclassique', city: 'Milan', country: 'Italie', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
  { name: 'Aïcha Benali', username: 'aicha_benali', email: 'aicha@artcore.test', bio: 'Photographe documentaire franco-marocaine. Son œuvre interroge l\'identité, l\'exil et les géographies intimes.', style: 'Photographie conceptuelle', city: 'Paris', country: 'France', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80' },
  { name: 'Lena Hoffmann', username: 'lena_hoff', email: 'lena@artcore.test', bio: 'Artiste numérique berlinoise. Elle fusionne algorithmes génératifs et peinture à l\'huile traditionnelle.', style: 'Art numérique hybride', city: 'Berlin', country: 'Allemagne', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80' },
  { name: 'Yusuf Adesanya', username: 'yusuf_ade', email: 'yusuf@artcore.test', bio: 'Peintre nigérian-britannique dont l\'œuvre célèbre la diaspora africaine avec une palette vibrante et des compositions monumentales.', style: 'Afrofuturisme pictural', city: 'Londres', country: 'Royaume-Uni', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80' },
  { name: 'Sakura Tanaka', username: 'sakura_t', email: 'sakura@artcore.test', bio: 'Céramiste contemporaine de Kyoto. Ses pièces dialoguent avec la tradition Wabi-Sabi et l\'esthétique minimaliste occidentale.', style: 'Céramique contemporaine', city: 'Kyoto', country: 'Japon', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80' },
  { name: 'Pablo Mendoza', username: 'pablo_mendoza', email: 'pablo@artcore.test', bio: 'Muraliste et peintre barcelonais. Ses installations questionnent les frontières entre espace public et sphère intime.', style: 'Muralisme urbain', city: 'Barcelone', country: 'Espagne', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
  { name: 'Ingrid Larsen', username: 'ingrid_l', email: 'ingrid@artcore.test', bio: 'Plasticienne norvégienne spécialisée dans les installations immersives liées aux phénomènes naturels nordiques.', style: 'Installation immersive', city: 'Oslo', country: 'Norvège', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80' },
  { name: 'Zhao Wei', username: 'zhao_wei_art', email: 'zhao@artcore.test', bio: 'Peintre shanghaïen mêlant encre traditionnelle et abstraction contemporaine. Exposé au MoMA et au Centre Pompidou.', style: 'Encre contemporaine', city: 'Shanghai', country: 'Chine', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80' },
  { name: 'Elena Vasquez', username: 'elena_v', email: 'elena@artcore.test', bio: 'Artiste textile colombienne. Elle tisse des récits politiques et poétiques avec des matières naturelles et des pigments végétaux.', style: 'Art textile', city: 'Bogotá', country: 'Colombie', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80' },
];

// ── Templates œuvres par artiste ──────────────────────────────────────────
const ARTWORK_TEMPLATES = {
  camille_b: [
    { title: 'Mémoire vive #3', desc: 'Acrylique et huile sur toile. Une exploration de la mémoire fragmentée à travers des couches superposées de couleurs brûlantes.', medium: 'Acrylique et huile sur toile', cat: 'painting', price: 4200, w: 120, h: 150 },
    { title: 'Confluence urbaine', desc: 'Grande composition architecturale mêlant photographie et peinture, capturant le chaos organique de la ville moderne.', medium: 'Technique mixte sur toile', cat: 'painting', price: 7800, w: 180, h: 120 },
    { title: 'L\'Invisible Présent', desc: 'Diptyque sur panneaux de bois, explorant la dualité entre présence et absence dans l\'espace quotidien.', medium: 'Huile sur panneau', cat: 'painting', price: 5600, w: 80, h: 100 },
    { title: 'Sédimentation #7', desc: 'Œuvre abstraite construite par accumulation de matières et pigments, évoquant les strates géologiques du temps.', medium: 'Technique mixte', cat: 'painting', price: 3100, w: 90, h: 110 },
    { title: 'Territoire intérieur', desc: 'Peinture gestuelle intense inspirée des paysages mentaux et des cartographies émotionnelles.', medium: 'Acrylique sur toile', cat: 'painting', price: 6200, w: 160, h: 140 },
    { title: 'Résonances bleues', desc: 'Une méditation chromatique en bleu cobalt et outremer, explorant la profondeur comme métaphore de l\'inconscient.', medium: 'Huile sur toile', cat: 'painting', price: 8900, w: 200, h: 160 },
    { title: 'Fragments d\'après', desc: 'Collage pictural combinant archives familiales et peinture contemporaine dans un dialogue intergénérationnel.', medium: 'Collage et acrylique', cat: 'mixed_media', price: 2800, w: 60, h: 80 },
    { title: 'La Ligne d\'horizon', desc: 'Paysage abstrait monumental évoquant la frontière entre terre et ciel, entre réel et imaginaire.', medium: 'Huile et pastel sur toile', cat: 'painting', price: 12000, w: 240, h: 100 },
    { title: 'Portrait de l\'absence', desc: 'Figuration évanescente où le sujet se dissout dans la matière picturale, questionnant la représentation identitaire.', medium: 'Huile sur toile', cat: 'painting', price: 4500, w: 80, h: 100 },
    { title: 'Palimpseste #2', desc: 'Œuvre construite sur une toile ancienne récupérée, où les couches successives racontent des histoires enchevêtrées.', medium: 'Huile sur toile ancienne', cat: 'painting', price: 9200, w: 100, h: 130 },
  ],
  marco_ferretti: [
    { title: 'Forme primordiale I', desc: 'Sculpture en marbre de Carrare blanc, travaillée à la main selon des techniques ancestrales. Formes biomorphiques tendant vers l\'abstraction.', medium: 'Marbre de Carrare', cat: 'sculpture', price: 28000, w: 40, h: 80 },
    { title: 'Tension dynamique', desc: 'Bronze patiné représentant deux forces opposées en équilibre précaire, métaphore des contradictions humaines.', medium: 'Bronze patiné', cat: 'sculpture', price: 15000, w: 30, h: 60 },
    { title: 'L\'Éveil', desc: 'Figure humaine stylisée en albâtre translucide, émergente d\'une forme brute non taillée. Édition de 3.', medium: 'Albâtre', cat: 'sculpture', price: 22000, w: 25, h: 70 },
    { title: 'Vortex', desc: 'Sculpture cinétique en acier inoxydable brossé dont les plans réfléchissants créent une vibration optique selon l\'angle d\'observation.', medium: 'Acier inoxydable', cat: 'sculpture', price: 18500, w: 50, h: 90 },
    { title: 'Archétype #4', desc: 'Série de fragments de marbre assemblés évoquant des vestiges archéologiques d\'une civilisation imaginaire.', medium: 'Marbre et résine', cat: 'sculpture', price: 9800, w: 35, h: 45 },
    { title: 'Continuum', desc: 'Installation sculpturale composée de neuf éléments en terre cuite émaillée formant un ensemble cohérent.', medium: 'Terre cuite émaillée', cat: 'sculpture', price: 35000, w: 200, h: 60 },
    { title: 'Genèse', desc: 'Bloc de granit noir poli sur lequel émergent des formes figuratives, comme jaillissant de la roche primordiale.', medium: 'Granit noir de Suède', cat: 'sculpture', price: 42000, w: 45, h: 100 },
    { title: 'Petite Vénus', desc: 'Figurine contemporaine en marbre rose du Portugal, réinterprétant les canons classiques de la beauté féminine.', medium: 'Marbre rose du Portugal', cat: 'sculpture', price: 8400, w: 15, h: 35 },
    { title: 'Mouvement perpétuel', desc: 'Composition abstraite en bronze à la cire perdue, figée dans un geste de transformation éternelle.', medium: 'Bronze à la cire perdue', cat: 'sculpture', price: 19000, w: 40, h: 75 },
    { title: 'Dualité', desc: 'Diptyque sculptural en marbre blanc et noir confrontant deux formes complémentaires dans un dialogue silencieux.', medium: 'Marbre blanc et noir', cat: 'sculpture', price: 31000, w: 60, h: 80 },
  ],
  aicha_benali: [
    { title: 'Entre-deux rives', desc: 'Série photographique documentant les espaces de transit et d\'attente des voyageurs entre Tanger et Tarifa. Tirage argentique.', medium: 'Photographie argentique', cat: 'photography', price: 1800, w: 100, h: 70 },
    { title: 'Femmes du Derb', desc: 'Portrait intime en noir et blanc de femmes artisanes du quartier historique de Fès. Tirage baryté contrecollé.', medium: 'Photographie noir et blanc', cat: 'photography', price: 2400, w: 80, h: 60 },
    { title: 'Chronologie d\'un exil', desc: 'Diaporama photographique accompagné d\'archives familiales explorant trois générations de migration maghrébine en France.', medium: 'Installation photographique', cat: 'photography', price: 12000, w: 0, h: 0 },
    { title: 'La Méditerranée vue d\'en bas', desc: 'Photographies sous-marines des épaves et débris laissés par les traversées migratoires. Témoignage poétique et politique.', medium: 'Photographie couleur', cat: 'photography', price: 3200, w: 120, h: 80 },
    { title: 'Henna & Pixels', desc: 'Dyptique confrontant tatouages au henné traditionnels et interfaces numériques — corps comme terrain d\'inscription culturelle.', medium: 'Photographie pigmentaire', cat: 'photography', price: 2100, w: 60, h: 90 },
    { title: 'Portraits d\'absents', desc: 'Silhouettes fantomatiques d\'immigrés clandestins reconstitués par leurs effets personnels retrouvés. Série de 12 tirages.', medium: 'Photographie argentique', cat: 'photography', price: 8500, w: 50, h: 60 },
    { title: 'Jardin suspendu', desc: 'Paysages de jardins potagers cultivés sur les terrasses d\'immeubles HLM de la banlieue parisienne — résistance poétique.', medium: 'Photographie couleur', cat: 'photography', price: 1600, w: 90, h: 60 },
    { title: 'Le Détroit au crépuscule', desc: 'Série panoramique du détroit de Gibraltar capturé à différentes heures de la journée. Six tirages de grand format.', medium: 'Photographie panoramique', cat: 'photography', price: 4800, w: 180, h: 60 },
    { title: 'Invisible #3', desc: 'Autoportrait conceptuel explorant la notion de visibilité et d\'invisibilité sociale des femmes issues de l\'immigration.', medium: 'Photographie pigmentaire', cat: 'photography', price: 3400, w: 70, h: 90 },
    { title: 'Mémoire des pierres', desc: 'Photographies des médinas marocaines accompagnées d\'extraits de journaux intimes de la période coloniale.', medium: 'Photographie et archive', cat: 'photography', price: 5200, w: 80, h: 100 },
  ],
  lena_hoff: [
    { title: 'Neural Garden #12', desc: 'Œuvre hybride combinant algorithme génératif et intervention picturale à l\'huile. Chaque tirage est unique et accompagné d\'un NFT certificat.', medium: 'Impression numérique et huile', cat: 'digital', price: 3800, w: 100, h: 100 },
    { title: 'Data Landscape', desc: 'Visualisation artistique de données climatiques transformées en paysage pictural. La couleur encode la température, la forme le CO2.', medium: 'Art numérique', cat: 'digital', price: 5200, w: 140, h: 90 },
    { title: 'Algorithme et Matière', desc: 'Processus génératif imprimé sur support physique puis retravaillé à la main — dialogue entre machine et geste humain.', medium: 'Technique mixte numérique', cat: 'mixed_media', price: 4100, w: 80, h: 80 },
    { title: 'Bruit rose', desc: 'Composition basée sur le bruit de Perlin générant des formes organiques proches du végétal. Impression sur papier Hahnemühle.', medium: 'Impression numérique', cat: 'digital', price: 1200, w: 60, h: 80 },
    { title: 'Ville fractale', desc: 'Architecture urbaine réinventée par algorithmes fractals. La ville comme organisme vivant auto-généré.', medium: 'Art numérique', cat: 'digital', price: 2900, w: 120, h: 80 },
    { title: 'Portrait augmenté #7', desc: 'Portrait photographique transformé par réseaux de neurones et retravaillé à la peinture à l\'huile. Série limitée à 5.', medium: 'Photographie et huile', cat: 'mixed_media', price: 6800, w: 60, h: 80 },
    { title: 'Chaos organisé', desc: 'Exploration des systèmes dynamiques chaotiques transformés en compositions visuelles d\'une beauté paradoxale.', medium: 'Impression pigmentaire', cat: 'digital', price: 1900, w: 100, h: 100 },
    { title: 'L\'Esprit de la machine', desc: 'Installation de 9 écrans montrant en temps réel un réseau de neurones apprenant à peindre. Édition unique.', medium: 'Installation vidéo', cat: 'digital', price: 28000, w: 0, h: 0 },
    { title: 'Pixelisation du réel', desc: 'Photographies de Berlin progressivement pixelisées selon un gradient de la périphérie vers le centre. 12 tirages.', medium: 'Photographie numérique', cat: 'photography', price: 2300, w: 80, h: 60 },
    { title: 'Entropie bleue', desc: 'Simulation de systèmes thermodynamiques rendue visible sous forme de nuages colorés en perpétuelle transformation.', medium: 'Art génératif', cat: 'digital', price: 3400, w: 90, h: 90 },
  ],
  yusuf_ade: [
    { title: 'Ife Rising', desc: 'Peinture monumentale célébrant la civilisation du Bénin précoloniale. Or, terres de sienne et bleu intense sur toile de lin.', medium: 'Huile et feuille d\'or sur lin', cat: 'painting', price: 45000, w: 250, h: 200 },
    { title: 'Lagos by Night', desc: 'Composition nocturne de Lagos — mégalopole africaine — vue depuis les gratte-ciels, saturée d\'énergie et de couleurs.', medium: 'Acrylique sur toile', cat: 'painting', price: 18000, w: 180, h: 130 },
    { title: 'Diaspora I', desc: 'Premier volet d\'une trilogie sur la diaspora africaine. Figures stylisées traversant des espaces géographiques et temporels multiples.', medium: 'Huile sur toile', cat: 'painting', price: 22000, w: 160, h: 140 },
    { title: 'Ancestral Voices', desc: 'Œuvre semi-abstraite où des masques traditionnels Yoruba émergent d\'un fond gestuel contemporain.', medium: 'Technique mixte sur toile', cat: 'painting', price: 14000, w: 120, h: 150 },
    { title: 'Market Women', desc: 'Portraits collectifs de femmes commerçantes du marché de Lagos, peints avec une énergie et une vitalité débordantes.', medium: 'Acrylique sur toile', cat: 'painting', price: 9800, w: 140, h: 100 },
    { title: 'Afrofuture', desc: 'Vision utopique d\'une Afrique technologiquement avancée et culturellement souveraine. Inspiré de la littérature afrofuturiste.', medium: 'Huile et acrylique sur toile', cat: 'painting', price: 32000, w: 200, h: 160 },
    { title: 'Sacred Geometry', desc: 'Composition abstraite basée sur les motifs géométriques sacrés de l\'art islamique d\'Afrique de l\'Ouest.', medium: 'Acrylique et or sur panneau', cat: 'painting', price: 11000, w: 80, h: 80 },
    { title: 'The Bridge', desc: 'Métaphore visuelle du pont entre Afrique et diaspora, entre tradition et modernité. Grand format.', medium: 'Huile sur toile', cat: 'painting', price: 27000, w: 210, h: 140 },
    { title: 'Carnival', desc: 'Explosion colorée célébrant le Carnaval de Notting Hill comme rite de résistance et d\'affirmation identitaire.', medium: 'Acrylique sur toile', cat: 'painting', price: 8500, w: 120, h: 90 },
    { title: 'Silence Before the Storm', desc: 'Peinture méditative en camaïeu d\'ocres représentant un paysage du delta du Niger avant l\'industrialisation pétrolière.', medium: 'Huile sur toile', cat: 'painting', price: 16000, w: 150, h: 110 },
  ],
  sakura_t: [
    { title: 'Bol à thé Wabi #3', desc: 'Bol à thé (chawan) réalisé selon la technique traditionnelle japonaise du Raku. Chaque pièce est unique, marquée par le feu.', medium: 'Céramique Raku', cat: 'ceramics', price: 2400, w: 15, h: 10 },
    { title: 'Vase aux fleurs fantômes', desc: 'Grand vase soliflore en grès porcelainé avec glaçure céladon. Incisions florales révélées par la cuisson.', medium: 'Grès porcelainé', cat: 'ceramics', price: 3800, w: 20, h: 45 },
    { title: 'Jardin de pierre', desc: 'Installation de 15 galets en céramique émaillée évoquant un jardin zen miniature. Poids et textures variables.', medium: 'Céramique émaillée', cat: 'ceramics', price: 5200, w: 60, h: 5 },
    { title: 'Kintsugi contemporain', desc: 'Pièce brisée et réparée à l\'or selon la technique ancestrale du Kintsugi, magnifiant les fractures comme partie de l\'histoire.', medium: 'Porcelaine et or', cat: 'ceramics', price: 4100, w: 25, h: 20 },
    { title: 'Bol de lune', desc: 'Grand bol sphérique (Dalbhanggi) en porcelaine blanche d\'une pureté absolue, réinterprétant la tradition coréenne.', medium: 'Porcelaine', cat: 'ceramics', price: 6800, w: 35, h: 30 },
    { title: 'Vases communicants', desc: 'Série de trois vases liés par une glaçure coulante continue — métaphore des relations humaines et du flux.', medium: 'Grès et glaçure', cat: 'ceramics', price: 8900, w: 80, h: 30 },
    { title: 'Empreintes', desc: 'Plaques de grès portant les empreintes de mains, feuilles et objets quotidiens — archéologie du présent.', medium: 'Grès chamotté', cat: 'ceramics', price: 1800, w: 40, h: 30 },
    { title: 'Ciel d\'encre', desc: 'Grand plat décoratif en porcelaine avec glaçure noire tenmoku parsemée d\'étoiles dorées. Cuisson au bois.', medium: 'Porcelaine, cuisson au bois', cat: 'ceramics', price: 5600, w: 45, h: 8 },
    { title: 'Formes primaires', desc: 'Série de cinq pièces explorant les formes géométriques fondamentales — sphère, cube, cylindre, cône, pyramide — en céramique.', medium: 'Grès émaillé', cat: 'ceramics', price: 7200, w: 30, h: 30 },
    { title: 'Zen Garden Bowl', desc: 'Grand bol de méditation incisé de mantras en calligraphie japonaise sous glaçure blanc-bleu de Kyoto.', medium: 'Porcelaine de Kyoto', cat: 'ceramics', price: 3200, w: 30, h: 15 },
  ],
  pablo_mendoza: [
    { title: 'Barcelona Viva', desc: 'Grande peinture murale portative sur toile de 3m x 2m. Célébration colorée de la vie dans les rues du Raval.', medium: 'Acrylique sur toile', cat: 'painting', price: 38000, w: 300, h: 200 },
    { title: 'Frontera invisible', desc: 'Œuvre dyptique explorant les frontières invisibles qui divisent les quartiers et les communautés urbaines.', medium: 'Technique mixte sur bois', cat: 'mixed_media', price: 12000, w: 160, h: 100 },
    { title: 'El Barrio vive', desc: 'Portrait collectif d\'un quartier populaire barcelonais menacé par la gentrification. Graffiti sur panneau de métal.', medium: 'Spray et acrylique sur métal', cat: 'painting', price: 8500, w: 120, h: 80 },
    { title: 'Mediterráneo', desc: 'Composition abstraite célébrant les cultures méditerranéennes à travers couleurs et motifs géométriques.', medium: 'Huile sur toile', cat: 'painting', price: 6200, w: 140, h: 100 },
    { title: 'Migración', desc: 'Installation de fragments de cartes géographiques peintes évoquant les migrations historiques de la péninsule ibérique.', medium: 'Technique mixte', cat: 'installation', price: 22000, w: 0, h: 0 },
    { title: 'La Plaza', desc: 'Grande peinture de la vie quotidienne d\'une place publique espagnole, capturant les gestes et rituel sociaux.', medium: 'Huile sur toile', cat: 'painting', price: 15000, w: 180, h: 120 },
    { title: 'Ramblas nocturnas', desc: 'Vue nocturne de la Rambla barcelonaise dans un style expressionniste vibrant. Couleurs saturées, perspective déformée.', medium: 'Acrylique sur toile', cat: 'painting', price: 9800, w: 100, h: 140 },
    { title: 'Arte callejero', desc: 'Série de 6 photographies documentant des fresques murales en voie de disparition à travers l\'Europe.', medium: 'Photographie pigmentaire', cat: 'photography', price: 3200, w: 80, h: 60 },
    { title: 'Homenaje a Miró', desc: 'Hommage à Joan Miró utilisant son vocabulaire de formes organiques dans une composition contemporaine et dynamique.', medium: 'Acrylique sur panneau', cat: 'painting', price: 7400, w: 90, h: 90 },
    { title: 'Arquitectura soñada', desc: 'Peinture architecturale fantastique combinant éléments du modernisme catalan et visions futuristes.', medium: 'Huile et acrylique', cat: 'painting', price: 11500, w: 120, h: 160 },
  ],
  ingrid_l: [
    { title: 'Aurora Borealis', desc: 'Installation immersive de fibres optiques et voiles translucides recréant l\'expérience des aurores boréales nordiques.', medium: 'Installation lumineuse', cat: 'installation', price: 85000, w: 400, h: 300 },
    { title: 'Glace vive', desc: 'Série photographique documentant les glaciers norvégiens en fonte sur 10 ans. Urgence climatique et beauté tragique.', medium: 'Photographie', cat: 'photography', price: 4200, w: 120, h: 80 },
    { title: 'Soleil de minuit', desc: 'Grande peinture du phénomène du soleil de minuit sur les fjords. Lumière blanche et bleue d\'une intensité hypnotique.', medium: 'Huile sur lin', cat: 'painting', price: 18000, w: 200, h: 100 },
    { title: 'Tempête arctique', desc: 'Peinture gestuelle évoquant la violence et la beauté d\'une tempête en mer de Barents. Technique à couteau.', medium: 'Huile sur toile', cat: 'painting', price: 12000, w: 150, h: 120 },
    { title: 'Forêt de bouleaux', desc: 'Impression numérique grand format d\'une forêt de bouleaux en automne — lignes verticales et or.', medium: 'Photographie numérique', cat: 'photography', price: 2800, w: 100, h: 150 },
    { title: 'Son du fjord', desc: 'Sculpture sonore composée de tubes de métal accordés aux fréquences naturelles du fjord de Bergen.', medium: 'Sculpture sonore', cat: 'installation', price: 35000, w: 0, h: 0 },
    { title: 'Brume d\'été', desc: 'Peinture atmosphérique capturant la brume légère sur les eaux calmes d\'un fjord en juillet. Lumière diffuse et apaisante.', medium: 'Huile sur toile', cat: 'painting', price: 9500, w: 130, h: 80 },
    { title: 'Lichen et Roc', desc: 'Photographies macro de lichens sur roches alpines — abstraction naturelle d\'une précision et d\'une complexité infinies.', medium: 'Photographie macro', cat: 'photography', price: 1900, w: 60, h: 60 },
    { title: 'Nuit polaire', desc: 'Peinture de la nuit polaire arctique — obscurité totale ponctuée d\'étoiles et de reflets sur la neige.', medium: 'Huile sur toile', cat: 'painting', price: 14000, w: 160, h: 100 },
    { title: 'Permafrost', desc: 'Installation in situ de blocs de glace artificielle contenant des objets du quotidien — mémoire conservée, temps suspendu.', medium: 'Installation', cat: 'installation', price: 42000, w: 0, h: 0 },
  ],
  zhao_wei_art: [
    { title: 'Encre et vide #8', desc: 'Peinture à l\'encre de Chine sur papier xuan. Le vide comme présence active — tradition calligraphique réinterprétée.', medium: 'Encre sur papier xuan', cat: 'painting', price: 8500, w: 70, h: 100 },
    { title: 'Montagne et nuage', desc: 'Paysage imaginaire en encre et pigments minéraux sur soie — dialogue entre tradition shanshui et abstraction contemporaine.', medium: 'Encre et pigments sur soie', cat: 'painting', price: 14000, w: 120, h: 80 },
    { title: 'Calligraphie du chaos', desc: 'Grands gestes calligraphiques abstraits à l\'encre noire sur papier blanc — écriture comme énergie pure.', medium: 'Encre sur papier', cat: 'painting', price: 6200, w: 80, h: 120 },
    { title: 'Pivoine de Shanghai', desc: 'Peinture botanique contemporaine de pivoine en technique gongbi (trait fin) sur papier doré.', medium: 'Encre et or sur papier', cat: 'painting', price: 9800, w: 60, h: 90 },
    { title: 'Rêve de papillon', desc: 'Diptyque inspiré du célèbre conte taoïste de Zhuangzi — frontière entre rêve et réalité, homme et nature.', medium: 'Encre et aquarelle', cat: 'painting', price: 18000, w: 140, h: 100 },
    { title: 'Nouvelle encre', desc: 'Fusion entre peinture à l\'encre traditionnelle et composition numérique — traditions transcendées par la technologie.', medium: 'Encre et impression numérique', cat: 'mixed_media', price: 11000, w: 100, h: 80 },
    { title: 'Dragon de mer', desc: 'Grande composition mythologique représentant un dragon des mers dans un style entre tradition dynastique et abstraction.', medium: 'Encre sur papier xuan', cat: 'painting', price: 22000, w: 180, h: 120 },
    { title: 'Bambouseraie', desc: 'Peinture de bambous au vent — maîtrise absolue du trait et de la valeur dans la tradition du pinceau liberé.', medium: 'Encre sur papier', cat: 'painting', price: 5400, w: 60, h: 100 },
    { title: 'Ville fantôme', desc: 'Paysage urbain de Shanghai rendu en encre vaporeuse — la métropole comme paysage de montagne traditionnel.', medium: 'Encre et lavis', cat: 'painting', price: 16500, w: 150, h: 90 },
    { title: 'Abstraction zen', desc: 'Composition minimaliste explorant l\'espace entre les gestes — le blanc comme matière, le noir comme espace.', medium: 'Encre sur papier', cat: 'painting', price: 7200, w: 90, h: 70 },
  ],
  elena_v: [
    { title: 'Tejido de memorias', desc: 'Grande tapisserie tissée à la main avec des fibres naturelles teintes aux pigments végétaux amazoniens. Récits indigènes tissés.', medium: 'Tapisserie, fibres naturelles', cat: 'textile', price: 16000, w: 180, h: 200 },
    { title: 'Huipil contemporain', desc: 'Réinterprétation du vêtement rituel indigène colombien en tant qu\'œuvre d\'art conceptuelle et politique.', medium: 'Textile et broderie', cat: 'textile', price: 8500, w: 80, h: 120 },
    { title: 'Racines', desc: 'Installation de cordages torsadés pendant du plafond, chaque corde contenant des graines et des pigments naturels.', medium: 'Installation textile', cat: 'installation', price: 28000, w: 0, h: 0 },
    { title: 'Cartographie du Corps', desc: 'Broderie fine sur tissu de soie représentant une cartographie détaillée du corps féminin et ses zones de force.', medium: 'Broderie sur soie', cat: 'textile', price: 5200, w: 60, h: 80 },
    { title: 'Amazonia', desc: 'Grande tapisserie évoquant la forêt amazonienne à travers des motifs géométriques indigènes Wayuu.', medium: 'Tapisserie Wayuu', cat: 'textile', price: 12000, w: 150, h: 180 },
    { title: 'Textiles politiques', desc: 'Série de 6 pièces tissées contenant des slogans féministes en langues indigènes colombiennes.', medium: 'Tissu et broderie', cat: 'textile', price: 9800, w: 100, h: 60 },
    { title: 'Nid', desc: 'Sculpture textile suspendue en forme de nid géant, tissée avec des matières recyclées et des fils d\'or.', medium: 'Sculpture textile', cat: 'textile', price: 18000, w: 80, h: 60 },
    { title: 'Voyage végétal', desc: 'Composition abstraite réalisée avec des plantes séchées, fibres et pigments naturels extraits de la jungle colombienne.', medium: 'Technique mixte naturelle', cat: 'mixed_media', price: 4200, w: 70, h: 90 },
    { title: 'Tissage du temps', desc: 'Œuvre en cours de réalisation depuis 5 ans, ajoutant chaque année une nouvelle couche — archive vivante.', medium: 'Tapisserie évolutive', cat: 'textile', price: 35000, w: 120, h: 160 },
    { title: 'Molas contemporaines', desc: 'Réinterprétation des Molas Kuna (appliqués textiles) en format contemporain grand et coloré.', medium: 'Appliqué textile', cat: 'textile', price: 3800, w: 60, h: 60 },
  ],
};

const ARTWORK_IMAGES = [
  'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800&q=80',
  'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&q=80',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80',
  'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
  'https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&q=80',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
  'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=800&q=80',
  'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80',
  'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80',
  'https://images.unsplash.com/photo-1633621412960-6df85ac74c93?w=800&q=80',
  'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800&q=80',
  'https://images.unsplash.com/photo-1559181567-c3190ef65235?w=800&q=80',
  'https://images.unsplash.com/photo-1614084942992-797d2d2c77d6?w=800&q=80',
  'https://images.unsplash.com/photo-1603484477859-abe6a73f9366?w=800&q=80',
  'https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=800&q=80',
];

const SCOUTS_DATA = [
  { name: 'Thomas Beauchamp', username: 'thomas_scout', email: 'thomas.b@prime.test', bio: 'Ancien galeriste reconverti en scout indépendant. Spécialiste peinture contemporaine française et belge.', specialite: 'Peinture contemporaine', region: 'France/Belgique', plan: 'pro' },
  { name: 'Sofia Marchetti', username: 'sofia_scout', email: 'sofia.m@prime.test', bio: 'Ex-directrice artistique chez Christie\'s Milan. Scout spécialisée art méditerranéen et design italien.', specialite: 'Art méditerranéen', region: 'Italie/Espagne', plan: 'elite' },
  { name: 'James O\'Brien', username: 'james_scout', email: 'james.ob@prime.test', bio: 'Critique d\'art et scout basé à Londres. Expert art africain contemporain et diaspora.', specialite: 'Art africain', region: 'Royaume-Uni/Afrique', plan: 'pro' },
  { name: 'Mei Lin', username: 'mei_scout', email: 'mei.l@prime.test', bio: 'Spécialiste art asiatique contemporain et encre. Passerelle entre marchés asiatiques et occidentaux.', specialite: 'Art asiatique', region: 'Asie-Pacifique', plan: 'elite' },
  { name: 'Clara Weber', username: 'clara_scout', email: 'clara.w@prime.test', bio: 'Scout allemande spécialisée art numérique et nouvelles technologies. Conseillère pour institutions digitales.', specialite: 'Art numérique', region: 'Europe du Nord', plan: 'pro' },
  { name: 'Ahmed Rashid', username: 'ahmed_scout', email: 'ahmed.r@prime.test', bio: 'Scout et collectionneur du Golfe. Expert art contemporain arabe et arte moyen-oriental émergent.', specialite: 'Art arabe contemporain', region: 'Moyen-Orient', plan: 'starter' },
  { name: 'Valentina Cruz', username: 'val_scout', email: 'val.c@prime.test', bio: 'Ancienne curatrice au MALBA Buenos Aires. Spécialiste art latino-américain et textiles contemporains.', specialite: 'Art latino-américain', region: 'Amérique latine', plan: 'pro' },
  { name: 'Pierre Delacroix', username: 'pierre_scout', email: 'pierre.d@prime.test', bio: 'Scout parisien, ancien journaliste aux Cahiers du Cinéma. Spécialiste art et cinéma, photographie documentaire.', specialite: 'Photographie', region: 'France', plan: 'starter' },
  { name: 'Nadia Volkov', username: 'nadia_scout', email: 'nadia.v@prime.test', bio: 'Scout russo-française. Expert art d\'Europe de l\'Est post-soviétique et avant-gardes émergentes.', specialite: 'Art est-européen', region: 'Europe de l\'Est', plan: 'pro' },
  { name: 'Kenji Yamamoto', username: 'kenji_scout', email: 'kenji.y@prime.test', bio: 'Scout basé à Tokyo. Spécialiste céramique contemporaine, art Mono-ha et nouvelles scènes japonaises.', specialite: 'Céramique et arts japonais', region: 'Japon/Corée', plan: 'elite' },
  { name: 'Amara Diallo', username: 'amara_scout', email: 'amara.d@prime.test', bio: 'Scout sénégalaise, fondatrice du réseau ArtAfrica Connect. Spécialiste art subsaharien émergent.', specialite: 'Art africain émergent', region: 'Afrique subsaharienne', plan: 'pro' },
  { name: 'Hugo Steinberg', username: 'hugo_scout', email: 'hugo.s@prime.test', bio: 'Scout viennois, expert art conceptuel et performance. Lié aux réseaux institutionnels autrichiens.', specialite: 'Art conceptuel', region: 'Autriche/Suisse', plan: 'starter' },
  { name: 'Chloe Martin', username: 'chloe_scout', email: 'chloe.m@prime.test', bio: 'Scout et bloggeuse art. 50k abonnés, forte présence digitale. Spécialiste street art et art urbain.', specialite: 'Street art', region: 'France/UK', plan: 'pro' },
  { name: 'Ravi Sharma', username: 'ravi_scout', email: 'ravi.s@prime.test', bio: 'Scout indo-britannique. Expert art contemporain indien et Asie du Sud. Conseiller pour musées de Mumbai.', specialite: 'Art indien contemporain', region: 'Inde/Asie du Sud', plan: 'elite' },
  { name: 'Luisa Romano', username: 'luisa_scout', email: 'luisa.r@prime.test', bio: 'Ancienne attachée culturelle italienne. Scout spécialisée sculpture contemporaine et art monumental.', specialite: 'Sculpture contemporaine', region: 'Italie/Méditerranée', plan: 'pro' },
  { name: 'Marc Fontaine', username: 'marc_scout', email: 'marc.f@prime.test', bio: 'Scout belge indépendant. Expert art naïf, brut et outsider art. Collectionneur passionné depuis 20 ans.', specialite: 'Art brut et outsider', region: 'Benelux', plan: 'starter' },
  { name: 'Yuki Tanaka', username: 'yuki_scout', email: 'yuki.t@prime.test', bio: 'Scout japonaise spécialisée art textile et mode. Liens forts avec les maisons de couture et musées textiles.', specialite: 'Art textile et mode', region: 'Japon/France', plan: 'pro' },
  { name: 'Carlos Fuentes', username: 'carlos_scout', email: 'carlos.f@prime.test', bio: 'Scout mexicain. Expert muralisme contemporain, art précolombien revisité et scène underground mexicaine.', specialite: 'Art mexicain', region: 'Mexique/Amérique centrale', plan: 'elite' },
  { name: 'Isabelle Chen', username: 'isabelle_scout', email: 'isabelle.c@prime.test', bio: 'Scout franco-chinoise. Spécialiste encre contemporaine et dialogue Est-Ouest. Conseil pour galeries parisiennes.', specialite: 'Encre et dialogue culturel', region: 'France/Chine', plan: 'pro' },
  { name: 'Anton Müller', username: 'anton_scout', email: 'anton.m@prime.test', bio: 'Scout berlinois. Expert scène underground Berlin, art politique et installations immersives.', specialite: 'Art politique et immersif', region: 'Allemagne', plan: 'starter' },
];

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  console.log('🌱 ART-CORE — Seed Data');
  console.log('========================\n');

  // Vérifier si des données existent déjà
  const { data: existingUsers } = await sqlExec(`SELECT count(*) FROM public.users`);
  const count = existingUsers?.[0]?.count;
  if (parseInt(count) > 0) {
    console.log(`⚠️  ${count} utilisateurs déjà présents. Nettoyage préalable...`);
    await sqlExec(`DELETE FROM public.scouted_artists; DELETE FROM public.affiliate_links; DELETE FROM public.scouts; DELETE FROM public.artworks; DELETE FROM public.user_roles; DELETE FROM public.users`);
    console.log('  ✅ Nettoyé\n');
  }

  // ── ARTISTES ────────────────────────────────────────────────────────────
  console.log('👨‍🎨 Insertion des artistes...');
  const artistIds = {};

  for (const a of ARTISTS) {
    // 1. Créer dans auth.users via Admin API
    const { status: authStatus, data: authData } = await createAuthUser(a.email, a.username, a.name);
    if (authStatus !== 200) {
      console.error(`  ❌ Auth ${a.name}:`, JSON.stringify(authData).slice(0, 100));
      await sleep(500);
      continue;
    }
    const id = authData.id;
    artistIds[a.username] = id;

    // 2. Attendre que le trigger crée la ligne dans public.users
    await sleep(600);

    // 3. Mettre à jour avec les infos supplémentaires
    await sqlExec(`
      UPDATE public.users SET
        username='${esc(a.username)}',
        full_name='${esc(a.name)}',
        avatar_url='${esc(a.avatar)}',
        bio='${esc(a.bio)}',
        website='https://${a.username}.artcore.com',
        verified=TRUE,
        onboarding_done=TRUE,
        total_earned=${Math.floor(Math.random() * 50000) + 5000}
      WHERE id='${id}'
    `);

    // 4. Rôle artiste
    await sqlExec(`INSERT INTO public.user_roles (user_id, role) VALUES ('${id}', 'artist') ON CONFLICT DO NOTHING`);
    console.log(`  ✅ ${a.name} (${a.username}) — ${id}`);
    await sleep(400);
  }

  // ── ŒUVRES ──────────────────────────────────────────────────────────────
  console.log('\n🖼️  Insertion des œuvres...');
  let imageIndex = 0;
  let artworkCount = 0;

  for (const artist of ARTISTS) {
    const artistId = artistIds[artist.username];
    const templates = ARTWORK_TEMPLATES[artist.username] || [];

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const id = uuid();
      const img = ARTWORK_IMAGES[imageIndex % ARTWORK_IMAGES.length];
      imageIndex++;
      const priceInCents = t.price * 100;
      const isForSale = Math.random() > 0.2;
      const isForRent = t.cat !== 'sculpture' && Math.random() > 0.6;
      const rentalPrice = isForRent ? Math.floor(t.price * 0.005) * 100 : 0;
      const slug = slugify(t.title) + '-' + id.slice(0, 8);

      const { status, data } = await sqlExec(`
        INSERT INTO public.artworks (
          id, owner_id, artist_id, title, slug, description, medium, category,
          status, is_public, is_for_sale, is_for_rent,
          price, rental_price_per_day, image_url, watermarked_url,
          width_cm, height_cm, tags, published_at
        ) VALUES (
          '${id}', '${artistId}', '${artistId}',
          '${esc(t.title)}', '${esc(slug)}',
          '${esc(t.desc)}', '${esc(t.medium)}',
          '${t.cat}', 'listed', TRUE,
          ${isForSale}, ${isForRent},
          ${isForSale ? priceInCents : 0},
          ${rentalPrice},
          '${img}', '${img}',
          ${t.w || 0}, ${t.h || 0},
          ARRAY['${artist.style.split(' ')[0].toLowerCase()}','${t.cat}','original'],
          NOW() - INTERVAL '${Math.floor(Math.random() * 180)} days'
        ) ON CONFLICT (slug) DO NOTHING
      `);

      if (status === 201) {
        artworkCount++;
        process.stdout.write(`\r  ✅ ${artworkCount}/100 œuvres insérées`);
      } else {
        process.stdout.write(`\r  ⚠️  ${t.title.slice(0, 30)} ignoré`);
      }
      await sleep(250);
    }
  }
  console.log(`\n  → ${artworkCount} œuvres insérées\n`);

  // ── SCOUTS ──────────────────────────────────────────────────────────────
  console.log('🔭 Insertion des scouts...');
  const scoutIds = {};

  for (const s of SCOUTS_DATA) {
    const { status: authStatus, data: authData } = await createAuthUser(s.email, s.username, s.name);
    if (authStatus !== 200) { console.log(`  ⚠️  Auth skip ${s.name}`); await sleep(400); continue; }
    const userId = authData.id;
    const scoutId = uuid();
    scoutIds[s.username] = { userId, scoutId };

    await sleep(600);
    await sqlExec(`UPDATE public.users SET username='${esc(s.username)}', full_name='${esc(s.name)}', bio='${esc(s.bio)}', verified=TRUE, onboarding_done=TRUE, total_earned=${Math.floor(Math.random() * 15000) + 1000} WHERE id='${userId}'`);
    await sqlExec(`INSERT INTO public.user_roles (user_id, role) VALUES ('${userId}', 'scout') ON CONFLICT DO NOTHING`);

    const { status } = await sqlExec(`
      INSERT INTO public.scouts (id, user_id, subscription_plan, total_scouted, total_earned, active_bets)
      VALUES ('${scoutId}', '${userId}', '${s.plan}', ${Math.floor(Math.random() * 15) + 1}, ${Math.floor(Math.random() * 8000) + 500}, ${Math.floor(Math.random() * 5)})
      ON CONFLICT (user_id) DO NOTHING
    `);

    if (status === 201) console.log(`  ✅ ${s.name} (${s.plan})`);
    await sleep(400);
  }

  // ── LIENS D'AFFILIATION ──────────────────────────────────────────────────
  console.log('\n🔗 Génération de liens d\'affiliation...');
  const scoutEntries = Object.entries(scoutIds);
  for (let i = 0; i < Math.min(10, scoutEntries.length); i++) {
    const [username, { scoutId }] = scoutEntries[i];
    const code = username.slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    await sqlExec(`
      INSERT INTO public.affiliate_links (scout_id, code, clicks, conversions, earnings)
      VALUES ('${scoutId}', '${code}', ${Math.floor(Math.random() * 500)}, ${Math.floor(Math.random() * 20)}, ${Math.floor(Math.random() * 3000) * 100})
      ON CONFLICT (code) DO NOTHING
    `);
    await sleep(200);
  }
  console.log('  ✅ Liens d\'affiliation créés');

  // ── VÉRIFICATION FINALE ──────────────────────────────────────────────────
  console.log('\n📊 Résumé final...\n');
  const tables = ['users', 'artworks', 'scouts', 'affiliate_links'];
  for (const t of tables) {
    const { data } = await sqlExec(`SELECT count(*) FROM public.${t}`);
    const n = data?.[0]?.count || 0;
    console.log(`  ${t.padEnd(20)} ${n} enregistrements`);
  }

  console.log('\n✅ Seed terminé !');
  console.log('\n🚀 Prêt pour le déploiement Vercel...\n');
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
