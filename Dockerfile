# Build stage: compile the React client (dist/) and the Express server (dist-server/).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production node_modules, shared by the server and combined app images.
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Server image: the Express API only (docker build --target server).
FROM node:20-alpine AS server
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY drizzle ./drizzle
USER node
EXPOSE 3001
CMD ["node", "dist-server/server/index.js"]

# UI image: nginx serving the built client and proxying /api to the server (docker build --target ui).
FROM nginx:1.27-alpine AS ui
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Default image: the server also serving the built client, as used by the deploy workflow.
FROM server AS app
COPY --from=build /app/dist ./dist
