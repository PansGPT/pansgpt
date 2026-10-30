import type { ComponentProps } from "react";
import { Button as SharedButton } from "@pansgpt/ui/shell";

/** Product actions use explicit icons rather than the design-gallery placeholders. */
export function Button(props: ComponentProps<typeof SharedButton>): React.ReactElement {
  return <SharedButton leadingIcon={null} trailingIcon={null} {...props} />;
}
