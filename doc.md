### API docs

#### 发布文章

* POST /post/publish
* 响应状态码：200

* curl -d "author=tengavinwood&title=xxxxx&publickey=EOS8QP2Z6tApaUYPEC6hm9f1pZrSEMmZ7n5SsvjzA3VTnRXUyra9E&hash=QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy&sign=SIG_K1_KZU9PyXP8YAePjCfCcmBjGHARkvTVDjKpKvVgS6XL8o2FXTXUdhP3rqrL38dJYgJo2WNBdYubsY9LKTo47RUUE4N3ZHjZQ&shortContent=aaa" -X POST https://api.smartsignature.io/post/publish

* 增加参数：commentPayPoint 评论需要花的积分


#### 获取文章列表

* GET /posts/timeRanking

* 参数 
* page: 页数，默认第一页
* pagesize: 每页的数量， 默认20
* author: 作者id，默认返回全部author的文章，传入author参数，则只返回指定author的文章。
* channel: 频道id, 1为普通文章, 2为商品文章, 不带则不筛选, 返回所有文章
* extra: 需要额外返回的项目， 以逗号分割， 如short_content,others,aaaabc

* curl -X GET https://api.smartsignature.io/posts/timeRanking
* curl -X GET https://api.smartsignature.io/posts/timeRanking?page=2
* curl -X GET https://api.smartsignature.io/posts/timeRanking?author=998
* curl -X GET https://api.smartsignature.io/posts/timeRanking?channel=1&extra=short_content,others

* 返回内容
```$xslt
{
    "code": 0,
    "message": "成功",
    "data": [
        {
            "id": 100455,
            "uid": 38,
            "author": "linklinkguan",
            "title": "【游戏精选】这不是个跳跃游戏！This is not a jump game",
            "short_content": null,
            "hash": "QmRpvUwMLCMyA6EJWo2hQtFqGh4ZzWfvp8Dz5vPDyYJVFZ",
            "create_time": "2019-05-30T13:22:03.000Z",
            "cover": "QmWDUvT3vBt5rqnfr4bU8TQnt1h2RNQJjqqc6nnCwwonNb",
            "nickname": "林可可",
            "read": 234,
            "eosvalue": 200,
            "ups": 2,
            "ontvalue": 20000
        },
    ]
}
```

#### 获取按照赞赏次数排行的文章列表

* GET /posts/supportsRanking

* 参数 
* page: 页数，默认第一页
* pagesize: 每页的数量， 默认20
* channel: 频道id, 1为普通文章, 2为商品文章, 不带则不筛选, 返回所有文章
* extra: 需要额外返回的项目， 以逗号分割， 如short_content,others,aaaabc

* curl -X GET https://api.smartsignature.io/posts/supportsRanking
* curl -X GET https://api.smartsignature.io/posts/supportsRanking?page=2
* curl -X GET https://api.smartsignature.io/posts/supportsRanking?channel=1

```$xslt
{
    "code": 0,
    "message": "成功",
    "data": [
        {
            "id": 100455,
            "uid": 38,
            "author": "linklinkguan",
            "title": "【游戏精选】这不是个跳跃游戏！This is not a jump game",
            "short_content": null,
            "hash": "QmRpvUwMLCMyA6EJWo2hQtFqGh4ZzWfvp8Dz5vPDyYJVFZ",
            "create_time": "2019-05-30T13:22:03.000Z",
            "cover": "QmWDUvT3vBt5rqnfr4bU8TQnt1h2RNQJjqqc6nnCwwonNb",
            "nickname": "林可可",
            "read": 234,
            "eosvalue": 200,
            "ups": 2,
            "ontvalue": 20000
        },
    ]
}
```

#### 获取推荐文章

* GET /posts/recommend
* 不分页, 返回最新的数条

* 参数:
* channel, URL参数, 区别是普通文章(1)还是商品文章(2), 不带则不筛选
* amount, URL参数, 返回的推荐数量, 不带则默认为5

* 请求示例
* curl -x GET https://api.smartsignature.io/posts/recommend?channel=2

* 返回示例
```
{
    "code": 0,
    "message": "成功",
    "data": [
        {
            "id": 100455,
            "uid": 38,
            "author": "linklinkguan",
            "title": "【游戏精选】这不是个跳跃游戏！This is not a jump game",
            "short_content": null,
            "hash": "QmRpvUwMLCMyA6EJWo2hQtFqGh4ZzWfvp8Dz5vPDyYJVFZ",
            "create_time": "2019-05-30T13:22:03.000Z",
            "cover": "QmWDUvT3vBt5rqnfr4bU8TQnt1h2RNQJjqqc6nnCwwonNb",
            "nickname": "林可可",
            "read": 280,
            "eosvalue": 200,
            "ups": 2,
            "ontvalue": 20000,
            "sale": 0
        }
    ]
}
```

#### 获取包含该tag的文章列表

* GET /posts/getPostByTag

* 参数 
* page: 页数，默认第一页
* pagesize: 每页的数量， 默认20
* extra: 需要额外返回的项目， 以逗号分割， 如short_content,others,aaaabc
* tagid: 标签的id

请求示例：
* curl http://localhost:7001/posts/getPostByTag?page=1&extra=aa,short_content&tagid=10

响应示例：

```
{
  "code": 0,
  "message": "成功",
  "data": [
    {
      "id": 100571,
      "uid": 207,
      "author": "fromnrttolax",
      "title": "use-html",
      "hash": "QmXLApxE7F4LFPTFWQbLXDBhvg23WQKdvbiasD2WckfWwe",
      "create_time": "2019-07-23T07:37:24.000Z",
      "cover": "/image/2019/07/23/52d7074a63456337c91a0e715add92d7.png",
      "nickname": "fromnrttolax",
      "avatar": "/avatar/2019/07/12/b8fea8566aa0b6341060c37410ea628b.png",
      "read": 14,
      "eosvalue": 0,
      "ups": 0,
      "ontvalue": 0,
      "tags": [
        5
      ],
      "sale": 0
    }
  ]
}
```


#### 获取用户信息 
    
 返回 email, nickname, avatar, avatar, fans 数和 follow 数 , is_follow 是否关注， 

* GET /user/:username
* 响应状态码：200
* 响应体：

```
{"username":"minakokojima", "email": "251815992@qq.com", "nickname":"岛娘", "avatar": "QmPFvWoRsaTqtS5i4YcAqLBca5aVvuxTNe95Ncnd7dssUT","follows":4,"fans":5, is_follow: false }
```

请求示例: 

* curl -X GET https://api.smartsignature.io/user/minakokojima

#### 获取用户个人主页的统计信息 (need access token)

* GET /user/stats
* 正常状态码: 200
* 响应体: 

