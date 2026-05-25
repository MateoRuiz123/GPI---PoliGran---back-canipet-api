# ── Stage 1: build ──────────────────────────────────────────
FROM node:22-alpine AS builder

RUN npm install -g pnpm@latest

WORKDIR /app

COPY pnpm-workspace.yaml .npmrc ./
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm run build

# ── Stage 2: production ──────────────────────────────────────
FROM node:22-alpine AS runner

RUN npm install -g pnpm@latest

WORKDIR /app

ENV NODE_ENV=production

COPY pnpm-workspace.yaml .npmrc ./
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3001

CMD ["pnpm", "run", "start"]
