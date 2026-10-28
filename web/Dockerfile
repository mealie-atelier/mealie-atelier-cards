FROM node:22.23.4-alpine
WORKDIR /app
# Every server module plus package.json (the service worker cache name is derived from its version).
COPY package.json *.mjs ./
COPY public/ ./public/
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 ATELIER_DATA_DIR=/app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=6s --start-period=10s --retries=3 \
  CMD ["node", "healthcheck.mjs"]
CMD ["node", "server.mjs"]
