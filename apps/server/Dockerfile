FROM oven/bun:1.3-slim AS base
WORKDIR /app

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash - \
    && ln -s /root/.local/share/pnpm/pnpm /usr/local/bin/pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/server/package.json apps/server/
COPY packages/protocol/package.json packages/protocol/
COPY packages/db/package.json packages/db/
COPY packages/auth/package.json packages/auth/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN pnpm install --frozen-lockfile --filter=@workspace/server...

FROM deps AS runtime
COPY apps/server apps/server
COPY packages/protocol packages/protocol
COPY packages/db packages/db
COPY packages/auth packages/auth
COPY packages/typescript-config packages/typescript-config
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["bun", "src/index.ts"]
