import { ButtonNativeAsset } from "./button-native-assets";
import { buttonNativeGlyphs } from "./button-native-data";
import type { ButtonVariant } from "./button";
export function ButtonPlaceholder({
  variant,
  destructive,
  trailing = false,
  disabled,
  loading,
}: {
  variant: ButtonVariant;
  destructive: boolean;
  trailing?: boolean;
  disabled?: boolean;
  loading?: boolean;
}): React.ReactElement {
  const prefix = `${destructive ? "destructive" : "normal"}:${variant}`;
  const state = loading ? "loading" : disabled ? "disabled" : "default";
  const glyphs =
    buttonNativeGlyphs[`${prefix}:${state}`] ?? buttonNativeGlyphs[`normal:${variant}:${state}`];
  const normal = glyphs?.[trailing ? 1 : 0] ?? glyphs?.[0];
  const hoverGlyphs =
    buttonNativeGlyphs[`${prefix}:hover`] ?? buttonNativeGlyphs[`normal:${variant}:hover`];
  const hover = hoverGlyphs?.[trailing ? 1 : 0] ?? hoverGlyphs?.[0];
  return (
    <span className="p-button-placeholder">
      <span data-glyph-state="default">
        {normal && <ButtonNativeAsset name={normal} className={loading ? "p-spin" : undefined} />}
      </span>
      {!disabled && !loading && hover && (
        <span data-glyph-state="hover">
          <ButtonNativeAsset name={hover} />
        </span>
      )}
    </span>
  );
}