```$xslt
{
    "code": 0,
    "message": "成功",
    "data": {
        "id": 170,
        "username": "joetothemoon",
        "email": null,
        "nickname": "nicknameNo2",
        "avatar": null,
        "create_time": "2019-04-26T09:34:33.000Z",
        "introduction": null,
        "accounts": 1,
        "follow": 6,
        "fan": 3,
        "articles": 20,
        "drafts": 4,
        "supports": 7
    }
}
```


#### 文章分享上报

* POST /share
* 响应状态码：200

参数
* user: 分享的用户
* hash: 文章的唯一hash

请求示例: 

* curl -d "user=joetothemoon&hash=QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy" -X POST https://api.smartsignature.io/share

#### 文章支持上报

* POST /vote
* 响应状态码：200

参数: 

* user: 分享的用户
* hash: 文章的唯一hash

请求示例: 
* curl -d "user=joetothemoon&hash=QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy" -X POST https://api.smartsignature.io/vote

#### IPFS add

* POST /ipfs/add
* 响应状态码：200

#### IPFS addJSON

* POST /ipfs/addJSON
* 响应状态码：200


#### IPFS cat

* GET /ipfs/cat
* 响应状态码：200

#### IPFS catJSON

* GET /ipfs/catJSON
* 响应状态码：200


请求示例: 

* curl -d "user=joetothemoon&hash=QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy" -X POST https://api.smartsignature.io/ipfs/add
* curl -d "data=xxxx" -X POST https://api.smartsignature.io/ipfs/addJSON
* curl -X GET https://api.smartsignature.io/ipfs/cat/QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy
* curl -X GET https://api.smartsignature.io/ipfs/catJSON/QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy

#### 上传文章至IPFS（新） （需要token）
POST /post/ipfs

示例：
curl -d "data" -H "x-access-token: your_access_token" -X POST https://apitest.smartsignature.io/post/ipfs

响应内容：
成功时候httpstaus为200， code为0
会携带内容的hash返回
```
{
    "code": 0,
    "msg": "success",
    "hash": "Qm00000000"
}
```

#### 从IPFS获取文章
GET /post/ipfs/:hash

示例： 
* curl https://apitest.smartsignature.io/post/ipfs/Qm00000000

响应内容：

{
  "code": 0,
  "data": {
    "title": "title",
    "author": "fromnrttolax",
    "desc": "whatever",
    "content": "content"
  }
}

#### 关注

* POST /follow/follow
* 响应状态码：200

参数：
* username: 当前用户
* followed: 关注的用户

请求示例: 
* curl -d "username=joetothemoon&followed=minakokojima" -X POST https://api.smartsignature.io/follow/follow

#### 取消关注

* POST /follow/unfollow
* 响应状态码：200

参数：
* username: 当前用户
* followed: 关注的用户

请求示例: 
* curl -d "username=joetothemoon&followed=minakokojima" -X POST https://api.smartsignature.io/follow/unfollow


#### Auth (请求获取 access token)

* POST /login/auth
* 响应状态码：200

参数：
* username: 用户
* publickey: 用户签名用的公钥
* sign: 签名
* platform: 账号平台，例如：'eos'，非必填
* source: 登录来源，例如：'ss'，非必填
* referral: 邀请人uid，非必填


成功得到 access_token 后 
在后续请求的请求头中带上access_token： req.header['x-access-token']

demo:

```
const API = {
  // 示例代码。。请随便改。。。
   authSignature(callback) {

    const account = this.getAccount();

    eosClient.getAccount(account.name, (error, result) => {
      // 获取当前权限
      const permissions = result.permissions.find(x => x.perm_name === account.authority);
      // 获取当前权限的public key
      const publicKey = permissions.required_auth.keys[0].key;
      // 需要签名的数据
      const sign_data = `${account.name}`;
      // 申请签名
      ScatterJS.scatter.getArbitrarySignature(publicKey, sign_data, 'Auth').then(signature => {
        callback(account.name, publicKey, signature);
      }).catch(error => {
        
      });
    })
  }
}

// 1. 取得签名
API.authSignature(function(username, publickey, sign){
    console.log(username, publickey, sign);
    // 2. post到服务端 获得accessToken并保存
    auth({ username, publickey, sign}, (error, response, body) => {
        console.log(body);
        if(!error){
            // 3. save accessToken 
            const accessToken = body;
            localStorage.setItem("ACCESS_TOKEN", accessToken);
        }
    })
});

// 示例代码。。请随便改。。。
function auth({
  username, publickey, sign
}, callback) {
  // const url = `${apiServer}/login/auth`;
  const url = `http://localhost:7001/login/auth`;
  return request({
    uri: url,
    rejectUnauthorized: false,
    json: true,
    headers: { Accept: '*/*', Authorization: "Basic bXlfYXBwOm15X3NlY3JldA==" },
    dataType: 'json',
    method: 'POST',
    form: {
      username,
      publickey,
      sign,
    },
  }, callback);
}


 // 4. 使用accessToken 示例。 请求修改某些和用户数据相关的api时，需要按照oauth2规范，在header里带上 accessToken， 以表示有权调用
const accessToken = localStorage.getItem("ACCESS_TOKEN");
request({
    // uri: "some api url that need auth",
    // uri: "http://localhost:7001/follow/follow",
    uri: "http://localhost:7001/follow/unfollow",
    rejectUnauthorized: false,
    json: true,
    headers: { Accept: '*/*', "x-access-token": accessToken },
    dataType: 'json',
    method: 'POST',
    form: {
        username:"joetothemoon",
        followed:"tengavinwood",
    },
}, function(err,resp, body){
    console.log(body);
});


