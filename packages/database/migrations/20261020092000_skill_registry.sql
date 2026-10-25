BEGIN;
-- Clinical executables remain disabled until validated handlers/data exist.
UPDATE public.ai_skills SET is_active=false WHERE slug IN ('dosage_calculator','drug_interaction_checker','chemical_drawer');
INSERT INTO public.ai_skills(slug,name,description,instructions,skill_type,is_active)
SELECT slug, replace(slug,'_',' '), 'Generate an educational study artifact',
       'Use the allowlisted typed backend handler.', 'python_tool'::public.skill_type, true
FROM unnest(ARRAY['create_doc','create_md','create_pdf','create_pptx','plot_graph','generate_flashcards','generate_mnemonics','draw_chemical_structure']) AS slug
ON CONFLICT(slug) DO NOTHING;
COMMIT;
