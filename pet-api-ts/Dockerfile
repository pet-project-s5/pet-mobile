FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/

RUN npm ci

RUN npx prisma generate

EXPOSE 8080

# Push schema → seed data → start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run seed && npm run dev"]
