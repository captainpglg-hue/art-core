-- ══════════════════════════════════════════════════════════
-- SEED DATA — Demo accounts + promo items + sample artworks
-- ══════════════════════════════════════════════════════════

-- Passwords are all "password123" hashed with bcrypt
-- $2a$10$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6

-- Demo Users
INSERT OR IGNORE INTO users (id, email, password_hash, name, username, role, bio, points_balance, total_earned, is_initie) VALUES
('usr_artist_1', 'artist@demo.com', '$2a$10$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6', 'Marie Dubois', 'marie.dubois', 'artist', 'Artiste peintre contemporaine, explorant les frontières entre abstraction et figuration.', 25, 150, 0),
('usr_artist_2', 'artist2@demo.com', '$2a$10$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6', 'Lucas Martin', 'lucas.martin', 'artist', 'Sculpteur et photographe. Mes oeuvres interrogent la matière et la lumière.', 40, 320, 0),
('usr_initie_1', 'initie@demo.com', '$2a$10$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6', 'Sophie Laurent', 'sophie.laurent', 'initiate', 'Passionnée d''art contemporain et collectionneuse avertie.', 45, 280, 1),
('usr_initie_2', 'initie2@demo.com', '$2a$10$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6', 'Thomas Bernard', 'thomas.bernard', 'initiate', 'Expert en art moderne, je repère les talents de demain.', 60, 450, 1),
('usr_client_1', 'client@demo.com', '$2a$10$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6', 'Jean Dupont', 'jean.dupont', 'client', 'Collectionneur amateur, à la recherche de pièces uniques.', 0, 0, 0),
('usr_admin_1', 'admin@artcore.com', '$2a$10$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6', 'Admin Core', 'admin', 'admin', 'Administrateur de la plateforme.', 0, 0, 0);

-- Promo Shop Items
INSERT OR IGNORE INTO promo_items (id, name, description, cost_points, type, duration_hours, icon) VALUES
('promo_boost', 'Boost Visibilité', 'Votre oeuvre apparaît en priorité dans les recherches pendant 24h.', 10, 'boost', 24, 'rocket'),
('promo_highlight', 'Mise en Avant', 'Oeuvre mise en avant sur la page d''accueil pendant 48h.', 20, 'highlight', 48, 'star'),
('promo_badge', 'Badge Premium', 'Badge doré visible sur votre oeuvre pendant 7 jours.', 15, 'badge', 168, 'award'),
('promo_search', 'Priorité Recherche', 'Apparaissez en tête des résultats de recherche pendant 72h.', 25, 'search_priority', 72, 'search'),
('promo_featured', 'Sélection Éditeur', 'Intégrez la sélection éditeur sur la page d''accueil pendant 24h.', 30, 'featured', 24, 'crown');