```

#### 验证用户是否存在
* GET /login/verify

* 参数（使用URL query 格式）：
* email： 用户名， 使用邮箱注册的就是邮箱

* 请求示例： curl https://apitest.smartsignature.io/login/verify?email=1@0.0

* 响应示例（data为true说明用户存在， false说明不存在）：
```
{
    "code": 0,
    "message": "成功",
    "data": true
}
```

#### 使用邮箱获取验证码
* GET /login/captcha

* 参数（使用URL query 格式）:
* email: 用户的邮箱

* 请求示例：curl https://apitest.smartsignature.io/login/captcha?email=0@gmail.com

* 响应示例：
```
{
    "code": 0,
    "message": "成功"
}
```

* 错误原因：邮箱格式不对， 邮箱已经注册

#### 使用邮箱注册
* POST /login/regist

* 参数（位于body中）：
* email: 获取验证码使用的邮箱
* captcha: 对应的验证码， 字符串格式
* password: 密码， 或者密码的哈希值

* 请求示例： curl -d "email=1@example.com&captcha=000000&password=pw&referral=123" -X POST https://apitest.smartsignature.io/login/regist

* 出错原因: 验证码错误， 此邮箱没有获取过验证码

#### 使用账户密码登陆
* POST /login/account

* 参数（位于body中）：
* username：账户名字， 邮箱注册的就是邮箱
* password： 密码， 或者密码的哈希， 需要和注册时候机制一致

* 请求示例： curl -d "username=1&password=1" -X POST https://apitest.smartsignature.io/login/account

* 响应示例（data里面是token）：
```
{
    "code": 0,
    "message": "成功",
    "data": "token"
}
```
* 出错原因：用户不存在， 密码错误

#### 文章阅读上报

统计阅读次数

文章被阅读次数统计 #51

新增 阅读次数统计的api :
带上access_token请求，会记录读者名字：

curl -H "x-access-token: your_access_token" -X POST http://api.smartsignature.io/post/show/QmfNHT4eaQ8XGr1kYXZFGEGtkGkr93H8of1vKc5L16ThSK

或者直接调用，算作匿名用户：

curl -X POST http://api.smartsignature.io/post/show/QmfNHT4eaQ8XGr1kYXZFGEGtkGkr93H8of1vKc5L16ThSK

阅读次数字段为 read ，在获取单篇文章的返回数据里 ：
ex：
http://api.smartsignature.io/post/QmfNHT4eaQ8XGr1kYXZFGEGtkGkr93H8of1vKc5L16ThSK


#### 获取打赏列表(打赏队列)

* GET /shares

* 参数 :
* page: 页数，默认第一页
* user: 指定用户
* signid: 指定文章

获取打赏列表，支持使用user和signid进行筛选。

#### 添加评论 (need access_token)

* POST /post/comment
* 响应状态码：200

参数：
* comment: 留言内容
* sign_id: 文章id

请求示例: 
* curl -d "comment=this is comment&sign_id=1" -H "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2V0b3RoZW1vb24iLCJleHAiOjE1NTM3NDQ2MzM0NjF9.hLHem3JxZrJxDDwDiYrs4YLKLT7Y5g0Bz_h7bDTu5zY"  -X POST https://api.smartsignature.io/post/comment


#### 获取评论列表
* GET /comment/comments
* 响应状态码： 200
curl https://apitest.smartsignature.io/comments?signid=100591
响应示例： 
```
{
  "code": 0,
  "message": "成功",
  "data": [
    {
      "payId": 437591,
      "amount": 100,
      "platform": "eos",
      "signid": 100591,
      "create_time": "2019-08-02T12:56:57.000Z",
      "num": 0,
      "action": 1,
      "id": 38,
      "username": "linklinkguan",
      "nickname": "林可可",
      "avatar": "/avatar/2019/08/01/fc2dc5791798301febcd65836be93061.png",
      "comment": "123"
    }
  ]
}
```



#### 获取支持过的文章列表

* GET /posts/supported

* 参数 :
* page: 页数，默认第一页
* user: 指定用户的id

获取支持过的文章列表，支持使用user进行筛选。

请求示例: 
* curl -X GET https://api.smartsignature.io/posts/supported?page=2&user=998

成功返回示例:

```$xslt
{
    "code": 0,
    "message": "成功",
    "data": [
        {
            "id": 100366,
            "uid": 234,
            "author": "AS8aW2K4MNhPk9Wn93QQVYvYLF1QV9wNBt",
            "title": "123",
            "short_content": null,
            "hash": "QmbG8fS91qfDLn71svgqC6tgAVLtwSPEFQvva12dESGrik",
            "create_time": "2019-05-16T08:04:25.000Z",
            "cover": "",
            "nickname": null,
            "read": 8,
            "eosvalue": 100,
            "ups": 2,
            "ontvalue": 30000,
            "support_time": "2019-05-16T00:05:09.000Z"
        },
    ]
}
```

#### 获取关注列表

* GET /follow/follows

* 参数 :
* page: 页数，默认第一页
* user: 指定用户

ps: 如果有传 access token, 服务端会检索 access token所属用户，是否已经关注了 列表中的人 ， 字段 is_follow 

根据 is_follow， 去表示UI界面上 “关注” 按钮的状态。


请求示例: 
curl https://api.smartsignature.io/follow/follows?user=xiaotiandada | jq

```
{
  "totalFollows": 9,
  "totalFans": 8,
  "list": [
    {
      "followed": "xiaotiandada",
      "is_follow": true
    },
    {
      "followed": "helloworld11",
      "is_follow": true
    },
    {
      "followed": "cryptobuffff",
      "is_follow": true
    },
    {
      "followed": "linklinkguan",
      "is_follow": true
    },
    {
      "followed": "QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy",
      "is_follow": true
    },
    {
      "followed": "333333",
      "is_follow": true
    },
    {
      "followed": "222222",
      "is_follow": true
    },
    {
      "followed": "111111",
      "is_follow": true
    },
    {
      "followed": "tengavinwood",
      "is_follow": true
    }
  ]
}

```

#### 获取粉丝列表

* GET /follow/fans

* 参数 :
* page: 页数，默认第一页
* user: 指定用户

ps: 如果有传 access token, 服务端会检索 access token所属用户，是否已经关注了 列表中的人 ， 字段 is_follow 
根据 is_follow， 去表示UI界面上 “关注” 按钮的状态。

请求示例: 
curl https://api.smartsignature.io/follow/fans?user=xiaotiandada | jq


```
{
  "totalFollows": 9,
  "totalFans": 8,
  "list": [
    {
      "username": "xiaotiandada",
      "is_follow": false
    },
    {
      "username": "cryptobuffff",
      "is_follow": false
    },
    {
      "username": "linklinkguan",
      "is_follow": false
    },
    {
      "username": "flyovergross",
      "is_follow": false
    },
    {
      "username": "",
      "is_follow": false
    },
    {
      "username": "444444",
      "is_follow": false
    },
    {
      "username": "333333",
      "is_follow": false
    },
    {
      "username": "222222",
      "is_follow": false
    },
    {
      "username": "111111",
      "is_follow": false
    },
    {
      "username": "tengavinwood",
      "is_follow": false
    }
  ]
}

```


#### 获取资产明细

* GET /assets

* 参数 :
* page: 页数，默认第一页
* user: 指定用户


请求示例: 
curl https://api.smartsignature.io/assets?user=gaojin.game | jq


```

{
  "user": "gaojin.game",
  "totalSignIncome": 0,
  "totalShareIncome": 17550,
  "totalShareExpenses": -10000,
  "history": [
    {
      "author": "gaojin.game",
      "amount": 10,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:32.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 10,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:30.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 10,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:28.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 10,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:26.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 10,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:23.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 500,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:20.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:18.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:16.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:13.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:10.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:08.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:05.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:03.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:48:01.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:47:57.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:47:55.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:47:53.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:47:51.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:47:49.000Z",
      "type": "bill share income"
    },
    {
      "author": "gaojin.game",
      "amount": 1000,
      "sign_id": 211,
      "create_time": "2019-04-01T03:47:46.000Z",
      "type": "bill share income"
    }
  ]
}

