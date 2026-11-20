export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  author: { name: string; url?: string };
  publishedAt: string;
  sections: readonly {
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
