FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install netcat-openbsd for wait-for-it.sh
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

COPY . .

RUN chmod +x wait-for-it.sh

EXPOSE 3000

CMD ["./wait-for-it.sh", "mysql:3306", "--", "node", "server.js"]