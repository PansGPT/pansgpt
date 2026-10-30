import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, PlayCircle, Lightbulb, MessageSquare } from "lucide-react";
import { StudyArt } from "@/components/shell/study-art";
import { getArticleBySlug, learnArticles } from "@/components/learn/learn-content";
import "@/components/learn/learn.css";

/* ─── Lesson bodies ──────────────────────────────────────────────── */

function ClinicalCaseBody(): React.ReactElement {
  return (
    <div className="learn-lesson-content">
      <p>
        Clinical cases can feel overwhelming at first — a wall of patient information with no
        obvious starting point. The good news: experienced clinicians don&apos;t magically process
        information faster than you. They use a framework. Here&apos;s the one that works.
      </p>

      <h2>1. Read the stem twice</h2>
      <p>
        Your first read is for orientation — age, sex, the chief complaint. Your second read is
        active: underline or mentally flag every abnormal finding, every timeline clue, and every
        piece of social or medication history.
      </p>

      <h2>2. Build a one-liner</h2>
      <p>
        Before you even think about a diagnosis, summarise the patient in a single sentence. For
        example:{" "}
        <em>
          &quot;A 58-year-old man with a 30-pack-year smoking history presents with progressive
          exertional dyspnoea and a productive cough over three months.&quot;
        </em>{" "}
        This forces clarity and reveals your knowledge gaps.
      </p>

      <h2>3. Generate a problem representation</h2>
      <p>
        Translate raw findings into clinical language. &quot;BP 80/50&quot; becomes
        &quot;hypotension.&quot; Group findings by system: cardiovascular, respiratory,
        neurological. This abstraction is what separates a differential from a guess.
      </p>

      <div className="learn-lesson-tip">
        <Lightbulb size={18} aria-hidden="true" />
        <span>
          <strong>Illness scripts:</strong> Build a mental library of disease patterns. When a case
          matches a script — the epidemiology, time course, and key findings — you&apos;ll recognise
          it faster under exam pressure.
        </span>
      </div>

      <h2>4. Rank your differential</h2>
      <p>Think in three columns:</p>
      <ul>
        <li>
          <strong>Must not miss</strong> — dangerous conditions with high mortality if delayed (PE,
          MI, aortic dissection)
        </li>
        <li>
          <strong>Most likely</strong> — the diagnosis that best fits the complete picture
        </li>
        <li>
          <strong>Other possibilities</strong> — what you&apos;d consider if the likely diagnosis is
          ruled out
        </li>
      </ul>

      <h2>5. Justify each investigation</h2>
      <p>
        Don&apos;t list every test you know. For each investigation, ask: &quot;What am I looking
        for, and how will this result change my management?&quot; Examiners want to see clinical
        reasoning, not a shotgun approach.
      </p>

      <h2>6. Synthesise and manage</h2>
      <p>
        Your management plan should flow logically from your diagnosis. Immediate stabilisation
        first (airway, breathing, circulation), then investigations, then definitive treatment. Show
        that you&apos;re thinking about the whole patient — safety netting, follow-up, and patient
        education matter too.
      </p>

      <Link href="/app/chat" className="learn-lesson-cta">
        <MessageSquare size={16} aria-hidden="true" />
        Try a case with PansGPT
      </Link>
    </div>
  );
}

