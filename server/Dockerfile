# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
# Full install (dev deps needed for the TypeScript build)
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
# Two processes share this image:
#   API server:      node dist/server.js   (default CMD)
#   Mailer worker:   node dist/worker.js   (override start command)
CMD ["node", "dist/server.js"]
