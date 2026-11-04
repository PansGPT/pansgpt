export type ArtKind =
  "case" | "recall" | "notes" | "document" | "pills" | "calculations" | "books" | "renal";

export type CardTheme = "teal" | "brand" | "blue" | "amber" | "purple" | "slate";

export type LearnArticle = {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  shortTag: string;
  artKind: ArtKind;
  duration: string;
  video: boolean;
  description: string;
  theme: CardTheme;
  minutes: number;
  thumbnailUrl: string;
  artUrl: string;
};

export const learnArticles: LearnArticle[] = [
  {
    slug: "clinical-case",
    title: "How to approach a clinical case",
    category: "Clinical Skills",
    categoryLabel: "Connect the dots",
    shortTag: "CLINICAL",
    artKind: "case",
    duration: "4 min watch",
    video: true,
    description: "A framework for unpacking clinical scenarios with confidence.",
    theme: "teal",
    minutes: 4,
    thumbnailUrl: "/learn/clinical-case.jpg",
    artUrl: "/learn/clinical-case-art.png",
  },
  {
    slug: "active-recall",
    title: "Active recall for better retention",
    category: "Study Techniques",
    categoryLabel: "Put it into practice",
    shortTag: "STUDY",
    artKind: "recall",
    duration: "3 min read",
    video: false,
    description: "Why re-reading fails and what to do instead.",
    theme: "brand",
    minutes: 3,
    thumbnailUrl: "/learn/active-recall.jpg",
    artUrl: "/learn/active-recall-art.png",
  },
  {
    slug: "study-notes",
    title: "Creating effective study notes",
    category: "Study Techniques",
    categoryLabel: "Make it your own",
    shortTag: "SKILLS",
    artKind: "notes",
    duration: "6 min watch",
    video: true,
    description: "Formats that accelerate your pharmacology revision.",
    theme: "purple",
    minutes: 6,
    thumbnailUrl: "/learn/study-notes.jpg",
    artUrl: "/learn/study-notes-art.png",
  },
  {
    slug: "pharmacy-beyond-counter",
    title: "Pharmacy Beyond the Counter",
    category: "Career Insight",
    categoryLabel: "Explore pathways",
    shortTag: "CAREER",
    artKind: "pills",
    duration: "8 min read",
    video: false,
    description: "Explore diverse career paths in pharmacy beyond traditional roles.",
    theme: "blue",
    minutes: 8,
    thumbnailUrl: "/learn/pharmacy-beyond-counter.jpg",
    artUrl: "/learn/signpost-art.png",
  },
  {
    slug: "career-mindset",
    title: "Still Waiting or Building Anyway?",
    category: "Career Mindset",
    categoryLabel: "Take initiative",
    shortTag: "MINDSET",
    artKind: "calculations",
    duration: "7 min read",
    video: false,
    description: "Stay productive while preparing for your next move.",
    theme: "amber",
    minutes: 7,
    thumbnailUrl: "/learn/career-mindset.jpg",
    artUrl: "/learn/career-mindset-art.png",
  },
  {
    slug: "build-cv",
    title: "Build a CV That Gets You Interviews",
    category: "Job Search",
    categoryLabel: "Stand out",
    shortTag: "RESUME",
    artKind: "document",
    duration: "6 min read",
    video: false,
    description: "Craft a resume that stands out in competitive selections.",
    theme: "slate",
    minutes: 6,
    thumbnailUrl: "/learn/build-cv.jpg",
    artUrl: "/learn/build-cv-art.png",
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
