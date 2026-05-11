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
    <div className="flex flex-col items-center px-4" key="overview">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-semibold text-2xl tracking-tight text-foreground [font-family:var(--font-display)] md:text-4xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDraftRequest
          ? "Draft a request"
          : isPendingRequestStart
            ? "Start a request"
          : isOpenedRequest
            ? "Active request room"
            : "What needs to get done?"}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-center text-muted-foreground/80 text-sm"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDraftRequest
          ? "Shape the request here. Start with the ask, then add budget, deadline, constraints, and what done looks like."
          : isPendingRequestStart
            ? "Write the first request message here. Boreal will create the durable request only after you send it."
          : isOpenedRequest
            ? "Move the request forward here. Post updates, adjust details, ask for recent activity, or decide the next step."
            : "Describe the work, the outcome, or the specialist you need. Boreal keeps the chat connected to the request when real work starts."}
      </motion.div>
    </div>
  );
};
