/** @type {import('tailwindcss').Config} */
export default {
  corePlugins: {
    // Tailwind v3 genera el preflight como CSS sin capa (@layer), por lo que
    // "button { padding: 0; background-color: transparent; }" sobrescribe
    // "@layer primereact { .p-button { padding: 0.75rem; } }" (sin capa > con capa).
    // Deshabilitarlo evita que el reset de preflight rompa los estilos de PrimeReact.
    // En Tailwind v4 el preflight irá en @layer base y layer-order.css resolverá esto.
    // Ref: https://primereact.org/guides/csslayer/
    preflight: false,
  },
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