```


#### 获取单篇文章的信息

新增, read: 阅读次数， ups: 被打赏次数, value: 被打赏总金额

* GET /post/:hash
* 响应状态码：200

请求示例: 
curl https://api.smartsignature.io/post/Qmdd61fhUoQQBABde1tfF6qaXVgqL7yv8dQLkkiyLF8cW1 | jq

* 响应体：
```
{
  "id": 225,
  "username": "daaaaaaaaaab",
  "author": "daaaaaaaaaab",
  "title": "法學、經濟學與區塊鏈的最潮交會 — 激進市場（Radical Markets）提案入門 [含閱讀清單]",
  "short_content": null,
  "hash": "Qmdd61fhUoQQBABde1tfF6qaXVgqL7yv8dQLkkiyLF8cW1",
  "sign": "SIG_K1_KZ42uGArUszTgdhfytVGWF1TGtJTSHcM521LEM3BLv4GptBMRjJRK754ogCpfW6X42aKoKzS85X2iKFt66XKe68TRrgtmY",
  "public_key": "EOS5mZZrQXTy5Pw97kb8xqTikVQyUNfCDzSYsQiACkAf9gJbJK9hr",
  "status": 0,
  "onchain_status": 1,
  "create_time": "2019-04-02T13:23:13.000Z",
  "fission_factor": 2000,
  "read": 58,
  "ups": 3,
  "value": 15100
}

```

#### ~~获取打赏次数排行榜~~

* GET /getSupportTimesRanking

* 参数 
* page: 页数，默认第一页

请求示例：

* curl -X GET https://api.smartsignature.io/getSupportTimesRanking
* curl -X GET https://api.smartsignature.io/getSupportTimesRanking?page=2


返回示例：

```
[
  {
    "id": 211,
    "author": "andoromedaio",
    "title": "活动 | 《链接偶像》送福利，币娘小姐姐们等你带回家！",
    "short_content": null,
    "hash": "QmRoUwGkwGLwwUnUQHnHptHnvzZ16LiuW6aR5YwP834GJD",
    "create_time": "2019-04-01T03:44:43.000Z",
    "times": 28
  },
  {
    "id": 213,
    "author": "eosjupiter33",
    "title": "币圈趣头条？智能签名将如何打破信息茧房",
    "short_content": null,
    "hash": "QmRxs3qTLMgFpRQF7kVV6gfkPWEPYyNGLYJ2mGaSGYYaQa",
    "create_time": "2019-04-01T09:57:40.000Z",
    "times": 5
  },
  {
    "id": 225,
    "author": "daaaaaaaaaab",
    "title": "法學、經濟學與區塊鏈的最潮交會 — 激進市場（Radical Markets）提案入門 [含閱讀清單]",
    "short_content": null,
    "hash": "Qmdd61fhUoQQBABde1tfF6qaXVgqL7yv8dQLkkiyLF8cW1",
    "create_time": "2019-04-02T13:23:13.000Z",
    "times": 3
  },
  {
    "id": 216,
    "author": "ygllxjgotodo",
    "title": "机械系的悲催小伙儿",
    "short_content": null,
    "hash": "QmUewbj9fFwErkujsHaGjZJYancnXH76iacSYisf1fxET3",
    "create_time": "2019-04-02T02:20:09.000Z",
    "times": 2
  },
  {
    "id": 218,
    "author": "andoromedaio",
    "title": "仙女电波  Vol. 1 仿生人会梦见电子羊吗",
    "short_content": null,
    "hash": "QmezBtn7MKSzppKYoJ6E417R1RgNzUWqvTJMEMS9g2dLmX",
    "create_time": "2019-04-02T03:42:00.000Z",
    "times": 2
  },
  {
    "id": 220,
    "author": "andoromedaio",
    "title": "1000EOS等你来！智能签名写作训练营系列1：爆款文章炼成",
    "short_content": null,
    "hash": "QmdbKn7a4o2ouhyqg9yL1irD8rraYSWEqg7PBTxXUQz8YV",
    "create_time": "2019-04-02T07:20:22.000Z",
    "times": 1
  },
  {
    "id": 223,
    "author": "neigung12345",
    "title": "区块链相关的优质（误）公众号汇总(有链接)",
    "short_content": null,
    "hash": "QmT8aha65VssFf1xsp5jho6xZVibUCZihrSETyzxbyprSB",
    "create_time": "2019-04-02T10:28:09.000Z",
    "times": 1
  },
] 

```


#### ~~获取打赏金额排行榜~~

* GET /getSupportAmountRanking

* 参数 
* page: 页数，默认第一页

请求示例：

* curl -X GET https://api.smartsignature.io/getSupportAmountRanking
* curl -X GET https://api.smartsignature.io/getSupportAmountRanking?page=2


返回示例：

```
[
  {
    "id": 211,
    "author": "andoromedaio",
    "title": "活动 | 《链接偶像》送福利，币娘小姐姐们等你带回家！",
    "short_content": null,
    "hash": "QmRoUwGkwGLwwUnUQHnHptHnvzZ16LiuW6aR5YwP834GJD",
    "create_time": "2019-04-01T03:44:43.000Z",
    "value": 44650
  },
  {
    "id": 225,
    "author": "daaaaaaaaaab",
    "title": "法學、經濟學與區塊鏈的最潮交會 — 激進市場（Radical Markets）提案入門 [含閱讀清單]",
    "short_content": null,
    "hash": "Qmdd61fhUoQQBABde1tfF6qaXVgqL7yv8dQLkkiyLF8cW1",
    "create_time": "2019-04-02T13:23:13.000Z",
    "value": 15100
  },
  {
    "id": 223,
    "author": "neigung12345",
    "title": "区块链相关的优质（误）公众号汇总(有链接)",
    "short_content": null,
    "hash": "QmT8aha65VssFf1xsp5jho6xZVibUCZihrSETyzxbyprSB",
    "create_time": "2019-04-02T10:28:09.000Z",
    "value": 10000
  },
  {
    "id": 218,
    "author": "andoromedaio",
    "title": "仙女电波  Vol. 1 仿生人会梦见电子羊吗",
    "short_content": null,
    "hash": "QmezBtn7MKSzppKYoJ6E417R1RgNzUWqvTJMEMS9g2dLmX",
    "create_time": "2019-04-02T03:42:00.000Z",
    "value": 5100
  },
  {
    "id": 221,
    "author": "bagawuziwei1",
    "title": "《链游大师》剑与魔法的幻想，默认素材首揭",
    "short_content": null,
    "hash": "QmV4rTx2xk3Aos1xksrYHAHBANv7CddYqSf3JQBjF3maoa",
    "create_time": "2019-04-02T07:21:55.000Z",
    "value": 1000
  }
] 

