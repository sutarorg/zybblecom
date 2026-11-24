import { site } from "@/config/site";

export const homeUrl = `${site.url}/`;

export const publisher = {
  "@id": `${homeUrl}#organization`,
  "@type": "Organization",
  name: site.name,
  url: homeUrl,
  logo: {
    "@type": "ImageObject",
    url: `${site.url}/icons/icon-512.png`,
    width: 512,
    height: 512,
  },
} as const;

export const websiteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${homeUrl}#website`,
      "@type": "WebSite",
      name: site.name,
      url: homeUrl,
      description: site.description,
      publisher: { "@id": publisher["@id"] },
    },
    publisher,
  ],
} as const;
