/** @type {import('tailwindcss').Config} */
export default {
  content:['./index.html','./src/**/*.{ts,tsx}'],
  theme:{extend:{colors:{navy:'#0B1F3A',teal:'#169C91',lab:'#F5F7FA'},boxShadow:{card:'0 12px 34px rgba(11,31,58,.08)'}}},
  plugins:[]
};
