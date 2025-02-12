FROM node:18

RUN npm install -g pnpm@latest

WORKDIR /usr/src/app

COPY package*.json ./

ENV NODE_ENV=production
RUN pnpm install 

COPY . .

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
