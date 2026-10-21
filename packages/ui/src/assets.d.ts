declare module "*.svg" {
  const asset: string | { src: string; width: number; height: number };
  export default asset;
}
declare module "*.png" {
  const asset: string | { src: string; width: number; height: number };
  export default asset;
}
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
