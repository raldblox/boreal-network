import type {
  BorealActorKind,
  BorealOutputKind,
  BorealRequestExecutionKind,
  BorealRequestMatchingMode,
  BorealRequestPaymentMode,
  BorealRequestRouteFamily,
  BorealSupplyKind,
} from "./matching-fingerprints";

export type BorealServicePlan = {
  planKey: string;
  label: string;
  price: string;
  turnaround: string;
  summary: string;
  included: string[];
  serviceRequestStarter: string;
};

export type BorealServiceIntake = {
  kind: "single_text" | "prompt_text" | "asset_plus_prompt";
  primaryLabel: string;
  primaryHelper: string;
  primaryPlaceholder: string;
  optionalFields: string[];
  submitLabel: string;
};

export type BorealServiceRequestDefaults = {
  actorKinds: BorealActorKind[];
  attachmentMode: "request_starter_no_supply_attached";
  attachmentRules: string[];
  executionKind: BorealRequestExecutionKind;
  matchingMode: BorealRequestMatchingMode;
  outputKinds: BorealOutputKind[];
  paymentMode: BorealRequestPaymentMode;
  routeFamily: BorealRequestRouteFamily;
  supplyKinds: BorealSupplyKind[];
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
  intake?: BorealServiceIntake;
  process: string[];
  proof: string[];
  requestDefaults: BorealServiceRequestDefaults;
  plans: BorealServicePlan[];
};

