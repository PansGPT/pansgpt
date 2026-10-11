"use client";

import { useId, useState } from "react";
import { TableAsset } from "./table-assets";
export type TableRatingProps = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  label: string;
  readOnly?: boolean;
  disabled?: boolean;
};
export function TableRating({
  value,
  defaultValue = 0,
  onValueChange,
  label,
  readOnly = false,
  disabled = false,
}: TableRatingProps): React.ReactElement {
  const [internal, setInternal] = useState(defaultValue);
  const name = useId();
  const current = Math.max(
    0,
    Math.min(5, Math.round(Number.isFinite(value ?? internal) ? (value ?? internal) : 0))
  );
  const change = (next: number) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };
  const star = (rating: number) => (
    <TableAsset
      name={rating <= current ? "source2_imgFill100ColorYellow" : "source2_imgFill0ColorYellow"}
    />
  );
  if (readOnly)
    return (
      <span className="p-table-rating" role="img" aria-label={`${label}: ${current} of 5 stars`}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <span key={rating}>{star(rating)}</span>
        ))}
      </span>
    );
  return (
    <fieldset className="p-table-rating" disabled={disabled}>
      <legend className="p-table-caption">{label}</legend>
      {[1, 2, 3, 4, 5].map((rating) => (
        <label key={rating}>
          <input
            type="radio"
            name={name}
            value={rating}
            checked={current === rating}
            aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
            onChange={() => change(rating)}
          />
          {star(rating)}
        </label>
      ))}
    </fieldset>
  );
}
