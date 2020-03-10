FROM registry.cn-hangzhou.aliyuncs.com/aliyun-node/alinode:5.15.0-alpine
RUN mkdir -p /usr/src/app
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -fs http://localhost:7001/ || exit 1
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN which git

# RUN npm config set registry "https://registry.npm.taobao.org"
RUN npm install
COPY . /usr/src/app

RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

EXPOSE 7001
