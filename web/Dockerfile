FROM node:22-alpine
WORKDIR /app
COPY server.mjs nutrition.mjs studio-state.mjs studio-ai.mjs ./
RUN mkdir -p /app/data && chown node:node /app/data
COPY public/ ./public/
USER node
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "server.mjs"]
