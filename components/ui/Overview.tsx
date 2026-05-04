"use client";
import { useState } from "react";

export default function Overview({ text }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-full">
      <p
        className={`
          text-slate-300  text-sm
          ${expanded ? "" : "line-clamp-4"}
        `}
      >
        {text}
      </p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-red-500 mt-2 text-sm hover:underline"
      >
        {expanded ? "Show less" : "Learn more"}
      </button>
    </div>
  );
}