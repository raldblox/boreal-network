# Boreal Desktop: Human-Grounded Local AI Workflows on QVAC, Pears, and WDK

## Statement of Work

Prepared for: Tether Grant Program  
Prepared by: Herald Bayoca, Founder, Boreal Work  
Website: https://boreal.work  
GitHub: https://github.com/raldblox/boreal-network  
Date: May 18, 2026

## 1. Summary

Boreal Desktop is an Electron-based operator runtime for serious work that AI cannot responsibly finish on its own.

Our core belief is simple: AI becomes less useful when products chase one-shot autonomy by quietly deleting the human steps, local tools, private context, and verification that real work still needs. Boreal Desktop is built to make that missing layer first-class. It gives operators a local runtime where AI can assist with execution, while humans still inspect, intervene, delegate, verify, and complete the job.

This project will turn Boreal Desktop into a practical open-source reference application for Tether's stack. QVAC will power private on-device AI execution inside the desktop runtime. Pears will allow trusted-device delegation when one machine is not enough. WDK will add a narrow self-custodial USDt lane for funding or payout inside the same workflow.

The result will not be a narrow technical demo. It will be a real Electron application, reusable codebase, reproducible demo flows, and developer onboarding package that shows how Tether's stack can power private AI work without defaulting to cloud inference, custodial middleware, or fake fully autonomous workflows.

## 2. Objective

Deliver a working desktop reference application that proves three layers together:

- Local AI execution with QVAC
- Trusted-device delegation with Pears
- Self-custodial USDt flows with WDK

The goal is not to ship three disconnected integrations. The goal is to publish one practical desktop application that other developers can study, run, and build on.

## 3. Problem and Opportunity

Many AI products still optimize for one-shot output. In practice, that often means they quietly remove the human steps and local runtime conditions that serious work still depends on. The result may look polished, but it is often incomplete, unverified, and too dependent on centralized infrastructure.

Boreal Desktop exists to solve that exact problem. It is designed as a local operator environment where AI can execute useful parts of the work, while humans remain in control of the parts that still require judgment, verification, intervention, or trusted delegation.

Tether's stack is a strong foundation for this model:

- QVAC for private on-device AI execution
- Pears for trusted peer delegation across user-controlled devices
- WDK for self-custodial USDt flows inside the same operator environment

## 4. Value to Tether

This project creates ecosystem value for Tether in five ways:

1. It gives Tether a real Electron reference app instead of a narrow technical demo.
2. It shows a practical use case for QVAC, Pears, and WDK inside a growing AI workflow category.
3. It demonstrates how USDt can be used inside AI-assisted work software.
4. It lowers adoption friction through open-source code, setup guides, and reproducible demos.
5. It helps position Tether's stack as infrastructure for private, local-first, operator-controlled AI applications.

## 5. Scope

### In scope

- QVAC integration into Boreal Desktop
- Pears-based trusted-device delegation
- WDK-based narrow desktop-first USDt flow
- Open-source release
- Setup docs, architecture notes, demo flows, and developer onboarding assets

### Out of scope

- Replacing Boreal's durable request truth with peer state
- Launching a public marketplace
- Broad marketing spend
- Full wallet expansion beyond the first useful USDt path

## 6. Work Packages and Milestones

### Milestone 1: Human-in-the-loop local execution with QVAC

Budget: 2,000 USDt  
Timeline: Weeks 1-3

Work:
Integrate QVAC into Boreal Desktop as the local execution engine for tracked work. Expose local runtime availability in-product and support one end-to-end local execution flow.

Acceptance criteria:

- Boreal Desktop can execute one tracked workflow through QVAC locally
- Local runtime availability is visible in the UI
- The core demo path does not require a hosted AI API

### Milestone 2: Trusted-device delegation with Pears

Budget: 2,000 USDt  
Timeline: Weeks 3-5

Work:
Connect Boreal Desktop to Pears-based trusted delegation so one device can hand off heavier work to another without defaulting to centralized AI providers.

Acceptance criteria:

- One Boreal desktop can delegate one task to another trusted device
- Peer runtime identity and execution handoff are visible in the workflow
- Delegation does not replace Boreal's durable workflow truth

### Milestone 3: Self-custodial USDt lane with WDK

Budget: 2,000 USDt  
Timeline: Weeks 5-7

Work:
Add a narrow desktop-first USDt path for funding or payout through WDK. Start with one controlled operator flow that is easy to reproduce and document.

Acceptance criteria:

- One Boreal desktop workflow can trigger a self-custodial funding or payout action
- Wallet actions run through WDK-based flows
- The first supported path is documented and reproducible

### Milestone 4: Open-source Electron reference app and docs

Budget: 1,500 USDt  
Timeline: Weeks 7-9

Work:
Publish the application integration as an open-source reference implementation with setup instructions, architecture notes, and a reproducible demo path.

Acceptance criteria:

- Source code is published
- Setup documentation is published
- At least one end-to-end demo is reproducible by an external developer

### Milestone 5: Developer activation package

Budget: 1,000 USDt  
Timeline: Weeks 9-12

Work:
Produce a compact builder-facing package: short demo video, walkthrough, screenshots, sample scenarios, and implementation notes that help other teams understand how to use QVAC, Pears, and WDK in a real desktop application.

Acceptance criteria:

- One short demo artifact is published
- One written walkthrough is published
- One developer-facing example flow is documented for reuse or extension

## 7. Requested Technical Support

We request targeted support in these areas:

- QVAC best practices for desktop-local execution
- Pears guidance for stable trusted-device packaging and delegation patterns
- WDK guidance for the cleanest first desktop-first USDt flow

## 8. Open-Source Commitment

All grant-funded outputs will be published as open-source. The project is structured to create reusable value for the broader Tether developer ecosystem, not only for Boreal.

## 9. Success Outcome

At completion, Tether will have a public Electron reference application showing how private AI execution, trusted-device delegation, and self-custodial USDt rails can work together inside a real operator workflow, without making centralized cloud AI or custodial middleware the default dependency.
