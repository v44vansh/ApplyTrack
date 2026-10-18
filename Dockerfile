FROM node:20.18.0-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN apk add --no-cache make && npm ci
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
