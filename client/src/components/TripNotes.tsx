/**
 * TripNotes.tsx
 *
 * Shared trip notes and journal — any planner can add entries, viewers read-only.
 * Categories: General, Packing List, Reminders, Tips, Journal
 * Pinned notes appear at the top. Notes are included in the PDF export.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Plus,
  X,
  Check,
  Loader2,
  BookOpen,
  ShoppingBag,
  Bell,
  Lightbulb,
  NotebookPen,
  FileText,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

type Category = "general" | "packing_list" | "reminder" | "tip" | "journal";

const CATEGORY_CONFIG: Record<
  Category,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  general:      { label: "General",      icon: <FileText className="w-4 h-4" />,     color: "text-gray-600",    bg: "bg-gray-100 border-gray-200" },
  packing_list: { label: "Packing List", icon: <ShoppingBag className="w-4 h-4" />,  color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
  reminder:     { label: "Reminder",     icon: <Bell className="w-4 h-4" />,          color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
  tip:          { label: "Travel Tip",   icon: <Lightbulb className="w-4 h-4" />,     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  journal:      { label: "Journal",      icon: <NotebookPen className="w-4 h-4" />,   color: "text-violet-600",  bg: "bg-violet-50 border-violet-200" },
};

const CATEGORY_TABS: { key: "all" | Category; label: string; icon: React.ReactNode }[] = [
  { key: "all",          label: "All Notes",    icon: <BookOpen className="w-4 h-4" /> },
  { key: "packing_list", label: "Packing",      icon: <ShoppingBag className="w-4 h-4" /> },
  { key: "reminder",     label: "Reminders",    icon: <Bell className="w-4 h-4" /> },
  { key: "tip",          label: "Tips",         icon: <Lightbulb className="w-4 h-4" /> },
  { key: "journal",      label: "Journal",      icon: <NotebookPen className="w-4 h-4" /> },
  { key: "general",      label: "General",      icon: <FileText className="w-4 h-4" /> },
];

// ─── Add / Edit Form ──────────────────────────────────────────────────────────

function NoteForm({
  tripId,
  initial,
  onSuccess,
  onCancel,
}: {
  tripId: number;
  initial?: { id: number; title: string; content: string; category: Category };
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<Category>(initial?.category ?? "general");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  const addNote = trpc.notes.add.useMutation({
    onSuccess: () => { utils.notes.list.invalidate({ tripId }); toast.success("Note added!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const updateNote = trpc.notes.update.useMutation({
    onSuccess: () => { utils.notes.list.invalidate({ tripId }); toast.success("Note updated!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both the title and content.");
      return;
    }
    if (initial) {
      updateNote.mutate({ id: initial.id, title: title.trim(), content: content.trim(), category });
    } else {
      addNote.mutate({ tripId, category, title: title.trim(), content: content.trim() });
    }
  };

  const isPending = addNote.isPending || updateNote.isPending;

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">
          {initial ? "Edit Note" : "Add a Note"}
        </h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Category selector */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                category === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span className={category === key ? "text-primary" : cfg.color}>{cfg.icon}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            category === "packing_list" ? "e.g. Clothing & Gear" :
            category === "reminder"     ? "e.g. Book snorkel tour before June" :
            category === "tip"          ? "e.g. Best time to visit Waimea Canyon" :
            category === "journal"      ? "e.g. Day 3 — North Shore" :
            "Note title"
          }
          maxLength={255}
          className="w-full text-base border border-border rounded-xl px-4 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            category === "packing_list" ? "- Swimsuit × 3\n- Sunscreen SPF 50\n- Reef-safe sunscreen\n- Snorkel gear" :
            category === "reminder"     ? "Remember to…" :
            category === "tip"          ? "Helpful tip: …" :
            category === "journal"      ? "Today we…" :
            "Write your note here…"
          }
          rows={6}
          className="w-full text-base border border-border rounded-xl px-4 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground resize-none font-mono text-sm leading-relaxed"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending} className="flex-1 h-11 text-base gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {initial ? "Save Changes" : "Add Note"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 px-5">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  tripId,
  canEdit,
}: {
  note: {
    id: number;
    title: string;
    content: string;
    category: string;
    authorName: string;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  tripId: number;
  canEdit: boolean;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => { utils.notes.list.invalidate({ tripId }); toast.success("Note deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const togglePin = trpc.notes.togglePin.useMutation({
    onSuccess: () => utils.notes.list.invalidate({ tripId }),
    onError: (e) => toast.error(e.message),
  });

  const cat = CATEGORY_CONFIG[note.category as Category] ?? CATEGORY_CONFIG.general;
  const isEdited = new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 2000;

  if (editing) {
    return (
      <NoteForm
        tripId={tripId}
        initial={{ id: note.id, title: note.title, content: note.content, category: note.category as Category }}
        onSuccess={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden ${note.isPinned ? "border-primary/40 shadow-sm" : "border-border"}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start gap-3">
        {/* Category badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shrink-0 mt-0.5 ${cat.bg} ${cat.color}`}>
          {cat.icon}
          {cat.label}
        </div>

        {/* Pin indicator */}
        {note.isPinned && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 mt-1">
            <Pin className="w-3 h-3" />
            Pinned
          </div>
        )}

        {/* Actions */}
        {canEdit && (
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <button
              onClick={() => togglePin.mutate({ id: note.id, isPinned: !note.isPinned })}
              className={`p-1.5 rounded-lg transition-colors ${note.isPinned ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"}`}
              title={note.isPinned ? "Unpin" : "Pin to top"}
            >
              {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              title="Edit note"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this note?")) deleteNote.mutate({ id: note.id });
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="px-4 pb-1">
        <h3 className="text-lg font-bold text-foreground leading-snug">{note.title}</h3>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <pre className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans break-words">
          {note.content}
        </pre>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
        <span>By <strong>{note.authorName}</strong></span>
        <span>·</span>
        <span>{new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        {isEdited && <span className="italic">(edited)</span>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TripNotesProps {
  tripId: number;
  /** Whether the current user can add/edit/delete notes (planners and owners) */
  canEdit?: boolean;
}

export default function TripNotes({ tripId, canEdit = true }: TripNotesProps) {
  const [activeTab, setActiveTab] = useState<"all" | Category>("all");
  const [showForm, setShowForm] = useState(false);

  const { data: notes, isLoading } = trpc.notes.list.useQuery({ tripId });

  const filtered = (notes ?? []).filter((n) =>
    activeTab === "all" ? true : n.category === activeTab
  );

  const pinnedNotes = filtered.filter((n) => n.isPinned);
  const unpinnedNotes = filtered.filter((n) => !n.isPinned);
  const orderedNotes = [...pinnedNotes, ...unpinnedNotes];

  const totalByCategory = (cat: Category) =>
    (notes ?? []).filter((n) => n.category === cat).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Trip Notes & Journal
          </h2>
          <p className="text-base text-muted-foreground mt-0.5">
            Shared notes, packing lists, reminders, and travel tips for your trip
          </p>
        </div>
        {canEdit && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-11 text-base gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Note
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <NoteForm
          tripId={tripId}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORY_TABS.map((tab) => {
          const count = tab.key === "all"
            ? (notes ?? []).length
            : totalByCategory(tab.key as Category);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {count > 0 && (
                <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.key ? "bg-white/20" : "bg-muted"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : orderedNotes.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-2xl">
          <div className="text-5xl mb-3">
            {activeTab === "packing_list" ? "🎒" :
             activeTab === "reminder"     ? "🔔" :
             activeTab === "tip"          ? "💡" :
             activeTab === "journal"      ? "📖" : "📝"}
          </div>
          <p className="text-xl font-semibold text-foreground mb-1">
            {activeTab === "all" ? "No notes yet" : `No ${CATEGORY_CONFIG[activeTab as Category]?.label ?? "notes"} yet`}
          </p>
          <p className="text-base text-muted-foreground mb-4">
            {activeTab === "packing_list" ? "Start your packing list so nothing gets forgotten!" :
             activeTab === "reminder"     ? "Add reminders for things to book or do before the trip." :
             activeTab === "tip"          ? "Share travel tips with your group." :
             activeTab === "journal"      ? "Write about your trip experiences." :
             "Add your first note to get started."}
          </p>
          {canEdit && (
            <Button onClick={() => setShowForm(true)} className="h-11 text-base gap-2">
              <Plus className="w-5 h-5" />
              Add a Note
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orderedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              tripId={tripId}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Read-only notice for viewers */}
      {!canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-base text-blue-800">
            You can read all notes here. To add your own notes, ask the trip owner to upgrade your role to Planner.
          </p>
        </div>
      )}
    </div>
  );
}
