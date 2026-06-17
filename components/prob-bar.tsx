"use client";

import { motion } from "framer-motion";
import type { Outcome } from "@/lib/types";
import { outcomeColor } from "@/lib/utils";

export function ProbBar({ outcomes }: { outcomes: Outcome[] }) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
      {outcomes.map((o, i) => (
        <motion.div
          key={o.name}
          initial={{ width: 0 }}
          animate={{ width: `${o.impliedPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ backgroundColor: outcomeColor(i) }}
        />
      ))}
    </div>
  );
}
