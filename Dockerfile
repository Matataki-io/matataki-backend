FROM node:18-alpine

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

# Install dependencies
COPY package.json yarn.lock /usr/src/app/
RUN yarn install --production --frozen-lockfile

COPY . /usr/src/app

HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD curl --fail http://localhost:7001/ || exit 1

EXPOSE 7001
