"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Overview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  const SHORT = 200;
  const isLong = text?.length > SHORT;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
      className="text-text-muted text-sm leading-relaxed max-w-140"
    >
      {expanded ? text : text?.slice(0, SHORT)}
      {isLong && (
        <>
          {!expanded && "... "}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white hover:underline text-xs ml-1 inline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </>
      )}
    </motion.div>
  );
}