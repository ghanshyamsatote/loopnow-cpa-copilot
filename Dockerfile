# syntax=docker/dockerfile:1

# ---- Stage 1: install dependencies ----
# Node 22+ required: pnpm@11.8.0 (pinned in package.json) needs Node >=22.13.
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build the app ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The Gemini key is not needed at build time (no pages call the model during
# `next build`), so no secret is baked into the image here.
RUN pnpm build

# ---- Stage 3: minimal production runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as a non-root user inside the container (least-privilege).
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# `output: "standalone"` (next.config.ts) produces a self-contained server
# bundle with only the runtime dependencies actually used — this is what
# keeps the final image small instead of copying the whole node_modules tree.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(r.status!==200)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
