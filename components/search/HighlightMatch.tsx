"use client";

import * as React from "react";

interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
  matchClassName?: string;
}

export function HighlightMatch({
  text,
  query,
  className = "",
  matchClassName = "bg-amber-200/80 text-amber-950 dark:bg-amber-500/30 dark:text-amber-200 font-bold px-0.5 rounded-xs",
}: HighlightMatchProps) {
  if (!text) return null;
  if (!query || !query.trim()) return <span className={className}>{text}</span>;

  const trimmedQuery = query.trim();
  // Escape special regex characters
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className={matchClassName}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
