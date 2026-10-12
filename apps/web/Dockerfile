FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/config/package.json ./packages/config/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @railraksha/web build
FROM node:24-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
RUN addgroup -S railraksha && adduser -S railraksha -G railraksha \
    && rm -rf /usr/local/lib/node_modules /opt/yarn* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg
COPY --from=build --chown=railraksha:railraksha /app/apps/web/.next/standalone ./
COPY --from=build --chown=railraksha:railraksha /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=railraksha:railraksha /app/apps/web/public ./apps/web/public
USER railraksha
EXPOSE 3000
CMD ["node","apps/web/server.js"]
