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
    familyKey: "character-call-starter",
    slug: "character-call-starter",
    title: "Character Call Starter",
    eyebrow: "Runway Characters service",
    summary:
      "A live AI character video-call setup from one approved image, persona brief, and call goal.",
    buyer:
      "Creators, fandom pages, avatar-curious users, founders, sellers, students, and teams who want a live character people can talk to.",
    providerLabel: "Runway Characters + OpenAI + Boreal review",
    tags: ["live avatar", "video call", "character", "interactive"],
    process: [
      "Upload one approved reference image, character name, persona notes, and call goal.",
      "Boreal shapes the persona sheet, boundaries, and first-message script.",
      "Operator review checks consent, no impersonation, blocked topics, and safe claims.",
      "Runway Character setup and session-launch handoff are prepared server-side.",
      "Boreal runs a test call, records notes, and delivers the launch handoff inside one request thread.",
    ],
    proof: [
      "persona sheet",
      "test-call notes",
      "session-launch handoff",
      "delivery receipt",
    ],
    plans: [
      {
        planKey: "starter-call",
        label: "Starter Call",
        price: "$1",
        turnaround: "24 hours",
        summary:
          "Launch-price checkout for one live character-call setup with persona sheet, one included test session, session-launch handoff, and delivery notes.",
        included: [
          "1 character setup direction",
          "1 included 5-minute test call",
          "persona and safety boundaries",
          "session-launch handoff",
        ],
        serviceRequestStarter:
          "I want the Character Call Starter, Starter Call. The character name is: . The call goal is: . The personality should be: . Allowed topics are: . Blocked topics are: . I can upload one approved reference image. Done means I receive a working character-call handoff, persona sheet, test notes, and delivery receipt.",
      },
      {
        planKey: "sales-avatar-test",
        label: "AI Sales Avatar Test",
        price: "$490",
        turnaround: "3 business days",
        summary:
          "A product-aware live avatar test that explains one offer, answers FAQ-style questions, and returns lead-note structure.",
        included: [
          "product-aware persona",
          "offer FAQ pack",
          "2 reviewed test calls",
          "lead-note handoff template",
        ],
        serviceRequestStarter:
          "I want the Character Call Starter, AI Sales Avatar Test. The product or offer URL is: . The target buyer is: . The avatar tone should be: . The FAQ or sales notes are: . Done means I receive a product-aware live avatar handoff, reviewed test-call notes, and lead-note template.",
      },
      {
        planKey: "practice-room-avatar",
        label: "Practice Room Avatar",
        price: "$220",
        turnaround: "48 hours",
        summary:
          "A live roleplay avatar for one practice scenario, with scenario prompt and feedback summary template.",
        included: [
          "1 roleplay persona",
          "1 scenario prompt",
          "1 reviewed test call",
          "feedback summary template",
        ],
        serviceRequestStarter:
          "I want the Character Call Starter, Practice Room Avatar. The practice scenario is: . The goal is: . The difficulty should be: . The avatar should act like: . Done means I receive a live roleplay avatar handoff, scenario prompt, test-call notes, and feedback summary template.",
      },
    ],
  },
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