export const borealServiceFamilies: BorealServiceFamily[] = [
  {
    familyKey: "human-editorial-polish",
    slug: "human-editorial-polish",
    title: "Human Editorial Polish",
    eyebrow: "Text-to-request service",
    summary:
      "Paste rough text, AI-assisted copy, a post, an email, or a script. Boreal turns it into a tracked edit request and delivers publish-ready text with notes.",
    buyer:
      "Founders, operators, creators, students, and teams who have useful text that still reads too generic, stiff, or unfinished.",
    providerLabel: "Boreal editorial workflow + operator review",
    tags: ["writing", "editing", "copy polish", "human review"],
    intake: {
      kind: "single_text",
      primaryLabel: "Text to polish",
      primaryHelper:
        "Do not write a prompt. Paste the material. Boreal will turn it into a Request, plan the edit, and deliver the final text with proof notes.",
      primaryPlaceholder:
        "Paste the rough draft, AI-assisted text, post, email, script, essay section, product copy, or landing page section...",
      optionalFields: [
        "Audience",
        "Tone",
        "Where it will be published",
        "What must not change",
      ],
      submitLabel: "Pay and polish text",
    },
    process: [
      "Paste the source text and optional audience, tone, channel, or preservation notes.",
      "Boreal creates a Request with the original text, selected plan, edit goal, proof needs, and credit requirement attached.",
      "The editorial workflow checks meaning, removes robotic structure, improves flow, and keeps the buyer's intent intact.",
      "Operator review catches over-polish, unsafe claims, missing context, and obvious meaning drift before delivery.",
      "Final text, edit notes, and a meaning-preservation check are delivered back inside the Request workroom.",
    ],
    proof: [
      "final polished text",
      "edit notes",
      "meaning-preservation check",
      "delivery receipt",
    ],
    requestDefaults: {
      actorKinds: ["human", "agent"],
      attachmentMode: "request_starter_no_supply_attached",
      attachmentRules: [
        "Service card starts a Request draft only.",
        "No humanizer worker or Supply is attached from the listing.",
        "Operator review and proof attach later through governed request routing.",
      ],
      executionKind: "hybrid_human_agent",
      matchingMode: "preferred_supply_direct",
      outputKinds: ["draft", "handoff_doc", "verification_note"],
      paymentMode: "fixed_request",
      routeFamily: "direct_specialist",
      supplyKinds: ["human_service", "documentation_support", "operator"],
    },
    plans: [
      {
        planKey: "publish-polish",
        label: "Publish Polish",
        price: "$1",
        turnaround: "24 hours",
        summary:
          "One short draft polished for clarity, rhythm, and publication readiness while preserving the original meaning.",
        included: [
          "up to 1,500 words",
          "clarity and rhythm pass",
          "tone cleanup",
          "edit notes and meaning check",
        ],
        serviceRequestStarter:
          "I want Human Editorial Polish, Publish Polish. Text to polish: . Audience: . Tone: . Where this will be published: . What must not change: . Done means I receive final polished text, edit notes, a meaning-preservation check, and a delivery receipt.",
      },
      {
        planKey: "launch-copy-pass",
        label: "Launch Copy Pass",
        price: "$1",
        turnaround: "2 business days",
        summary:
          "A focused polish pass for launch copy, landing sections, product announcements, or social posts that need to sound clearer and less generic.",
        included: [
          "headline and body polish",
          "audience-fit notes",
          "plain-language cleanup",
          "final copy plus change notes",
        ],
        serviceRequestStarter:
          "I want Human Editorial Polish, Launch Copy Pass. Text to polish: . Product or offer context: . Target reader: . Tone: . What must not change: . Done means I receive cleaner launch copy, audience-fit notes, edit notes, and a delivery receipt.",
      },
    ],
  },
  {
    familyKey: "character-call-starter",
    slug: "character-call-starter",
    title: "Character Call Starter",
    eyebrow: "Runway Characters service",
    summary:
      "Set up a live AI character call from one approved image, a persona brief, and a clear call goal.",
    buyer:
      "Creators, fandom pages, avatar-curious users, founders, sellers, students, and teams who want a live character people can talk to.",
    providerLabel: "Runway Characters + OpenAI + Boreal review",
    tags: ["live avatar", "video call", "character", "interactive"],
    process: [
      "Upload one approved reference image, character name, persona notes, and call goal.",
      "Boreal turns the brief into a persona sheet, safety boundaries, and first-message script.",
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
    requestDefaults: {
      actorKinds: ["human", "agent", "tool"],
      attachmentMode: "request_starter_no_supply_attached",
      attachmentRules: [
        "Service card starts a Request draft or checkout flow.",
        "Runway handoff supply is attached only after checkout or request routing.",
        "Session credentials remain ephemeral and are not durable request truth.",
      ],
      executionKind: "provider_api",
      matchingMode: "preferred_supply_direct",
      outputKinds: ["handoff_doc", "delivery_confirmation"],
      paymentMode: "fixed_request",
      routeFamily: "direct_specialist",
      supplyKinds: ["provider_capability", "operator"],
    },
    plans: [
      {
        planKey: "starter-call",
        label: "Starter Call",
        price: "$1",
        turnaround: "24 hours",
        summary:
          "One live character-call setup with a persona sheet, included test session, launch handoff, and delivery notes.",
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
        price: "$1",
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
        price: "$1",
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
      "Ready-to-post avatar or character clips for launches, sales replies, onboarding, and founder-led promotion.",
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
    requestDefaults: {
      actorKinds: ["human", "agent", "tool"],
      attachmentMode: "request_starter_no_supply_attached",
      attachmentRules: [
        "Service card starts a Request draft only.",
        "Video-generation supply attachment waits for checkout or request routing.",
        "Provider execution waits for accepted commitment or owner-private fulfillment.",
      ],
      executionKind: "provider_api",
      matchingMode: "preferred_supply_direct",
      outputKinds: ["media", "video", "handoff_doc"],
      paymentMode: "fixed_request",
      routeFamily: "direct_specialist",
      supplyKinds: ["provider_capability", "video_generation", "operator"],
    },
    plans: [
      {
        planKey: "sales-reply-pack",
        label: "Sales Reply Pack",
        price: "$1",
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
      "Create a recurring host or character for niche commentary, explainers, and trend-response clips.",
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
    requestDefaults: {
      actorKinds: ["human", "agent", "tool"],
      attachmentMode: "request_starter_no_supply_attached",
      attachmentRules: [
        "Service card starts a Request draft only.",
        "Character production worker or provider supply attaches later.",
        "Reusable character guidance is an Artifact only after proof submission.",
      ],
      executionKind: "hybrid_human_agent",
      matchingMode: "preferred_supply_direct",
      outputKinds: ["media", "video", "handoff_doc"],
      paymentMode: "fixed_request",
      routeFamily: "direct_specialist",
      supplyKinds: ["provider_capability", "documentation_support", "operator"],
    },
    plans: [
      {
        planKey: "character-seed-pack",
        label: "Character Seed Pack",
        price: "$1",
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
        price: "$1",
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
      "A ready-to-post set of short-form clips built around hooks, captions, trend rationale, and posting sequence.",
    buyer:
      "Creator-founders, niche media pages, collector brands, and growth operators testing a new content lane.",
    providerLabel: "OpenAI + Runway-ready production",
    tags: ["reels", "tiktok", "instagram", "niche hooks"],
    process: [
      "Pick a niche, target audience, and posting goal.",
      "Boreal turns the angle into hook families and scripts.",
      "Clips are generated or edited against the chosen content format.",
      "Operator review packages captions, covers, and posting notes.",
      "Delivery lands as a file and proof bundle.",
    ],
    proof: [
      "video drafts",
      "caption sheet",
      "trend rationale",
      "posting map",
    ],
    requestDefaults: {
      actorKinds: ["human", "agent", "tool"],
      attachmentMode: "request_starter_no_supply_attached",
      attachmentRules: [
        "Service card starts a Request draft only.",
        "Trend production supply is not assigned from the listing.",
        "Captions and posting notes become Artifacts only after execution proof.",
      ],
      executionKind: "hybrid_human_agent",
      matchingMode: "preferred_supply_direct",
      outputKinds: ["media", "video", "handoff_doc"],
      paymentMode: "fixed_request",
      routeFamily: "direct_specialist",
      supplyKinds: ["provider_capability", "documentation_support", "operator"],
    },
    plans: [
      {
        planKey: "trend-signal-12",
        label: "Trend Signal 12",
        price: "$1",
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
