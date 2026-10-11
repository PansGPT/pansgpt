"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { PaginationDots } from "./pagination";
import leftMd from "../../assets/carousel-arrow-imgChevronLeft.svg";
import leftLg from "../../assets/carousel-arrow-imgChevronLeft1.svg";
import rightMd from "../../assets/carousel-arrow-imgChevronRight.svg";
import rightLg from "../../assets/carousel-arrow-imgChevronRight1.svg";

const arrows = { md: { previous: leftMd, next: rightMd }, lg: { previous: leftLg, next: rightLg } };
export type CarouselArrowProps = Omit<ComponentProps<"button">, "children"> & {
  direction: "previous" | "next";
  size?: "md" | "lg";
};
export function CarouselArrow({
  direction,
  size = "md",
  className,
  "aria-label": label,
  ...props
}: CarouselArrowProps): React.ReactElement {
  const asset = arrows[size][direction];
  return (
    <Button
      {...props}
      iconOnly
      aria-label={label ?? (direction === "previous" ? "Previous slide" : "Next slide")}
      leadingIcon={<img src={typeof asset === "string" ? asset : asset.src} alt="" />}
      trailingIcon={null}
      variant="tertiary"
      className={cn("p-carousel-arrow", className)}
      data-carousel-size={size}
      data-direction={direction}
    />
  );
}

export interface CarouselSlide {
  id: string;
  src: string;
  alt: string;
}
export type CarouselImageProps = Omit<ComponentProps<"section">, "children" | "onChange"> & {
  slides: readonly CarouselSlide[];
  label: string;
  size?: "md" | "lg";
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  loop?: boolean;
  disabled?: boolean;
};
export function CarouselImage({
  slides,
  label,
  size = "md",
  index,
  defaultIndex = 0,
  onIndexChange,
  loop = true,
  disabled = false,
  className,
  ...props
}: CarouselImageProps): React.ReactElement {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const selected = index ?? internalIndex;
  if (slides.length === 0) throw new RangeError("Carousel needs at least one slide");
  if (!Number.isSafeInteger(selected))
    throw new RangeError("Carousel index must be a safe integer");
  const current = Math.max(0, Math.min(selected, slides.length - 1));
  const slide = slides[current]!;
  const change = (next: number): void => {
    if (disabled) return;
    const bounded = loop
      ? ((next % slides.length) + slides.length) % slides.length
      : Math.max(0, Math.min(next, slides.length - 1));
    if (bounded === current) return;
    if (index === undefined) setInternalIndex(bounded);
    onIndexChange?.(bounded);
  };
  const unavailable = disabled || slides.length === 1;
  return (
    <section
      {...props}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("p-carousel", className)}
      data-carousel-size={size}
    >
      <div
        className="p-carousel-slide"
        role="group"
        aria-roledescription="slide"
        aria-label={`${current + 1} of ${slides.length}`}
      >
        <img key={slide.id} src={slide.src} alt={slide.alt} className="p-carousel-image" />
      </div>
      <CarouselArrow
        direction="previous"
        size={size}
        disabled={unavailable || (!loop && current === 0)}
        onClick={() => change(current - 1)}
      />
      <CarouselArrow
        direction="next"
        size={size}
        disabled={unavailable || (!loop && current === slides.length - 1)}
        onClick={() => change(current + 1)}
      />
      <PaginationDots
        pageCount={slides.length}
        page={current + 1}
        onPageChange={(page) => change(page - 1)}
        size={size}
        framed
        aria-label={`${label} slide navigation`}
        disabled={disabled}
        className="p-carousel-dots"
      />
      <span className="p-carousel-announcement" aria-live="polite" aria-atomic="true">
        Slide {current + 1} of {slides.length}
      </span>
    </section>
  );
}
