#!/usr/bin/env node
// Insert 100 artworks using existing artist IDs from DB
const https = require('https');
const PAT = 'sbp_85360682b077f687cb720a83ae40aff699010a0c';
const REF = 'kmmlwuwsahtzgzztcdaj';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function esc(s) { return s ? String(s).replace(/'/g, "''") : ''; }
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
function slugify(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }

function sql(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const opts = { hostname: 'api.supabase.com', path: '/v1/projects/' + REF + '/database/query', method: 'POST', headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 30000 };
    const req = https.request(opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve({ status: r.statusCode, data: (() => { try { return JSON.parse(d); } catch { return d; } })() })); });
    req.on('error', reject); req.write(body); req.end();
  });
}

const IMGS = [
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

const AW = [
  { a: 'camille_b', t: 'Memoire vive 3', d: 'Acrylique et huile sur toile. Exploration de la memoire fragmentee.', m: 'Acrylique et huile sur toile', c: 'painting', p: 420000, w: 120, h: 150 },
  { a: 'camille_b', t: 'Confluence urbaine', d: 'Composition architecturale melant photographie et peinture.', m: 'Technique mixte sur toile', c: 'painting', p: 780000, w: 180, h: 120 },
  { a: 'camille_b', t: 'Invisible Present', d: 'Diptyque explorant la dualite entre presence et absence.', m: 'Huile sur panneau', c: 'painting', p: 560000, w: 80, h: 100 },
  { a: 'camille_b', t: 'Sedimentation 7', d: 'Oeuvre abstraite construite par accumulation de matieres.', m: 'Technique mixte', c: 'painting', p: 310000, w: 90, h: 110 },
  { a: 'camille_b', t: 'Territoire interieur', d: 'Peinture gestuelle inspiree des paysages mentaux.', m: 'Acrylique sur toile', c: 'painting', p: 620000, w: 160, h: 140 },
  { a: 'camille_b', t: 'Resonances bleues', d: 'Meditation chromatique en bleu cobalt.', m: 'Huile sur toile', c: 'painting', p: 890000, w: 200, h: 160 },
  { a: 'camille_b', t: 'Fragments d apres', d: 'Collage pictural archives familiales et peinture contemporaine.', m: 'Collage et acrylique', c: 'mixed_media', p: 280000, w: 60, h: 80 },
  { a: 'camille_b', t: 'Ligne horizon', d: 'Paysage abstrait monumental entre terre et ciel.', m: 'Huile et pastel sur toile', c: 'painting', p: 1200000, w: 240, h: 100 },
  { a: 'camille_b', t: 'Portrait absence', d: 'Figuration evanescente - le sujet se dissout dans la matiere.', m: 'Huile sur toile', c: 'painting', p: 450000, w: 80, h: 100 },
  { a: 'camille_b', t: 'Palimpseste 2', d: 'Oeuvre sur toile ancienne recuperee, couches successives.', m: 'Huile sur toile ancienne', c: 'painting', p: 920000, w: 100, h: 130 },
  { a: 'marco_ferretti', t: 'Forme primordiale I', d: 'Sculpture en marbre de Carrare blanc. Formes biomorphiques.', m: 'Marbre de Carrare', c: 'sculpture', p: 2800000, w: 40, h: 80 },
  { a: 'marco_ferretti', t: 'Tension dynamique', d: 'Bronze patine - deux forces opposees en equilibre precaire.', m: 'Bronze patine', c: 'sculpture', p: 1500000, w: 30, h: 60 },
  { a: 'marco_ferretti', t: 'L Eveil', d: 'Figure humaine en albatre translucide. Edition de 3.', m: 'Albatre', c: 'sculpture', p: 2200000, w: 25, h: 70 },
  { a: 'marco_ferretti', t: 'Vortex', d: 'Sculpture cinetique en acier inoxydable bross.', m: 'Acier inoxydable', c: 'sculpture', p: 1850000, w: 50, h: 90 },
  { a: 'marco_ferretti', t: 'Archetype 4', d: 'Fragments de marbre evoquant des vestiges archeologiques.', m: 'Marbre et resine', c: 'sculpture', p: 980000, w: 35, h: 45 },
  { a: 'marco_ferretti', t: 'Continuum', d: 'Installation de neuf elements en terre cuite emaillee.', m: 'Terre cuite emaillee', c: 'sculpture', p: 3500000, w: 200, h: 60 },
  { a: 'marco_ferretti', t: 'Genese', d: 'Granit noir poli sur lequel emergent des formes figuratives.', m: 'Granit noir de Suede', c: 'sculpture', p: 4200000, w: 45, h: 100 },
  { a: 'marco_ferretti', t: 'Petite Venus', d: 'Figurine en marbre rose du Portugal.', m: 'Marbre rose du Portugal', c: 'sculpture', p: 840000, w: 15, h: 35 },
  { a: 'marco_ferretti', t: 'Mouvement perpetuel', d: 'Composition abstraite en bronze a la cire perdue.', m: 'Bronze a la cire perdue', c: 'sculpture', p: 1900000, w: 40, h: 75 },
  { a: 'marco_ferretti', t: 'Dualite', d: 'Diptyque sculptural en marbre blanc et noir.', m: 'Marbre blanc et noir', c: 'sculpture', p: 3100000, w: 60, h: 80 },
  { a: 'aicha_benali', t: 'Entre deux rives', d: 'Serie photographique entre Tanger et Tarifa. Tirage argentique.', m: 'Photographie argentique', c: 'photography', p: 180000, w: 100, h: 70 },
  { a: 'aicha_benali', t: 'Femmes du Derb', d: 'Portrait intime de femmes artisanes de Fes. Tirage baryte.', m: 'Photographie noir et blanc', c: 'photography', p: 240000, w: 80, h: 60 },
  { a: 'aicha_benali', t: 'Chronologie d un exil', d: 'Diaporama photographique - trois generations de migration maghrebine.', m: 'Installation photographique', c: 'photography', p: 1200000, w: 0, h: 0 },
  { a: 'aicha_benali', t: 'Mediterranee vue d en bas', d: 'Photographies sous-marines des epaves de traversees migratoires.', m: 'Photographie couleur', c: 'photography', p: 320000, w: 120, h: 80 },
  { a: 'aicha_benali', t: 'Henna et Pixels', d: 'Dyptique confrontant tatouages au henne et interfaces numeriques.', m: 'Photographie pigmentaire', c: 'photography', p: 210000, w: 60, h: 90 },
  { a: 'aicha_benali', t: 'Portraits d absents', d: 'Silhouettes fantomatiques d immigrants. Serie de 12 tirages.', m: 'Photographie argentique', c: 'photography', p: 850000, w: 50, h: 60 },
  { a: 'aicha_benali', t: 'Jardin suspendu', d: 'Jardins potagers sur les terrasses d immeubles HLM.', m: 'Photographie couleur', c: 'photography', p: 160000, w: 90, h: 60 },
  { a: 'aicha_benali', t: 'Detroit au crepuscule', d: 'Serie panoramique du detroit de Gibraltar. Six tirages.', m: 'Photographie panoramique', c: 'photography', p: 480000, w: 180, h: 60 },
  { a: 'aicha_benali', t: 'Invisible 3', d: 'Autoportrait conceptuel - visibilite sociale des femmes immigrees.', m: 'Photographie pigmentaire', c: 'photography', p: 340000, w: 70, h: 90 },
  { a: 'aicha_benali', t: 'Memoire des pierres', d: 'Photographies des medinas marocaines avec archives coloniales.', m: 'Photographie et archive', c: 'photography', p: 520000, w: 80, h: 100 },
  { a: 'lena_hoff', t: 'Neural Garden 12', d: 'Algorithme generatif combine a la peinture a l huile.', m: 'Impression numerique et huile', c: 'digital', p: 380000, w: 100, h: 100 },
  { a: 'lena_hoff', t: 'Data Landscape', d: 'Visualisation de donnees climatiques en paysage pictural.', m: 'Art numerique', c: 'digital', p: 520000, w: 140, h: 90 },
  { a: 'lena_hoff', t: 'Algorithme et Matiere', d: 'Processus generatif imprime et retravaille a la main.', m: 'Technique mixte numerique', c: 'mixed_media', p: 410000, w: 80, h: 80 },
  { a: 'lena_hoff', t: 'Bruit rose', d: 'Composition sur le bruit de Perlin generant des formes organiques.', m: 'Impression numerique', c: 'digital', p: 120000, w: 60, h: 80 },
  { a: 'lena_hoff', t: 'Ville fractale', d: 'Architecture urbaine reinventee par algorithmes fractals.', m: 'Art numerique', c: 'digital', p: 290000, w: 120, h: 80 },
  { a: 'lena_hoff', t: 'Portrait augmente 7', d: 'Portrait transforme par reseaux de neurones et peint a l huile.', m: 'Photographie et huile', c: 'mixed_media', p: 680000, w: 60, h: 80 },
  { a: 'lena_hoff', t: 'Chaos organise', d: 'Systemes dynamiques chaotiques en compositions visuelles.', m: 'Impression pigmentaire', c: 'digital', p: 190000, w: 100, h: 100 },
  { a: 'lena_hoff', t: 'Esprit de la machine', d: 'Installation de 9 ecrans - reseau de neurones apprenant a peindre.', m: 'Installation video', c: 'digital', p: 2800000, w: 0, h: 0 },
  { a: 'lena_hoff', t: 'Pixelisation du reel', d: 'Photographies de Berlin progressivement pixelisees. 12 tirages.', m: 'Photographie numerique', c: 'photography', p: 230000, w: 80, h: 60 },
  { a: 'lena_hoff', t: 'Entropie bleue', d: 'Simulation de systemes thermodynamiques en nuages colores.', m: 'Art generatif', c: 'digital', p: 340000, w: 90, h: 90 },
  { a: 'yusuf_ade', t: 'Ife Rising', d: 'Peinture monumentale celebrant la civilisation du Benin precoloniale.', m: 'Huile et feuille or sur lin', c: 'painting', p: 4500000, w: 250, h: 200 },
  { a: 'yusuf_ade', t: 'Lagos by Night', d: 'Composition nocturne de Lagos saturee d energie.', m: 'Acrylique sur toile', c: 'painting', p: 1800000, w: 180, h: 130 },
  { a: 'yusuf_ade', t: 'Diaspora I', d: 'Premier volet d une trilogie sur la diaspora africaine.', m: 'Huile sur toile', c: 'painting', p: 2200000, w: 160, h: 140 },
  { a: 'yusuf_ade', t: 'Ancestral Voices', d: 'Masques Yoruba emergent d un fond gestuel contemporain.', m: 'Technique mixte sur toile', c: 'painting', p: 1400000, w: 120, h: 150 },
  { a: 'yusuf_ade', t: 'Market Women', d: 'Portraits de femmes commericantes du marche de Lagos.', m: 'Acrylique sur toile', c: 'painting', p: 980000, w: 140, h: 100 },
  { a: 'yusuf_ade', t: 'Afrofuture', d: 'Vision utopique d une Afrique technologiquement avancee.', m: 'Huile et acrylique sur toile', c: 'painting', p: 3200000, w: 200, h: 160 },
  { a: 'yusuf_ade', t: 'Sacred Geometry', d: 'Motifs geometriques de l art islamique d Afrique de l Ouest.', m: 'Acrylique et or sur panneau', c: 'painting', p: 1100000, w: 80, h: 80 },
  { a: 'yusuf_ade', t: 'The Bridge', d: 'Pont entre Afrique et diaspora. Grand format.', m: 'Huile sur toile', c: 'painting', p: 2700000, w: 210, h: 140 },
  { a: 'yusuf_ade', t: 'Carnival', d: 'Carnaval de Notting Hill comme rite d affirmation identitaire.', m: 'Acrylique sur toile', c: 'painting', p: 850000, w: 120, h: 90 },
  { a: 'yusuf_ade', t: 'Silence Before Storm', d: 'Paysage du delta du Niger avant l industrialisation petroliere.', m: 'Huile sur toile', c: 'painting', p: 1600000, w: 150, h: 110 },
  { a: 'sakura_t', t: 'Bol a the Wabi 3', d: 'Bol a the (chawan) realise selon la technique du Raku.', m: 'Ceramique Raku', c: 'ceramics', p: 240000, w: 15, h: 10 },
  { a: 'sakura_t', t: 'Vase fleurs fantomes', d: 'Grand vase soliflore en gres porcelaine avec glacure celadon.', m: 'Gres porcelaine', c: 'ceramics', p: 380000, w: 20, h: 45 },
  { a: 'sakura_t', t: 'Jardin de pierre', d: '15 galets en ceramique emaillee evoquant un jardin zen.', m: 'Ceramique emaillee', c: 'ceramics', p: 520000, w: 60, h: 5 },
  { a: 'sakura_t', t: 'Kintsugi contemporain', d: 'Piece reparee a l or selon la technique ancestrale du Kintsugi.', m: 'Porcelaine et or', c: 'ceramics', p: 410000, w: 25, h: 20 },
  { a: 'sakura_t', t: 'Bol de lune', d: 'Grand bol spherique en porcelaine blanche d une purete absolue.', m: 'Porcelaine', c: 'ceramics', p: 680000, w: 35, h: 30 },
  { a: 'sakura_t', t: 'Vases communicants', d: 'Trois vases lies par une glacure coulante continue.', m: 'Gres et glacure', c: 'ceramics', p: 890000, w: 80, h: 30 },
  { a: 'sakura_t', t: 'Empreintes ceramique', d: 'Plaques de gres portant empreintes de mains et feuilles.', m: 'Gres chamotte', c: 'ceramics', p: 180000, w: 40, h: 30 },
  { a: 'sakura_t', t: 'Ciel d encre', d: 'Grand plat en porcelaine avec glacure noire et etoiles dorees.', m: 'Porcelaine cuisson bois', c: 'ceramics', p: 560000, w: 45, h: 8 },
  { a: 'sakura_t', t: 'Formes primaires', d: 'Cinq pieces explorant les formes geometriques fondamentales.', m: 'Gres emaille', c: 'ceramics', p: 720000, w: 30, h: 30 },
  { a: 'sakura_t', t: 'Zen Garden Bowl', d: 'Grand bol de meditation incise de mantras en calligraphie japonaise.', m: 'Porcelaine de Kyoto', c: 'ceramics', p: 320000, w: 30, h: 15 },
  { a: 'pablo_mendoza', t: 'Barcelona Viva', d: 'Grande peinture murale portative 3m x 2m. Vie dans les rues du Raval.', m: 'Acrylique sur toile', c: 'painting', p: 3800000, w: 300, h: 200 },
  { a: 'pablo_mendoza', t: 'Frontera invisible', d: 'Frontieres invisibles entre communautes urbaines.', m: 'Technique mixte sur bois', c: 'mixed_media', p: 1200000, w: 160, h: 100 },
  { a: 'pablo_mendoza', t: 'El Barrio vive', d: 'Portrait d un quartier barcelonais menace par la gentrification.', m: 'Spray et acrylique sur metal', c: 'painting', p: 850000, w: 120, h: 80 },
  { a: 'pablo_mendoza', t: 'Mediterraneo', d: 'Cultures mediterraneennes en couleurs et motifs geometriques.', m: 'Huile sur toile', c: 'painting', p: 620000, w: 140, h: 100 },
  { a: 'pablo_mendoza', t: 'Migracion', d: 'Fragments de cartes geographiques evoquant les migrations.', m: 'Technique mixte', c: 'installation', p: 2200000, w: 0, h: 0 },
  { a: 'pablo_mendoza', t: 'La Plaza', d: 'Vie quotidienne d une place publique espagnole.', m: 'Huile sur toile', c: 'painting', p: 1500000, w: 180, h: 120 },
  { a: 'pablo_mendoza', t: 'Ramblas nocturnas', d: 'Vue nocturne de la Rambla barcelonaise en style expressionniste.', m: 'Acrylique sur toile', c: 'painting', p: 980000, w: 100, h: 140 },
  { a: 'pablo_mendoza', t: 'Arte callejero', d: '6 photographies de fresques murales en voie de disparition.', m: 'Photographie pigmentaire', c: 'photography', p: 320000, w: 80, h: 60 },
  { a: 'pablo_mendoza', t: 'Homenaje a Miro', d: 'Hommage a Joan Miro avec son vocabulaire de formes organiques.', m: 'Acrylique sur panneau', c: 'painting', p: 740000, w: 90, h: 90 },
  { a: 'pablo_mendoza', t: 'Arquitectura sonada', d: 'Peinture combinant modernisme catalan et visions futuristes.', m: 'Huile et acrylique', c: 'painting', p: 1150000, w: 120, h: 160 },
  { a: 'ingrid_l', t: 'Aurora Borealis', d: 'Installation immersive de fibres optiques recreant les aurores boreales.', m: 'Installation lumineuse', c: 'installation', p: 8500000, w: 400, h: 300 },
  { a: 'ingrid_l', t: 'Glace vive', d: 'Glaciers norvegiens en fonte sur 10 ans. Urgence climatique.', m: 'Photographie', c: 'photography', p: 420000, w: 120, h: 80 },
  { a: 'ingrid_l', t: 'Soleil de minuit', d: 'Soleil de minuit sur les fjords. Lumiere blanche et bleue.', m: 'Huile sur lin', c: 'painting', p: 1800000, w: 200, h: 100 },
  { a: 'ingrid_l', t: 'Tempete arctique', d: 'Violence et beaute d une tempete en mer de Barents.', m: 'Huile sur toile', c: 'painting', p: 1200000, w: 150, h: 120 },
  { a: 'ingrid_l', t: 'Foret de bouleaux', d: 'Foret de bouleaux en automne - lignes verticales et or.', m: 'Photographie numerique', c: 'photography', p: 280000, w: 100, h: 150 },
  { a: 'ingrid_l', t: 'Son du fjord', d: 'Sculpture sonore aux frequences naturelles du fjord de Bergen.', m: 'Sculpture sonore', c: 'installation', p: 3500000, w: 0, h: 0 },
  { a: 'ingrid_l', t: 'Brume d ete', d: 'Brume legere sur un fjord en juillet. Lumiere diffuse et apaisante.', m: 'Huile sur toile', c: 'painting', p: 950000, w: 130, h: 80 },
  { a: 'ingrid_l', t: 'Lichen et Roc', d: 'Photos macro de lichens sur roches alpines.', m: 'Photographie macro', c: 'photography', p: 190000, w: 60, h: 60 },
  { a: 'ingrid_l', t: 'Nuit polaire', d: 'Nuit polaire arctique - obscurite et reflets sur la neige.', m: 'Huile sur toile', c: 'painting', p: 1400000, w: 160, h: 100 },
  { a: 'ingrid_l', t: 'Permafrost', d: 'Blocs de glace artificielle contenant des objets du quotidien.', m: 'Installation', c: 'installation', p: 4200000, w: 0, h: 0 },
  { a: 'zhao_wei_art', t: 'Encre et vide 8', d: 'Encre de Chine sur papier xuan. Le vide comme presence active.', m: 'Encre sur papier xuan', c: 'painting', p: 850000, w: 70, h: 100 },
  { a: 'zhao_wei_art', t: 'Montagne et nuage', d: 'Paysage imaginaire en encre et pigments mineraux sur soie.', m: 'Encre et pigments sur soie', c: 'painting', p: 1400000, w: 120, h: 80 },
  { a: 'zhao_wei_art', t: 'Calligraphie du chaos', d: 'Gestes calligraphiques abstraits a l encre noire sur papier blanc.', m: 'Encre sur papier', c: 'painting', p: 620000, w: 80, h: 120 },
  { a: 'zhao_wei_art', t: 'Pivoine de Shanghai', d: 'Peinture botanique en technique gongbi sur papier dore.', m: 'Encre et or sur papier', c: 'painting', p: 980000, w: 60, h: 90 },
  { a: 'zhao_wei_art', t: 'Reve de papillon', d: 'Diptyque inspire de Zhuangzi - frontiere entre reve et realite.', m: 'Encre et aquarelle', c: 'painting', p: 1800000, w: 140, h: 100 },
  { a: 'zhao_wei_art', t: 'Nouvelle encre', d: 'Peinture a l encre traditionnelle et composition numerique.', m: 'Encre et impression numerique', c: 'mixed_media', p: 1100000, w: 100, h: 80 },
  { a: 'zhao_wei_art', t: 'Dragon de mer', d: 'Composition mythologique d un dragon des mers.', m: 'Encre sur papier xuan', c: 'painting', p: 2200000, w: 180, h: 120 },
  { a: 'zhao_wei_art', t: 'Bambouseraie', d: 'Bambous au vent - maitrise absolue du trait.', m: 'Encre sur papier', c: 'painting', p: 540000, w: 60, h: 100 },
  { a: 'zhao_wei_art', t: 'Ville fantome', d: 'Shanghai rendu en encre vaporeuse comme paysage de montagne.', m: 'Encre et lavis', c: 'painting', p: 1650000, w: 150, h: 90 },
  { a: 'zhao_wei_art', t: 'Abstraction zen', d: 'Minimalisme - l espace entre les gestes.', m: 'Encre sur papier', c: 'painting', p: 720000, w: 90, h: 70 },
  { a: 'elena_v', t: 'Tejido de memorias', d: 'Tapisserie tissee avec fibres naturelles teintes aux pigments vegetaux.', m: 'Tapisserie fibres naturelles', c: 'textile', p: 1600000, w: 180, h: 200 },
  { a: 'elena_v', t: 'Huipil contemporain', d: 'Reinterpretation du vetement rituel indigene colombien.', m: 'Textile et broderie', c: 'textile', p: 850000, w: 80, h: 120 },
  { a: 'elena_v', t: 'Racines', d: 'Installation de cordages pendant du plafond, contenant des graines.', m: 'Installation textile', c: 'installation', p: 2800000, w: 0, h: 0 },
  { a: 'elena_v', t: 'Cartographie du Corps', d: 'Broderie sur soie representant une cartographie du corps feminin.', m: 'Broderie sur soie', c: 'textile', p: 520000, w: 60, h: 80 },
  { a: 'elena_v', t: 'Amazonia', d: 'Tapisserie evoquant la foret amazonienne a travers motifs Wayuu.', m: 'Tapisserie Wayuu', c: 'textile', p: 1200000, w: 150, h: 180 },
  { a: 'elena_v', t: 'Textiles politiques', d: '6 pieces tissees avec slogans feministes en langues indigenes.', m: 'Tissu et broderie', c: 'textile', p: 980000, w: 100, h: 60 },
  { a: 'elena_v', t: 'Nid textile', d: 'Sculpture textile suspendue en forme de nid geant.', m: 'Sculpture textile', c: 'textile', p: 1800000, w: 80, h: 60 },
  { a: 'elena_v', t: 'Voyage vegetal', d: 'Plantes sechees, fibres et pigments naturels de la jungle.', m: 'Technique mixte naturelle', c: 'mixed_media', p: 420000, w: 70, h: 90 },
  { a: 'elena_v', t: 'Tissage du temps', d: 'Oeuvre en cours depuis 5 ans - archive vivante.', m: 'Tapisserie evolutive', c: 'textile', p: 3500000, w: 120, h: 160 },
  { a: 'elena_v', t: 'Molas contemporaines', d: 'Reinterpretation des Molas Kuna en format contemporain.', m: 'Applique textile', c: 'textile', p: 380000, w: 60, h: 60 },
];

async function main() {
  // Get existing artist IDs
  const { data: users } = await sql(
    "SELECT username, id FROM public.users WHERE username IN ('camille_b','marco_ferretti','aicha_benali','lena_hoff','yusuf_ade','sakura_t','pablo_mendoza','ingrid_l','zhao_wei_art','elena_v')"
  );
  if (!users || !users.length) { console.error('No artists found!'); process.exit(1); }
  const IDS = {};
  users.forEach(u => IDS[u.username] = u.id);
  console.log('Artists found:', Object.keys(IDS).length, '/', 10);

  console.log('Inserting 100 artworks...');
  let ok = 0;
  for (let i = 0; i < AW.length; i++) {
    const aw = AW[i];
    const artistId = IDS[aw.a];
    if (!artistId) { console.log('SKIP no ID for', aw.a); continue; }
    const id = uuid();
    const img = IMGS[i % IMGS.length];
    const slug = slugify(aw.t) + '-' + id.slice(0, 8);
    const isForSale = Math.random() > 0.1;
    const isForRent = aw.c !== 'sculpture' && aw.c !== 'installation' && Math.random() > 0.6;
    const rentalPrice = isForRent ? Math.floor(aw.p * 0.005) : 0;
    const days = Math.floor(Math.random() * 300);

    const { status, data } = await sql(
      `INSERT INTO public.artworks (id,owner_id,artist_id,title,slug,description,medium,category,status,is_public,is_for_sale,is_for_rent,price,rental_price_per_day,image_url,watermarked_url,width_cm,height_cm,tags,published_at) VALUES ('${id}','${artistId}','${artistId}','${esc(aw.t)}','${esc(slug)}','${esc(aw.d)}','${esc(aw.m)}','${aw.c}','listed',TRUE,${isForSale},${isForRent},${isForSale ? aw.p : 0},${rentalPrice},'${img}','${img}',${aw.w},${aw.h},ARRAY['${aw.c}','original'],NOW() - INTERVAL '${days} days') ON CONFLICT (slug) DO NOTHING`
    );
    if (status === 201) { ok++; process.stdout.write('\r  ✅ ' + ok + '/100'); }
    else process.stdout.write('\r  ⚠️  ' + ok + '/100 ' + (typeof data === 'object' ? data.message : '').slice(0, 40));
    await sleep(250);
  }

  console.log('\n');
  const tables = ['users', 'artworks', 'scouts', 'affiliate_links'];
  for (const t of tables) {
    const { data } = await sql('SELECT count(*) FROM public.' + t);
    console.log(' ', t.padEnd(20), data?.[0]?.count, 'records');
  }
  console.log('\n✅ Done!');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
