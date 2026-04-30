FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY prisma ./prisma
ARG DATABASE_URL=postgresql://admin:admin@postgres:5432/games
ENV DATABASE_URL=${DATABASE_URL}
RUN bunx prisma generate

COPY . .

EXPOSE 4001

CMD ["bun", "run", "src/main.ts"]
