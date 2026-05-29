export const borealHomepageCopy = {
  eyebrow: "Live work board",
  title: "Boreal turns requests into completed work.",
  body:
    "Post a request, compare plans, run or fund the work, verify artifacts, and reuse accepted solutions.",
  support:
    "Every step stays attached to one durable Request: demand, plans, fulfillment, proof, review, payment, and reuse.",
} as const;

export const borealHowItWorksPoints = [
  {
    body:
      "Start with the problem, goal, constraints, deadline, budget, and proof needs. Boreal keeps one request open instead of letting work split across chats and side threads.",
    label: "Post the request",
  },
  {
    body:
      "Plans, services, humans, agents, tools, and runtimes can be compared as paths for the same demand instead of becoming disconnected workflows.",
    label: "Compare paths",
  },
  {
    body:
      "Funding or credits can attach when work needs execution, inference, provider APIs, service capacity, or human review.",
    label: "Run or fund",
  },
  {
    body:
      "Delivery, proof, and acceptance stay attached to the same request before anyone treats the job as done.",
    label: "Verify artifacts",
  },
  {
    body:
      "If the accepted work should stay useful, Boreal can keep it visible as a public solution that others inspect free or run with credits.",
    label: "Reuse what worked",
  },
] as const;

export const borealWhyBorealPoints = [
  {
    body:
      "A polished answer can still miss the human work, review, proof, or handoff that makes the work usable in the real world.",
    label: "A draft is not a finished result",
  },
  {
    body:
      "A board, marketplace, or workflow template is not enough if the request still loses context before review and closeout.",
    label: "A listing is not a work flow",
  },
  {
    body:
      "Boreal keeps the request, plan, worker, payment, artifact, review, and final delivery on one visible path.",
    label: "Why Boreal exists",
  },
] as const;

export const borealReusePoints = [
  {
    body:
      "The final delivery should still point back to the original ask, the participants, and the proof that made it valid.",
    label: "Keep the source request",
  },
  {
    body:
      "When work is worth reusing, Boreal can project it as a public solution instead of burying it in private delivery threads.",
    label: "Keep accepted work useful",
  },
  {
    body:
      "A later user can start a new request from the accepted artifact when they need a custom follow-up instead of starting from zero.",
    label: "Fork from what worked",
  },
] as const;

export const borealAccessTracks = [
  {
    body:
      "Bring a serious request that needs more than a one-shot answer. Keep planning, execution, review, and proof on one track.",
    cta: "Post request",
    href: "/?mode=request",
    label: "Post a request",
  },
  {
    body:
      "Join if you can show a real workflow where review, proof, judgment, or handoff still matter after AI has done its part.",
    cta: "Join provider whitelist",
    href: "/supplies/new?entry=whitelist",
    label: "Join the provider whitelist",
  },
] as const;

export const borealWhitelistPrompts = [
  "One real scenario where AI alone would likely fail.",
  "Which parts AI can handle well, and where human work must step in.",
  "What proof would show the work was actually completed.",
  "What kind of buyer usually needs this workflow.",
] as const;
