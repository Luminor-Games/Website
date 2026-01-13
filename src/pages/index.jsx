import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";

export default function Home() {
  return (
    <Layout
      title="Luminor"
      description="Уютный ванильный Minecraft-сервер и пространство для сообщества."
    >
      <main className="container margin-vert--lg">
        <div className="hero-luminor">
          <div className="hero-luminor__content">
            <h1>Luminor</h1>
            <p className="hero-luminor__subtitle">
              Уютный ванильный Minecraft-сервер и пространство для спокойной игры, идей и
              сообщества.
            </p>

            <div className="hero-luminor__buttons">
              <Link className="button button--primary button--lg" to="/docs/intro">
                Открыть Wiki
              </Link>
              <Link className="button button--secondary button--lg" to="/feeds/news">
                Новости
              </Link>
              <Link className="button button--secondary button--lg" to="/feeds/gallery">
                Галерея
              </Link>
            </div>

            <div className="hero-luminor__meta">
              <span>🌿 Уют • 🤝 Сообщество • 🛠️ Честная игра</span>
            </div>
          </div>
        </div>

        <div className="luminor-grid">
          <section className="luminor-card">
            <h2>Про что проект</h2>
            <p>
              Luminor — это мир, где приятно строить, исследовать и просто быть рядом.
              Без спешки, без лишнего шума — с акцентом на атмосферу и уважение.
            </p>
          </section>

          <section className="luminor-card">
            <h2>Как следить за обновлениями</h2>
            <p>
              Все новости публикуются в Social и автоматически появляются здесь в ленте.
              Можно читать прямо на сайте или открыть пост на Mastodon.
            </p>
            <p style={{ marginBottom: 0 }}>
              <Link to="/feeds/news">Перейти к новостям →</Link>
            </p>
          </section>

          <section className="luminor-card">
            <h2>Где смотреть скриншоты</h2>
            <p>
              В “Галерее” — посты с тегом <code>#галерея</code> (и медиа-каруселью).
              Отлично подходит для красивых мест, построек и событий.
            </p>
            <p style={{ marginBottom: 0 }}>
              <Link to="/feeds/gallery">Открыть галерею →</Link>
            </p>
          </section>

          <section className="luminor-card">
            <h2>Правила и ответы</h2>
            <p>
              База знаний живёт в Wiki: правила, механики, полезные команды, частые
              вопросы, заметки по миру.
            </p>
            <p style={{ marginBottom: 0 }}>
              <Link to="/docs/intro">Открыть Wiki →</Link>
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}