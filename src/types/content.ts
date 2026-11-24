export type Article = {
  slug: string;
  title: string;
  description: string;
  keywords: readonly string[];
  category: string;
  author: { name: string; url?: string };
  publishedAt: string;
  updatedAt?: string;
  wordCount?: number;
  edition?: ArticleEdition;
  sections?: readonly {
    id: string;
    title: string;
    paragraphs: readonly string[];
  }[];
  thumbnail: { src: string; alt: string };
  links: readonly { href: string; label: string }[];
  featured?: boolean;
};
export type VerifiedClip = {
  id: string;
  title: string;
  description: string;
  video: string;
  captions: string;
  poster?: string;
};

export type ArticleInline = string | { href: string; label: string };
export type ArticleBlock =
  | { kind: "paragraph"; content: string | readonly ArticleInline[] }
  | {
      kind: "list";
      ordered?: boolean;
      start?: number;
      items: readonly string[];
    }
  | {
      kind: "table";
      caption: string;
      headers: readonly string[];
      rows: readonly (readonly string[])[];
    };
export type ArticleEdition = {
  intent: string;
  intro: string;
  sections: readonly {
    id: string;
    title: string;
    blocks: readonly ArticleBlock[];
  }[];
  takeaway: string;
  cta: { title: string; text: string; href: string; label: string };
};
