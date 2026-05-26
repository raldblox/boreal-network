export type BorealServicePlan = {
  planKey: string;
  label: string;
  price: string;
  turnaround: string;
  summary: string;
  included: string[];
  serviceRequestStarter: string;
};

export type BorealServiceFamily = {
  familyKey: string;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  buyer: string;
  providerLabel: string;
  tags: string[];
  process: string[];
  proof: string[];
  plans: BorealServicePlan[];
};

export const borealServiceFamilies: BorealServiceFamily[] = [
  {
    familyKey: "founder-avatar-clip-pack",
    slug: "founder-avatar-clip-pack",
    title: "Founder Avatar Clip Pack",
    eyebrow: "Runway-backed service",
    summary:
      "Ready-to-post avatar and character clips for launches, sales replies, onboarding, and founder-led promotion.",
    buyer: "Founders, creator-brands, operators, and growth leads who need finished clips instead of another generation tool.",
    providerLabel: "Runway + Boreal review",
    tags: ["avatar video", "short-form", "character", "launch"],
    process: [
      "Submit the offer, audience, tone, and reference assets.",
      "Boreal shapes scripts and approves the generation plan before spend.",
      "Runway generation produces avatar or character clip candidates.",
      "Operator review checks brand fit, captions, completeness, and handoff.",
      "Final clips, captions, and proof are delivered inside one request thread.",
    ],
    proof: [
      "captioned video exports",
      "clean media files",
      "script and prompt handoff",
      "delivery receipt",
    ],
    plans: [
      {
        planKey: "sales-reply-pack",
        label: "Sales Reply Pack",
        price: "$1,250",
        turnaround: "5 business days",
        summary:
          "Eight short avatar clips with scripts, captions, Runway generations, review, and one revision pass.",
        included: [
          "8 short-form avatar clips",
          "script variants",
          "captioned and clean exports",
          "one revision pass",
        ],
        serviceRequestStarter:
          "I want the Founder Avatar Clip Pack, Sales Reply Pack. The offer is: . The audience is: . The tone should be: . I can provide these reference assets: . Done means I receive ready-to-post clips, captions, and delivery notes.",
      },
    ],
  },
  {
    familyKey: "character-host-trend-pack",
    slug: "character-host-trend-pack",
    title: "Character Host Trend Pack",
    eyebrow: "Viral content service",
    summary:
      "Create a repeatable host or character that can deliver niche commentary, explainers, and trend response clips.",
    buyer:
      "Anonymous niche pages, creator founders, ecommerce brands, and operators who need a recognizable recurring host.",
    providerLabel: "Runway + OpenAI + operator review",
    tags: ["character", "trend", "niche media", "posting"],
    process: [
      "Define the niche, host persona, visual direction, and posting goal.",
      "Boreal prepares scripts, hooks, and character guidance.",
      "Generation and editing create reusable host samples and clips.",
      "Operator review checks consistency and safe claims.",
      "The buyer receives clips plus a reusable character handoff.",
    ],
    proof: [
      "ready-to-post clips",
      "character sheet",
      "caption pack",
      "posting notes",
    ],
    plans: [
      {
        planKey: "character-seed-pack",
        label: "Character Seed Pack",
        price: "$320",
        turnaround: "4 business days",
        summary:
          "One host look, one voice direction, three sample clips, and usage notes.",
        included: [
          "1 character direction",
          "3 sample clips",
          "voice and style notes",
          "handoff sheet",
        ],
        serviceRequestStarter:
          "I want the Character Host Trend Pack, Character Seed Pack. The niche is: . The character should feel like: . The clips should talk about: . Done means I receive three sample clips, a character sheet, and usage notes.",
      },
      {
        planKey: "character-host-10",
        label: "Character Host 10",
        price: "$890",
        turnaround: "7 business days",
        summary:
          "One tuned host persona, ten clips, script pack, caption pack, and character bible.",
        included: [
          "10 ready clips",
          "script pack",
          "caption pack",
          "character bible",
        ],
        serviceRequestStarter:
          "I want the Character Host Trend Pack, Character Host 10. The niche is: . The host persona is: . The target audience is: . Done means I receive ten ready clips, captions, scripts, and a character bible.",
      },
    ],
  },
  {
    familyKey: "trend-seed-reel-pack",
    slug: "trend-seed-reel-pack",
    title: "Trend Seed Reel Pack",
    eyebrow: "Short-form growth service",
    summary:
      "A ready-to-post set of niche short-form clips built around hooks, captions, trend rationale, and posting sequence.",
    buyer:
      "Creator-founders, niche media pages, collector brands, and growth operators testing a new content lane.",
    providerLabel: "OpenAI + Runway-ready production",
    tags: ["reels", "tiktok", "instagram", "niche hooks"],
    process: [
      "Pick a niche, target audience, and posting goal.",
      "Boreal turns the angle into hook families and scripts.",
      "Clips are generated or edited against the chosen content format.",
      "Operator review packages captions, covers, and posting notes.",
      "Delivery lands as a request artifact bundle.",
    ],
    proof: [
      "video drafts",
      "caption sheet",
      "trend rationale",
      "posting map",
    ],
    plans: [
      {
        planKey: "trend-signal-12",
        label: "Trend Signal 12",
        price: "$420",
        turnaround: "5 business days",
        summary:
          "Twelve clips, three hook families, caption pack, posting sequence, and trend rationale.",
        included: [
          "12 clips",
          "3 hook families",
          "caption pack",
          "posting sequence",
        ],
        serviceRequestStarter:
          "I want the Trend Seed Reel Pack, Trend Signal 12. The niche is: . The audience is: . The content examples or competitors are: . Done means I receive twelve ready-to-post clips, captions, and posting notes.",
      },
    ],
  },
];

export function getServiceFamilyBySlug(slug: string | null | undefined) {
  if (!slug) {
    return undefined;
  }

  return borealServiceFamilies.find((family) => family.slug === slug);
}

export function getServicePlan({
  familyKey,
  planKey,
}: {
  familyKey: string | null | undefined;
  planKey: string | null | undefined;
}) {
  const family =
    borealServiceFamilies.find((entry) => entry.familyKey === familyKey) ??
    getServiceFamilyBySlug(familyKey);
  if (!family) {
    return undefined;
  }

  const plan = planKey
    ? family.plans.find((entry) => entry.planKey === planKey)
    : family.plans[0];

  if (!plan) {
    return undefined;
  }

  return {
    family,
    plan,
  };
}
