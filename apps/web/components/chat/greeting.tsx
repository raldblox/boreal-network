import { motion } from "framer-motion";

export const Greeting = ({
  isRequestMode,
}: {
  isRequestMode: boolean;
}) => {
  return (
    <div className="flex flex-col items-center px-4" key="overview">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-semibold text-2xl tracking-tight text-foreground [font-family:var(--font-display)] md:text-4xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isRequestMode ? "Draft a request" : "What needs to get done?"}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-center text-muted-foreground/80 text-sm"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isRequestMode
          ? "Write the title, summary, body, constraints, budget, or timing. Boreal will keep the live request object visible beside the chat."
          : "Describe the work, the outcome, or the specialist you need. Boreal keeps the chat connected to the request when real work starts."}
      </motion.div>
    </div>
  );
};
