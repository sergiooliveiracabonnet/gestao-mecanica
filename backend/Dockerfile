# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY backend/package.json ./backend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter=@oficina/backend...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY . .
RUN pnpm --filter=@oficina/contracts build
RUN pnpm --filter=@oficina/backend build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/main.js"]
