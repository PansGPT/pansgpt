-- ==============================================================================
-- PansGPT 2.0 Local Development & Staging Seed Data (UNIJOS Only)
-- ==============================================================================

DO 
DECLARE
    v_unijos_id uuid;
    v_student_1 uuid := '018f0000-0000-7000-8000-000000000001'::uuid;
    v_student_2 uuid := '018f0000-0000-7000-8000-000000000002'::uuid;
    v_lecturer_1 uuid := '018f0000-0000-7000-8000-000000000003'::uuid;
    v_admin_1 uuid := '018f0000-0000-7000-8000-000000000004'::uuid;
    v_super_1 uuid := '018f0000-0000-7000-8000-000000000005'::uuid;
BEGIN
    SELECT id INTO v_unijos_id FROM public.universities WHERE short_name = 'UNIJOS' LIMIT 1;

    IF v_unijos_id IS NULL THEN
        INSERT INTO public.universities (name, short_name, slug, state, country, status)
        VALUES ('University of Jos', 'UNIJOS', 'unijos', 'Plateau', 'Nigeria', 'active')
        RETURNING id INTO v_unijos_id;
    END IF;

    -- Insert mock users
    INSERT INTO public.users (id, email, full_name, role, university_id, level, faculty, department, is_active)
    VALUES
        (v_student_1, 'student1.jos@pansgpt.test', 'Chinedu Eze', 'student', v_unijos_id, '300', 'Pharmaceutical Sciences', 'Clinical Pharmacy', true),
        (v_student_2, 'student2.jos@pansgpt.test', 'Nanret Goyit', 'student', v_unijos_id, '400', 'Pharmaceutical Sciences', 'Pharmacology & Toxicology', true),
        (v_lecturer_1, 'lecturer.jos@pansgpt.test', 'Dr. Emmanuel Okafor', 'lecturer', v_unijos_id, NULL, 'Pharmaceutical Sciences', 'Pharmaceutics & Pharm Tech', true),
        (v_admin_1, 'admin.jos@pansgpt.test', 'Pharm. Funke Adeyemi', 'university_admin', v_unijos_id, NULL, 'Pharmaceutical Sciences', 'Deanery', true),
        (v_super_1, 'superadmin@pansgpt.test', 'Super Admin', 'super_admin', NULL, NULL, NULL, NULL, true)
    ON CONFLICT (email) DO NOTHING;

    -- Insert course knowledge sample for UNIJOS
    INSERT INTO public.course_knowledge (university_id, course_code, course_title, level, semester, credit_units, lecturer_name)
    VALUES
        (v_unijos_id, 'PCL301', 'Introductory Pharmacology & Autonomic Nervous System', '300', 1, 3, 'Dr. Emmanuel Okafor'),
        (v_unijos_id, 'PCT301', 'Physical Pharmaceutics & Dosage Forms', '300', 1, 3, 'Prof. A. K. Lar')
    ON CONFLICT (university_id, course_code) DO NOTHING;

END ;
