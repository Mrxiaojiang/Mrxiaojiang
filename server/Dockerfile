# ========== Development ==========
FROM node:18-alpine AS development

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ========== Build ==========
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ========== Production ==========
FROM node:18-alpine AS production

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
