export type CaseSource = {
  label: string;
  url: string;
};

export type UapCase = {
  slug: string;
  name: string;
  dateLabel: string;
  location: string;
  tags: string[];
  summary: string;
  reported: string;
  evidence: string;
  skepticalExplanations: string[];
  openQuestions: string[];
  sources: CaseSource[];
};
