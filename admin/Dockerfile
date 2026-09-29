# Stage 1: Builder — contexto = raíz del monorepo (incluye shared/)
FROM node:22-alpine AS builder
WORKDIR /app

# @pagui/shared = file:../shared → debe existir ANTES de npm ci
COPY shared/ ./shared/
COPY admin/package.json admin/package-lock.json ./admin/
RUN cd admin && npm ci

# Copia el resto del código fuente de admin
COPY admin/ ./admin/

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN cd admin && npm run build

# Stage 2: Release — SPA estática servida por nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/admin/build /usr/share/nginx/html
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
