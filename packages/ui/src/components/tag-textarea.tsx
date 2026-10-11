"use client";
import { cn } from "../utils";
import { FigmaAsset } from "./asset";
import { TagInput, type TagInputProps } from "./tag-input";
export type TagTextareaProps = TagInputProps & { resizable?: boolean };
/** A wrapping tag field with the source textarea's minimum height and native resize behavior. */
export function TagTextarea({
  className,
  resizable = true,
  ...props
}: TagTextareaProps): React.ReactElement {
  return (
    <div className={cn("p-tag-textarea", className)} data-resizable={resizable}>
      <TagInput
        {...props}
        helpPlacement="label"
        errorIcon={null}
        trailingAction={
          resizable ? <FigmaAsset name="resize" className="p-resize-handle" /> : undefined
        }
      />
    </div>
  );
}
