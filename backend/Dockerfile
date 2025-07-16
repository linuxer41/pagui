FROM oven/bun:alpine

WORKDIR /app

# Instalar dependencias de PostgreSQL
RUN apk add --no-cache postgresql-client

COPY package.json bun.lockb ./
RUN bun install

COPY . .

# Variables de entorno para la base de datos
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=payments
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"] 