-- DRAFT - Convertir transfer_type (text libre) en enum strict

BEGIN;

-- 1. Verifier les valeurs existantes (a executer manuellement avant migration)
-- SELECT DISTINCT transfer_type, COUNT(*) FROM ownership_transfers GROUP BY transfer_type;
-- En prod : gift (60), certification (31), sale (1)

CREATE TYPE transfer_type_enum AS ENUM (
  'gift',          -- donation, transfert sans contrepartie
  'certification', -- creation initiale du passeport
  'sale',          -- vente Stripe (la cible)
  'inheritance',   -- heritage
  'restoration',   -- changement de garde pour restauration
  'admin'          -- reaffectation admin
);

-- 2. Migration de la colonne (avec fallback 'gift' si valeur non reconnue)
ALTER TABLE ownership_transfers 
  ALTER COLUMN transfer_type TYPE transfer_type_enum 
  USING CASE 
    WHEN transfer_type IN ('gift','certification','sale','inheritance','restoration','admin') 
      THEN transfer_type::transfer_type_enum
    ELSE 'gift'::transfer_type_enum
  END,
  ALTER COLUMN transfer_type SET NOT NULL;

COMMIT;
