import React from "react";
import Layout from "@theme/Layout";
import MasonryFeed from "../components/MasonryFeed";

export default function FeedPage({ title, apiUrl }) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    fetch(apiUrl)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setData({ error: String(e) }));
  }, [apiUrl]);

  const items =
    (data?.feeds ?? [])
      .flatMap((f) => f.items ?? [])
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  return (
    <Layout title={title}>
      <main className="container margin-vert--lg">
        <div className="feed-wrapper">
          <h1>{title}</h1>

          {data?.error && <p style={{ color: "red" }}>{data.error}</p>}
          {!data && <p>Loading…</p>}

          {data && <MasonryFeed items={items} />}
        </div>
      </main>
    </Layout>
  );
}