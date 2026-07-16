/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], theme: { extend: { colors: { navy: { 50:'#f1f6fb',100:'#dce9f5',600:'#155483',700:'#103f64',800:'#12354f',900:'#102a3d' } }, boxShadow:{ card:'0 1px 3px rgba(15,23,42,.08),0 8px 24px rgba(15,23,42,.04)' } } }, plugins: [] };
