FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY prisma ./prisma
RUN bunx prisma generate

COPY . .

EXPOSE 4001

CMD ["bun", "run", "src/main.ts"]
