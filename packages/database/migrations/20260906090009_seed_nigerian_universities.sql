-- ==============================================================================
-- Migration: 20260906090009_seed_nigerian_universities.sql
-- Purpose: Seed accredited Nigerian faculties of pharmacy and initial runtime configurations.
-- ==============================================================================

-- 1. Initial Nigerian Universities with Pharmacy Faculties
INSERT INTO public.universities (name, short_name, slug, state, country, status)
VALUES
  ('University of Jos', 'UNIJOS', 'unijos', 'Plateau', 'Nigeria', 'active'),
  ('University of Ibadan', 'UI', 'ui', 'Oyo', 'Nigeria', 'active'),
  ('Ahmadu Bello University', 'ABU', 'abu', 'Kaduna', 'Nigeria', 'active'),
  ('University of Lagos', 'UNILAG', 'unilag', 'Lagos', 'Nigeria', 'active'),
  ('Obafemi Awolowo University', 'OAU', 'oau', 'Osun', 'Nigeria', 'active'),
  ('University of Benin', 'UNIBEN', 'uniben', 'Edo', 'Nigeria', 'active'),
  ('University of Nigeria, Nsukka', 'UNN', 'unn', 'Enugu', 'Nigeria', 'active'),
  ('Bayero University Kano', 'BUK', 'buk', 'Kano', 'Nigeria', 'active'),
  ('Olabisi Onabanjo University', 'OOU', 'oou', 'Ogun', 'Nigeria', 'active'),
  ('Nnamdi Azikiwe University', 'UNIZIK', 'unizik', 'Anambra', 'Nigeria', 'active')
ON CONFLICT (lower(name)) DO NOTHING;

-- 2. Default System Settings
INSERT INTO public.system_settings (id, system_prompt, temperature, maintenance_mode, web_search_enabled, rag_threshold)
VALUES (
  1,
  'You are the PansGPT AI Study Companion, an intelligent, curriculum-grounded clinical pharmacology mentor designed for Nigerian pharmacy students. Teach with patient rigor, provide step-by-step pharmacokinetic calculations with explicit units, anchor pharmacology concepts to high-yield clinical mnemonics, and cite course lecture slides when answering from uploaded monographs.',
  0.7,
  false,
  true,
  0.50
)
ON CONFLICT (id) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  temperature = EXCLUDED.temperature,
  web_search_enabled = EXCLUDED.web_search_enabled;

-- 3. Core Dynamic AI Skills
INSERT INTO public.ai_skills (slug, name, description, instructions, skill_type, is_active)
VALUES
  (
    'dosage_calculator',
    'Clinical Dosage & PK Calculator',
    'Calculates pediatric, renal-adjusted, and loading/maintenance doses with full formula derivations.',
    'When calculating drug dosages or pharmacokinetics parameters (Clearance, Half-life, Volume of Distribution, Creatinine Clearance via Cockcroft-Gault), always show every step, include measurement units at every stage, and flag clinical cautions for narrow therapeutic index drugs.',
    'prompt',
    true
  ),
  (
    'drug_interaction_checker',
    'Pharmacological Drug Interaction Checker',
    'Analyzes drug-drug, drug-food, and pharmacokinetic enzyme interactions (CYP450 induction/inhibition).',
    'Identify mechanisms of interaction (pharmacokinetic vs pharmacodynamic), specify the clinical severity (Major, Moderate, Minor), describe the biological consequence (e.g. QT prolongation, bleeding risk), and provide concrete monitoring or dosing adjustments.',
    'prompt',
    true
  ),
  (
    'chemical_drawer',
    'PubChem SMILES & Mechanism Drawer',
    'Extracts and renders chemical reaction mechanisms, functional groups, and 2D molecular structures.',
    'When explaining medicinal chemistry and structure-activity relationships (SAR), provide standard SMILES strings for the active pharmaceutical ingredient, explain key pharmacophores, and analyze how chemical modifications alter receptor affinity.',
    'prompt',
    true
  )
ON CONFLICT (slug) DO NOTHING;
