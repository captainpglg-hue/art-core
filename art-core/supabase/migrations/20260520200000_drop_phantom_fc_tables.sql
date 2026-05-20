-- Drop the 17 phantom fc_* tables in passcore-mvp.
-- These are leftovers from when fresh-core lived in the same Supabase project.
-- fresh-core now has its own project (hqsyygywfhtsbtgdtzds) with unprefixed
-- tables (establishments, equipment, deliveries, etc.).
--
-- The 13 rows of data across fc_lots, fc_chain_steps, fc_cleaning_records
-- were E2E test fixtures from 2026-04-07 (lot codes TEST-*/DEMO-*, hashes
-- 0xTEST/0xFAILTEMP/0xAOPCAM, created_by null). Dump archived at
-- sql/backups/fc_phantom_tables_dump_2026-05-20.json before DROP.

DROP TABLE IF EXISTS public.fc_chain_steps          CASCADE;
DROP TABLE IF EXISTS public.fc_delivery_items       CASCADE;
DROP TABLE IF EXISTS public.fc_equipment            CASCADE;
DROP TABLE IF EXISTS public.fc_establishments       CASCADE;
DROP TABLE IF EXISTS public.fc_profiles             CASCADE;
DROP TABLE IF EXISTS public.fc_lots                 CASCADE;
DROP TABLE IF EXISTS public.fc_deliveries           CASCADE;
DROP TABLE IF EXISTS public.fc_suppliers            CASCADE;
DROP TABLE IF EXISTS public.fc_temperature_readings CASCADE;
DROP TABLE IF EXISTS public.fc_oil_controls         CASCADE;
DROP TABLE IF EXISTS public.fc_pest_controls        CASCADE;
DROP TABLE IF EXISTS public.fc_cleaning_records     CASCADE;
DROP TABLE IF EXISTS public.fc_dlc                  CASCADE;
DROP TABLE IF EXISTS public.fc_nettoyage            CASCADE;
DROP TABLE IF EXISTS public.fc_profils              CASCADE;
DROP TABLE IF EXISTS public.fc_sorties              CASCADE;
DROP TABLE IF EXISTS public.fc_temperatures         CASCADE;
