# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — builder
# Installs the full workspace (including devDependencies, which are needed to
# compile TypeScript and build Next.js), then builds every workspace package.
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# The repo root pins pnpm via `packageManager`, which corepack reads. Prepare
# that exact version explicitly anyway so the image never depends on corepack's
# bundled default — a different pnpm major can fail `--frozen-lockfile` on a
# lockfile-format mismatch. pnpm 11 requires Node >=22.13, which is why both
# stages are on node:22-slim (Next.js 16.3.1 needs only >=20.9.0).
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# Build order matters: protocol is a dependency of the others.
RUN pnpm --filter @convkit/protocol run build \
 && pnpm --filter @convkit/sdk run build \
 && pnpm --filter @convkit/test-engine run build \
 && pnpm --filter @convkit/cli run build \
 && pnpm --filter @convkit/server run build \
 && pnpm --filter web run build

# Drop devDependencies now that everything is compiled. This rewrites
# node_modules in place, keeping only production deps (fastify, next, react,
# ... ) and the workspace symlinks, which is what shrinks the runtime image.
#
# CI=true is required here, not cosmetic: switching a full install to --prod
# makes pnpm purge and rebuild node_modules, and it refuses to remove the
# directory unattended ("Aborted removal of modules directory due to no TTY").
# It is scoped to this one command so it cannot change how the Next.js build
# above behaves.
RUN CI=true pnpm install --prod --frozen-lockfile --ignore-scripts


# ---------------------------------------------------------------------------
# Stage 2 — runtime
#
# Why copy node_modules from the builder rather than using `pnpm deploy`:
# pnpm's node_modules is a tree of symlinks into /app/node_modules/.pnpm.
# Copying the whole /app tree to the *same absolute path* keeps every one of
# those links valid, so resolution works with no extra install step. That also
# preserves the workspace links (@convkit/protocol -> packages/protocol) that
# both the server and the CLI depend on. `pnpm deploy` would produce a flatter
# tree per app, but it needs one deploy pass per application plus --legacy on
# pnpm 11 for non-injected workspaces, and it would still have to ship both
# apps — so the size win does not pay for the extra fragility here. The
# devDependency prune in the builder stage is what actually keeps this small.
# ---------------------------------------------------------------------------
FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# Read at runtime by apps/web/app/api/config/route.ts and served to the browser
# from /api/config, so the UI's server address is no longer fixed at build time.
# Override with `docker run -e CONVKIT_SERVER_URL=... -e CONVKIT_WS_URL=...`.
ENV CONVKIT_SERVER_URL=http://localhost:4000
ENV CONVKIT_WS_URL=ws://localhost:4000/ws

# The server's CORS allowlist. Must match the origin the browser loads the UI
# from. The container cannot discover its own published host port, so remapping
# the UI port still requires overriding this at run time.
ENV WEB_URL=http://localhost:3000

WORKDIR /app

# Same absolute path as the builder, so the pnpm symlinks resolve.
COPY --from=builder /app /app

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# 4000 = Fastify server, 3000 = Next.js UI
EXPOSE 4000 3000

# `convkit dev` is not used here: it starts the UI with `next dev` (a dev
# server) and shells out to pnpm in a monorepo layout. start.sh runs the
# production equivalents directly — node on the compiled server, next start
# on the prebuilt UI.
CMD ["/usr/local/bin/start.sh"]
