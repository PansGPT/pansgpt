-- ==============================================================================
-- PansGPT 2.0 Local Development & Staging Seed Data
-- ==============================================================================

DO $$
DECLARE
    v_unijos_id uuid;
    v_uniport_id uuid;
BEGIN
    -- 1. Seed Primary Institutions (UNIJOS & UNIPORT)
    SELECT id INTO v_unijos_id FROM public.universities WHERE short_name = 'UNIJOS' LIMIT 1;
    IF v_unijos_id IS NULL THEN
        INSERT INTO public.universities (id, name, short_name, slug, state, country, status)
        VALUES ('018f3a10-0001-7000-8000-000000000001', 'University of Jos', 'UNIJOS', 'unijos', 'Plateau', 'Nigeria', 'active')
        RETURNING id INTO v_unijos_id;
    END IF;

    SELECT id INTO v_uniport_id FROM public.universities WHERE short_name = 'UNIPORT' LIMIT 1;
    IF v_uniport_id IS NULL THEN
        INSERT INTO public.universities (id, name, short_name, slug, state, country, status)
        VALUES ('018f3a10-0002-7000-8000-000000000001', 'University of Port Harcourt', 'UNIPORT', 'uniport', 'Rivers', 'Nigeria', 'active')
        RETURNING id INTO v_uniport_id;
    END IF;

    -- 2. Seed Academic Terms for UNIJOS
    INSERT INTO public.academic_terms (university_id, academic_session, semester)
    VALUES (v_unijos_id, '2025/2026', 'first')
    ON CONFLICT (university_id) DO UPDATE
    SET academic_session = EXCLUDED.academic_session,
        semester = EXCLUDED.semester,
        updated_at = now();

    -- 3. Seed Course Knowledge Base for UNIJOS Pharmacy
    INSERT INTO public.course_knowledge (university_id, course_code, level, knowledge_text)
    VALUES
        (v_unijos_id, 'PCL 401', '400'::public.university_level, 'Autonomic pharmacology: Adrenergic agonists, antagonists, cholinergic neurotransmission, and clinical applications in cardiovascular therapy.'),
        (v_unijos_id, 'PCH 301', '300'::public.university_level, 'Pharmaceutical chemistry of heterocyclic compounds, beta-lactam antibiotics, and structure-activity relationships.'),
        (v_unijos_id, 'PCT 401', '400'::public.university_level, 'Advanced industrial pharmacy: sterile product formulation, biopharmaceutics, and sustained-release delivery systems.')
    ON CONFLICT DO NOTHING;

    -- 4. Seed Default System Settings
    INSERT INTO public.system_settings (id, system_prompt, temperature, maintenance_mode, web_search_enabled, rag_threshold)
    VALUES (1, 'You are PansGPT, an expert clinical pharmacy and pharmacology AI academic tutor for Nigerian pharmacy students.', 0.7, false, true, 0.50)
    ON CONFLICT (id) DO UPDATE
    SET system_prompt = EXCLUDED.system_prompt,
        temperature = EXCLUDED.temperature,
        maintenance_mode = EXCLUDED.maintenance_mode,
        web_search_enabled = EXCLUDED.web_search_enabled,
        rag_threshold = EXCLUDED.rag_threshold,
        updated_at = now();

    -- 5. Seed Core AI Skills
    INSERT INTO public.ai_skills (id, slug, name, description, instructions, skill_type, is_active)
    VALUES
        ('018f3a20-0001-7000-8000-000000000001', 'dosage_calculator', 'Clinical Dosage Calculator', 'Pediatric and renal dosage adjustments based on GFR and weight', 'Calculate dosage according to Cockcroft-Gault formula and pediatric weight rules.', 'python_tool'::public.skill_type, true),
        ('018f3a20-0002-7000-8000-000000000001', 'drug_interaction_checker', 'Drug-Drug Interaction Checker', 'Cytochrome P450 inhibition and pharmacokinetic interaction evaluation', 'Evaluate CYP3A4, CYP2D6 interactions and highlight severe contraindications.', 'python_tool'::public.skill_type, true),
        ('018f3a20-0003-7000-8000-000000000001', 'chemical_drawer', 'Chemical Structure Visualizer', 'Generates 2D/3D chemical structures and SMILES representations', 'Render chemical structure in SMILES format with functional group breakdown.', 'python_tool'::public.skill_type, true)
    ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        instructions = EXCLUDED.instructions,
        is_active = EXCLUDED.is_active,
        updated_at = now();

END $$;
