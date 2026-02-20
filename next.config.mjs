// REMOVER todo o bloco env: { ... }
// Manter apenas:
import { config } from "dotenv";
config({ path: ".env" });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // env: { ... } ← DELETE ISSO
};

export default nextConfig;