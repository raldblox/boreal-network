import { motion } from "framer-motion";
import type { RequestStatus } from "@/lib/request";

export const Greeting = ({
  isRequestMode,
  requestStatus,
}: {
  isRequestMode: boolean;
  requestStatus?: RequestStatus | null;
}) => {
  const isDraftRequest = requestStatus === "draft";
  const isOpenedRequest = Boolean(requestStatus && requestStatus !== "draft");
  const isPendingRequestStart = isRequestMode && !requestStatus;

  return (
    <div className="flex max-w-2xl flex-col items-center px-4 text-center" key="overview">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 inline-flex rounded-full border border-border/60 bg-background/82 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/72"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.25, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDraftRequest
          ? "Request Preflight"
          : isPendingRequestStart
            ? "Request Preflight"
            : isOpenedRequest
              ? "Active request"
              : "Boreal"}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-3xl tracking-tight text-foreground [font-family:var(--font-display)] md:text-5xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDraftRequest
          ? "Shape the request before it opens"
          : isPendingRequestStart
            ? "Start Request Preflight"
          : isOpenedRequest
            ? "Active request room"
            : "What needs to get done?"}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 max-w-xl text-muted-foreground/82 text-sm leading-7 md:text-[15px]"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDraftRequest
          ? "Preflight keeps the buyer-owned ask, done condition, constraints, budget, deadline, proof, and human or local requirements visible before the Request opens."
          : isPendingRequestStart
            ? "Write the first serious request message here. Boreal will create a Preflight draft only after you send it."
            : isOpenedRequest
            ? "Move the request forward here. Post updates, adjust details, ask for recent activity, or decide the next step."
            : "Describe the work, the outcome, or the specialist you need. Boreal keeps the chat connected to the request when real work starts."}
      </motion.div>
    </div>
  );
};
