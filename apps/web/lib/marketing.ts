export const borealHomepageCopy = {
  eyebrow: "For serious complete work",
  title: "Boreal is for work that AI cannot fully finish on its own.",
  body:
    "When a request still needs planning, human judgment, verification, handoff, or real execution, Boreal keeps the whole job on one thread instead of pretending the work ended at the draft.",
  support:
    "Opening with buyer-funded request pilots and a curated supply whitelist built around real AI + human workflows.",
} as const;

export const borealMissionPoints = [
  {
    body:
      "Most AI products optimize for one-shot output, so the plan looks complete only because the system quietly removed the parts the model cannot do.",
    label: "One-shot bias",
  },
  {
    body:
      "That is exactly where serious work breaks: verification disappears, handoffs disappear, and the human steps that make the outcome real disappear.",
    label: "Missing human steps",
  },
  {
    body:
      "Boreal exists to keep those steps visible, coordinated, and accountable instead of hiding them behind a polished draft.",
    label: "Why Boreal exists",
  },
] as const;

export const borealVisionPoints = [
  {
    body:
      "AI should take on more of the planning, synthesis, routing, and execution work that slows teams down today.",
    label: "Use AI where it is strongest",
  },
  {
    body:
      "Humans should still stay in the flow when judgment, verification, communication, trust, or delivery in the real world still matters.",
    label: "Keep humans where they matter",
  },
  {
    body:
      "The goal is full completion: one request carrying the plan, the people, the proof, and the payout until the job is actually done.",
    label: "Build for complete work",
  },
] as const;

export const borealWhitelistTracks = [
  {
    body:
      "Post a funded request when the job is too important to leave at a draft and too messy for disconnected tools. Boreal helps keep the route, proof, and outcome together.",
    cta: "Post a paid request",
    href: "/?mode=request",
    label: "Buyer pilots",
  },
  {
    body:
      "Join the whitelist if you can show a real workflow where AI alone breaks and where human judgment, verification, or handoff still changes the outcome.",
    cta: "Join supply whitelist",
    href: "/supplies/new?entry=whitelist",
    label: "Supply whitelist",
  },
] as const;

export const borealWhitelistPrompts = [
  "One real scenario where AI alone would likely fail.",
  "Which parts AI can handle well, and where human work must step in.",
  "What proof would show the work was actually completed.",
  "What kind of buyer usually needs this workflow.",
] as const;
