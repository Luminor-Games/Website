FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache nginx supervisor

# ----- Docusaurus deps -----
COPY package*.json ./
RUN npm ci

# ----- API deps -----
# COPY api/package*.json ./api/
# RUN cd api && npm ci

# ----- Sources -----
COPY . .

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV API_PORT=3101
ENV FEEDS_TTL_MS=120000
ENV FEEDS_LIMIT=20

CMD ["supervisord", "-c", "/app/supervisord.conf"]
