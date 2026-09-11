# ==============================================================================
# PansGPT 2.0 Security, Prompt Injection Filter & Medical Acronym Normalizer
# ==============================================================================

import re

# Standard Educational Study Disclaimer for clinical academic guidance
STUDY_DISCLAIMER = (
    "\n\n> ⚠️ *Educational Study Aid: PansGPT is designed for academic revision. "
    "Always verify clinical calculations and drug monographs with official departmental "
    "guidelines and licensed pharmacy practitioners.*"
)

# ------------------------------------------------------------------------------
# 1. 200+ Standard Pharmacy & Medical Acronyms (Curriculum Aligned)
# ------------------------------------------------------------------------------
MEDICAL_ACRONYMS: dict[str, str] = {
    # Organ Systems & Anatomy
    "CVS": "Cardiovascular System",
    "CNS": "Central Nervous System",
    "ANS": "Autonomic Nervous System",
    "PNS": "Peripheral Nervous System",
    "GIT": "Gastrointestinal Tract",
    "GI": "Gastrointestinal",
    "RS": "Respiratory System",
    "ENT": "Ear, Nose, and Throat",
    "GU": "Genitourinary System",
    "MSK": "Musculoskeletal System",
    "BBB": "Blood-Brain Barrier",
    # Cardiovascular & Vasoactive
    "BP": "Blood Pressure",
    "HR": "Heart Rate",
    "CO": "Cardiac Output",
    "SVR": "Systemic Vascular Resistance",
    "PVR": "Pulmonary Vascular Resistance",
    "SV": "Stroke Volume",
    "MAP": "Mean Arterial Pressure",
    "HTN": "Hypertension",
    "CHF": "Congestive Heart Failure",
    "HF": "Heart Failure",
    "HFREF": "Heart Failure with Reduced Ejection Fraction",
    "HFPEF": "Heart Failure with Preserved Ejection Fraction",
    "LVEF": "Left Ventricular Ejection Fraction",
    "MI": "Myocardial Infarction",
    "STEMI": "ST-Elevation Myocardial Infarction",
    "NSTEMI": "Non-ST-Elevation Myocardial Infarction",
    "ACS": "Acute Coronary Syndrome",
    "IHD": "Ischemic Heart Disease",
    "CAD": "Coronary Artery Disease",
    "PAD": "Peripheral Artery Disease",
    "AF": "Atrial Fibrillation",
    "AFL": "Atrial Flutter",
    "SVT": "Supraventricular Tachycardia",
    "VT": "Ventricular Tachycardia",
    "VF": "Ventricular Fibrillation",
    "DVT": "Deep Vein Thrombosis",
    "PE": "Pulmonary Embolism",
    "VTE": "Venous Thromboembolism",
    "JVP": "Jugular Venous Pressure",
    # Pharmacology Drug Classes
    "NSAIDS": "Non-Steroidal Anti-Inflammatory Drugs",
    "NSAID": "Non-Steroidal Anti-Inflammatory Drug",
    "PPI": "Proton Pump Inhibitors",
    "PPIS": "Proton Pump Inhibitors",
    "H2RA": "Histamine-2 Receptor Antagonists",
    "ACEI": "Angiotensin Converting Enzyme Inhibitors",
    "ACEIS": "Angiotensin Converting Enzyme Inhibitors",
    "ARB": "Angiotensin II Receptor Blockers",
    "ARBS": "Angiotensin II Receptor Blockers",
    "ARNI": "Angiotensin Receptor-Neprilysin Inhibitor",
    "CCB": "Calcium Channel Blockers",
    "CCBS": "Calcium Channel Blockers",
    "DHP": "Dihydropyridine Calcium Channel Blocker",
    "NON-DHP": "Non-Dihydropyridine Calcium Channel Blocker",
    "BB": "Beta Blockers",
    "BBS": "Beta Blockers",
    "MRA": "Mineralocorticoid Receptor Antagonists",
    "HCTZ": "Hydrochlorothiazide",
    "SGLT2": "Sodium-Glucose Cotransporter 2",
    "SGLT2I": "Sodium-Glucose Cotransporter 2 Inhibitors",
    "GLP1": "Glucagon-Like Peptide 1",
    "GLP-1": "Glucagon-Like Peptide 1",
    "GLP1RA": "Glucagon-Like Peptide 1 Receptor Agonists",
    "DPP4": "Dipeptidyl Peptidase 4",
    "DPP-4": "Dipeptidyl Peptidase 4",
    "DPP4I": "Dipeptidyl Peptidase 4 Inhibitors",
    "TZD": "Thiazolidinediones",
    "TZDS": "Thiazolidinediones",
    "SU": "Sulfonylureas",
    "SSRI": "Selective Serotonin Reuptake Inhibitor",
    "SSRIS": "Selective Serotonin Reuptake Inhibitors",
    "SNRI": "Serotonin-Norepinephrine Reuptake Inhibitor",
    "SNRIS": "Serotonin-Norepinephrine Reuptake Inhibitors",
    "TCA": "Tricyclic Antidepressants",
    "TCAS": "Tricyclic Antidepressants",
    "MAOI": "Monoamine Oxidase Inhibitor",
    "MAOIS": "Monoamine Oxidase Inhibitors",
    "BZD": "Benzodiazepines",
    "BZDS": "Benzodiazepines",
    "AED": "Antiepileptic Drugs",
    "ASM": "Anti-Seizure Medications",
    "OAC": "Oral Anticoagulants",
    "DOAC": "Direct Oral Anticoagulant",
    "DOACS": "Direct Oral Anticoagulants",
    "NOAC": "Novel Oral Anticoagulants",
    "LMWH": "Low Molecular Weight Heparin",
    "UFH": "Unfractionated Heparin",
    "SABA": "Short-Acting Beta Agonists",
    "LABA": "Long-Acting Beta Agonists",
    "SAMA": "Short-Acting Muscarinic Antagonists",
    "LAMA": "Long-Acting Muscarinic Antagonists",
    "ICS": "Inhaled Corticosteroids",
    "LTRA": "Leukotriene Receptor Antagonists",
    "MDI": "Metered Dose Inhaler",
    "DPI": "Dry Powder Inhaler",
    # Pharmacokinetics & Pharmacodynamics (PK/PD)
    "ADME": "Absorption, Distribution, Metabolism, Excretion",
    "PK": "Pharmacokinetics",
    "PD": "Pharmacodynamics",
    "MOA": "Mechanism of Action",
    "TDM": "Therapeutic Drug Monitoring",
    "AUC": "Area Under the Curve",
    "MIC": "Minimum Inhibitory Concentration",
    "MBC": "Minimum Bactericidal Concentration",
    "CYP450": "Cytochrome P450 Enzyme System",
    "CYP": "Cytochrome P450",
    "TI": "Therapeutic Index",
    "NTI": "Narrow Therapeutic Index",
    "ED50": "Effective Dose 50%",
    "TD50": "Toxic Dose 50%",
    "LD50": "Lethal Dose 50%",
    "CMAX": "Peak Plasma Concentration (Cmax)",
    "TMAX": "Time to Peak Concentration (Tmax)",
    "VD": "Volume of Distribution",
    "CL": "Clearance",
    "CRCL": "Creatinine Clearance",
    "SCR": "Serum Creatinine",
    "BUN": "Blood Urea Nitrogen",
    "PGP": "P-Glycoprotein",
    "P-GP": "P-Glycoprotein",
    "BCRP": "Breast Cancer Resistance Protein",
    # Clinical Safety & Adverse Events
    "ADR": "Adverse Drug Reaction",
    "ADRS": "Adverse Drug Reactions",
    "ADE": "Adverse Drug Event",
    "DDI": "Drug-Drug Interaction",
    "DDIS": "Drug-Drug Interactions",
    "REMS": "Risk Evaluation and Mitigation Strategy",
    "EPS": "Extrapyramidal Symptoms",
    "NMS": "Neuroleptic Malignant Syndrome",
    "TD": "Tardive Dyskinesia",
    # Pharmacy Practice & Administration Routes
    "OTC": "Over-The-Counter",
    "POM": "Prescription-Only Medicine",
    "IV": "Intravenous",
    "IM": "Intramuscular",
    "SC": "Subcutaneous",
    "SQ": "Subcutaneous",
    "PO": "Per Os (Oral administration)",
    "PR": "Per Rectum",
    "PV": "Per Vaginam",
    "SL": "Sublingual",
    "BUCC": "Buccal",
    "INH": "Inhalation",
    "TOP": "Topical",
    "QD": "Once daily",
    "BID": "Twice daily",
    "TID": "Three times daily",
    "QID": "Four times daily",
    "Q4H": "Every 4 hours",
    "Q6H": "Every 6 hours",
    "Q8H": "Every 8 hours",
    "Q12H": "Every 12 hours",
    "Q24H": "Every 24 hours",
    "QHS": "Every night at bedtime",
    "AC": "Before meals (Ante Cibum)",
    "PC": "After meals (Post Cibum)",
    "PRN": "Pro Re Nata (As needed)",
    "STAT": "Immediately",
    "NPO": "Nil Per Os (Nothing by mouth)",
    "SIG": "Label / Directions for use",
    "RX": "Prescription / Treatment",
    # University Pharmacy Disciplines (Nigerian Faculties)
    "PCL": "Pharmacology and Toxicology",
    "PCO": "Pharmacognosy and Traditional Medicine",
    "PCT": "Pharmaceutics and Pharmaceutical Technology",
    "PCG": "Pharmaceutical and Medicinal Chemistry",
    "CP": "Clinical Pharmacy and Pharmacy Practice",
    "PCH": "Pharmaceutical Microbiology and Biotechnology",
    # Clinical Conditions, Labs & Diagnostics
    "BPH": "Benign Prostatic Hyperplasia",
    "CKD": "Chronic Kidney Disease",
    "ESRD": "End-Stage Renal Disease",
    "AKI": "Acute Kidney Injury",
    "ATN": "Acute Tubular Necrosis",
    "AIN": "Acute Interstitial Nephritis",
    "GFR": "Glomerular Filtration Rate",
    "EGFR": "Estimated Glomerular Filtration Rate",
    "LFT": "Liver Function Tests",
    "LFTS": "Liver Function Tests",
    "AST": "Aspartate Aminotransferase",
    "ALT": "Alanine Aminotransferase",
    "ALP": "Alkaline Phosphatase",
    "GGT": "Gamma-Glutamyl Transferase",
    "TBIL": "Total Bilirubin",
    "DBIL": "Direct Bilirubin",
    "RFT": "Renal Function Tests",
    "RFTS": "Renal Function Tests",
    "FBC": "Full Blood Count",
    "CBC": "Complete Blood Count",
    "WBC": "White Blood Cells",
    "RBC": "Red Blood Cells",
    "PLT": "Platelets",
    "HGB": "Hemoglobin",
    "HCT": "Hematocrit",
    "MCV": "Mean Corpuscular Volume",
    "ANC": "Absolute Neutrophil Count",
    "HBA1C": "Glycated Hemoglobin",
    "INR": "International Normalized Ratio",
    "PT": "Prothrombin Time",
    "APTT": "Activated Partial Thromboplastin Time",
    "COPD": "Chronic Obstructive Pulmonary Disease",
    "SOB": "Shortness of Breath",
    "GERD": "Gastroesophageal Reflux Disease",
    "PUD": "Peptic Ulcer Disease",
    "IBD": "Inflammatory Bowel Disease",
    "CD": "Crohn's Disease",
    "UC": "Ulcerative Colitis",
    "IBS": "Irritable Bowel Syndrome",
    "SBO": "Small Bowel Obstruction",
    "NAFLD": "Non-Alcoholic Fatty Liver Disease",
    "NASH": "Non-Alcoholic Steatohepatitis",
    "UTI": "Urinary Tract Infection",
    "UTIS": "Urinary Tract Infections",
    "RTI": "Respiratory Tract Infection",
    "URTI": "Upper Respiratory Tract Infection",
    "LRTI": "Lower Respiratory Tract Infection",
    "CAP": "Community-Acquired Pneumonia",
    "HAP": "Hospital-Acquired Pneumonia",
    "VAP": "Ventilator-Associated Pneumonia",
    "TB": "Tuberculosis",
    "DOTS": "Directly Observed Therapy Short-Course",
    "ART": "Antiretroviral Therapy",
    "ARV": "Antiretroviral",
    "PLHIV": "People Living with HIV",
    "ACT": "Artemisinin-based Combination Therapy",
    "AL": "Artemether-Lumefantrine",
    "SP": "Sulfadoxine-Pyrimethamine",
    "IPTP": "Intermittent Preventive Treatment in Pregnancy",
    "MRSA": "Methicillin-Resistant Staphylococcus aureus",
    "MSSA": "Methicillin-Susceptible Staphylococcus aureus",
    "VRE": "Vancomycin-Resistant Enterococci",
    "ESBL": "Extended-Spectrum Beta-Lactamase",
    "CRE": "Carbapenem-Resistant Enterobacteriaceae",
    "MDR": "Multi-Drug Resistant",
    "XDR": "Extensively Drug Resistant",
    "ABX": "Antibiotics",
    "PCN": "Penicillin",
    "FQ": "Fluoroquinolones",
    "AG": "Aminoglycosides",
    "TMP-SMX": "Trimethoprim-Sulfamethoxazole",
    # Endocrine, Metabolic & Rheumatology
    "DM": "Diabetes Mellitus",
    "T1DM": "Type 1 Diabetes Mellitus",
    "T2DM": "Type 2 Diabetes Mellitus",
    "DKA": "Diabetic Ketoacidosis",
    "HHS": "Hyperosmolar Hyperglycemic State",
    "FPG": "Fasting Plasma Glucose",
    "OGTT": "Oral Glucose Tolerance Test",
    "TSH": "Thyroid Stimulating Hormone",
    "T3": "Triiodothyronine",
    "T4": "Thyroxine",
    "PTH": "Parathyroid Hormone",
    "RAIU": "Radioactive Iodine Uptake",
    "BMD": "Bone Mineral Density",
    "DEXA": "Dual-Energy X-ray Absorptiometry",
    "RA": "Rheumatoid Arthritis",
    "OA": "Osteoarthritis",
    "SLE": "Systemic Lupus Erythematosus",
    # Neurology & Psychiatry
    "MDD": "Major Depressive Disorder",
    "GAD": "Generalized Anxiety Disorder",
    "OCD": "Obsessive-Compulsive Disorder",
    "PTSD": "Post-Traumatic Stress Disorder",
    "BPD": "Bipolar Disorder",
    "SZ": "Schizophrenia",
    "AD": "Alzheimer's Disease",
    "MS": "Multiple Sclerosis",
    "ALS": "Amyotrophic Lateral Sclerosis",
    "MG": "Myasthenia Gravis",
    "GBS": "Guillain-Barré Syndrome",
    "TIA": "Transient Ischemic Attack",
    "CVA": "Cerebrovascular Accident (Stroke)",
    "ICH": "Intracerebral Hemorrhage",
    "SAH": "Subarachnoid Hemorrhage",
    "ICP": "Intracranial Pressure",
    "CSF": "Cerebrospinal Fluid",
    # Neurotransmitters & Biological Receptors
    "GABA": "Gamma-Aminobutyric Acid",
    "NMDA": "N-Methyl-D-Aspartate",
    "ACH": "Acetylcholine",
    "NE": "Norepinephrine",
    "DA": "Dopamine",
    "5HT": "5-Hydroxytryptamine (Serotonin)",
    "5-HT": "5-Hydroxytryptamine (Serotonin)",
    "COX": "Cyclooxygenase",
    "COX1": "Cyclooxygenase-1",
    "COX-1": "Cyclooxygenase-1",
    "COX2": "Cyclooxygenase-2",
    "COX-2": "Cyclooxygenase-2",
    "PGE2": "Prostaglandin E2",
    "TXA2": "Thromboxane A2",
    # Regulatory & Professional Bodies
    "PCN_COUNCIL": "Pharmacists Council of Nigeria",
    "PSN": "Pharmaceutical Society of Nigeria",
    "NAFDAC": "National Agency for Food and Drug Administration and Control",
    "NDLEA": "National Drug Law Enforcement Agency",
    "FMOH": "Federal Ministry of Health",
    "WHO": "World Health Organization",
}