```


#### 修改昵称 (need access_token)

* POST /user/setNickname
* 响应状态码：201

参数：
* nickname: 昵称

请求示例: 
* curl -d "nickname=joenick" -H "x-access-token: access-token"  -X POST https://api.smartsignature.io/user/setNickname




#### 获取单篇文章的信息 （短链接 issues）


* GET /p/:id
* 响应状态码：200

请求示例: 
curl https://api.smartsignature.io/p/123 | jq

* 响应体：

```
{
	"code": 0,
	"message": "成功",
	"data": {
		"id": 100531,
		"username": "xiaotiandada",
		"author": "xiaotiandada",
		"title": "占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页",
		"short_content": "占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页",
		"hash": "QmcHTp2NdrZcweq1Do3v4g1iK2yq6ANHBfyCeF98jLqgti",
		"status": 0,
		"onchain_status": 0,
		"create_time": "2019-06-21T03:59:59.000Z",
		"fission_factor": 2000,
		"cover": "/image/2019/07/11/561ad457a2368a4be4909cef0ac328c7.jpg",
		"is_original": 0,
		"channel_id": 1,
		"fission_rate": 100,
		"referral_rate": 0,
		"uid": 65,
		"is_recommend": 1,
		"category_id": 0,
		"read": 114,
		"sale": 0,
		"ups": 2,
		"value": 0,
		"ontvalue": 20000,
		"likes": 2,
		"dislikes": 0,
		"tags": [{
			"id": 10,
			"name": "我看不行"
		}],
		"is_support": false,
		"nickname": "11我321哈11112",
		"is_liked": 1,
		"points": [{
			"uid": 1048,
			"amount": 3,
			"type": "reading",
			"create_time": "2019-08-13T09:08:52.000Z"…
		}],
    is_readnew": 0,
    "isHoldMineTokens": true
	}
}
```
#### 上传并设置头像（阿里云oss版本）（need access token）
* POST /user/uploadAvatar
* 响应状态码： 200

* 数据： form-data 格式的图片数据， 支持jpg，png，gif等

* 响应示例：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 上传图片（阿里云oss版本）（need access token）
* POST /post/uploadImage
* 响应状态码： 200

* 数据： form-data 格式的图片数据， 支持jpg，png，gif等

* 响应会带文章的文件名和地址， 示例：

```
{
  "code": 0,
  "message": "成功",
  "data": {
    "cover": "/image/2019/07/24/2ba618d03e1202fdfe581ff7540e959b.png"
  }
}
```

#### 获取图片（阿里云oss版本）
* GET /image/:filename  请注意填写正确的域名

* 响应状态码：200

请求示例： 
https://ssimg.frontenduse.top/image/2019/07/24/2ba618d03e1202fdfe581ff7540e959b.png

#### ~~上传图像到ipfs服务器~~

* POST /ipfs/upload
* 响应状态码：200

参数：
* avatar: 

上传示例：

```

<!DOCTYPE html>
<html>

<head>
  <title>JavaScript file upload</title>
  <meta http-equiv="content-type" content="text/html; charset=UTF-8">
</head>
<script type="text/javascript">

</script>

<body>
  <form action=" https://apitest.smartsignature.io/ipfs/upload" method="post" enctype="multipart/form-data">
    <fieldset>
      <legend>Upload photo</legend>
      <input type="file" name="avatar" id="avatar">
      <button type="submit">Upload</button>
    </fieldset>
  </form>
  </br>
  </br>
  <a id="url"></a>
  </br>
  </br>
  <img id="output">
</body>

</html>


```

返回图片的ipfs hash：

```
{"code":200,"hash":"QmPFvWoRsaTqtS5i4YcAqLBca5aVvuxTNe95Ncnd7dssUT"}

```

#### ~~展示上传的图片~~

* GET /image/:hash
* 响应状态码：200

请求示例： 

https://apitest.smartsignature.io/image/QmPFvWoRsaTqtS5i4YcAqLBca5aVvuxTNe95Ncnd7dssUT



#### 设置头像 (need access_token)

* POST /user/setAvatar
* 响应状态码：201

参数：
* avatar: 头像的ipfs hash

请求示例: 

* curl -d "avatar=QmPFvWoRsaTqtS5i4YcAqLBca5aVvuxTNe95Ncnd7dssUT" -H "x-access-token: access-token"  -X POST https://api.smartsignature.io/user/setAvatar


#### 设置用户的个性签名（自我介绍）(need access_token)

* POST /user/setIntroduction
* 成功响应状态码：200
* 失败响应状态码：400,401,500

Body参数（application/x-www-form-urlencoded）：
* introduction：用户的个性签名文字，不超过20个字

成功请求示例：

* curl -d "introduction=" -H "x-access-token:access-token" -X POST https://api.smartsignature.io/user/setIntroduction
```
{
    "status": 200,
    "msg": "Updated successfully"
}
```

失败请求示例：
```
{
    "status": 401,
    "msg": "Cannot get user info from token"
}
```

#### 删除文章(隐藏) (need access_token)

* DELETE /post/:id
* 响应状态码：200
* id: 需要删除的文章的id

请求示例: 

* curl  -H "x-access-token: access-token"  -X DELETE https://api.smartsignature.io/post/100010

成功返回示例: 
```$xslt
{
    "code": 0,
    "message": "成功"
}
```


#### 编辑文章 (need access_token)

* POST /post/edit
* 响应状态码：201

参数: (和publish相比，多了一个signId)

1. signId: 文章的id, 必传
2. author: 作者，必传
3. title: 标题，可选
4. publickey 签名时的公钥，必传
5. hash:  新文章内容的ipfs hash，必传
6. sign: 签名, 必传
7. 

请求示例: 

```

curl -H "x-access-token: access-token" -d "signId=1&author=joetothemoon&title=ddasdasd&publickey=EOS5nUuGx9iuHsWE5vqVpd75QgDx6mEK87ShPdpVVHVwqdY4xwg9C&hash=QmPtcBBEU5JdVy3yBtUfRMx7F2UDQs9V3KdqrcmGppc5VX&sign=SIG_K1_KdWVRnpoYUh1XH1QhhyisAoqGysSLmue46r1J2pJjgSMN9944YADea3WSBnW2ify9BVsk2ipRVAXqRkaxkKernojX9Mfed" -X POST https://api.smartsignature.io/post/edit

```


#### draft list

* GET /draft/drafts
* 响应状态码：201

* 参数 
* page: 页数，默认第一页

* 请求示例

```
curl -H "x-access-token: access-token"  -X GET https://apitest.smartsignature.io/draft/drafts 

```

* 返回示例：

```

[
  {
    "id": 9,
    "uid": 166,
    "title": "11",
    "content": "222",
    "status": 0,
    "create_time": "2019-04-26T08:57:45.000Z",
    "update_time": "2019-04-26T08:57:45.000Z"
  }
]

``` 

#### create draft

* POST /draft/save
* 响应状态码：201

* 参数 
* title: 标题
* content: 内容
* cover: 封面
* fissionFactor: 列变参数

* 请求示例

```

curl -H "x-access-token: access-token" -d "title=112121&content=223312122" -X POST https://apitest.smartsignature.io/draft/save 

```

#### update draft

* POST /draft/save
* 响应状态码：201

* 参数 
* id : 草稿id
* title: 标题
* content: 内容



#### get draft by id

* GET /draft/:id
* 响应状态码：200

* 请求示例

```
curl -H "x-access-token: access-token"  -X GET https://apitest.smartsignature.io/draft/1

