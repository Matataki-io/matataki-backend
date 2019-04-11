### API docs

#### 发布文章

* POST /publish
* 响应状态码：200

* curl -d "author=tengavinwood&title=xxxxx&publickey=EOS8QP2Z6tApaUYPEC6hm9f1pZrSEMmZ7n5SsvjzA3VTnRXUyra9E&hash=QmNzMrW3J7eY6KPqXd3TLwr2Y31iga2QowzrhUPJYk2mcy&sign=SIG_K1_KZU9PyXP8YAePjCfCcmBjGHARkvTVDjKpKvVgS6XL8o2FXTXUdhP3rqrL38dJYgJo2WNBdYubsY9LKTo47RUUE4N3ZHjZQ" -X POST https://api.smartsignature.io/publish


#### 获取文章列表

* GET /posts

* 参数 
* page: 页数，默认第一页
* author: 作者，默认返回全部author的文章，传入author参数，则只返回指定author的文章。

* curl -X GET https://api.smartsignature.io/posts
* curl -X GET https://api.smartsignature.io/posts?page=2
* curl -X GET https://api.smartsignature.io/posts?author=minakokojima


#### 获取用户信息 
    
新增, 返回fans数和follow数 ,is_follow 是否关注， nickname 昵称, avatar, 头像的ipfs hash

* GET /user/:username
* 响应状态码：200
* 响应体：

```
{"username":"minakokojima", "username":"minanick" "avatar": "QmPFvWoRsaTqtS5i4YcAqLBca5aVvuxTNe95Ncnd7dssUT","follows":4,"fans":5, is_follow: false }

```

请求示例: 

* curl -X GET https://api.smartsignature.io/user/minakokojima

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
 

#### 关注

* POST /follow
* 响应状态码：200

参数：
* username: 当前用户
* followed: 关注的用户

请求示例: 
* curl -d "username=joetothemoon&followed=minakokojima" -X POST https://api.smartsignature.io/follow

#### 取消关注

* POST /unfollow
* 响应状态码：200

参数：
* username: 当前用户
* followed: 关注的用户

请求示例: 
* curl -d "username=joetothemoon&followed=minakokojima" -X POST https://api.smartsignature.io/unfollow


#### Auth (请求获取 access token)

* POST /auth
* 响应状态码：200

参数：
* username: 用户
* publickey: 用户签名用的公钥
* sign: 签名

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
  // const url = `${apiServer}/auth`;
  const url = `http://localhost:7001/auth`;
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
    // uri: "http://localhost:7001/follow",
    uri: "http://localhost:7001/unfollow",
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


#### 获取支持过的文章列表

* GET /supports

* 参数 :
* page: 页数，默认第一页
* user: 指定用户

获取支持过的文章列表，支持使用user进行筛选。

请求示例: 
* curl -X GET https://api.smartsignature.io/supports?user=flyovergross



#### 获取粉丝列表

* GET /follows

* 参数 :
* page: 页数，默认第一页
* user: 指定用户

ps: 如果有传 access token, 服务端会检索 access token所属用户，是否已经关注了 列表中的人 ， 字段 is_follow 

根据 is_follow， 去表示UI界面上 “关注” 按钮的状态。

请求示例: 
curl https://api.smartsignature.io/follows?user=xiaotiandada | jq

```
[
  {
    "followed": "linklinkguan",
    "is_follow": true
  },
  {
    "followed": "shellteo2345",
    "is_follow": false
  },
  {
    "followed": "ygllxjgotodo",
    "is_follow": false
  },
  {
    "followed": "eoseoteoteot",
    "is_follow": false
  },
  {
    "followed": "flyovergross",
    "is_follow": false
  }
]

```

#### 获取关注列表

* GET /fans

* 参数 :
* page: 页数，默认第一页
* user: 指定用户

ps: 如果有传 access token, 服务端会检索 access token所属用户，是否已经关注了 列表中的人 ， 字段 is_follow 
根据 is_follow， 去表示UI界面上 “关注” 按钮的状态。

请求示例: 
curl https://api.smartsignature.io/fans?user=xiaotiandada | jq


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

#### 获取打赏次数排行榜

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


#### 获取打赏金额排行榜

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
  "id": 123,
  "username": null,
  "author": "cryptobuffff",
  "title": "我是一个粉刷匠",
  "short_content": null,
  "hash": "QmUkEM3FKU1mvBSKfZLMWubBZMnnmNMp5No8DoWTrUZ8vX",
  "sign": "SIG_K1_K9gV2aPKUoYX53C9bbXPKs1ZhH5jkmPTLqM3eygRcDeGbJkZgbk5de4UESSowpPUB3KXq9GLZn66kyLqobTVZPQBi5pZ2k",
  "public_key": "EOS89Q5D3pDAn4UeLqhtX8ZoDWKNTmiYewPQk4CmQTdj81BuTe9es",
  "status": 0,
  "onchain_status": 1,
  "create_time": "2019-03-21T12:35:29.000Z",
  "fission_factor": 2000,
  "read": 0,
  "ups": 0,
  "value": 0
}

```


#### 上传图像到ipfs服务器

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

#### 展示上传的图片

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


#### 删除文章(隐藏) (need access_token)

* DELETE /post/:id
* 响应状态码：200

请求示例: 

* curl  -H "x-access-token: access-token"  -X DELETE https://api.smartsignature.io/post/100010