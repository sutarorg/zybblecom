/** Public support address, also used by the existing production contact integration. */
export const supportEmail = "tejassutar.business@gmail.com";

export const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
] as const;

export const dodoLegal = {
  buyerTerms: "https://dodopayments.com/legal/buyer-terms",
  privacy: "https://dodopayments.com/legal/privacy-policy",
} as const;
