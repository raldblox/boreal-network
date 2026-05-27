export const borealHomepageCopy = {
  eyebrow: "From request to accepted result",
  title: "One thread from request to accepted result.",
  body:
    "Open a request, fund it if needed, route the work, review what comes back, and keep the accepted artifact attached to the same flow.",
  support:
    "Starting with paid request pilots, curated supply, and selective public-request funding where accepted work should stay reusable.",
} as const;

export const borealHowItWorksPoints = [
  {
    body:
      "Start with the problem, the goal, and the constraints. Boreal keeps one request open instead of letting the work break into chats, forms, and side threads.",
    label: "Open the request",
  },
  {
    body:
      "When the same problem is worth solving publicly, funding can attach to the request without turning it into a separate grant or bounty object.",
    label: "Fund it if needed",
  },
  {
    body:
      "Boreal narrows the right solver, reviewer, or runtime lane before the work starts so the request does not drift.",
    label: "Route the work",
  },
  {
    body:
      "Artifacts, proof, and acceptance stay attached to the same request before anyone treats the job as done.",
    label: "Review the result",
  },
  {
    body:
      "If the accepted work should stay useful, Boreal can keep it visible as a public solution and let later users fork from it into a new request.",
    label: "Reuse what worked",
  },
] as const;

export const borealWhyBorealPoints = [
  {
    body:
      "A polished answer can still miss the review, proof, or handoff that makes the work usable in the real world.",
    label: "A draft is not a finished result",
  },
  {
    body:
      "Tracking a request, matching a person, or running a workflow is not enough if the work still loses context before review and closeout.",
    label: "A task board is not a completion system",
  },
  {
    body:
      "Boreal keeps the request, the work, the funding, and the accepted result on one visible path instead of scattering the job across posts, chats, tools, and delivery threads.",
    label: "Why Boreal exists",
  },
] as const;

export const borealReusePoints = [
  {
    body:
      "The accepted result should still point back to the original ask, the participants, and the proof that made it valid.",
    label: "Keep the source request",
  },
  {
    body:
      "When work is worth reusing, Boreal can project it as a public solution instead of burying it in private delivery threads.",
    label: "Keep the accepted artifact useful",
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
      "Bring a serious request that needs more than a one-shot answer. Start with a paid pilot and keep the work, review, and proof on one track.",
    cta: "Start request",
    href: "/?mode=request",
    label: "Start a private request",
  },
  {
    body:
      "Join if you can show a real workflow where review, proof, judgment, or handoff still matter after AI has done its part.",
    cta: "Join whitelist",
    href: "/supplies/new?entry=whitelist",
    label: "Join the curated whitelist",
  },
] as const;

export const borealWhitelistPrompts = [
  "One real scenario where AI alone would likely fail.",
  "Which parts AI can handle well, and where human work must step in.",
  "What proof would show the work was actually completed.",
  "What kind of buyer usually needs this workflow.",
] as const;
