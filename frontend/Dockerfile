# =========================================================
# Stage 1: Build React Production Bundle
# =========================================================
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency manifests and install packages
COPY package.json package-lock.json ./
RUN npm install

# Copy source code and build React app
COPY . .
RUN npm run build

# =========================================================
# Stage 2: Serve with Nginx Alpine (Minimal Production Image)
# =========================================================
FROM nginx:alpine AS runtime

# Copy custom Nginx configuration with SPA routing & reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
