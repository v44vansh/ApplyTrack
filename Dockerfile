FROM node:20.18.0-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apk add --no-cache make && npm ci
COPY . .
RUN npm run db:generate && npm run db:push && npm run build
EXPOSE 4000
CMD ["npm", "run", "server:start"]
