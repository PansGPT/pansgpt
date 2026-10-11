import { navigationAssetUrl, type NavigationAssetName } from "./navigation-assets";

export function NavigationAsset({ name }: { name: NavigationAssetName }): React.ReactElement {
  return <img src={navigationAssetUrl(name)} alt="" aria-hidden="true" />;
}
