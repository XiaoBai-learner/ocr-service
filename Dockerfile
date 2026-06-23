FROM wxapp-server:2026-06-12-amd64

WORKDIR /ocr-service

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
