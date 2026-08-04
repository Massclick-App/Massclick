FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --include=optional

COPY . .

# Certificate rendering resolves fonts through fontconfig, which reads this
# during library load — it has to be in the environment before node starts,
# setting it from JS is too late. See assets/fontconfig/fonts.conf.
ENV FONTCONFIG_FILE=/app/assets/fontconfig/fonts.conf
RUN mkdir -p /app/assets/fontconfig/cache

EXPOSE 4000

CMD ["node", "app.js"]
