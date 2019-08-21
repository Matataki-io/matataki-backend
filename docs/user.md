# Users API 文档

### 全文搜索功能
- 路径：/users/search
- 请求方式： GET
- Header： 默认
- 请求参数：

| 参数名 | 类型 | 是否必须 | 说明 | 位置 |
|---|---|---|---|---|
| word | string | True | 搜索关键词 | Query |
| page | int | False | 页码 | Query |
| pagesize | int | False | 每页的条目数 | Query |

- 请求示例：

```
curl -X GET 'https://apitest.smartsignature.io/users/search?word=t&page=1&pagesize=10' 
```

- 返回示例：
```
{
    "code": 0,
    "message": "成功",
    "data": {
        "count": 1,
        "list": [
            {
                "id": 1047,
                "username": "guanchao71@<em>gmail</em>.com",
                "nickname": "00",
                "avatar": "/avatar/2019/08/09/5ce83d89b2052ea7e3128844be68025a.gif",
                "introduction": "woshipm"
            }
        ]
    }
}
```
