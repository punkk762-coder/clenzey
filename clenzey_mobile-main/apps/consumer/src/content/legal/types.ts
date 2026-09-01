export interface LegalSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro?: string[];
  sections: LegalSection[];
}