# ------------------------------------------------------------------------------
# 2. Prompt Injection & Jailbreak Patterns
# ------------------------------------------------------------------------------
INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(
        r"(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|rules|commands)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:reveal|display|output|print|show|leak)\s+(?:your\s+)?(?:system\s+prompt|initial\s+prompt|developer\s+message|secret\s+instructions)",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:dan\s+mode|jailbreak|do\s+anything\s+now|developer\s+mode|unfiltered\s+mode)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:bypass|disable|override)\s+(?:all\s+)?(?:content\s+filters|safety\s+filters|guidelines|guardrails)",
        re.IGNORECASE,
    ),
    re.compile(r"<\s*(?:system|developer|eval_prompt|chat_history)\s*>", re.IGNORECASE),
    re.compile(r"base64\s+(?:decode|encoded)\s+(?:and\s+execute|payload)", re.IGNORECASE),
    re.compile(
        r"you\s+are\s+now\s+(?:in\s+god\s+mode|unrestricted|free\s+of\s+rules)", re.IGNORECASE
    ),
]

LEAK_PATTERNS: list[re.Pattern] = [
    re.compile(r"postgresql://[^\s]+:[^\s]+@[^\s]+", re.IGNORECASE),
    re.compile(r"AIzaSy[0-9A-Za-z_-]{33}"),
    re.compile(r"gsk_[0-9A-Za-z]{48}"),
    re.compile(r"sk-or-v1-[0-9a-f]{64}"),
    re.compile(r"tvly-[0-9A-Za-z_-]{32}"),
]

