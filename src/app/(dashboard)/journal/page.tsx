"use client";

import { useJournal } from "@/lib/hooks/useJournal";
import JournalPage from "@/components/JournalPage";

export default function JournalRoute() {
  const journal = useJournal();

  return (
    <div className="mx-auto max-w-6xl">
      <JournalPage
        entries={journal.entries}
        allTags={journal.allTags}
        tagCounts={journal.tagCounts}
        moodCounts={journal.moodCounts}
        uniquePairs={journal.uniquePairs}
        onAdd={journal.addEntry}
        onUpdate={journal.updateEntry}
        onDelete={journal.deleteEntry}
      />
    </div>
  );
}