-- Sample Artworks (certified via Pass-Core)
INSERT OR IGNORE INTO artworks (id, title, artist_id, description, technique, dimensions, creation_date, category, photos, macro_photo, blockchain_hash, blockchain_tx_id, certification_date, status, price, gauge_points, gauge_locked, listed_at) VALUES
('art_001', 'Crépuscule Doré', 'usr_artist_1', 'Une exploration lumineuse du coucher de soleil sur la Méditerranée. Les tons dorés et pourpres se mêlent dans une danse de couleurs vibrantes.', 'Huile sur toile', '80x120 cm', '2024-06-15', 'painting', '["https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800", "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800"]', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200', '0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', 'tx_001_poly', '2024-07-01', 'for_sale', 4500, 72, 0, '2024-07-02'),
('art_002', 'Fragments Urbains', 'usr_artist_1', 'Collage mixte capturant l''énergie brute de la ville contemporaine. Papiers, acrylique et encre sur panneau.', 'Technique mixte', '60x90 cm', '2024-08-20', 'mixed_media', '["https://images.unsplash.com/photo-1549490349-8643362247b5?w=800", "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800"]', 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=200', '0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF', 'tx_002_poly', '2024-09-01', 'for_sale', 2800, 35, 0, '2024-09-02'),
('art_003', 'Silence Minéral', 'usr_artist_2', 'Sculpture en marbre de Carrare, forme organique évoquant le silence des pierres millénaires.', 'Sculpture marbre', '45x30x25 cm', '2024-05-10', 'sculpture', '["https://images.unsplash.com/photo-1554188248-986adbb73be4?w=800"]', 'https://images.unsplash.com/photo-1554188248-986adbb73be4?w=200', '0xFEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210', 'tx_003_poly', '2024-06-01', 'for_sale', 8500, 100, 1, '2024-06-05'),
('art_004', 'Ondes Parallèles', 'usr_artist_2', 'Photographie grand format en noir et blanc. Jeux de reflets sur l''eau captant des géométries invisibles.', 'Photographie argentique', '100x150 cm', '2024-10-01', 'photography', '["https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800"]', 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=200', '0x9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA', 'tx_004_poly', '2024-10-15', 'for_sale', 3200, 18, 0, '2024-10-16'),
('art_005', 'Éclats de Mémoire', 'usr_artist_1', 'Aquarelle abstraite jouant sur la transparence et les superpositions de couches colorées.', 'Aquarelle sur papier', '50x70 cm', '2024-11-01', 'painting', '["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800", "https://images.unsplash.com/photo-1482160549825-59d1b23cb208?w=800"]', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=200', '0x5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA', 'tx_005_poly', '2024-11-10', 'for_sale', 1800, 55, 0, '2024-11-11'),
('art_006', 'Horizon Intérieur', 'usr_artist_2', 'Installation vidéo projetée sur toile enduite. Exploration des paysages mentaux et de la contemplation.', 'Installation vidéo', '200x300 cm', '2024-03-15', 'digital', '["https://images.unsplash.com/photo-1459908676235-d5f02a50184b?w=800"]', 'https://images.unsplash.com/photo-1459908676235-d5f02a50184b?w=200', '0xAAAABBBBCCCCDDDDAAAABBBBCCCCDDDDAAAABBBBCCCCDDDDAAAABBBBCCCCDDDD', 'tx_006_poly', '2024-04-01', 'sold', 12000, 100, 1, '2024-04-05'),
('art_007', 'Résonance Bleue', 'usr_artist_1', 'Grande toile acrylique monochrome explorant les nuances infinies du bleu outremer.', 'Acrylique sur toile', '150x200 cm', '2025-01-05', 'painting', '["https://images.unsplash.com/photo-1549490349-8643362247b5?w=800"]', 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=200', '0x1111222233334444111122223333444411112222333344441111222233334444', 'tx_007_poly', '2025-01-15', 'for_sale', 6700, 45, 0, '2025-01-16'),
('art_008', 'Matière Première', 'usr_artist_2', 'Terre cuite émaillée représentant les forces primordiales de la nature.', 'Céramique', '35x40x30 cm', '2025-02-01', 'sculpture', '["https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800"]', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200', '0xDDDDEEEEFFFF0000DDDDEEEEFFFF0000DDDDEEEEFFFF0000DDDDEEEEFFFF0000', 'tx_008_poly', '2025-02-10', 'for_sale', 5200, 88, 0, '2025-02-11');

-- Gauge entries (initiates investing points)
INSERT OR IGNORE INTO gauge_entries (id, artwork_id, initiate_id, points, created_at) VALUES
('ge_001', 'art_001', 'usr_initie_1', 40, '2024-07-10'),
('ge_002', 'art_001', 'usr_initie_2', 32, '2024-07-15'),
('ge_003', 'art_002', 'usr_initie_1', 20, '2024-09-10'),
('ge_004', 'art_002', 'usr_initie_2', 15, '2024-09-12'),
('ge_005', 'art_003', 'usr_initie_1', 55, '2024-06-10'),
('ge_006', 'art_003', 'usr_initie_2', 45, '2024-06-15'),
('ge_007', 'art_004', 'usr_initie_1', 18, '2024-10-20'),
('ge_008', 'art_005', 'usr_initie_2', 30, '2024-11-15'),
('ge_009', 'art_005', 'usr_initie_1', 25, '2024-11-18'),
('ge_010', 'art_006', 'usr_initie_1', 60, '2024-04-10'),
('ge_011', 'art_006', 'usr_initie_2', 40, '2024-04-12'),
('ge_012', 'art_007', 'usr_initie_2', 25, '2025-01-20'),
('ge_013', 'art_007', 'usr_initie_1', 20, '2025-01-22'),
('ge_014', 'art_008', 'usr_initie_1', 48, '2025-02-15'),
('ge_015', 'art_008', 'usr_initie_2', 40, '2025-02-18');

-- Transaction for sold artwork (art_006)
INSERT OR IGNORE INTO transactions (id, artwork_id, buyer_id, seller_id, amount, commission_platform, status, created_at) VALUES
('tx_sale_001', 'art_006', 'usr_client_1', 'usr_artist_2', 12000, 1200, 'completed', '2024-05-01');

-- Commissions paid to initiates for art_006 sale
INSERT OR IGNORE INTO initiate_commissions (id, transaction_id, initiate_id, artwork_id, points_invested, percentage, commission_amount, paid_as_points, created_at) VALUES
('ic_001', 'tx_sale_001', 'usr_initie_1', 'art_006', 60, 60, 720, 720, '2024-05-01'),
('ic_002', 'tx_sale_001', 'usr_initie_2', 'art_006', 40, 40, 480, 480, '2024-05-01');

-- Betting markets (PRIME-CORE)
INSERT OR IGNORE INTO betting_markets (id, artwork_id, market_type, question, threshold_value, threshold_days, total_yes_amount, total_no_amount, odds_yes, odds_no, status, created_at) VALUES
('mkt_001', 'art_001', 'time', 'Crépuscule Doré sera-t-elle vendue en moins de 30 jours ?', NULL, 30, 45, 30, 1.67, 2.50, 'open', '2024-07-05'),
('mkt_002', 'art_001', 'value', 'Crépuscule Doré sera-t-elle vendue à plus de 5000€ ?', 5000, NULL, 20, 55, 3.75, 1.36, 'open', '2024-07-05'),
('mkt_003', 'art_003', 'time', 'Silence Minéral sera-t-il vendu en moins de 14 jours ?', NULL, 14, 80, 15, 1.19, 6.33, 'open', '2024-06-10'),
('mkt_004', 'art_003', 'value', 'Silence Minéral sera-t-il vendu à plus de 10000€ ?', 10000, NULL, 35, 40, 2.14, 1.88, 'open', '2024-06-10'),
('mkt_005', 'art_005', 'time', 'Éclats de Mémoire sera-t-elle vendue en moins de 60 jours ?', NULL, 60, 30, 25, 1.83, 2.20, 'open', '2024-11-15'),
('mkt_006', 'art_007', 'value', 'Résonance Bleue sera-t-elle vendue à plus de 7000€ ?', 7000, NULL, 15, 20, 2.33, 1.75, 'open', '2025-01-20'),
('mkt_007', 'art_008', 'time', 'Matière Première sera-t-elle vendue en moins de 21 jours ?', NULL, 21, 50, 20, 1.40, 3.50, 'open', '2025-02-15'),
('mkt_008', 'art_006', 'value', 'Horizon Intérieur vendu à plus de 10000€ ?', 10000, NULL, 60, 10, 1.00, 1.00, 'resolved_yes', '2024-04-08');

-- Sample bets
INSERT OR IGNORE INTO bets (id, market_id, user_id, position, amount, odds_at_bet, potential_payout, result, payout, created_at) VALUES
('bet_001', 'mkt_001', 'usr_initie_1', 'yes', 15, 1.67, 25.05, 'pending', 0, '2024-07-06'),
('bet_002', 'mkt_001', 'usr_initie_2', 'no', 10, 2.50, 25.00, 'pending', 0, '2024-07-07'),
('bet_003', 'mkt_002', 'usr_client_1', 'no', 20, 1.36, 27.20, 'pending', 0, '2024-07-08'),
('bet_004', 'mkt_003', 'usr_initie_1', 'yes', 30, 1.19, 35.70, 'pending', 0, '2024-06-12'),
('bet_005', 'mkt_008', 'usr_initie_2', 'yes', 25, 1.17, 29.25, 'won', 29.25, '2024-04-10');

-- Sample messages
INSERT OR IGNORE INTO messages (id, conversation_id, sender_id, receiver_id, artwork_id, content, read, created_at) VALUES
('msg_001', 'conv_001', 'usr_client_1', 'usr_artist_1', 'art_001', 'Bonjour, cette oeuvre est magnifique ! Est-il possible de la voir en personne ?', 1, '2024-07-20'),
('msg_002', 'conv_001', 'usr_artist_1', 'usr_client_1', 'art_001', 'Merci beaucoup ! Bien sûr, je peux organiser une visite à mon atelier. Quand seriez-vous disponible ?', 0, '2024-07-20'),
('msg_003', 'conv_002', 'usr_initie_1', 'usr_artist_2', 'art_003', 'La jauge est presque pleine sur Silence Minéral. Félicitations !', 1, '2024-06-18');

-- Notifications
INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, link, read, created_at) VALUES
('notif_001', 'usr_artist_1', 'gauge', 'Jauge en progression', 'La jauge de "Crépuscule Doré" a atteint 72 points !', '/art-core/oeuvre/art_001', 0, '2024-07-15'),
('notif_002', 'usr_initie_1', 'commission', 'Commission reçue', 'Vous avez reçu 720 pts de commission pour la vente de "Horizon Intérieur".', '/art-core/wallet', 1, '2024-05-01'),
('notif_003', 'usr_artist_2', 'sale', 'Oeuvre vendue !', '"Horizon Intérieur" a été vendue pour 12 000€.', '/art-core/oeuvre/art_006', 1, '2024-05-01');

-- Point transaction history
INSERT OR IGNORE INTO point_transactions (id, user_id, amount, type, reference_id, description, created_at) VALUES
('pt_001', 'usr_initie_1', 15, 'signup_bonus', NULL, 'Bonus de bienvenue initié', '2024-01-01'),
('pt_002', 'usr_initie_2', 15, 'signup_bonus', NULL, 'Bonus de bienvenue initié', '2024-01-05'),
('pt_003', 'usr_initie_1', -40, 'gauge_deposit', 'ge_001', 'Dépôt jauge: Crépuscule Doré', '2024-07-10'),
('pt_004', 'usr_initie_1', 720, 'commission', 'ic_001', 'Commission vente: Horizon Intérieur', '2024-05-01'),
('pt_005', 'usr_initie_2', 480, 'commission', 'ic_002', 'Commission vente: Horizon Intérieur', '2024-05-01');

-- Favorites
INSERT OR IGNORE INTO favorites (id, user_id, artwork_id, created_at) VALUES
('fav_001', 'usr_client_1', 'art_001', '2024-07-18'),
('fav_002', 'usr_client_1', 'art_003', '2024-06-20'),
('fav_003', 'usr_initie_1', 'art_005', '2024-11-20'),
('fav_004', 'usr_initie_2', 'art_001', '2024-07-12');
