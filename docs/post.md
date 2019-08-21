# Posts API 文档

### 全文搜索功能

- 路径： /posts/search
- 请求方式： GET
- Header： 默认
- 参数：
  
| 参数名 | 类型 | 是否必须 | 说明 | 位置 |
|---|---|---|---|---|
| word | string | True | 搜索关键词 | Query |
| channel | int | False | 文章的频道， 1为文章， 2为商品， 没有则为全部 | Query |
| page | int | False | 页码 | Query |
| pagesize | int | False | 每页的条目数 | Query |

- 请求示例：

```
curl -X GET 'https://apitest.smartsignature.io/posts/search?type=post&word=%E4%BB%B7%E5%80%BC&channel=1&page=1&pagesize=10'
```

- 返回示例：
```
{
    "code": 0,
    "message": "成功",
    "data": {
        "count": 51,
        "list": [
            {
                "id": 100683,
                "uid": 1055,
                "author": "AUD4eZPoqq5kTDxDUnnu3PLLpPFamTwyfn",
                "title": "美国大选华裔候选人杨安泽说了，数据比石油更有<em>价值</em>，但如何实现它？",
                "short_content": "这是当我们讨论数据所有权和数据<em>价值</em>时，第一件、或许也是最重要需要理解的事情：我们不能通过出售数据实现数据<em>价值</em>，只能通过出售数据结果实现数据<em>价值</em>。...,
                "hash": "QmNXih3LLpuJcKobS1gfbLWvQEQttmC95Cj1ncnoTGmKUs",
                "create_time": "2019-08-16T02:03:12.000Z",
                "cover": "/image/2019/08/16/5aae5c967bf99912d1f322c2104c5991.jpg",
                "nickname": null,
                "avatar": null,
                "read": 4,
                "eosvalue": 0,
                "ups": 0,
                "ontvalue": 0,
                "tags": [
                    {
                        "id": 2,
                        "name": "认真脑洞",
                        "type": "post"
                    }
                ],
                "sale": 0
            }
        ]
    }
}
```

