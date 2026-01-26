import React from "react";
import Layout from "@theme/Layout";
import { useParams } from "@docusaurus/router";

export const path = "/warn/:type/:id";

const TYPE_TITLES = {
  ban: "Ban",
  mute: "Mute",
  warn: "Warn",
  kick: "Kick",
};

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

function resolveServer(item) {
  return item?.server_scope || item?.server_origin || "global";
}

export default function WarnDetail() {
  const { type, id } = useParams();
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    fetch(`/api/warn/${type}/${id}`)
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
  }, [id, type]);

  const title = `${TYPE_TITLES[type] || "Punishment"} #${id}`;
  const playerName = data?.player || "—";
  const staffName = data?.staff || "—";
  const playerAvatar = `https://avatar.luminor.games/portrait/name/${encodeURIComponent(
    playerName
  )}?upscale=6`;
  const staffAvatar = `https://avatar.luminor.games/portrait/name/${encodeURIComponent(
    staffName
  )}?upscale=6&flip=true`;

  const untilValue = Number(data?.until);
  const isTimed = Number.isFinite(untilValue) && untilValue > 0;
  const isPermanent = !isTimed && ["ban", "mute"].includes(data?.type);
  const untilLabel = isTimed
    ? formatDate(untilValue)
    : isPermanent
    ? "Пожизненное наказание"
    : "N/A";

  return (
    <Layout title={title}>
      <main className="container margin-vert--lg warn-container">
        <section className="warn-detail">
          <h1 className="warn-detail__title">{title}</h1>

          {error && <div className="warn-error">{error}</div>}
          {loading && <div className="warn-loading">Загрузка…</div>}

          {data && !error && (
            <div className="warn-detail__grid">
              <div className="warn-detail__person">
                <div className="warn-detail__label">Игрок</div>
                <img src={playerAvatar} alt="" className="warn-detail__avatar" />
                <div className="warn-detail__name">
                  <img
                    src={`https://avatar.luminor.games/face/name/${encodeURIComponent(
                      playerName
                    )}?upscale=4`}
                    alt=""
                  />
                  <span>{playerName}</span>
                </div>
              </div>

              <div className="warn-detail__info">
                <div className="warn-detail__row">
                  <div className="warn-detail__row-title">Причина</div>
                  <div className="warn-detail__row-value">{data.reason || "—"}</div>
                </div>
                <div className="warn-detail__row">
                  <div className="warn-detail__row-title">Дата</div>
                  <div
                    className="warn-detail__row-value"
                    title={relativeFromNow(data.time)}
                  >
                    {formatDate(data.time)}
                  </div>
                </div>
                <div className="warn-detail__row">
                  <div className="warn-detail__row-title">Сервер</div>
                  <div className="warn-detail__row-value">{resolveServer(data)}</div>
                </div>
                <div className="warn-detail__row">
                  <div className="warn-detail__row-title">Истекает</div>
                  <div
                    className="warn-detail__row-value"
                    title={isTimed ? relativeFromNow(untilValue) : ""}
                  >
                    {untilLabel}
                  </div>
                </div>
              </div>

              <div className="warn-detail__person">
                <div className="warn-detail__label">Staff</div>
                <img src={staffAvatar} alt="" className="warn-detail__avatar" />
                <div className="warn-detail__name">
                  <img
                    src={`https://avatar.luminor.games/face/name/${encodeURIComponent(
                      staffName
                    )}?upscale=4`}
                    alt=""
                  />
                  <span>{staffName}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </Layout>
  );
}
