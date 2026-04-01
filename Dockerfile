FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8000
ENV NODE_ENV=production
CMD ["node", "index.js"]

