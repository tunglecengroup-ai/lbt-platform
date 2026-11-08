import { AUTHOR, BRAND, SOCIALS, siteUrl } from "@/lib/site";

/** Các khối schema.org dùng lại nhiều nơi (Google rich results + AI search hiểu "ai đứng sau nội dung") */
export const orgId = () => `${siteUrl}/#organization`;
export const personId = () => `${siteUrl}/#lebatung`;

export const organizationLd = () => ({
  "@type": "EducationalOrganization",
  "@id": orgId(),
  name: BRAND.name,
  url: siteUrl,
  description: BRAND.description,
  logo: `${siteUrl}/logo.png`,
  sameAs: SOCIALS,
  founder: { "@id": personId() },
});

export const personLd = () => ({
  "@type": "Person",
  "@id": personId(),
  name: AUTHOR.name,
  jobTitle: AUTHOR.jobTitle,
  description: AUTHOR.bio,
  url: `${siteUrl}${AUTHOR.aboutPath}`,
  sameAs: SOCIALS,
  worksFor: { "@id": orgId() },
  knowsAbout: ["Quảng cáo Facebook", "Facebook Ads", "Marketing online", "Bán hàng COD", "AI marketing"],
});

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${siteUrl}${it.path}` })),
});

export const faqLd = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
