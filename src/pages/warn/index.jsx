import React from "react";
import Layout from "@theme/Layout";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useHistory } from "@docusaurus/router";

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

function relativeFromNow(input) {
  const num = Number(input);
  if (!Number.isFinite(num)) return "";
  const ms = num < 1e12 ? num * 1000 : num;
  const diffMs = ms - Date.now();
  const isFuture = diffMs > 0;
  const totalHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  let body = "";
  if (days > 0) {
    body = `${days} дн ${hours} ч`;
  } else if (hours > 0) {
    body = `${hours} ч`;
  } else {
    body = "менее часа";
  }

  return isFuture ? `через ${body}` : `${body} назад`;
}

export default function WarnPage() {
  const history = useHistory();
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

  const sortingState = React.useMemo(
    () => [{ id: filters.sort, desc: filters.order === "desc" }],
    [filters.order, filters.sort]
  );

  const columns = React.useMemo(
    () => [
      {
        id: "type",
        header: "Тип",
        cell: ({ row }) => (
          <span className={`warn-badge warn-badge--${row.original.type}`}>
            {TYPE_LABELS[row.original.type] ?? row.original.type}
          </span>
        ),
      },
      {
        id: "player",
        header: ({ column }) => (
          <button
            type="button"
            className="warn-sort"
            onClick={column.getToggleSortingHandler()}
          >
            {SORT_LABELS.player}
            <span>
              {column.getIsSorted() === "asc"
                ? "↑"
                : column.getIsSorted() === "desc"
                ? "↓"
                : "↕"}
            </span>
          </button>
        ),
        accessorKey: "player",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="warn-person">
            <img
              src={`https://avatar.luminor.games/face/name/${encodeURIComponent(
                row.original.player || "lakiviko"
              )}?upscale=4`}
              alt=""
              loading="lazy"
            />
            <span className="warn-person__name">{row.original.player || "—"}</span>
          </span>
        ),
      },
      {
        id: "staff",
        header: ({ column }) => (
          <button
            type="button"
            className="warn-sort"
            onClick={column.getToggleSortingHandler()}
          >
            {SORT_LABELS.staff}
            <span>
              {column.getIsSorted() === "asc"
                ? "↑"
                : column.getIsSorted() === "desc"
                ? "↓"
                : "↕"}
            </span>
          </button>
        ),
        accessorKey: "staff",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="warn-person">
            <img
              src={`https://avatar.luminor.games/face/name/${encodeURIComponent(
                row.original.staff || "lakiviko"
              )}?upscale=4`}
              alt=""
              loading="lazy"
            />
            <span className="warn-person__name">{row.original.staff || "—"}</span>
          </span>
        ),
      },
      {
        id: "reason",
        header: "Причина",
        cell: ({ row }) => row.original.reason || "—",
      },
      {
        id: "date",
        accessorFn: (row) => row.time,
        header: ({ column }) => (
          <button
            type="button"
            className="warn-sort"
            onClick={column.getToggleSortingHandler()}
          >
            {SORT_LABELS.date}
            <span>
              {column.getIsSorted() === "asc"
                ? "↑"
                : column.getIsSorted() === "desc"
                ? "↓"
                : "↕"}
            </span>
          </button>
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span title={relativeFromNow(row.original.time)}>
            {formatDate(row.original.time)}
          </span>
        ),
      },
      {
        id: "until",
        header: "Истекает",
        cell: ({ row }) => {
          const untilValue = Number(row.original.until);
          const isTimed = Number.isFinite(untilValue) && untilValue > 0;
          const isPermanent =
            !isTimed && ["ban", "mute"].includes(row.original.type);
          const label = isTimed
            ? formatDate(untilValue)
            : isPermanent
            ? "Пожизненное наказание"
            : "N/A";
          const dotClass = isTimed ? "warn-dot--timed" : isPermanent ? "warn-dot--perm" : "";
          const title = isTimed ? relativeFromNow(untilValue) : "";

          return (
            <span className="warn-until" title={title}>
              {dotClass ? <span className={`warn-dot ${dotClass}`} /> : null}
              <span>{label}</span>
            </span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting: sortingState },
    enableSortingRemoval: false,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(sortingState) : updater;
      const nextSort = next?.[0];
      if (!nextSort?.id) return;
      setFilters((prev) => ({
        ...prev,
        sort: nextSort.id,
        order: nextSort.desc ? "desc" : "asc",
        page: 1,
      }));
    },
  });

  return (
    <Layout title="Стена позора">
      <main className="container margin-vert--lg warn-container">
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
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`warn-col-${header.column.id}`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="warn-row"
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      history.push(`/warn/${row.original.type}/${row.original.id}`)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        history.push(`/warn/${row.original.type}/${row.original.id}`);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`warn-col-${cell.column.id}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
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
