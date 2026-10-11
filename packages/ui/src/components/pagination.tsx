"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { NavigationAsset } from "./navigation-asset";

export const paginationVariants = [
  "page-default",
  "page-minimal",
  "card-default",
  "card-minimal-right",
  "card-minimal-left",
  "card-minimal-center",
  "card-group-right",
  "card-group-left",
  "card-group-center",
] as const;
export type PaginationVariant = (typeof paginationVariants)[number];
type PageState = {
  pageCount: number;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
};

function usePage({
  pageCount,
  page,
  defaultPage = 1,
  onPageChange,
}: PageState): readonly [number, (next: number) => void] {
  const [internalPage, setInternalPage] = useState(defaultPage);
  if (!Number.isSafeInteger(pageCount) || pageCount < 1)
    throw new RangeError("pageCount must be a positive safe integer");
  const selected = page ?? internalPage;
  if (!Number.isSafeInteger(selected)) throw new RangeError("page must be a safe integer");
  const current = Math.max(1, Math.min(selected, pageCount));
  return [
    current,
    (next) => {
      const clamped = Math.max(1, Math.min(next, pageCount));
      if (clamped === current) return;
      if (page === undefined) setInternalPage(clamped);
      onPageChange?.(clamped);
    },
  ] as const;
}

function pageWindow(current: number, total: number, compact: boolean): (number | string)[] {
  const edge = compact ? 2 : 3;
  const visible = new Set<number>();
  if (compact && total > 5 && current > 2 && current < total - 1) {
    return [
      1,
      ...(current > 2 ? ["gap-1"] : []),
      current,
      ...(current < total - 1 ? ["gap-" + current] : []),
      total,
    ];
  }
  if (total <= (compact ? 5 : 7)) {
    for (let number = 1; number <= total; number++) visible.add(number);
  } else if (current <= edge + 1 || current >= total - edge) {
    for (let offset = 0; offset < edge; offset++) {
      visible.add(offset + 1);
      visible.add(total - offset);
    }
    visible.add(current);
  } else {
    visible.add(1);
    visible.add(total);
    for (let number = current - (compact ? 0 : 1); number <= current + (compact ? 0 : 1); number++)
      visible.add(number);
  }
  const sorted = [...visible].sort((a, b) => a - b);
  return sorted.flatMap((number, index) => {
    const previous = sorted[index - 1];
    return previous !== undefined && number - previous > 1 ? ["gap-" + previous, number] : [number];
  });
}

export type PaginationProps = Omit<ComponentProps<"nav">, "onChange"> &
  PageState & {
    variant?: PaginationVariant;
    shape?: "square" | "circle";
    breakpoint?: "responsive" | "desktop" | "mobile";
  };
