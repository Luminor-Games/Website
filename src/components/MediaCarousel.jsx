import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";

function ZoomableImage({ src, alt }) {
  return (
    <Zoom>
      <img className="embla__img" src={src} alt={alt || ""} loading="lazy" />
    </Zoom>
  );
}

export default function MediaCarousel({ media }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollSnaps, setScrollSnaps] = React.useState([]);

  React.useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());

    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    });

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  if (!media?.length) return null;

  return (
    <div className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {media.map((m) => (
            <div className="embla__slide" key={m.url}>
              <ZoomableImage src={m.url} alt={m.description} />
              {m.description ? <div className="embla__caption">{m.description}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {media.length > 1 && (
        <>
          <button className="embla__prev" type="button" onClick={() => emblaApi?.scrollPrev()} aria-label="Prev">
            ‹
          </button>
          <button className="embla__next" type="button" onClick={() => emblaApi?.scrollNext()} aria-label="Next">
            ›
          </button>

          <div className="embla__dots">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`embla__dot ${i === selectedIndex ? "is-selected" : ""}`}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}