function ActiveRecallBody(): React.ReactElement {
  return (
    <div className="learn-lesson-content">
      <p>
        Most students spend the majority of their study time re-reading notes and highlighting
        textbooks. It feels productive — but the research is unambiguous: passive review is one of
        the least effective ways to build long-term memory.
      </p>

      <h2>Why active recall works</h2>
      <p>
        Every time you retrieve a memory, you strengthen the neural pathway that holds it. This is
        called the <strong>testing effect</strong>. Struggling to recall something — even when you
        fail — dramatically improves future retention compared to reading the same material again.
      </p>
      <p>
        A landmark study by Karpicke &amp; Roediger (2008) showed that students who tested
        themselves retained 80% of material after a week, while students who re-read retained just
        36%. Same time invested, very different outcomes.
      </p>

      <div className="learn-lesson-tip">
        <Lightbulb size={18} aria-hidden="true" />
        <span>
          <strong>The blank page test:</strong> After a lecture, close your notes and write down
          everything you remember. Then check what you missed. This single habit, done consistently,
          is worth more than hours of re-reading.
        </span>
      </div>

      <h2>How to apply it in pharmacy</h2>
      <ul>
        <li>
          <strong>Flashcards with spaced repetition</strong> — Anki is the gold standard. New cards
          daily; review due cards without skipping.
        </li>
        <li>
          <strong>Question banks</strong> — Do questions before you feel ready. Getting them wrong
          now saves you from getting them wrong in exams.
        </li>
        <li>
          <strong>Teach it out loud</strong> — Explaining a drug mechanism to an imaginary student
          forces you to find the gaps in your understanding.
        </li>
        <li>
          <strong>Mini-quizzes after every topic</strong> — Before moving on, write 3–5 questions
          about what you just studied. Answer them tomorrow.
        </li>
      </ul>

      <h2>The biggest mistake</h2>
      <p>
        Starting a study session by reviewing old material before doing active recall. Flip it: test
        yourself first, then review what you couldn&apos;t remember. This is harder and feels less
        comfortable — which is exactly why it works.
      </p>

      <Link href="/app/chat" className="learn-lesson-cta">
        <MessageSquare size={16} aria-hidden="true" />
        Test yourself with PansGPT
      </Link>
    </div>
  );
}

function StudyNotesBody(): React.ReactElement {
  return (
    <div className="learn-lesson-content">
      <p>
        The best study notes aren&apos;t a transcript of your lecture — they&apos;re a tool for
        retrieval. Every formatting decision you make should ask: &quot;Will this help me remember
        and apply this information?&quot; Here&apos;s how to build notes that actually work.
      </p>

      <h2>Principle 1: Write less, think more</h2>
      <p>
        Trying to capture everything is the fastest way to produce notes that are useless for
        revision. Instead, listen for the core idea in each section, pause, and write it in your own
        words. Paraphrasing forces understanding; verbatim copying is just typing.
      </p>

      <h2>Principle 2: Match the format to the content</h2>
      <ul>
        <li>
          <strong>Mechanisms and pathways</strong> → diagrams and flowcharts. Drawing the
          renin-angiotensin-aldosterone cascade beats reading about it every time.
        </li>
        <li>
          <strong>Drug classes</strong> → comparison tables. Columns: mechanism, indications,
          contraindications, key side effects, monitoring.
        </li>
        <li>
          <strong>Clinical reasoning</strong> → decision trees or if/then frameworks. &quot;If the
          patient has X, then consider Y before Z.&quot;
        </li>
        <li>
          <strong>Mnemonics</strong> → sparingly, only for lists that genuinely need them. Build
          your own rather than memorising someone else&apos;s — the act of creating it aids
          retention.
        </li>
      </ul>

      <div className="learn-lesson-tip">
        <Lightbulb size={18} aria-hidden="true" />
        <span>
          <strong>Leave white space:</strong> Cramming everything onto a page makes notes hard to
          review. Generous margins let you add connections later — and signal where you ran out of
          understanding the first time.
        </span>
      </div>

      <h2>Principle 3: Build in retrieval cues</h2>
      <p>
        The Cornell method divides your page into a main notes area, a narrow cue column on the
        left, and a summary at the bottom. After your lecture, fill in the cue column with questions
        that your notes answer. Cover the right side and quiz yourself. This turns every page of
        notes into a self-test.
      </p>

      <h2>Principle 4: Review and refine, don&apos;t rewrite</h2>
      <p>
        Rewriting notes from scratch feels productive but rarely is. Instead, within 24 hours of a
        lecture, add connections to other topics, correct errors, and highlight the 3–5 most
        important points. Then leave them alone until your spaced repetition schedule says
        otherwise.
      </p>

      <h2>What good notes look like after six months</h2>
      <p>
        Dense with your own annotations. Covered in question marks where you pushed your
        understanding. Slightly dog-eared from being used. Not pristine.
      </p>

      <Link href="/app/chat" className="learn-lesson-cta">
        <MessageSquare size={16} aria-hidden="true" />
        Ask PansGPT to help structure your notes
      </Link>
    </div>
  );
}

