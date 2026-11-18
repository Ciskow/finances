# Stage 1: build the React app (web/) with the design system it imports.
FROM node:22-alpine AS build
WORKDIR /src
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci
COPY design-system ./design-system
COPY web ./web
RUN cd web && npm run build

# Stage 2: the tiny Node server plus the built files.
FROM node:22-alpine
WORKDIR /app
COPY server.js ./
COPY --from=build /src/dist ./dist
ENV PORT=8182 DATA_FILE_PATH=/data/db.json
EXPOSE 8182
CMD ["node", "server.js"]
