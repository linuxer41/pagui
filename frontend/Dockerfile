FROM oven/bun:alpine AS builder
ARG BUILD_API_URL
ENV NODE_ENV=production
ENV VITE_API_URL=${BUILD_API_URL}

WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
COPY shared /app/shared
COPY plugins /app/plugins
RUN bun install
COPY frontend/ .
RUN echo "VITE_API_URL: $VITE_API_URL"
RUN bun run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/frontend/build .
COPY --from=builder /app/frontend/static ./static
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
