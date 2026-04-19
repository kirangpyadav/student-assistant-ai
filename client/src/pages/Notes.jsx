import { useEffect, useState } from "react";
import api from "../api/client";
import jsPDF from "jspdf";

export default function Notes() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [noteDoc, setNoteDoc] = useState(null);
  const [savedNotes, setSavedNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshSaved() {
    const { data } = await api.get("/api/notes");
    setSavedNotes(data.notes || []);
  }

  useEffect(() => {
    void refreshSaved();
  }, []);

  async function generate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setError("");
    setLoading(true);
    setNotes("");
    setNoteDoc(null);
    try {
      const { data } = await api.post("/api/notes/generate", { topic: topic.trim() });
      setNotes(data.notes);
      setNoteDoc(data.note || null);
      await refreshSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to generate notes");
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    const text = notes || noteDoc?.content;
    if (!text) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const title = (noteDoc?.topic || topic || "Notes").slice(0, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 40, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(text, 515);
    doc.text(lines, 40, 80);
    doc.save(`${title.replace(/[^a-z0-9-_ ]/gi, "").trim() || "notes"}.pdf`);
  }

  async function toggleBookmark(id, bookmarked) {
    try {
      await api.patch(`/api/notes/${id}/bookmark`, { bookmarked: !bookmarked });
      await refreshSaved();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to bookmark");
    }
  }

  async function removeNote(id) {
    try {
      await api.delete(`/api/notes/${id}`);
      await refreshSaved();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to delete");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Notes generator</h1>
        <p className="text-sm text-slate-400">Short, structured notes for revision.</p>
      </div>

      <form onSubmit={generate} className="flex flex-wrap gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic or chapter title"
          className="min-w-[240px] flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Writing…" : "Generate notes"}
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={!notes}
          className="rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
        >
          Download PDF
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {notes && (
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-lg font-semibold text-indigo-200">Your notes</h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {notes}
          </div>
        </article>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Saved notes</h2>
        {savedNotes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Your generated notes will appear here.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {savedNotes.slice(0, 20).map((n) => (
              <li
                key={n._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">{n.topic}</p>
                  <p className="text-xs text-slate-500">{new Date(n.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotes(n.content);
                      setTopic(n.topic);
                      setNoteDoc(n);
                    }}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(n._id, n.bookmarked)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
                  >
                    {n.bookmarked ? "Unbookmark" : "Bookmark"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeNote(n._id)}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/15"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
