import { useState } from "react";
import { CarouselArrow, CarouselImage, type CarouselSlide } from "../src";
import sourceImage from "../assets/carousel-image-imgSizeMd.png";
const src = typeof sourceImage === "string" ? sourceImage : sourceImage.src;
const slides: CarouselSlide[] = [0, 1, 2].map((index) => ({
  id: String(index),
  src,
  alt: `Rubber plant photograph ${index + 1}`,
}));
export function CarouselFixtures(): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [changes, setChanges] = useState(0);
  return (
    <section className="preview-section">
      <h2>Carousel arrows</h2>
      <div className="carousel-arrow-source-grid">
        <CarouselArrow direction="previous" size="md" data-source-id="1253:189" />
        <CarouselArrow direction="previous" size="lg" data-source-id="1253:215" />
        <CarouselArrow direction="next" size="md" data-source-id="1253:187" />
        <CarouselArrow direction="next" size="lg" data-source-id="1253:211" />
      </div>
      <h2>Carousel image layouts</h2>
      <div className="carousel-source-grid">
        <CarouselImage label="Medium source carousel" slides={slides} data-source-id="1253:274" />
        <CarouselImage
          label="Large source carousel"
          slides={slides}
          size="lg"
          data-source-id="1253:386"
        />
      </div>
      <div role="group" aria-label="Interactive carousels" className="avatar-pattern-demo">
        <CarouselImage
          label="Plant collection"
          slides={slides}
          index={index}
          onIndexChange={(next) => {
            setIndex(next);
            setChanges((previous) => previous + 1);
          }}
          loop={false}
        />
        <output aria-live="polite">
          Selected slide: {index}; changes: {changes}
        </output>
        <CarouselImage label="Looping collection" slides={slides} />
        <CarouselImage label="Unavailable collection" slides={slides} disabled />
        <CarouselImage label="Single photograph" slides={slides.slice(0, 1)} />
      </div>
    </section>
  );
}
