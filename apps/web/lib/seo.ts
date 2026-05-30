import type { Metadata } from "next";
import type {
  BorealServiceFamily,
  BorealServicePlan,
} from "@/lib/service-catalog";

export const seoSiteName = "Boreal";
export const seoSiteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://boreal.work"
);
export const seoDefaultTitle = "Boreal - Requests into completed work";
export const seoTitleTemplate = "%s | Boreal";
export const seoDefaultDescription =
  "Boreal turns requests into completed work across humans and AI, with plans, proof, review, and reusable solutions attached to one durable Request.";
export const seoShortDescription =
  "Post a request, compare plans, run or fund the work, verify artifacts, and reuse accepted solutions.";
export const seoOgImagePath = "/opengraph-image";
export const seoTwitterImagePath = "/twitter-image";

export const seoKeywords = [
  "Boreal",
  "completed work",
  "AI work board",
  "request-native work commerce",
  "human AI fulfillment",
  "request tracking",
  "proof of work",
  "public solutions",
  "run with credits",
];

export const publicSeoRoutes = [
  "/",
  "/open-requests",
  "/services",
  "/download/boreal-desktop",
  "/architecture",
  "/problem-intel",
] as const;

export const isDemoMode =
  process.env.IS_DEMO === "1" || process.env.NEXT_PUBLIC_BASE_PATH === "/demo";

export const publicRobots = {
  follow: true,
  googleBot: {
    follow: true,
    index: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  index: true,
} satisfies Metadata["robots"];

export const privateRobots = {
  follow: false,
  googleBot: {
    follow: false,
    index: false,
  },
  index: false,
} satisfies Metadata["robots"];

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, seoSiteUrl).toString();
}

function metadataTitle(title: string, absolute = false): Metadata["title"] {
  return absolute ? { absolute: title } : title;
}

function socialTitle(title: string, absolute = false) {
  return absolute ? title : `${title} | ${seoSiteName}`;
}

export function buildRootMetadata(): Metadata {
  return {
    applicationName: seoSiteName,
    appleWebApp: {
      capable: true,
      title: seoSiteName,
    },
    authors: [{ name: "Boreal" }],
    category: "productivity",
    creator: "Boreal",
    description: seoDefaultDescription,
    formatDetection: {
      address: false,
      email: false,
      telephone: false,
    },
    icons: {
      icon: "/favicon.ico",
    },
    keywords: seoKeywords,
    metadataBase: seoSiteUrl,
    openGraph: {
      description: seoDefaultDescription,
      images: [
        {
          alt: "Boreal turns requests into completed work.",
          height: 630,
          url: seoOgImagePath,
          width: 1200,
        },
      ],
      locale: "en_US",
      siteName: seoSiteName,
      title: seoDefaultTitle,
      type: "website",
      url: absoluteUrl("/"),
    },
    publisher: "Boreal",
    robots: isDemoMode ? privateRobots : publicRobots,
    title: {
      default: seoDefaultTitle,
      template: seoTitleTemplate,
    },
    twitter: {
      card: "summary_large_image",
      description: seoDefaultDescription,
      images: [seoTwitterImagePath],
      title: seoDefaultTitle,
    },
  };
}

export function buildPageMetadata({
  absoluteTitle = false,
  description,
  imageAlt,
  noindex = false,
  path,
  title,
}: {
  absoluteTitle?: boolean;
  description: string;
  imageAlt?: string;
  noindex?: boolean;
  path: string;
  title: string;
}): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const resolvedTitle = socialTitle(title, absoluteTitle);

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: imageAlt ?? `${resolvedTitle}.`,
          height: 630,
          url: seoOgImagePath,
          width: 1200,
        },
      ],
      siteName: seoSiteName,
      title: resolvedTitle,
      type: "website",
      url: canonicalUrl,
    },
    robots: noindex || isDemoMode ? privateRobots : publicRobots,
    title: metadataTitle(title, absoluteTitle),
    twitter: {
      card: "summary_large_image",
      description,
      images: [seoTwitterImagePath],
      title: resolvedTitle,
    },
  };
}

export function buildPrivateMetadata(title: string): Metadata {
  return {
    robots: privateRobots,
    title,
  };
}

export function serviceFamilyPath(family: BorealServiceFamily) {
  return `/services/${family.slug}`;
}

export function servicePlanPath(
  family: BorealServiceFamily,
  plan: BorealServicePlan
) {
  return `/services/${family.slug}/${plan.planKey}`;
}

export function buildServiceFamilyMetadata(family: BorealServiceFamily) {
  return buildPageMetadata({
    description: `${family.summary} Buying this service opens one Boreal Request with execution, proof, review, and delivery attached.`,
    path: serviceFamilyPath(family),
    title: family.title,
  });
}

export function buildServicePlanMetadata({
  family,
  plan,
}: {
  family: BorealServiceFamily;
  plan: BorealServicePlan;
}) {
  return buildPageMetadata({
    description: `${plan.summary} ${family.title} runs through one Boreal Request with proof and delivery artifacts.`,
    path: servicePlanPath(family, plan),
    title: `${plan.label} - ${family.title}`,
  });
}
