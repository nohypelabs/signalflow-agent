"use client";

interface Props {
  title: string;
  description?: string;
}

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-border-default flex items-center justify-center mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15h8M9 9h.01M15 9h.01" />
        </svg>
      </div>
      <p className="text-sm text-txt-muted">{title}</p>
      {description && <p className="text-xs text-txt-dim mt-1">{description}</p>}
    </div>
  );
}
