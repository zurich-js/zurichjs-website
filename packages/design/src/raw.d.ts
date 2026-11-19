/** Vite's `?raw` import: a file's contents as a string (theme.ts reads theme.css this way). */
declare module '*.css?raw' {
  const contents: string;
  export default contents;
}