```

返回示例:

```
{
  "id": 9,
  "uid": 166,
  "title": "11",
  "content": "222",
  "status": 0,
  "create_time": "2019-04-26T08:57:45.000Z",
  "update_time": "2019-04-26T08:57:45.000Z"
}

```

#### delete draft by id

* DELETE /draft/:id
* 响应状态码：200

* 请求示例

```
curl -H "x-access-token: access-token"  -X DELETE https://apitest.smartsignature.io/draft/1 

```

#### support 跨链打赏

* POST /support/support
* 响应状态码：201

* 参数 
* signId : 文章id
* contract: 打赏货币的合约名
* symbol: 货币符号
* amount: 打赏数量（ 无精度的，如1EOS，就传10000 ）
* platform: 平台 eos或ont
* referrer: 推荐人

* 请求示例：

```
curl -d "signId=1&contract=eosio.token&symbol=EOS&amount=111&platform=eos&referrer=joetothemoon" -H "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2V0b3RoZW1vb24iLCJleHAiOjE1NTc5NzE5MDUwNTR9.9BxHyx9T1Tw-_a8-yX-cNO72R45YEIrRuzJh5jMI3ko"  -X POST http://localhost:7001/support/support 

```

#### tokens 个人资产列表  (need access_token)

返回EOS、ONT的待提现、历史总打赏收入、历史总创作收入、总支出、以及流水数据

* GET /user/tokens
* 响应状态码：200

响应示例

```

{
  "EOS": {
    "balance": 16317,
    "totalSignIncome": 822,
    "totalShareIncome": 0,
    "totalShareExpenses": -811,
    "logs": [
      {
        "id": 4,
        "uid": 170,
        "contract": "eosio.token",
        "symbol": "EOS",
        "amount": -111,
        "signid": 2,
        "platform": "eos",
        "type": "support expenses",
        "create_time": "2019-05-13T09:34:21.000Z"
      },
      {
        "id": 5,
        "uid": 170,
        "contract": "eosio.token",
        "symbol": "EOS",
        "amount": 111,
        "signid": 2,
        "platform": "eos",
        "type": "sign income",
        "create_time": "2019-05-13T09:34:21.000Z"
      },
      ....
    ]
  }
}

```

#### 个人资产明细(need access token)

* GET /user/balance
* 响应状态码： 200
* 响应示例：
```
{
    "code": 0,
    "message": "成功",
    "data": [
        {
            "contract": "AFmseVrdL9f9oyCzZefL9tG6UbvhUMqNMV",
            "symbol": "ONT",
            "amount": 20000,
            "platform": "ont",
            "totalIncome": 14590000
        },
        {
            "contract": "eosio.token",
            "symbol": "EOS",
            "amount": 61940,
            "platform": "eos",
            "totalIncome": 1000
        }
    ]
}
```


#### 资产提现


* POST /user/withdraw
* 响应状态码：201

* 参数 
* contract : 提现币种的合约地址
* symbol: 提现币种的符号
* amount: 提现数量（ 1 EOS和1 ONT都是 传10000的格式）
* platform: 平台（eos or ont）
* toaddress: 提现地址
* memo: 转账备注（可放空）
* publickey: 签名公钥
* sign: 签名

sign 的签名内容：

```
let sign_data = `${toaddress} ${contract} ${symbol} ${amount}`;

比如:
 "xiaotiandada eosio.token EOS 10000"
 "ALStiQ9ZFZo8R8aXaHfZEPReJzv3jSz1Es AFmseVrdL9f9oyCzZefL9tG6UbvhUMqNMV ONT 30000"

```

* EOS提现请求示例：

```

curl -d "sign=SIG_K1_Kbx5MbeSZhHZhHnfhA7KD2YEZLfGbvhrWejwgHyzXQa4gvHfdCiAdMgiUJQvYqrpPrgYXugBNF75Rr4K8D6PW91ibTHwpN&publickey=EOS5nUuGx9iuHsWE5vqVpd75QgDx6mEK87ShPdpVVHVwqdY4xwg9C&toaddress=joetothemoon&signId=1&contract=eosio.token&symbol=EOS&amount=1&memo=memoxx&platform=eos" -H "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2V0b3RoZW1vb24iLCJleHAiOjE1NTkxODg4MjIyMzgsInBsYXRmb3JtIjoiZW9zIiwiaWQiOjE3MH0.DJ5MABCaPYqcrPADYmpVJCGTgXLLuur_Y4JjLSRMJa8"  -X POST http://localhost:7001/user/withdraw

```

* ONT提现请求示例：

```

curl -d "sign=01b07c90984e0385b19f62f29f93b037a8a3c3a9d2d434229c5da315e31bdc1f573cc37c6ad27331a608a7e39a2a4299c71c786371b3790e9a77579d86f58dfedc&publickey=02f57f00790d3e368ad2bf28b08379ce01d608caaf19f862dc92541438fea6daeb&toaddress=ALStiQ9ZFZo8R8aXaHfZEPReJzv3jSz1Es&contract=AFmseVrdL9f9oyCzZefL9tG6UbvhUMqNMV&symbol=ONT&amount=30000&platform=ont" -H "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJBTFN0aVE5WkZabzhSOGFYYUhmWkVQUmVKenYzalN6MUVzIiwiZXhwIjoxNTU5MjgzNjQwODYxLCJwbGF0Zm9ybSI6Im9udCIsImlkIjozMDZ9.pcRmiN9aprhTetCIZCXY5eZNRJwOWfI3tyg_UykSlvc"  -X POST http://localhost:7001/user/withdraw

```


#### 获取已经购买的商品列表(need access token)

* GET /support/products
* 响应状态码: 200
* URL参数: page 第几页； pagesize 每页显示数量

* 请求示例: curl -H "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9......" http://localhost:7001/support/products?page=1&pagesize=4

```

{
    "code": 0,
    "message": "成功",
    "data": [
        {
            "sign_id": 100455,
            "digital_copy": "L9N4Q-*****-8NHT1",
            "support_id": 604,
            "status": 1,
            "title": "This is not a jump game",
            "symbol": "EOS",
            "amount": 200,
            "create_time": "2019-05-31T07:16:37.000Z"
        },
        {
            "sign_id": 100425,
            "digital_copy": "gggggg*****gggg-3",
            "support_id": 519,
            "status": 1,
            "title": "The Legend of Forgotten: The Game of the Gods",
            "symbol": "EOS",
            "amount": 100,
            "create_time": "2019-05-27T12:21:17.000Z"
        }
    ]
}

```


#### get tags 获取可用标签列表

* GET /tag/tags
* 响应状态码：200

* 参数： type， 带则返回某个类型下的tags， 否则返回所有的tags

* 请求示例

curl http://localhost:7001/tag/tags
curl http://localhost:7001/tag/tags?type=product

```