function PharmacyBeyondCounterBody(): React.ReactElement {
  return (
    <div className="learn-lesson-content">
      <p>
        The traditional picture of a pharmacist standing behind a dispensary counter is only one
        branch of a massive healthcare landscape. Modern pharmacy graduates are spearheading
        multinational clinical trials, advising health ministries, and steering pharmaceutical
        biotechnology.
      </p>

      <h2>1. Clinical Trials &amp; Medical Affairs</h2>
      <p>
        Pharmaceutical companies rely on clinical pharmacists to bridge bench research and patient
        care. As a Medical Science Liaison (MSL) or Clinical Research Associate (CRA), you interpret
        pharmacokinetic data, train principal investigators, and monitor adverse drug reactions.
      </p>

      <h2>2. Regulatory Affairs &amp; Drug Safety (Pharmacovigilance)</h2>
      <p>
        Every medicine brought to market requires regulatory submission, safety monitoring, and
        rigorous compliance with national health authorities (like NAFDAC, FDA, or EMA). Pharmacists
        lead signal detection teams that identify rare post-marketing drug risks.
      </p>

      <div className="learn-lesson-tip">
        <Lightbulb size={18} aria-hidden="true" />
        <span>
          <strong>Industry insight:</strong> Penultimate year is the optimal time to seek summer
          internships in regulatory consulting, pharmacovigilance, or health-tech product teams.
        </span>
      </div>

      <h2>3. Health Economics &amp; Outcomes Research (HEOR)</h2>
      <p>
        It is no longer enough for a drug to work — governments and HMOs ask: &quot;Is it
        cost-effective compared to standard care?&quot; HEOR pharmacists model survival curves,
        quality-adjusted life years (QALYs), and shape formularies that determine which medications
        patients can access.
      </p>

      <Link href="/app/chat" className="learn-lesson-cta">
        <MessageSquare size={16} aria-hidden="true" />
        Explore pharmacy career paths in PansGPT
      </Link>
    </div>
  );
}

function CareerMindsetBody(): React.ReactElement {
  return (
    <div className="learn-lesson-content">
      <p>
        Many pharmacy students fall into the &quot;waiting trap&quot; — waiting for graduation,
        waiting for internship matching, waiting for someone to hand them a title before doing
        meaningful work. The most successful students start building their clinical reputation long
        before their final exams.
      </p>

      <h2>Action precedes motivation</h2>
      <p>
        Waiting until you &quot;feel ready&quot; to tackle clinical journal reviews or clinical
        audits usually means waiting indefinitely. Clinical confidence is the byproduct of repeated
        small actions: presenting a mini-case, auditing an antimicrobial guideline, or drafting a
        study monograph.
      </p>

      <h2>How to build clinical presence now</h2>
      <ul>
        <li>
          <strong>Audit one drug class per week</strong>: Don&apos;t just cram for exams. Pick a
          drug class and dissect its clinical trials, renal cutoffs, and therapeutic drug monitoring
          parameters.
        </li>
        <li>
          <strong>Engage in student clinical competitions</strong>: Participate in clinical case
          OSCE bowls and compounding challenges.
        </li>
        <li>
          <strong>Shadow proactively</strong>: When on hospital visits, ask the clinical pharmacist
          about their most difficult drug-interaction catch of the week.
        </li>
      </ul>

      <div className="learn-lesson-tip">
        <Lightbulb size={18} aria-hidden="true" />
        <span>
          <strong>The builder&apos;s mindset:</strong> You don&apos;t need a license to think like a
          clinician. Approach every lecture slide with the question: &quot;How does this prevent a
          patient error?&quot;
        </span>
      </div>

      <Link href="/app/chat" className="learn-lesson-cta">
        <MessageSquare size={16} aria-hidden="true" />
        Brainstorm clinical projects with PansGPT
      </Link>
    </div>
  );
}

