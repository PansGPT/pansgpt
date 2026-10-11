import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { Typography } from "./typography";

export type AvatarImageProps = Omit<ComponentProps<"figure">, "children"> & {
  src: string;
  alt: string;
  variant?: "square" | "portrait";
  caption?: ReactNode;
  source?: { label?: ReactNode; href?: string };
};

export function AvatarImage({
  src,
  alt,
  variant = "square",
  caption,
  source,
  className,
  ...props
}: AvatarImageProps): React.ReactElement {
  return (
    <figure {...props} className={cn("p-avatar-image", className)} data-variant={variant}>
      <img className="p-avatar-image-photo" src={src} alt={alt} />
      {(caption != null || source != null) && (
        <figcaption className="p-avatar-image-caption">
          {caption != null && <Typography variant="text-lg-medium">{caption}</Typography>}
          {source != null && (
            <Typography as="div" variant="text-md-regular" className="p-avatar-image-source">
              {source.href ? (
                <a href={source.href}>{source.label ?? "Source"}</a>
              ) : (
                <span>{source.label ?? "Source"}</span>
              )}
            </Typography>
          )}
        </figcaption>
      )}
    </figure>
  );
}
