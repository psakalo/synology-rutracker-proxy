FROM node:latest

ENV RUTRACKER_USERNAME=username
ENV RUTRACKER_PASSWORD=password
ENV PORT=3700

WORKDIR /usr/src

COPY . .

RUN npm ci

EXPOSE 8080

CMD [ "node", "index.js" ]
