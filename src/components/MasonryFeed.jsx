import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import MediaCarousel from "../components/MediaCarousel";

function MasonryClient({ items }) {
  const containerRef = React.useRef(null);
  const masonryRef = React.useRef(null);

  React.useEffect(() => {
    let destroyed = false;

    (async () => {
      const Masonry = (await import("masonry-layout")).default;
      const imagesLoaded = (await import("imagesloaded")).default;

      if (destroyed) return;
      const el = containerRef.current;
      if (!el) return;

      // если уже было — уничтожаем перед пересозданием
      if (masonryRef.current) {
        masonryRef.current.destroy();
        masonryRef.current = null;
      }

      const msnry = new Masonry(el, {
        itemSelector: ".masonry-item",
        columnWidth: ".masonry-sizer",
        percentPosition: true,
        horizontalOrder: true, // строгий порядок слева-направо построчно
        transitionDuration: 0,
      });

      masonryRef.current = msnry;

      imagesLoaded(el, () => {
        msnry.layout();
      });
    })();

    return () => {
      destroyed = true;
      if (masonryRef.current) {
        masonryRef.current.destroy();
        masonryRef.current = null;
      }
    };
  }, [items]);

  return (
    <div ref={containerRef} className="masonry">
      <div className="masonry-sizer" />
      {items.map((it) => (
        <div className="masonry-item" key={it.link}>
          <article className="feed-card">
            <div
              className="feed-content"
              dangerouslySetInnerHTML={{ __html: it.content }}
            />
            {(it.media?.length ?? 0) > 0 && (
              <div className="feed-media">
                <MediaCarousel media={it.media} />
              </div>
            )}
            <div className="feed-meta">
              <a href={it.link} target="_blank" rel="noreferrer">Откруть в Social</a>
              {it.pubDate ? ` • ${new Date(it.pubDate).toLocaleString()}` : ""}
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}

export default function MasonryFeed({ items }) {
  return (
    <BrowserOnly fallback={<p>Loading layout…</p>}>
      {() => <MasonryClient items={items} />}
    </BrowserOnly>
  );
}