export function Pagination({
  pageCount,
  page,
  defaultPage,
  onPageChange,
  variant = "page-default",
  shape = "square",
  breakpoint = "responsive",
  className,
  "aria-label": label = "Pagination",
  ...props
}: PaginationProps): React.ReactElement {
  const [current, change] = usePage({ pageCount, page, defaultPage, onPageChange });
  const grouped = variant.startsWith("card-group");
  const minimal = variant.startsWith("card-minimal");
  const numberList = (compact: boolean) =>
    pageWindow(current, pageCount, compact).map((number) =>
      typeof number === "string" ? (
        <span key={number} className="p-pagination-gap" aria-hidden="true">
          ...
        </span>
      ) : (
        <button
          key={number}
          type="button"
          className="p-pagination-number"
          aria-label={"Page " + number}
          aria-current={current === number ? "page" : undefined}
          onClick={() => change(number)}
        >
          {number}
        </button>
      )
    );
  const action = (next: boolean, compact: boolean) => {
    const text = next ? "Next" : "Previous";
    const disabled = next ? current === pageCount : current === 1;
    const name = grouped
      ? next
        ? "paginationImgArrowRight2"
        : compact
          ? "paginationImgArrowLeft3"
          : "paginationImgArrowLeft2"
      : compact
        ? next
          ? "paginationImgArrowRight1"
          : "paginationImgArrowLeft1"
        : next
          ? "paginationImgArrowRight"
          : "paginationImgArrowLeft";
    const icon = <NavigationAsset name={name} />;
    if (grouped)
      return (
        <button
          type="button"
          aria-label={text + " page"}
          disabled={disabled}
          className="p-pagination-group-action"
          data-direction={next ? "next" : "previous"}
          onClick={() => change(current + (next ? 1 : -1))}
        >
          {!next && icon}
          <span className="p-pagination-action-label">{text}</span>
          {next && icon}
        </button>
      );
    if (compact)
      return (
        <Button
          iconOnly
          aria-label={text + " page"}
          variant="secondary"
          leadingIcon={icon}
          disabled={disabled}
          onClick={() => change(current + (next ? 1 : -1))}
          className="p-pagination-action"
        />
      );
    const showIcon = !minimal;
    return (
      <Button
        variant={variant === "page-default" ? "link-gray" : "secondary"}
        className="p-pagination-action"
        aria-label={text + " page"}
        leadingIcon={!next && showIcon ? icon : null}
        trailingIcon={next && showIcon ? icon : null}
        disabled={disabled}
        onClick={() => change(current + (next ? 1 : -1))}
      >
        {text}
      </Button>
    );
  };
  const counter = (
    <span className="p-pagination-counter">
      Page {current} of {pageCount}
    </span>
  );
  return (
    <nav
      {...props}
      aria-label={label}
      className={cn("p-pagination", className)}
      data-variant={variant}
      data-shape={shape}
      data-breakpoint={breakpoint}
    >
      <div className="p-pagination-desktop">
        {grouped ? (
          <div className="p-pagination-group">
            {action(false, false)}
            {numberList(false)}
            {action(true, false)}
          </div>
        ) : minimal ? (
          variant === "card-minimal-center" ? (
            <>
              {action(false, false)}
              {counter}
              {action(true, false)}
            </>
          ) : (
            <>
              {counter}
              <div className="p-pagination-actions">
                {action(false, false)}
                {action(true, false)}
              </div>
            </>
          )
        ) : (
          <>
            {action(false, false)}
            <div className="p-pagination-numbers">{numberList(false)}</div>
            {action(true, false)}
          </>
        )}
      </div>
      <div className="p-pagination-mobile">
        {grouped ? (
          <div className="p-pagination-group">
            {action(false, true)}
            {numberList(true)}
            {action(true, true)}
          </div>
        ) : (
          <>
            {action(false, true)}
            {counter}
            {action(true, true)}
          </>
        )}
      </div>
    </nav>
  );
}

export type PaginationDotsProps = Omit<ComponentProps<"nav">, "onChange" | "style"> &
  PageState & {
    size?: "md" | "lg";
    variant?: "dot" | "line";
    framed?: boolean;
    disabled?: boolean;
  };
export function PaginationDots({
  pageCount,
  page,
  defaultPage,
  onPageChange,
  size = "md",
  variant = "dot",
  framed = false,
  disabled = false,
  className,
  "aria-label": label = "Slide navigation",
  ...props
}: PaginationDotsProps): React.ReactElement {
  const [current, change] = usePage({ pageCount, page, defaultPage, onPageChange });
  return (
    <nav
      {...props}
      aria-label={label}
      className={cn("p-pagination-dots", className)}
      data-size={size}
      data-variant={variant}
      data-framed={framed || undefined}
    >
      {Array.from({ length: pageCount }, (_, index) => (
        <button
          key={index}
          type="button"
          className="p-pagination-dot"
          disabled={disabled}
          aria-label={"Go to slide " + (index + 1)}
          aria-current={current === index + 1 ? "true" : undefined}
          onClick={() => change(index + 1)}
        />
      ))}
    </nav>
  );
}