{
  "msg": "success",
  "data": [
    {
      "id": 1,
      "name": "EOS"
    },
    {
      "id": 2,
      "name": "ONT"
    },
    {
      "id": 3,
      "name": "小白入门"
    },
    {
      "id": 4,
      "name": "大咖解说"
    }
  ]
}

```

在publish一篇文章的时候，tags 参数是tag id join ',' 后传到后端。例如:

tags=1,2,3,4



#### get post by tag

根据tagid 查找文章

* GET /posts/getPostByTag
* 响应状态码：200

* 请求示例

curl http://localhost:7001/posts/getPostByTag?tagid=1&page=2


#### 转移文章所有权

* POST /post/transferOwner
* 响应状态码：201

* 参数 
* signid : 要转移的文章的id
* uid: 接收者的user id

curl -d "signid=1&uid=10" -X POST  http://127.0.0.1:7001/post/transferOwner

#### 转移草稿所有权

* POST /draft/transferOwner
* 响应状态码：201

* 参数 
* draftid : 要转移的草稿的id
* uid: 接收者的user id

curl -d "draftid=1&uid=10" -X POST  http://127.0.0.1:7001/draft/transferOwner


#### 用户搜索

* GET /user/search
* 响应状态码：200

* 参数 
* q : 搜索的字段：昵称或用户名

curl -X GET  http://127.0.0.1:7001/user/search?q=xiaotiandada

#### 购买商品


* POST /order/order
* 响应状态码：201

* 参数 
* signId : 文章id
* contract: 打赏货币的合约名
* symbol: 货币符号
* amount: 货币数量（ 无精度的，如1EOS，就传10000 ）
* platform: 平台 eos或ont
* referrer: 推荐人
* num: 商品数量

* 请求示例：
```
curl -d "num=10&signId=100418&contract=eosio.token&symbol=EOS&amount=1&platform=eos&referrer=65" -H "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJqb2V0b3RoZW1vb24iLCJleHAiOjE1NjE2MDQ4MjY2NjYsInBsYXRmb3JtIjoiZW9zIiwiaWQiOjE3MH0.Ph73nBjvsz-3Sj79JhotA-tGSYxXHkXyvTrRkH5xDo0" -X POST  http://localhost:7001/order/order/create
```
* 返回示例：
{
	"code": 0,
	"message": "成功",
	"data": {
		"orderId": 23
	}
}

购买流程: 

1. 前端调用后端的 order/create， 参数和打赏差不多，多了一个num（商品数量），成功后返回一个 orderid，
2. 拿到ordreid后， 转账给合约，格式就是 buy orderid 推荐人 , 比如（buy 1 xiaotiandada）
3. 后端验证了后，处理发货（现在留空了）
4. 修改order状态



#### 橙皮书人次统计

* GET /ads/statistics
* 响应状态码：200

```
{
  "code": 0,
  "message": "成功",
  "data": {
    "play_count": 1,
    "user_count": 1
  }
}

```

curl -X GET  http://localhost:7001/ads/statistics



#### 橙皮书 广告上传（最高出价者才能调用成功）

* POST /ads/submit
* 响应状态码：200

* 参数 （预留字段，没有的话可以不传）
* title : 广告标题
* url: 广告图片url
* link: 广告点击跳转链接
* content: 广告文案
* hash： (文章link的hash) 上传全局广告的话，hash不用传

```
{
  "code": 0,
  "message": "成功"
}

```

curl -d "title=牛逼" -H "x-access-token: xxxx" -X POST  http://localhost:7001/ads/submit



#### 橙皮书 广告获取

* GET /ads/ad
* 响应状态码：200

查询参数: hash (文章link的hash) ,获取全局广告的话，hash不用传


```
{
  "code": 0,
  "message": "成功",
  "data": {
    "title": "",
    "url": "",
    "link": "",
    "content": "",
    "username": "joetothemoon",
    "uid": 170
  }
}
```

curl -X GET  http://localhost:7001/ads/ad?hash=fa3225e28a5f785dcb816f1110fe231cb703954f7b4612abc5daf48d8d56b277


#### 文章搬运功能（need access token）

* POST /posts/importer
* 参数： 需要获取的页面URL， 带协议名称， 如
```
{
  "url": "https://www.chainnews.com/articles/133376386310.htm"
}
```
* 正常响应状态码：200
* 响应数据：文章的题目， 封面， 内容
```
{
    "code": 0,
    "message": "成功",
    "data": {
        "title": "慢雾：门罗币锁定转账攻击可锁定交易所 XMR 流动性，但不会导致资金损失",
        "cover": "/image/2019/08/13/565a7435db23af271289eb2350e2f11f.jpg",
        "content": "> 该攻击不会导致交易所任何资金损失，但是会锁定了交易所 XMR 流动性。\n\n**原文标题：《门罗币 (XMR) 锁定转账攻击细节分析》**  \n**作者：ISME@SlowMist team**\n\n近日据慢雾区情报显示，针对门罗币 (XMR) 转账锁定攻击在多个交易所出现，慢雾安全团队在收到情报第一时间进行分析跟进，本着负责任披露的原则我们第一时间在慢雾区进行了预警并为我们所服务的客户进行了及时的情报同步以及协助检测和修复。如有其他需要提供验证和检测服务欢迎联系慢雾安全团队。"
    }
}
```
### 积分系统

积分类型：
```
 pointTypes: {
    reading: 'reading', // 用户阅读
    beread: 'beread', // 读者的文章被阅读
    publish: 'publish', // 发布文章
    readingNew: 'reading_new', // 用户阅读新文章，额外获得的
    bereadNew: 'beread_new', // 读者的新文章被阅读，额外获得的
  }
