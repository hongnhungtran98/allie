import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-extra + its plugins use dynamic require() patterns (merge-deep, clone-deep,
  // is-plain-object) that Next's bundler mangles, surfacing as "utils.typeOf is not a function"
  // at runtime. Keep them external so Node loads them via require() at request time.
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "puppeteer-real-browser",
    "rebrowser-puppeteer-core",
  ],
};

export default nextConfig;
