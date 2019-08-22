# Users API 文档

### 全文搜索功能
- 路径：/users/search
- 请求方式： GET
- Header： 

| 参数名 | 类型 | 是否必须 | 说明 |
|---|---|---|---|
| x-access-token | string | False | 用户的Token， 无则用户均显示未关注 |

- 请求参数：

| 参数名 | 类型 | 是否必须 | 说明 | 位置 |
|---|---|---|---|---|
| word | string | True | 搜索关键词 | Query |
| page | int | False | 页码 | Query |
| pagesize | int | False | 每页的条目数 | Query |

- 请求示例：

```
curl -X GET -H 'x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJsaW45Nzg4NDYwODBAZ21haWwuY29tIiwiZXhwIjoxNTY3MDUwMDYxMzkzLCJwbGF0Zm9ybSI6ImVtYWlsIiwiaWQiOjEwNDV9.heYvlv-NtjhNyv5kCRmli1jZv1FVygev_ypXQfEn5mM' 'https://apitest.smartsignature.io/users/search?word=t&page=1&pagesize=10' 
```

- 返回示例：
```
{
    "code": 0,
    "message": "成功",
    "data": {
        "count": 16,
        "list": [
            {
                "id": 1041,
                "username": "<em>1</em>@0.0",
                "platform": "email",
                "nickname": null,
                "avatar": null,
                "introduction": null,
                "fans": 0,
                "follows": 0,
                "is_follow": false,
                "is_fan": false
            }
        ]
    }
}
```
