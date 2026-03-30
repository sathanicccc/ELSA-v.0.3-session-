FROM node:20

WORKDIR /app

# lockfile ഇല്ലെങ്കിലും npm install വർക്ക് ആകാൻ ഇത് സഹായിക്കും
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

CMD ["node", "index.js"]

