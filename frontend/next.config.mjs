/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOT using output: 'standalone' here — its file tracer creates real
  // symlinks (fs.symlink), which requires SeCreateSymbolicLinkPrivilege on
  // Windows (admin or Developer Mode). Without it, `next build` fails with
  // EPERM for every developer on a normal, non-elevated Windows setup. The
  // Docker image instead copies the full relative pnpm workspace structure
  // (see frontend/Dockerfile) — no tracing/symlinking needed.
};

export default nextConfig;
