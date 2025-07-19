# Etapa de build
FROM oven/bun:alpine AS builder
ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
RUN bun run build

# Etapa de producción
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/build .
COPY --from=builder /app/static ./static
COPY --from=builder /app/build /usr/share/nginx/html
COPY --from=builder /app/static /usr/share/nginx/html/static
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 