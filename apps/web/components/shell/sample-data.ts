import { addDateDays } from "@pansgpt/ui/shell";

// Presentation-only examples. Never written to an account or sent to an AI provider.
export const sampleDocuments = [
  { title: "Pharmacology Notes", art: "document" },
  { title: "Antimicrobials Quiz", art: "pills" },
  { title: "Clinical Cases", art: "renal" },
  { title: "Drug Calculations", art: "calculations" },
  { title: "Pharmaceutics Notes", art: "books" },
  { title: "OSCE Preparation", art: "notes" },
] as const;

export function sampleActivities(today: string): {
  id: string;
  title: string;
  date: string;
  detail: string;
  kind: "task" | "class";
}[] {
  return [
    {
      id: "sample-lecture",
      title: "Pharmacology Lecture",
      date: today,
      detail: "9:00 AM · Online",
      kind: "class",
    },
    {
      id: "sample-assignment",
      title: "Clinical Pharmacy Assignment",
      date: addDateDays(today, 3),
      detail: "10:00 AM · Library",
      kind: "task",
    },
    {
      id: "sample-meeting",
      title: "PANS Meeting",
      date: addDateDays(today, 5),
      detail: "2:00 PM · Faculty Hall",
      kind: "class",
    },
  ];
}
