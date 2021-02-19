服务器在阿里云，阿里云账号见《云账号.xlsx》，网络与安全主要是通过安全组控制端口的访问权限。

## 测试服：47.52.2.146

### Web 服务器

测试 web 使用 jenkins 管理，文件目录/var/lib/jenkins/workspace，注意文件的所有者为 jenkins 账号，不要使用 root 账号去修改文件，否则 jenkins 没有权限在继续操作会报错。参考以下两篇文章：

[前端自动构建说明](https://andoromeda.coding.net/p/smart-signature-future/wiki/158)

[后端自动构建说明](https://andoromeda.coding.net/p/smart-signature-future/wiki/159)

### IPFS

IPFS 通过 https://github.com/smart-signature/ipfs-service/ 这个项目 docker 部署的，这个项目本身的服务已经没用了。
ipfs 文件目录：/root/ipfs-data-volumes
ipfs 端口：

```
5001：ipfs数据操作端口，需要对外关闭，否则可能会有他人恶意写入文件
8888：ipfs数据浏览端口，可以开放，如果不想让别人访问可以关闭
```

### Nginx

配置文件在 /etc/nginx/，修改完配置文件执行命令：

```
//验证语法
# nginx -t
//重新加载
# nginx -s reload
```

服务器重启后 nginx 不会自动重新，执行命令启动：

```
# nginx
```

移动端、pc 端、微信端是在 nginx 内判断并跳转的，具体查看 nginx 配置文件。

### ElasticSearch

安装目录：/usr/local/elasticsearch-7.2.0/，启动命令：

```
# cd /usr/local/elasticsearch-7.2.0/
// 切换账号（不能使用root启动）
# sudo su es
# ./bin/elasticsearch -d -p pid
```

端口：9200，es 的 api 接口为 RESTful 风格，没有账号权限控制，需要关闭端口的外网访问权限，服务器配置内网 IP 访问。公司内调试可以开 IP 白名单。

生产服和测试服使用都使用这个 es 服务，通过 indexs 名称来区分，见后端的配置文件：

```
测试服：
indexPosts: 'test_posts',
indexUsers: 'test_users',
生产服：
indexPosts: 'prod_posts',
indexUsers: 'prod_users',
```

### Redis

使用 docker 安装，Redis 数据文件目录：/usr/etc/redis-data，启动命令：

```
$ docker run -d --name redis -v $PWD/redis-data:/data -p 6379:6379 redis redis-server --appendonly yes  --requirepass "9vIZfzIHJEID1dK2" --restart=always

-p 6379:6379 : 将容器的6379端口映射到主机的6379端口
-v $PWD/redis-data:/data : 将主机中当前目录下的redis-data挂载到容器的/data
redis-server –appendonly yes : 在容器执行redis-server启动命令，并打开redis持久化配置
--privileged root权限，大约在0.6版，privileged被引入docker。 使用该参数，container内的root拥有真正的root权限。
--restart=always 自动重启
```

端口：6379，虽然设置了访问密码，安全起见端口尽量不要对外开放，服务器配置内网 IP 访问。
生产服和测试服使用都使用这个 redis 服务，通过 db index 区分：

```
测试服：db：0
生产服：db：1
```

### Grafana

grafana 是一款数据可视化工具，可以配置数据库、es、zabbix 等数据源，通过图表等展示数据，目前后端数据库的一些数据通过它来展示。grafana 管理员账号见《云账号.xlsx》。
grafana docker 安装命令：

```
# docker run -d --name=grafana -p 3018:3000 grafana/grafana 
```

- 访问地址：http://47.52.2.146:3018/

- grafana 参考：https://grafana.com/grafana/download?platform=docker

## 生产服：47.52.134.165

### Web 服务器

移动端 web：/usr/local/smart-signature/smart-signature-future，发布命令：

```
# bash update_prod
```

pc 端 web：/usr/local/smart-signature/smart-signature-pcweb，发布命令：

```
# bash update_prod_pcweb
```

服务端：/usr/local/smart-signature/smart-signature-backend，发布命令：

```
# bash update_prod_backend
```

### Nginx

同测试服

### IPFS

同测试服

## 其他

### 域名

matataki.io，Tmono 在 domains.google.com 上申请的，需要 Tmono 授权即可管理。
~~smartsignature.io，godaddy 上申请，域名账号见《云账号.xlsx》~~ (已经由 mttk.net 替代)
mttk.net Porkbun 申请的，需要 Frank 授权管理
frontenduse.top，阿里云申请

### 第三方统计

- 百度统计
- TalkingData

### 微信支付

### 安全

- 服务之间尽量使用内网 IP
- 防火墙关闭端口外部访问，或 IP 白名单

### https 证书

阿里云申请的免费证书，1 年有效期