SCHEMA_LEAK_PATTERNS: list[re.Pattern] = [
    re.compile(r"\bpublic\.document_chunks\b", re.IGNORECASE),
    re.compile(r"\bpublic\.user_credits\b", re.IGNORECASE),
    re.compile(r"\bpublic\.ai_telemetry\b", re.IGNORECASE),
    re.compile(r"\bmatch_document_chunks\b", re.IGNORECASE),
    re.compile(r"\bmatch_documents_global\b", re.IGNORECASE),
]


class PolicyGuardEngine:
    """Enforces prompt safety, medical acronym normalization, and clinical system prompts."""

    @staticmethod
    def check_prompt_safety(text: str) -> tuple[bool, str | None]:
        """
        Scans input query for prompt injections, system prompt exfiltration, and jailbreaks.
        Returns: (is_safe, error_reason)
        """
        if not text or not text.strip():
            return True, None

        for pattern in INJECTION_PATTERNS:
            if pattern.search(text):
                return (
                    False,
                    "Prompt violates system safety policy: attempted instruction override or prompt exfiltration.",
                )

        return True, None

    @staticmethod
    def check_output_safety(text: str) -> tuple[bool, str]:
        """
        Scans generated output for accidental system prompt regurgitation or database schema leaks.
        Returns: (is_safe, sanitized_or_redacted_text)
        """
        if not text:
            return True, text

        sanitized = text
        # Filter credential leaks
        for pattern in LEAK_PATTERNS:
            sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)

        # Redact raw internal schema table names
        for pattern in SCHEMA_LEAK_PATTERNS:
            sanitized = pattern.sub("[internal_schema]", sanitized)

        return True, sanitized

    @staticmethod
    def normalize_medical_acronyms(text: str) -> str:
        """
        Expands 200+ standard pharmacy acronyms to their full clinical terms,
        preserving the acronym to maximize dense vector cosine similarity and FTS matching.
        Example: "What are the contraindications of NSAIDs in CKD?"
        -> "What are the contraindications of NSAIDs (Non-Steroidal Anti-Inflammatory Drugs) in CKD (Chronic Kidney Disease)?"
        """
        if not text:
            return text

        words = re.findall(r"\b[A-Za-z0-9\-]+\b", text)
        replaced_tokens = set()
        normalized = text

        for word in words:
            upper = word.upper()
            if upper in MEDICAL_ACRONYMS and upper not in replaced_tokens:
                expansion = MEDICAL_ACRONYMS[upper]
                pattern = re.compile(rf"\b{re.escape(word)}\b")
                normalized = pattern.sub(f"{word} ({expansion})", normalized)
                replaced_tokens.add(upper)

        return normalized

    @staticmethod
    def filter_credential_leaks(content: str) -> str:
        """Sanitizes outgoing LLM text against accidental key or connection string leaks."""
        sanitized = content
        for pattern in LEAK_PATTERNS:
            sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
        for pattern in SCHEMA_LEAK_PATTERNS:
            sanitized = pattern.sub("[internal_schema]", sanitized)
        return sanitized

    @staticmethod
    def append_study_disclaimer(content: str) -> str:
        """Appends the standardized clinical study disclaimer footnote to responses."""
        if not content:
            return content
        if "Educational Study Aid: PansGPT" in content:
            return content
        return content.rstrip() + STUDY_DISCLAIMER

    @staticmethod
    def build_system_prompt(rag_context: str | None = None) -> str:
        """
        Builds the clinical pharmacy grounding system prompt for Gemma.
        Enforces strict grounding, citation attribution, and zero hallucination.
        """
        base = (
            "You are PansGPT, an expert clinical pharmacy and pharmacology academic tutor for university pharmacy students.\n"
            "Your mission is to provide rigorous, clear, and clinically accurate explanations of drug mechanisms, "
            "pharmacokinetics, pharmacodynamics, medicinal chemistry, clinical indications, contraindications, and adverse effects.\n\n"
            "CRITICAL CLINICAL SAFETY RULES:\n"
            "1. Ground your answers strictly in the verified course material chunks provided below.\n"
            "2. Whenever citing information from the retrieved chunks, cite the document title and page number like: [Doc: Title, p. X].\n"
            "3. If the provided course materials do not contain sufficient evidence to answer the student's question with certainty, "
            "explicitly state that this specific topic is not found in the uploaded course materials. Never invent dosages or contraindications.\n"
            "4. Maintain a supportive, academic, professional tone appropriate for training future licensed pharmacists.\n"
            "5. Format output with clear markdown headings, bullet points, and chemical/receptor mechanisms where appropriate.\n"
        )

        if rag_context and rag_context.strip():
            base += f"\n--- VERIFIED COURSE MATERIAL CHUNKS ---\n{rag_context}\n--- END COURSE MATERIALS ---\n"
        else:
            base += "\n(No specific lecture monograph chunks were retrieved for this question. Answer generally based on standard pharmacology principles while reminding the student to verify with their official course slides.)\n"

        return base


policy_guard = PolicyGuardEngine()
