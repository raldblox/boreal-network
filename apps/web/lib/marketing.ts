export const borealHomepageCopy = {
  eyebrow: "For work that needs real completion",
  title: "Turn a work request into a finished outcome.",
  body:
    "Boreal helps teams route, execute, review, and prove work that AI cannot finish on its own.",
  support:
    "Starting with paid request pilots and a curated supply whitelist while we prove the first workflows.",
} as const;

export const borealHowItWorksPoints = [
  {
    body:
      "Start with the brief, the goal, and any constraints. Boreal opens one tracked request instead of scattering the work across chats, forms, and docs.",
    label: "Open the request",
  },
  {
    body:
      "Boreal narrows the right mix of humans, agents, tools, or runtimes before the work starts.",
    label: "Route the right lane",
  },
  {
    body:
      "Updates, blockers, and delivery stay attached to the same request while the work is moving.",
    label: "Run the work",
  },
  {
    body:
      "Proof, review, and closeout stay on the same flow so the work is not treated as done too early.",
    label: "Review what was done",
  },
] as const;

export const borealWhyBorealPoints = [
  {
    body:
      "A polished answer can still miss the handoff, the check, or the real-world step that makes the result usable.",
    label: "The draft is not the finish",
  },
  {
    body:
      "Some work still needs judgment, communication, approval, onsite action, or verification before it is truly done.",
    label: "Human steps still matter",
  },
  {
    body:
      "Boreal exists to keep the work, the people, and the proof on one visible path to completion.",
    label: "Why Boreal exists",
  },
] as const;

export const borealVisionPoints = [
  {
    body:
      "Let AI plan, synthesize, route, and handle routine execution where it is actually strong.",
    label: "Use AI for the heavy lift",
  },
  {
    body:
      "Bring people back into the flow when judgment, trust, communication, or verification still matters.",
      label: "Keep humans where they matter",
  },
  {
    body:
      "Use a local runtime when privacy, local tools, or owner-controlled execution matter to the outcome.",
    label: "Keep local runtime in the loop",
  },
] as const;

export const borealAccessTracks = [
  {
    body:
      "Bring work that is too messy for disconnected tools and too important to leave at a draft. Start with a paid pilot.",
    cta: "Post request",
    href: "/?mode=request",
    label: "Post a work request",
  },
  {
    body:
      "Join the whitelist if you can show a real workflow where AI alone breaks and where human judgment, verification, or handoff still changes the outcome.",
    cta: "Join whitelist",
    href: "/supplies/new?entry=whitelist",
    label: "Join the supply whitelist",
  },
] as const;

export const borealWhitelistPrompts = [
  "One real scenario where AI alone would likely fail.",
  "Which parts AI can handle well, and where human work must step in.",
  "What proof would show the work was actually completed.",
  "What kind of buyer usually needs this workflow.",
] as const;