```

#### 客户端打开文章后提交，表示开始阅读
* POST /posts/:id/reading
* 响应状态码：200
* 参数：无
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 阅读后点击推荐
* POST /posts/:id/like
* 响应状态码：200
* 参数：
```
{
  "time": 111
}
```
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 阅读后点击不推荐
* POST /posts/:id/dislike
* 响应状态码：200
* 参数：
```
{
  "time": 111
}
```
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 获取我的积分
* GET /user/points
* 响应状态码：200
* 参数：
```
?page=1&pagesize=10
```
* 返回值：
```
{
	"code": 0,
	"message": "成功",
	"data": {
		"amount": 26,
		"logs": [{
				"sign_id": 100531,
				"title": "占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页",
				"amount": 20,
				"create_time": "2019-08-14T06:41:33.000Z",
				…
			},
			{
				"sign_id": 100531,
				"title": "占据首页占据首页占据首页占据首页占据首页占据首页占据首页占据首页",
				"amount": 3,
				"create_time": "2019-08-13T09:08:52.000Z",
				…
			}
		]
	}
}
```

#### 获取任务状态
* GET /user/pointStatus
* 响应状态码：200
* 参数：无
* 请求头：x-access-token
* 返回值：
```
{
	"code": 0,
	"message": "成功",
	"data": {
		"amount": 592,
		"login": 1, //1已经领取登录积分，0未领取
		"profile": 1, //1已经领取完善资料积分，0未领取
		"read": {
			"today": 0,
			"max": 100
		},
		"publish": {
			"today": 0,
			"max": 20
		}
	}
}
```

#### 领取任务积分

* POST /user/claimTaskPoint
* 响应状态码：200
* 参数：
```
{
  "type": "login"，取值范围："login"表示领取登录积分，"profile"表示领取完善资料积分
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```


#### 赞赏提交交易hash

* POST /support/saveTxhash
* 响应状态码：200
* 参数：
```
{
	"supportId": 437619,
  "txhash": "0x111"
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```


#### 订单提交交易hash

* POST /order/saveTxhash
* 响应状态码：200
* 参数：
```
{
	"orderId": 437619,
  "txhash": "0x111"
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```


#### 积分评论
* POST /comment/comment
* 响应状态码： 200
* 参数：
```
{
  "signId": 100748,
  "comment": "sfdsfdsfdsf"
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 创建我的token
* POST /minetoken/create
* 响应状态码： 200
* 参数：
```
{
	"name": "chenhao token",
	"symbol": "CHT",
	"decimals": 1111
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 发行我的token
* POST /minetoken/mint
* 响应状态码： 200
* 参数：
```
{
	"amount": 100000
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 转移token
* POST /minetoken/transfer
* 响应状态码： 200
* 参数：
```
{
  "tokenId": 5,
	"to": 1049,
	"amount": 200
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 创建交易对，前提条件是先查到tokenId
* POST /exchange/create
* 响应状态码： 200
* 参数：
```
{
	"tokenId": 5
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 获取交易对信息，应该还会有调整
* GET /exchange/create?tokenId=5
* 响应状态码： 200
* 参数：无
* 请求头：x-access-token
* 返回值：
```
{
	"code": 0,
	"message": "成功",
	"data": {
		"id": 5,
		"token_id": 5,
		"total_supply": 15000,
		"create_time": "2019-09-19T03:36:48.000Z",
		"exchange_uid": 1050
	}
}
```

#### 获取token详情
* GET /token/detail
* 响应状态码： 200
* 参数：无
* 请求头：x-access-token
* 返回值：
```
// 用户发行了token，data为对象，没有发行token，data为null
{
    "code": 0,
    "message": "成功",
    "data": {
        "id": 10,
        "uid": 1042,
        "name": "zxplus",
        "symbol": "ZXT",
        "decimals": 20,
        "total_supply": 0,
        "create_time": "2019-09-24T07:28:50.000Z",
        "status": 1
    }
}
```

#### 获取token的持仓用户列表
* GET /token/userlist
* 响应状态码： 200
* 参数：page || 1, pagesize || 10
* 请求头：x-access-token
* 返回值：
```
{
    "code": 0,
    "message": "成功",
    "data": {
        "count": 1,
        "list": [
            {
                "id": 19,
                "uid": 1042,
                "token_id": "10",
                "amount": 100,
                "username": "shellteo@163.com",
                "email": "shellteo@163.com",
                "nickname": "zxppppp",
                "avatar": "/avatar/2019/08/08/19009c5b2c25f2a9a262fa9b309b44c6.png"
            }
        ]
    }
}
```

#### 获取用户的持仓token列表
* GET /token/tokenlist
* 响应状态码： 200
* 参数：page || 1, pagesize || 10
* 请求头：x-access-token
* 返回值：
```
{
    "code": 0,
    "message": "成功",
    "data": {
        "count": 1,
        "list": [
            {
                "id": 10,
                "uid": 1042,
                "token_id": "10",
                "amount": 100,
                "name": "zxplus",
                "symbol": "ZXT",
                "decimals": 20,
                "total_supply": 0,
                "create_time": "2019-09-24T07:28:50.000Z",
                "status": 1
            }
        ]
    }
}
```


#### token兑换token
* POST /exchange/tokenToTokenInput
* 响应状态码： 200
* 参数：
```
{
  "inTokenId": 8,
  "tokens_sold": 90,
  "min_tokens_bought": 80,
  "deadline": 1600000000,
  "recipient": 1048,
  "outTokenId": 12
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### token兑换cny
* POST /exchange/tokenToCnyInput
* 响应状态码： 200
* 参数：
```
{
  "tokenId": 8,
  "tokens_sold": 90,
  "min_cny": 95,
  "deadline": 1600000000,
  "recipient": 1048
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 移除流动性
* POST /exchange/removeLiquidity
* 响应状态码： 200
* 参数：
```
{
  "tokenId": 8,
  "amount": 9000,
  "min_cny": 8900,
  "min_tokens": 8900,
  "deadline": 1600000000
}
```
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
}
```

#### 增加文章持币阅读
* POST /post/addMineTokens
* 响应状态码： 200
* 参数：
```
{
	"signId": 100783,
	"tokens": [{
			"tokenId": 14,
			"amount": 100
		},
		{
			"tokenId": 15,
			"amount": 20
		}
	]
}
```
#### 买入粉丝币-流水明细
* GET /token/tokenflow
* 响应状态码： 200
* 参数：page || 1, pagesize || 10, tokenId
* 请求头：x-access-token
* 返回值：
```
{
    "code": 0,
    "message": "成功",
    "data": {
        "count": 1,
        "list": [
          {
            "id": 79,
            "uid": 1042,
            "token_id": 14,
            "cny_amount": 10000,
            "token_amount": 758573,
            "type": "buy_token_input",
            "trade_no": "i9T5PmF6Xnufe4z1lA3HNEwqrLY8ETq",
            "openid": "",
            "status": 9,
            "create_time": "2019-09-29T07:02:12.000Z",
            "pay_time": null,
            "ip": "112.118.225.21",
            "deadline": 1569740832,
            "min_liquidity": 0,
            "max_tokens": 0,
            "min_tokens": 750987,
            "recipient": 1042
          }
        ]
    }
}
```

#### 我的粉丝币-流水明细
* GET /token/usertokenflow
* 响应状态码： 200
* 参数：page || 1, pagesize || 10
* 请求头：x-access-token
* 返回值：
```
{
  "code": 0,
  "message": "成功"
    "code": 0,
    "message": "成功",
    "data": {
        "count": 1,
        "list": [
          {
            "id": 79,
            "uid": 1042,
            "token_id": 14,
            "cny_amount": 10000,
            "token_amount": 758573,
            "type": "buy_token_input",
            "trade_no": "i9T5PmF6Xnufe4z1lA3HNEwqrLY8ETq",
            "openid": "",
            "status": 9,
            "create_time": "2019-09-29T07:02:12.000Z",
            "pay_time": null,
            "ip": "112.118.225.21",
            "deadline": 1569740832,
            "min_liquidity": 0,
            "max_tokens": 0,
            "min_tokens": 750987,
            "recipient": 1042
          }
        ]
    }
}
```
