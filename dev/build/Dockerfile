# ====================
# --- Build Assets ---
# ====================
FROM node:20-alpine AS assets

RUN apk add yarn g++ make cmake python3 --no-cache

WORKDIR /wiki

# Copy only dependency files first (for better caching)
COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
COPY ./patches ./patches

# Install ALL dependencies (dev + prod)
RUN yarn --frozen-lockfile --non-interactive

# Now copy source code (changes here won't invalidate dependency install)
COPY ./client ./client
COPY ./dev ./dev
COPY ./.babelrc ./.babelrc
COPY ./.eslintignore ./.eslintignore
COPY ./.eslintrc.yml ./.eslintrc.yml

# Build assets
RUN yarn build

# ====================
# --- Prod Deps ---
# ====================
FROM node:20-alpine AS deps

RUN apk add yarn g++ make cmake python3 --no-cache

WORKDIR /wiki

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
COPY ./patches ./patches

# Install ONLY production dependencies
RUN yarn --production --frozen-lockfile --non-interactive && \
    yarn patch-package

# ===============
# --- Release ---
# ===============
FROM node:20-alpine
LABEL maintainer="requarks.io"

RUN apk add bash curl git openssh gnupg sqlite --no-cache && \
    mkdir -p /wiki && \
    mkdir -p /logs && \
    mkdir -p /wiki/data/content && \
    chown -R node:node /wiki /logs

WORKDIR /wiki

COPY --chown=node:node --from=assets /wiki/assets ./assets
COPY --chown=node:node --from=deps /wiki/node_modules ./node_modules
COPY --chown=node:node ./server ./server
COPY --chown=node:node --from=assets /wiki/server/views ./server/views
COPY --chown=node:node ./dev/build/config.yml ./config.yml
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./LICENSE ./LICENSE

# Copy compiled client themes from assets stage (includes custom themes)
COPY --chown=node:node --from=assets /wiki/client/themes ./client/themes

USER node

VOLUME ["/wiki/data/content"]

EXPOSE 3000
EXPOSE 3443

# HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 CMD curl -f http://localhost:3000/healthz

CMD ["node", "server"]
