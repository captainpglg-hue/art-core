# Addendum au compte rendu d'évolution — décisions du 26 avril 2026

**Statut : décisions actées par Philippe le 26 avril 2026.**
**Ce document complète et précise le compte rendu d'évolution daté du même jour. Il acte trois choix structurants qui figuraient en section 4.3 (points à trancher) et qui passent en section 4.1 (décisions actées).**

---

## D1 — Stockage de la base chiffrée de patches : sur la plateforme

**Décision** : la base dense de 50 à 100 patches macro chiffrés est stockée sur l'infrastructure de la plateforme (Supabase Storage + chiffrement applicatif AES-GCM, clé dérivée HKDF de la `SUPABASE_SERVICE_ROLE_KEY`, comme spécifié dans le prompt phase A).

**Conséquences techniques**
- Architecture centralisée : une seule surface à durcir, une seule sauvegarde à gérer, un seul incident à traiter en cas de fuite.
- La plateforme devient le tiers de confiance opérationnel du protocole. Le contrat utilisateur doit le refléter (mention explicite dans les CGU et dans le parcours d'enrôlement).
- Plan de continuité indispensable : sauvegarde chiffrée géo-redondée (au minimum trois régions), procédure de restauration testée, rotation maîtrisée des clés de dérivation avec versionnage `derivation_version` en DB.
- Audit : journal d'accès immuable (`asset_access_log`) pour toute lecture de patch, exposable au propriétaire à la demande.

**Conséquences pitch**
- L'argument "verrou écosystème" devient légitime et défendable : la plateforme est techniquement le seul lecteur des patches secrets, donc l'authentification ne peut pas exister sans elle.
- Cet argument doit être présenté comme un choix conscient et assumé, pas comme une fatalité technique. La phrase de la fiche Triple-Check "Seule la plateforme détient la clé de lecture" peut être réintroduite dans la communication, en la qualifiant : "stockage centralisé chiffré, audit consultable par le propriétaire, plan de continuité industriel, possibilité d'export chiffré sur demande pour exécution testamentaire".

**Risques résiduels acceptés**
- Single point of failure logique : géré par redondance et sauvegardes.
- Cible d'attaque concentrée : géré par WAF, rate limiting, isolation réseau, rotation des secrets.
- Dépendance Supabase : un plan B sur AWS S3 + KMS doit être documenté pour garantir une migration possible en moins de 30 jours en cas de défaillance fournisseur.

---

## D2 — Financement des cartes ArUco : aide au parrainage bancaire

**Décision** : le coût unitaire des cartes de calibration physique (ISO 7810 polycarbonate, marqueurs ArUco haute précision, signes anti-contrefaçon) est absorbé via les programmes de parrainage et d'incentive bancaires négociés dans le cadre du term sheet en cours.

**Conséquences modèle économique**
- Coût cible carte : 3 à 8 € pièce à série moyenne, 1 à 2 € à série large. Compatible avec le mode ART (œuvre 5 000 €+) sans répercussion utilisateur.
- Le parrainage bancaire couvre l'émission initiale et la première rotation par vente. Au-delà, le coût est intégré à la commission plateforme.
- Argument à intégrer au pitch banque : la carte est un objet physique de marque cobrandée banque + plateforme, distribué à une clientèle haut-de-gamme captive (collectionneurs), qui devient un point de contact tangible — équivalent fonctionnel d'une carte premium.

**Conséquences opérationnelles**
- Identification du fournisseur d'impression industrielle : à inclure dans la phase E (prospection partenaires) du RFC v2.2.
- Lien à formaliser entre l'identité bancaire du propriétaire et l'émission de la carte (KYC déjà fait par la banque, donc pas de doublon côté plateforme pour les comptes parrainés).
- Comptabilisation : les cartes parrainées sont une charge prise en compte dans le P&L de la phase pilote ART, financée par la ligne "marketing partenarial bancaire" du term sheet.

**Sujet à valider avec la banque**
- Volume annuel cible et engagement plancher.
- Modalités de cobranding (logo, tranches de couleur, mention "carte d'authentification — émis avec [Banque]").
- Traçabilité comptable des cartes émises sous parrainage.

---

## D3 — Carte ArUco spécifique au mode ART, multi-modes maintenu

**Décision** : la carte de calibration ArUco et le protocole associé (carte présente dans le cadre, re-enrôlement à chaque vente, base dense de patches) **sont propres au mode ART**. Les modes TCG et VÉLO conservent les protocoles spécifiques définis au RFC v2.2 phases 1 et 3.

**Cartographie protocolaire par mode**

| Mode | Protocole de capture | Référentiel de calibration | Re-enrôlement |
|---|---|---|---|
| TCG (phase 1) | bbox globale + 3 zones macro fixes | gabarit logiciel (taille standard 63 × 88 mm connue) | aucun (la carte ne change pas de propriétaire au sens cryptographique : achat = remise simple) |
| VÉLO (phase 3) | 3 zones-cibles fixes sur cadre (tube de direction / boîtier de pédalier / patte arrière) | dimensions standardisées du cadre + référentiel matériau | déclenché par révision/changement de propriétaire FNUCI |
| ART (phase 4) | carte de calibration ArUco présente dans le cadre, base dense 50–100 patches, tirage aléatoire de 3 patches par vente | marqueurs ArUco physiques sur la carte ISO 7810 | systématique à chaque vente |

**Conséquences techniques**
- Le code partage la couche basse (calcul descripteurs DINOv2, stockage chiffré, signature blockchain) entre les trois modes.
- La couche capture est polymorphe : un module `capture/strategy/` avec trois implémentations (TcgCaptureStrategy, BikeCaptureStrategy, ArtCaptureStrategy) sélectionnées via le `mode_id` de l'œuvre.
- La table `asset_macros` accepte tous les modes, le champ `capture_strategy` distinguant la méthode utilisée à l'enrôlement.
- L'introduction du protocole ArUco (carte) ne touche pas le code de la phase A TCG. Phase A reste exécutable telle que prévue.

**Conséquences communication**
- À chaque mention publique de "la carte de calibration", préciser "(mode ART)". Sinon, dev et investisseurs supposeront à tort que la carte est universelle.
- Le pitch global présente une matrice 3 modes × 3 protocoles, en mettant en avant la cohérence (un même socle DB et crypto, trois adaptations métier) plutôt que l'uniformité (qui serait fausse).
- Le mode VÉLO conserve sa narrative propre (loi LOM, TAM 3M vélos/an, partenariat opérateur FNUCI), indépendamment du protocole ART.

---

## Intégration dans la roadmap

La séquence du RFC v2.2 reste valide et n'est pas perturbée par ces décisions :

- **Phase A — TCG MVP** (déjà spécifiée dans le prompt Claude Code) : aucun changement. Le protocole TCG est totalement indépendant de la carte ArUco. Démarrable dès maintenant.
- **Phase F — VÉLO MVP** : aucun changement. Le protocole VÉLO est totalement indépendant de la carte ArUco.
- **Phase H — ART** : à respecifier intégralement autour du protocole carte ArUco. Le travail de cette phase intègre les composants nouveaux : émission de cartes, lecture ArUco temps réel, base dense de patches, re-enrôlement à chaque vente, intégration parrainage bancaire.

Pour la phase H, les composants techniques additionnels à prévoir :
- détection ArUco temps réel (OpenCV `aruco.detectMarkers`, dictionnaire DICT_5X5_1000, validation de la pose homographique calculée à partir des 4 marqueurs) ;
- API d'émission de carte (génération de l'identifiant, lien au certificat blockchain, génération du fichier d'impression conforme spec fournisseur) ;
- intégration fournisseur de cartes (commande, suivi, livraison nominative au propriétaire) ;
- protocole de révocation de carte (perte, destruction, succession) — listé en 4.3 du compte rendu, à figer en phase H ;
- module `art_enrollment` côté mobile : guidage caméra macro, capture séquentielle des 50–100 patches, contrôle de couverture par l'application, chiffrement et upload de la base.

---

## Mise à jour à apporter au compte rendu maître

Trois modifications à reporter dans `compte_rendu_evolution_projet.docx` :

**1. Section 4.1 (décisions actées)** — ajouter trois lignes :
- "Stockage centralisé chiffré de la base dense de patches sur l'infrastructure plateforme."
- "Financement des cartes de calibration via parrainage bancaire — coût absorbé hors utilisateur final."
- "Carte de calibration ArUco spécifique au mode ART. Modes TCG et VÉLO conservent leurs protocoles propres sans carte physique."

**2. Section 4.3 (points ouverts)** — retirer les trois items correspondants, ajouter un nouveau : "Spécification fine du protocole de révocation de carte (perte, destruction, succession internationale) à figer en phase H."

**3. Section 7 (communication externe)** — préciser : "La fiche révisée distingue explicitement le protocole ART (avec carte ArUco) des protocoles TCG et VÉLO (sans carte). Toute mention de la carte mentionne le mode ART entre parenthèses."

---

## Action côté code

Aucune action de code immédiate n'est rendue nécessaire par ces décisions. La phase A TCG reste prioritaire et exécutable. Les éléments techniques ART seront introduits en phase H, dont le démarrage est subordonné à la validation préalable de TCG (et idéalement de VÉLO).

Si tu souhaites que ces décisions soient committées dans le repo (par exemple comme `docs/architecture/decisions/2026-04-26-D1-D2-D3.md`), je peux te préparer le prompt court correspondant à exécuter dans Claude Code. Ça permet à toute personne reprenant le projet plus tard de voir l'historique des décisions, sans avoir à fouiller dans des emails ou des comptes rendus dispersés.
