export type ArtKind =
  "case" | "recall" | "notes" | "document" | "pills" | "calculations" | "books" | "renal";

export type CardTheme = "teal" | "brand" | "blue" | "amber" | "purple" | "slate";

export type LearnArticle = {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  artKind: ArtKind;
  duration: string;
  video: boolean;
  description: string;
  theme: CardTheme;
  minutes: number;
};

export const learnArticles: LearnArticle[] = [
  {
    slug: "clinical-case",
    title: "How to approach a clinical case",
    category: "Clinical Skills",
    categoryLabel: "Connect the dots",
    artKind: "case",
    duration: "4 min watch",
    video: true,
    description:
      "A step-by-step framework for unpacking any clinical scenario — from the chief complaint to a differential diagnosis you can defend.",
    theme: "teal",
    minutes: 4,
  },
  {
    slug: "active-recall",
    title: "Active recall for better retention",
    category: "Study Techniques",
    categoryLabel: "Put it into practice",
    artKind: "recall",
    duration: "3 min read",
    video: false,
    description:
      "Why re-reading your notes is one of the least effective ways to study — and what you should do instead.",
    theme: "brand",
    minutes: 3,
  },
  {
    slug: "study-notes",
    title: "Creating effective study notes",
    category: "Study Techniques",
    categoryLabel: "Make it your own",
    artKind: "notes",
    duration: "6 min watch",
    video: true,
    description:
      "Good notes accelerate your revision. Learn the formats that work best for dense pharmacology, anatomy, and clinical reasoning.",
    theme: "purple",
    minutes: 6,
  },
  {
    slug: "pharmacy-beyond-counter",
    title: "Pharmacy Beyond the Counter",
    category: "Career Insight",
    categoryLabel: "Explore pathways",
    artKind: "pills",
    duration: "8 min read",
    video: false,
    description:
      "Explore diverse career paths in pharmacy beyond traditional roles — clinical trials, industrial regulatory affairs, and public health.",
    theme: "blue",
    minutes: 8,
  },
  {
    slug: "career-mindset",
    title: "Still Waiting or Building Anyway?",
    category: "Career Mindset",
    categoryLabel: "Take initiative",
    artKind: "calculations",
    duration: "7 min read",
    video: false,
    description:
      "How to stay productive and clinically sharp while preparing for your next internship, hospital rotation, or licensing exam.",
    theme: "amber",
    minutes: 7,
  },
  {
    slug: "build-cv",
    title: "Build a CV That Gets You Interviews",
    category: "Job Search",
    categoryLabel: "Stand out",
    artKind: "document",
    duration: "6 min read",
    video: false,
    description:
      "Tips to craft a competitive pharmacy resume and clinical portfolio that stands out in hospital and residency selections.",
    theme: "slate",
    minutes: 6,
  },
];

/** Quick lookup: slug → article */
export function getArticleBySlug(slug: string): LearnArticle | undefined {
  return learnArticles.find((a) => a.slug === slug);
}

/** All distinct categories in the catalogue */
export const learnCategories: string[] = Array.from(new Set(learnArticles.map((a) => a.category)));

/** Map artKind → slug for the dashboard guide cards */
export const kindToSlug: Record<string, string> = Object.fromEntries(
  learnArticles.map((a) => [a.artKind, a.slug])
);
