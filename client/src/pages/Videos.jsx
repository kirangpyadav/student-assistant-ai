import { useEffect, useMemo, useState } from "react";
import api from "../api/client";

export default function Videos() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [saved, setSaved] = useState([]);
  const [subject, setSubject] = useState("general");
  const [language, setLanguage] = useState("en");
  const [tab, setTab] = useState("search"); // search | recommended | saved
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const savedIds = useMemo(() => new Set(saved.map((v) => v.videoId)), [saved]);

  async function refreshSaved() {
    const { data } = await api.get("/api/videos/saved", { params: { subject, language } });
    setSaved(data.videos || []);
  }

  async function refreshRecommended() {
    const { data } = await api.get("/api/videos/recommended");
    setItems((data.videos || []).map((v) => ({
      id: v.videoId,
      title: v.title,
      channelTitle: v.channelTitle,
      thumbnail: v.thumbnail,
      _savedMeta: v,
    })));
  }

  useEffect(() => {
    void refreshSaved();
  }, [subject, language]);

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setError("");
    setLoading(true);
    setItems([]);
    try {
      const { data } = await api.get("/api/videos/search", {
        params: { q: q.trim(), language },
      });
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveVideo(item) {
    try {
      await api.post("/api/videos/saved", {
        videoId: item.id,
        title: item.title || "",
        channelTitle: item.channelTitle || "",
        thumbnail: item.thumbnail || "",
        subject,
        language,
      });
      await refreshSaved();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to save");
    }
  }

  async function removeVideo(videoId) {
    try {
      await api.delete(`/api/videos/saved/${videoId}`);
      await refreshSaved();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to remove");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Learning videos</h1>
        <p className="text-sm text-slate-400">Search YouTube for tutorials and lessons.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          ["search", "Search"],
          ["recommended", "Recommended for you"],
          ["saved", "Saved"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={async () => {
              setTab(k);
              setError("");
              if (k === "recommended") await refreshRecommended();
              if (k === "saved") await refreshSaved();
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === k ? "bg-indigo-600 text-white" : "bg-white/10 text-slate-200 hover:bg-white/15"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={search} className="flex flex-wrap items-end gap-4">
        <label className="min-w-[240px] flex-1">
          <span className="text-sm text-slate-400">Query</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. linear algebra eigenvalues"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50"
          />
        </label>
        <label>
          <span className="text-sm text-slate-400">Subject</span>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
          >
            {["general", "math", "physics", "chemistry", "biology", "cs", "history"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm text-slate-400">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 block rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
          >
            {[
              ["en", "English"],
              ["hi", "Hindi"],
              ["te", "Telugu"],
              ["ta", "Tamil"],
              ["kn", "Kannada"],
              ["ml", "Malayalam"],
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {(tab === "saved"
          ? saved.map((v) => ({
              id: v.videoId,
              title: v.title,
              channelTitle: v.channelTitle,
              thumbnail: v.thumbnail,
              _saved: true,
            }))
          : items
        ).map((item) =>
          item.id ? (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-indigo-500/40"
            >
              <div className="flex gap-4 p-4">
                <a
                  href={`https://www.youtube.com/watch?v=${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 gap-4"
                >
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="h-24 w-40 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-white line-clamp-2">{item.title}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.channelTitle}</p>
                  </div>
                </a>
                <div className="flex flex-col gap-2">
                  {savedIds.has(item.id) || item._saved ? (
                    <button
                      type="button"
                      onClick={() => removeVideo(item.id)}
                      className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/15"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => saveVideo(item)}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
            </li>
          ) : null
        )}
      </ul>

      {!loading && items.length === 0 && tab !== "saved" && !error && (
        <p className="text-sm text-slate-500">Results appear here after you search.</p>
      )}
    </div>
  );
}
