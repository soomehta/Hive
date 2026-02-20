"use client";

import { relativeDate, formatDateTime } from "@/lib/utils/dates";

interface DateDisplayProps {
  date: Date | string;
  className?: string;
}

export function DateDisplay({ date, className }: DateDisplayProps) {
  const relative = relativeDate(date);
  const full = formatDateTime(date);

  return (
    <span title={full} className={className}>
      {relative}
    </span>
  );
}
