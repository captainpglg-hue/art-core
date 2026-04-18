# Journal d'installation photo-v2 - 2026-04-18 16:25:52

## Contexte
Restauration des jauges qualite photo (resolution, nettete via Laplacien,
exposition, score 0-100) qui avaient disparu. La page pass-core/certifier
etait restee sur l'ancien monolithe de 921 lignes qui n'avait aucune jauge.

Le package photo-module-v2 existait sur disque mais n'avait jamais ete
installe (ou avait ete desinstalle par le commit e7e31ad du 8 avril).

## Fichiers copies
- pass-core/components/certifier/useCameraMacro.ts (useCameraMacro.ts) - pass-core/components/certifier/CaptureStep.tsx (CaptureStep.tsx (JAUGES temps reel)) - pass-core/components/certifier/PreviewStep.tsx (PreviewStep.tsx) - pass-core/components/certifier/ConfirmStep.tsx (ConfirmStep.tsx) - pass-core/app/pass-core/certifier/page.tsx (certifier/page.tsx (remplace monolithe 921 lignes)) - pass-core/app/api/fingerprint/route.ts (api/fingerprint/route.ts (dup detection)) - pass-core/lib/fingerprint.ts (pass-core/lib/fingerprint.ts) - art-core/lib/fingerprint.ts (art-core/lib/fingerprint.ts)

## Dependances
- sharp ^0.34.5 : deja dans pass-core/package.json
- lucide-react ^0.378.0 : deja dans pass-core/package.json
(Aucun npm install necessaire)

## SQL optionnel
Pour activer la detection de doublons pHash :
- executer sql/2026-04-18_photo-v2-columns.sql dans Supabase SQL Editor
- les jauges fonctionnent meme sans ce SQL (purement client-side)

## Rollback
Les 8 anciens fichiers sont dans archives/2026-04-18_photo-v2/old-versions/
Pour annuler : restore chacun depuis son archive.
