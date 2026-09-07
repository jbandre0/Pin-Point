/** @type {import('next').NextConfig} */

// Empty for local dev (site served from "/"); set to "/pinpoint" by the
// GitHub Pages workflow so assets and routes resolve under the project path.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export", // build a static ./out folder — no server needed (GitHub Pages)
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["react-simple-maps", "d3-geo", "d3-array", "topojson-client"],
};

export default nextConfig;
