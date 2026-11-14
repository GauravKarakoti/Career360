import type { NextConfig } from 'next';
const config: NextConfig = {
  allowedDevOrigins: ["*.vercel.run", "preview-check.vercel.run"], devIndicators: false };
export default config;