function BuildCvBody(): React.ReactElement {
  return (
    <div className="learn-lesson-content">
      <p>
        Hospitals and top healthcare institutions receive hundreds of interchangeable resumes with
        identical degree titles and GPAs. To stand out, your CV must tell a clear story of clinical
        competence, initiative, and patient-centered responsibility.
      </p>

      <h2>1. Lead with clinical competencies, not just coursework</h2>
      <p>
        Instead of listing &quot;Attended Clinical Pharmacy lectures,&quot; highlight hands-on
        experience: &quot;Conducted medication reconciliation for 25+ patient cases during hospital
        clinical rotation, identifying 4 potential drug-drug interactions involving
        narrow-therapeutic-index agents.&quot;
      </p>

      <h2>2. Quantify your contributions</h2>
      <ul>
        <li>
          <strong>Leadership</strong>: &quot;Led a 4-person student team in university compounding
          lab optimising topical formulation yield by 18%.&quot;
        </li>
        <li>
          <strong>Research</strong>: &quot;Co-authored clinical audit on community antibiotic
          adherence presented at faculty symposium.&quot;
        </li>
        <li>
          <strong>Community</strong>: &quot;Screened 120+ individuals for hypertension and diabetes
          during student outreach clinic.&quot;
        </li>
      </ul>

      <div className="learn-lesson-tip">
        <Lightbulb size={18} aria-hidden="true" />
        <span>
          <strong>Format tip:</strong> Keep your CV clean, strictly single or double page, with no
          decorative charts or rating bars for skills. Hospital preceptors look for clarity and
          accuracy.
        </span>
      </div>

      <Link href="/app/chat" className="learn-lesson-cta">
        <MessageSquare size={16} aria-hidden="true" />
        Review your CV draft with PansGPT
      </Link>
    </div>
  );
}

const lessonBodies: Record<string, React.ReactElement> = {
  "clinical-case": <ClinicalCaseBody />,
  "active-recall": <ActiveRecallBody />,
  "study-notes": <StudyNotesBody />,
  "pharmacy-beyond-counter": <PharmacyBeyondCounterBody />,
  "career-mindset": <CareerMindsetBody />,
  "build-cv": <BuildCvBody />,
};

/* ─── Page ─────────────────────────────────────────────────────────── */

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) notFound();

  const body = lessonBodies[slug];
  const moreGuides = learnArticles.filter((item) => item.slug !== slug);

  return (
    <div className="learn-lesson-container">
      <Link href="/app/learn" className="learn-lesson-back">
        <ArrowLeft size={15} aria-hidden="true" />
        Back to Learn
      </Link>

      <div className="learn-lesson-layout">
        <article className="learn-lesson-main">
          <div className="learn-lesson-hero" data-art={article.artKind}>
            <StudyArt kind={article.artKind} variant="banner" />
            <span className="learn-lesson-hero-label" aria-hidden="true">
              {article.categoryLabel}
            </span>
          </div>

          <div className="learn-lesson-eyebrow">
            <span className="learn-lesson-category">{article.category}</span>
            <span className="learn-lesson-duration">
              {article.video ? (
                <PlayCircle size={13} aria-hidden="true" />
              ) : (
                <BookOpen size={13} aria-hidden="true" />
              )}
              {article.duration}
            </span>
          </div>

          <h1>{article.title}</h1>

          {body}
        </article>

        <aside className="learn-lesson-sidebar" aria-label="More guides to explore">
          <h2 className="learn-sidebar-heading">More to read &amp; watch</h2>
          <div className="learn-sidebar-list">
            {moreGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/app/learn/${guide.slug}`}
                className="learn-sidebar-item"
              >
                <div className="learn-sidebar-thumb" data-art={guide.artKind}>
                  <StudyArt kind={guide.artKind} variant="square" />
                </div>
                <div className="learn-sidebar-details">
                  <span className="learn-sidebar-category">{guide.shortTag}</span>
                  <h3>{guide.title}</h3>
                  <span className="learn-sidebar-meta">
                    {guide.video ? (
                      <PlayCircle size={12} aria-hidden="true" />
                    ) : (
                      <BookOpen size={12} aria-hidden="true" />
                    )}
                    {guide.duration}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="learn-sidebar-help-card">
            <h3>Practice with PansGPT</h3>
            <p>
              Work through real cases, generate quiz questions, or summarize lecture monographs.
            </p>
            <Link href="/app/chat" className="learn-sidebar-help-link">
              <MessageSquare size={14} aria-hidden="true" />
              Open AI Chat
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
