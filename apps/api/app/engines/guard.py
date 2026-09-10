# ==============================================================================
# PansGPT 2.0 Security, Prompt Injection Filter & Medical Acronym Normalizer
# ==============================================================================

import re

# ------------------------------------------------------------------------------
# 1. 100+ Standard Pharmacy & Medical Acronyms (Curriculum Aligned)
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
    # Cardiovascular & Vasoactive
    "BP": "Blood Pressure",
    "HR": "Heart Rate",
    "CO": "Cardiac Output",
    "SVR": "Systemic Vascular Resistance",
    "SV": "Stroke Volume",
    "MAP": "Mean Arterial Pressure",
    "HTN": "Hypertension",
    "CHF": "Congestive Heart Failure",
    "HF": "Heart Failure",
    "MI": "Myocardial Infarction",
    "IHD": "Ischemic Heart Disease",
    "CAD": "Coronary Artery Disease",
    "AF": "Atrial Fibrillation",
    "DVT": "Deep Vein Thrombosis",
    "PE": "Pulmonary Embolism",
    "VTE": "Venous Thromboembolism",
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
    "CCB": "Calcium Channel Blockers",
    "CCBS": "Calcium Channel Blockers",
    "BB": "Beta Blockers",
    "BBS": "Beta Blockers",
    "SGLT2": "Sodium-Glucose Cotransporter 2",
    "GLP1": "Glucagon-Like Peptide 1",
    "GLP-1": "Glucagon-Like Peptide 1",
    "DPP4": "Dipeptidyl Peptidase 4",
    "DPP-4": "Dipeptidyl Peptidase 4",
    "TZD": "Thiazolidinediones",
    "TZDS": "Thiazolidinediones",
    "SSRI": "Selective Serotonin Reuptake Inhibitor",
    "SSRIS": "Selective Serotonin Reuptake Inhibitors",
    "SNRI": "Serotonin-Norepinephrine Reuptake Inhibitor",
    "SNRIS": "Serotonin-Norepinephrine Reuptake Inhibitors",
    "TCA": "Tricyclic Antidepressants",
    "TCAS": "Tricyclic Antidepressants",
    "MAOI": "Monoamine Oxidase Inhibitor",
    "MAOIS": "Monoamine Oxidase Inhibitors",
    "OAC": "Oral Anticoagulants",
    "DOAC": "Direct Oral Anticoagulant",
    "DOACS": "Direct Oral Anticoagulants",
    "NOAC": "Novel Oral Anticoagulants",
    "LMWH": "Low Molecular Weight Heparin",
    "UFH": "Unfractionated Heparin",
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
    # Clinical Safety & Adverse Events
    "ADR": "Adverse Drug Reaction",
    "ADRS": "Adverse Drug Reactions",
    "ADE": "Adverse Drug Event",
    "DDI": "Drug-Drug Interaction",
    "DDIS": "Drug-Drug Interactions",
    # Pharmacy Practice & Administration Routes
    "OTC": "Over-The-Counter",
    "POM": "Prescription-Only Medicine",
    "IV": "Intravenous",
    "IM": "Intramuscular",
    "SC": "Subcutaneous",
    "PO": "Per Os (Oral administration)",
    "PR": "Per Rectum",
    "SL": "Sublingual",
    "INH": "Inhalation",
    "QD": "Once daily",
    "BID": "Twice daily",
    "TID": "Three times daily",
    "QID": "Four times daily",
    "Q4H": "Every 4 hours",
    "Q6H": "Every 6 hours",
    "Q8H": "Every 8 hours",
    "PRN": "Pro Re Nata (As needed)",
    "STAT": "Immediately",
    # University Pharmacy Disciplines (Nigerian Faculties)
    "PCL": "Pharmacology and Toxicology",
    "PCO": "Pharmacognosy and Traditional Medicine",
    "PCT": "Pharmaceutics and Pharmaceutical Technology",
    "PCG": "Pharmaceutical and Medicinal Chemistry",
    "CP": "Clinical Pharmacy and Pharmacy Practice",
    "PCH": "Pharmaceutical Microbiology and Biotechnology",
    # Clinical Conditions & Diseases
    "BPH": "Benign Prostatic Hyperplasia",
    "CKD": "Chronic Kidney Disease",
    "ESRD": "End-Stage Renal Disease",
    "GFR": "Glomerular Filtration Rate",
    "EGFR": "Estimated Glomerular Filtration Rate",
    "CRCL": "Creatinine Clearance",
    "SCR": "Serum Creatinine",
    "LFT": "Liver Function Tests",
    "LFTS": "Liver Function Tests",
    "RFT": "Renal Function Tests",
    "RFTS": "Renal Function Tests",
    "FBC": "Full Blood Count",
    "CBC": "Complete Blood Count",
    "HBA1C": "Glycated Hemoglobin",
    "INR": "International Normalized Ratio",
    "PT": "Prothrombin Time",
    "APTT": "Activated Partial Thromboplastin Time",
    "COPD": "Chronic Obstructive Pulmonary Disease",
    "GERD": "Gastroesophageal Reflux Disease",
    "PUD": "Peptic Ulcer Disease",
    "IBD": "Inflammatory Bowel Disease",
    "IBS": "Irritable Bowel Syndrome",
    "UTI": "Urinary Tract Infection",
    "UTIS": "Urinary Tract Infections",
    "RTI": "Respiratory Tract Infection",
    "CAP": "Community-Acquired Pneumonia",
    "HAP": "Hospital-Acquired Pneumonia",
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
    "VRE": "Vancomycin-Resistant Enterococci",
    "ESBL": "Extended-Spectrum Beta-Lactamase",
    "MDR": "Multi-Drug Resistant",
    "XDR": "Extensively Drug Resistant",
    # Neurotransmitters & Biological Markers
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
    def normalize_medical_acronyms(text: str) -> str:
        """
        Expands 100+ standard pharmacy acronyms to their full clinical terms,
        preserving the acronym to maximize dense vector cosine similarity.
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
                # Replace whole word only
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
        return sanitized

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
