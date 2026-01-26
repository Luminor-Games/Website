import React from "react";
import Layout from "@theme/Layout";

const TYPE_OPTIONS = [
  { value: "", label: "Все" },
  { value: "ban", label: "Баны" },
  { value: "mute", label: "Муты" },
  { value: "warn", label: "Предупреждения" },
  { value: "kick", label: "Кики" },
];

const TYPE_LABELS = {
  ban: "Бан",
  mute: "Мут",
  warn: "Варн",
  kick: "Кик",
};

const SORT_LABELS = {
  date: "Дата",
  player: "Игрок",
  staff: "Наказал",
};

function toQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      qs.set(key, String(value));
    }
  });
  return qs.toString();
}

function formatDate(input) {
  const num = Number(input);
  if (!Number.isFinite(num)) return "";
  const ms = num < 1e12 ? num * 1000 : num;
  return new Date(ms).toLocaleString("ru-RU");
}

export default function WarnPage() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [draft, setDraft] = React.useState({
    type: "",
    player: "",
    sort: "date",
    order: "desc",
  });

  const [filters, setFilters] = React.useState({
    type: "",
    player: "",
    sort: "date",
    order: "desc",
    page: 1,
    limit: 25,
  });

  const query = toQuery(filters);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    fetch(`/api/warn?${query}`)
      .then((r) => r.json())
      .then((payload) => {
        if (!alive) return;
        if (payload?.error) {
          setError(payload.error);
          setData(null);
          return;
        }
        setData(payload);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e));
        setData(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query]);

  const total = data?.total ?? 0;
  const limit = data?.limit ?? filters.limit;
  const page = data?.page ?? filters.page;
  const counts = data?.counts ?? { ban: 0, mute: 0, warn: 0, kick: 0, total: 0 };
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  function applyFilters(event) {
    event.preventDefault();
    setFilters((prev) => ({
      ...prev,
      ...draft,
      page: 1,
    }));
  }

  function updateDraft(key) {
    return (event) => {
      setDraft((prev) => ({ ...prev, [key]: event.target.value }));
    };
  }

  function goToPage(nextPage) {
    setFilters((prev) => ({ ...prev, page: nextPage }));
  }

  function applyTypeFilter(nextType) {
    const isActive = filters.type === nextType;
    const resolvedType = isActive ? "" : nextType;
    setDraft((prev) => ({ ...prev, type: resolvedType }));
    setFilters((prev) => ({
      ...prev,
      type: resolvedType,
      page: 1,
    }));
  }

  function applySort(nextSort) {
    setFilters((prev) => {
      const isSame = prev.sort === nextSort;
      const nextOrder = isSame && prev.order === "desc" ? "asc" : "desc";
      return { ...prev, sort: nextSort, order: nextOrder, page: 1 };
    });
  }

  function sortIndicator(key) {
    if (filters.sort !== key) return "↕";
    return filters.order === "asc" ? "↑" : "↓";
  }

  return (
    <Layout title="Стена позора">
      <main className="container margin-vert--lg warn-container">
        <section className="warn-hero">
          <h1>Стена позора Luminor</h1>
          <p className="warn-subtitle">Правосудие настигнет каждого!</p>
        </section>

        <section className="warn-cards">
          <button
            type="button"
            className={`warn-card warn-card--ban${filters.type === "ban" ? " is-active" : ""}`}
            onClick={() => applyTypeFilter("ban")}
          >
            <div className="warn-card__value">{counts.ban}</div>
            <div className="warn-card__label">Bans</div>
          </button>
          <button
            type="button"
            className={`warn-card warn-card--mute${filters.type === "mute" ? " is-active" : ""}`}
            onClick={() => applyTypeFilter("mute")}
          >
            <div className="warn-card__value">{counts.mute}</div>
            <div className="warn-card__label">Mutes</div>
          </button>
          <button
            type="button"
            className={`warn-card warn-card--warn${filters.type === "warn" ? " is-active" : ""}`}
            onClick={() => applyTypeFilter("warn")}
          >
            <div className="warn-card__value">{counts.warn}</div>
            <div className="warn-card__label">Warns</div>
          </button>
          <button
            type="button"
            className={`warn-card warn-card--kick${filters.type === "kick" ? " is-active" : ""}`}
            onClick={() => applyTypeFilter("kick")}
          >
            <div className="warn-card__value">{counts.kick}</div>
            <div className="warn-card__label">Kicks</div>
          </button>
        </section>

        <section className="warn-panel">
          <div className="warn-status">
            <span>Всего: {total}</span>
            <span>
              Страница {page} из {totalPages}
            </span>
            <form className="warn-search" onSubmit={applyFilters}>
              <input
                type="text"
                placeholder="lakiviko"
                value={draft.player}
                onChange={updateDraft("player")}
              />
              <span className="warn-avatar">
                <img
                  src={`https://avatar.luminor.games/face/name/${encodeURIComponent(
                    draft.player?.trim() || "lakiviko"
                  )}?upscale=4`}
                  alt=""
                />
              </span>
            </form>
          </div>

          {error && <div className="warn-error">{error}</div>}
          {loading && <div className="warn-loading">Загрузка…</div>}

          <div className="warn-table-wrap">
            <table className="warn-table">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>
                    <button
                      type="button"
                      className="warn-sort"
                      onClick={() => applySort("player")}
                    >
                      {SORT_LABELS.player}
                      <span>{sortIndicator("player")}</span>
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="warn-sort"
                      onClick={() => applySort("staff")}
                    >
                      {SORT_LABELS.staff}
                      <span>{sortIndicator("staff")}</span>
                    </button>
                  </th>
                  <th>Причина</th>
                  <th>
                    <button
                      type="button"
                      className="warn-sort"
                      onClick={() => applySort("date")}
                    >
                      {SORT_LABELS.date}
                      <span>{sortIndicator("date")}</span>
                    </button>
                  </th>
                  <th>Истекает</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((item) => {
                  const untilText =
                    Number(item.until) > 0 ? formatDate(item.until) : "N/A";
                  return (
                    <tr key={`${item.type}-${item.time}-${item.player}-${item.staff}`}>
                      <td>
                        <span className={`warn-badge warn-badge--${item.type}`}>
                          {TYPE_LABELS[item.type] ?? item.type}
                        </span>
                      </td>
                      <td>
                        <span className="warn-player">
                          <img
                            src={`https://avatar.luminor.games/face/name/${encodeURIComponent(
                              item.player || "lakiviko"
                            )}?upscale=4`}
                            alt=""
                            loading="lazy"
                          />
                          <span>{item.player || "—"}</span>
                        </span>
                      </td>
                      <td>{item.staff || "—"}</td>
                      <td>{item.reason || "—"}</td>
                      <td>{formatDate(item.time)}</td>
                      <td>{untilText}</td>
                    </tr>
                  );
                })}
                {!loading && data && data.items?.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center" }}>
                      Ничего не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="warn-pagination">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => goToPage(Math.max(page - 1, 1))}
              disabled={page <= 1 || loading}
            >
              Назад
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => goToPage(Math.min(page + 1, totalPages))}
              disabled={page >= totalPages || loading}
            >
              Вперёд
            </button>
          </div>
        </section>
      </main>
    </Layout>
  );
}
