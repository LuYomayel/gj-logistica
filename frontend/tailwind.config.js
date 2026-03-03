/** @type {import('tailwindcss').Config} */
export default {
  corePlugins: {
    // Deshabilitar preflight para evitar que Tailwind resetee los estilos de PrimeReact.
    // Ver: https://primereact.org/tailwind/
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
