
create database ss;

use ss;

CREATE TABLE stream_keys(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner varchar(100),
  keystr varchar(100),
  keyhash varchar(100),
  price  INT UNSIGNED  DEFAULT 0,
  status INT UNSIGNED  DEFAULT 0, 
  PRIMARY KEY (id),
  UNIQUE (keystr)
);

insert into stream_keys values(null, "joe", 'key11111','aaaaaaa', 1234, 0);
insert into stream_keys values(null, "joe", 'key22222','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key33333','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key44444','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key55555','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key66666','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key77777','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key888888','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key99999','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "joe", 'key1111111','bbbbbbb', 1234, 0);

insert into stream_keys values(null, "xx", 'aaaaaaa','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'bbbbbbb','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'ccccccc','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'ddddddd','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'eeeeeee','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'fffffff','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'ggggggg','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'hhhhhhh','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'iiiiiii','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'jjjjjjj','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'kkkkkkk','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'lllllll','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'mmmmmmm','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'nnnnnnn','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'ooooooo','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'ppppppp','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'qqqqqqq','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'rrrrrrr','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'sssssss','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'ttttttt','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'uuuuuuu','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'vvvvvvv','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'wwwwwww','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'xxxxxxx','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'yyyyyyy','bbbbbbb', 1234, 0);
insert into stream_keys values(null, "xx", 'zzzzzzz','bbbbbbb', 1234, 0);

update stream_keys set status = 0;

select * from stream_keys  ;

-- eos账号和email

CREATE TABLE userinfo(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username varchar(100),
  mail varchar(100),
  PRIMARY KEY (id),
  UNIQUE (username)
);

insert into userinfo values(null, "gyztimzshage", "31647753@qq.com");
insert into userinfo values(null, "alibabaoneos", "misakamikoto110@gmail.com");
insert into userinfo values(null, "flyovergross", "my8560ex@gmail.com");
insert into userinfo values(null, "minakokojima", "lychees67@gmail.com");
insert into userinfo values(null, "acgrid121214", "acgrid@gmail.com");


select * from userinfo;
select * from userinfo  where username = "tengavinwood";




-- 新的egg-js服务项目表设计

users

. id
. username
. email
. register_time

eos_auths

 id | user_id | oauth_name | oauth_id | oauth_access_token | oauth_expires
----+---------+------------+----------+--------------------+---------------
 11 | A1      | weibo      | W-012345 | xxxxxxxxxx         | 604800
 12 | A2      | weibo      | W-234567 | xxxxxxxxxx         | 604800
 13 | A1      | qq         | Q-090807 | xxx-xxx-xxx        | 86400
 14 | A2      | qq         | Q-807060 | xxx-xxx-xxx        | 86400

  
-- 文章列表
CREATE TABLE posts(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username varchar(100), 
  author varchar(100), 
  title varchar(100),
  short_content varchar(255), 
  hash varchar(100), 
  sign varchar(255), 
  public_key varchar(100), 
  status INT UNSIGNED  DEFAULT 0, 
  onchain_status INT UNSIGNED  DEFAULT 0, 
  create_time timestamp,
  PRIMARY KEY (id),
  UNIQUE (hash)
);

ALTER TABLE posts ADD COLUMN fission_factor INT DEFAULT 2000;


drop table posts;


insert into posts values(null, "joetothemoon", "title test1111", "short_content111","hash 11111", "sign1111", "public_key1111", 0 , now());
insert into posts values(null, "joetothemoon", "title test1111", "short_content111","hash 11112", "sign1112", "public_key1111", 0 , now());
insert into posts values(null, "joetothemoon", "title test1111", "short_content111","hash 11113", "sign1113", "public_key1111", 0 , now());
insert into posts values(null, "joetothemoon", "title test1111", "short_content111","hash 11114", "sign1114", "public_key1111", 0 , now());
insert into posts values(null, "joetothemoon", "title test1111", "short_content111","hash 11115", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "tengavinwood", "title test1111", "short_content111","hash 11116", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "tengavinwood", "title test1111", "short_content111","hash 11117", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "tengavinwood", "title test1111", "short_content111","hash 11118", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "tengavinwood", "title test1111", "short_content111","hash 11119", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "tengavinwood", "title test1111", "short_content111","hash 111110", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "tengavinwood", "title test1111", "short_content111","hash 111111", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "tengavinwood", "title test1111", "short_content111","hash 1111112", "sign111", "public_key1111", 0 , now());


insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11111a", "sign1111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11112b", "sign1112", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11113c", "sign1113", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11114d", "sign1114", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11115e", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11116f", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11117g", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11118h", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 11119i", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 111110h", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 111111k", "sign111", "public_key1111", 0 , now());
insert into posts values(null, "minakokojima", "title test1111", "short_content111","hash 1111112l", "sign111", "public_key1111", 0 , now());


-- 支持（投票）
CREATE TABLE votes(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username varchar(100), 
  hash varchar(100), 
  money INT UNSIGNED  DEFAULT 0, 
  status INT UNSIGNED  DEFAULT 0, 
  create_time timestamp,
  PRIMARY KEY (id),
  UNIQUE (username, hash)
);

drop table votes;

-- 分享 (转发)
CREATE TABLE shares(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username varchar(100), 
  hash varchar(100), 
  status INT UNSIGNED  DEFAULT 0, 
  create_time timestamp,
  PRIMARY KEY (id),
  UNIQUE (username, hash)
);

-- follows (关注)
CREATE TABLE follows(
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username varchar(100), -- 用户
  followed varchar(100), -- 关注的人
  status tinyint(1)  DEFAULT 1,
  create_time timestamp,
  PRIMARY KEY (id),
  UNIQUE (username, followed)
);

insert into follows values(null, "tengavinwood", "joetothemoon", 1 , now());
insert into follows values(null, "joetothemoon", "tengavinwood", 1 , now());
insert into follows values(null, "joetothemoon", "111111", 1 , now());
insert into follows values(null, "joetothemoon", "222222", 1 , now());
insert into follows values(null, "joetothemoon", "333333", 1 , now());
insert into follows values(null, "111111", "joetothemoon", 1 , now());
insert into follows values(null, "222222", "joetothemoon", 1 , now());
insert into follows values(null, "333333", "joetothemoon", 1 , now());
insert into follows values(null, "444444", "joetothemoon", 1 , now());

select * from follows;

-- 获取某账号关注数 
select count(*) from follows where username = 'joetothemoon';

-- 获取某账号粉丝数 
select count(*) from follows where followed = 'joetothemoon';

drop table follows;


-- 文章被阅读次数统计 #51 https://github.com/smart-signature/smart-signature-future/issues/51
CREATE TABLE readers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reader varchar(100),
  sign_id INT UNSIGNED DEFAULT 0,
  hash varchar(100),
  create_time timestamp,
  PRIMARY KEY (id)
);

drop table  readers;
select count(*) as read_count from reads where hash = "xxxx"

-- 同步actions回来
CREATE TABLE actions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  act_account varchar(100),
  act_name varchar(100),
  act_data text,

  author varchar(100),
  memo varchar(100),
  amount INT  DEFAULT 0,
  sign_id INT UNSIGNED DEFAULT 0,
  
  type varchar(100),
  create_time timestamp,
  PRIMARY KEY (id)
);

drop table actions;


-- comments
CREATE TABLE comments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username varchar(100),  
  sign_id INT UNSIGNED DEFAULT 0,
  comment varchar(500),  
  create_time timestamp,
  PRIMARY KEY (id),
  UNIQUE (username, sign_id)
);

drop table comments;


-- 避免sign id 在正式和测试服中重复（修改测试服起始id为10010）
alter table posts AUTO_INCREMENT=100010;


-- add new column into users table
ALTER TABLE users ADD COLUMN nickname varchar(100) DEFAULT null;
ALTER TABLE users ADD COLUMN avatar varchar(255) DEFAULT null;
ALTER TABLE users ADD COLUMN create_time timestamp;

drop table edit_history;

CREATE TABLE edit_history (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sign_id INT UNSIGNED DEFAULT 0,
  hash varchar(100),
  title varchar(100),
  sign varchar(255), 
  cover varchar(255) DEFAULT null,
  public_key varchar(100), 
  create_time timestamp,
  PRIMARY KEY (id)
);

ALTER TABLE edit_history ADD COLUMN cover varchar(255) DEFAULT null;

ALTER TABLE posts ADD COLUMN cover varchar(255) DEFAULT null;

alter table users change mail email varchar(255) null;

ALTER TABLE readers ADD COLUMN sign_id INT UNSIGNED DEFAULT 0;

CREATE TABLE post_read_count (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id INT UNSIGNED DEFAULT 0,
  real_read_count INT UNSIGNED DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (post_id)
);

# 帐号系统 顶级uid ？（todo）
create table accounts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  create_time timestamp,
  PRIMARY KEY (id)
);

# 草稿箱
create table drafts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid INT UNSIGNED NOT NULL ,
  title varchar(255), 
  content text,
  status INT UNSIGNED  DEFAULT 0, 
  create_time timestamp,
  update_time timestamp,
  PRIMARY KEY (id)
);




ALTER TABLE drafts ADD COLUMN fission_factor INT DEFAULT 2000;
ALTER TABLE drafts ADD COLUMN cover varchar(255) DEFAULT null;


# 资产列表
create table assets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid INT UNSIGNED NOT NULL,
  contract varchar(255) NOT NULL,
  symbol varchar(255) NOT NULL,
  amount INT UNSIGNED DEFAULT 0, 
  decimals INT UNSIGNED DEFAULT 0, 
  platform varchar(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (uid, contract, symbol)
);

drop table assets;

ALTER TABLE posts ADD COLUMN platform varchar(255) DEFAULT null;
ALTER TABLE users ADD COLUMN platform varchar(255) DEFAULT null;


create table supports (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid INT UNSIGNED NOT NULL,
  signid INT UNSIGNED NOT NULL,
  contract varchar(255) NOT NULL,
  symbol varchar(255) NOT NULL,
  amount INT UNSIGNED DEFAULT 0, 
  platform varchar(255) NOT NULL,
  referreruid INT UNSIGNED DEFAULT 0, 
  status INT UNSIGNED DEFAULT 0, 
  create_time timestamp,
  PRIMARY KEY (id),
  UNIQUE (uid, signid)
);

## 资产log
create table assets_change_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid INT UNSIGNED NOT NULL,
  contract varchar(255) NOT NULL,
  symbol varchar(255) NOT NULL,
  amount INT DEFAULT 0, 
  signid INT UNSIGNED DEFAULT NULL,
  platform varchar(255) NOT NULL,
  type varchar(255) NOT NULL,
  create_time timestamp,
  PRIMARY KEY (id)
);

## 打赏额度
create table support_quota (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid INT UNSIGNED NOT NULL,
  signid INT UNSIGNED NOT NULL,
  contract varchar(255) NOT NULL,
  symbol varchar(255) NOT NULL,
  quota  INT UNSIGNED NOT NULL,
  create_time timestamp,
  PRIMARY KEY (id),
  UNIQUE (uid, signid, contract, symbol)
);


## drop useless tables
drop table constants;
drop table eos_auths;
drop table logs;
drop table shares;
drop table votes;
drop table ariticle;
drop table readers;


## 提现
create table withdraws (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid INT UNSIGNED NOT NULL,
  contract varchar(255) NOT NULL,
  symbol varchar(255) NOT NULL,
  amount INT DEFAULT 0, 
  platform varchar(255) NOT NULL,
  toaddress varchar(255) NOT NULL,    -- 提现地址
  memo varchar(255) DEFAULT "",       -- 提现备注
  status INT DEFAULT 0,               -- 0 待处理 1已转账待确认 2成功 3失败 4审核 5审核拒绝 6转账进行中
  trx varchar(255) NOT NULL,
  create_time timestamp,
  PRIMARY KEY (id)
);


ALTER TABLE assets_change_log ADD COLUMN toaddress varchar(255) DEFAULT "";
ALTER TABLE assets_change_log ADD COLUMN memo varchar(255) DEFAULT "";
ALTER TABLE assets_change_log ADD COLUMN status INT DEFAULT 2;
ALTER TABLE assets_change_log ADD COLUMN trx varchar(255) DEFAULT "";


---------- 06.02 数据库更新-----

drop index username on comments;
alter table comments drop key username;
alter table comments ADD COLUMN uid INT UNSIGNED;
-- 执行迁移脚本 修改 comments 的uid

alter table follows ADD COLUMN uid INT UNSIGNED;
alter table follows ADD COLUMN fuid INT UNSIGNED;
-- 执行迁移脚本 修改 follows 的 uid 和 fuid

alter table posts ADD COLUMN uid INT UNSIGNED;


create table tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  create_time timestamp,
  PRIMARY KEY (id)
);

create table post_tag (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sid INT UNSIGNED NOT NULL, -- sign id
  tid INT UNSIGNED NOT NULL,  -- tag id
  PRIMARY KEY (id),
  UNIQUE (sid, tid)
);

-- 记录转移操作日志
create table post_transfer_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  postid varchar(255) NOT NULL,
  fromuid INT UNSIGNED NOT NULL,  -- 原主人
  touid INT UNSIGNED NOT NULL,    -- 转移后的主人
  type varchar(255) NOT NULL,     -- 类型 post 或 draft
  create_time timestamp,
  PRIMARY KEY (id)
);

ALTER TABLE users ADD COLUMN accept tinyint(1)  DEFAULT 0; -- 是否接受转移

ALTER TABLE drafts ADD COLUMN tags varchar(255) DEFAULT "";

-- 修改字段的字符集
ALTER TABLE comments CHANGE `comment` `comment` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin; 
ALTER TABLE posts CHANGE `title` `title` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;  
ALTER TABLE users CHANGE `introduction` `introduction` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;  

-- 2019/06/14 sprint4-v2.2.0
-- 改username单unique为 username+platform双unique
DROP INDEX username ON users;

CREATE UNIQUE INDEX idx_users_username_platform ON users(username, platform);

insert into tags values (null, '大咖解说', NOW());
insert into tags values (null, '认真脑洞', NOW());
insert into tags values (null, '别地没有', NOW());
insert into tags values (null, '大声哔哔', NOW());
insert into tags values (null, '这是证据', NOW());

insert into tags values (null, '挖掘知识', NOW());
insert into tags values (null, '行业热点', NOW());
insert into tags values (null, '显摆显摆', NOW());
insert into tags values (null, '评测评测', NOW());

insert into tags values (null, '我看不行', NOW());
insert into tags values (null, '硬派技术', NOW());
insert into tags values (null, '智能签名', NOW());

-- 2019/06/18 spinrt5-v2.3.0
-- 增加字段: 是否是被推荐的文章/商品
ALTER TABLE posts ADD COLUMN is_recommend TINYINT(1) DEFAULT 0 COMMENT '是否是被推荐的商品,默认为0,不被推荐';

-- 增加字段: 商品的类别
ALTER TABLE posts ADD COLUMN category_id INT DEFAULT 0 COMMENT '商品的类别,默认为0无类别,只对商品文章有效';

-- 改阅读量列不为NULL
UPDATE post_read_count SET real_read_count = 0 WHERE real_read_count IS NULL;
ALTER TABLE post_read_count MODIFY real_read_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文章阅读统计';

-- 增加字段: 商品销量
ALTER TABLE post_read_count ADD COLUMN sale_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '商品销量统计,只对商品文章有效';

-- 增加字段: 文章赞赏次数统计
ALTER TABLE post_read_count ADD COLUMN support_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文章赞赏统计';

-- 增加字段: EOS以及ONT赞赏金额统计
ALTER TABLE post_read_count ADD COLUMN eos_value_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'EOS赞赏金额统计';

ALTER TABLE post_read_count ADD COLUMN ont_value_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'ONT赞赏金额统计';

-- 给所有没有统计数据的文章创建一条各项为0的数据
INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count)
SELECT p.id, 0, 0, 0, 0, 0 FROM posts p LEFT JOIN post_read_count c
ON c.post_id = p.id WHERE c.real_read_count IS NULL;

-- 同步销量数据到表
UPDATE post_read_count c INNER JOIN posts p
SET sale_count = (SELECT COUNT(*) AS counts FROM product_stock_keys s
WHERE s.sign_id = c.post_id AND s.status = 1)
WHERE p.channel_id = 2;

-- 同步文章赞赏数据到表, 主代码修正之后需要再次同步
UPDATE post_read_count c
SET c.support_count = (SELECT COUNT(*) AS counts FROM supports s 
WHERE s.signid = c.post_id AND s.status = 1);

-- 同步EOS和ONT赞赏金额到表, 主代码修正之后需要再次同步
UPDATE post_read_count c
SET c.eos_value_count = IFNULL((SELECT SUM(amount) AS sum FROM supports s
WHERE s.signid = c.post_id AND s.platform = 'eos' AND s.status = 1), 0);

UPDATE post_read_count c
SET c.ont_value_count = IFNULL((SELECT SUM(amount) AS sum FROM supports s
WHERE s.signid = c.post_id AND s.platform = 'ont' AND s.status = 1), 0);

-- 06.19 
-- 订单表： 记录 "谁" 从 "哪篇文章" 中买了多少商品，付款多少币（合约、符号、数量、平台）。
CREATE TABLE `orders`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `uid` int(10) UNSIGNED NOT NULL,
  `signid` int(10) UNSIGNED NOT NULL COMMENT 'posts.id',
  `referreruid` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '邀请人',
  `num` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '数量',
  `contract` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `symbol` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '总价',
  `price` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '单价',
  `decimals` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '精度',
  `platform` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT '状态：0未处理，1已验证已发货',
  `create_time` timestamp(0) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 53 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- 2019/06/24 spinrt5-v2.3.0
-- 修改关注表的unique index
DROP INDEX username ON follows;
CREATE UNIQUE INDEX idx_follows_uid_fuid ON follows(uid, fuid);

-- 橙皮书 action同步
create table orange_actions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  act_account varchar(100),
  act_name varchar(100),
  act_receiver varchar(100),
  act_data text,
  user varchar(100),
  amount varchar(100),
  create_time timestamp,
  PRIMARY KEY (id)
);


-- 处理comments 支持supports、orders
-- comments表增加字段
ALTER TABLE comments ADD COLUMN type INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '类型，1support，2order';
ALTER TABLE comments ADD COLUMN ref_id INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '关联对应表的id';

-- 处理赞赏/订单分开
-- 增加product_stock_keys.order_id字段
ALTER TABLE product_stock_keys ADD COLUMN order_id INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '订单id';
-- 处理历史数据
UPDATE product_stock_keys set order_id = support_id;
-- supports里的订单导入到orders
insert into orders(id,uid,signid,contract,symbol,amount,platform,referreruid,`status`,create_time,price,num,decimals) select id,uid,signid,contract,symbol,amount,platform,referreruid,`status`,create_time,amount,1,4 from supports where signid in (select id from posts where channel_id=2);
-- 删除supports里的订单
delete from supports where id in (select id from orders);

-- 更新comments.ref_id
-- 根据supports更新ref_id
update comments c 
INNER JOIN supports s on c.uid=s.uid and c.sign_id=s.signid
set ref_id = s.id, type=1;
-- 根据orders更新ref_id
update comments c 
INNER JOIN orders o on c.uid=o.uid and c.sign_id=o.signid
set ref_id = o.id, type=2;

-- 查询重复的数据，手动清理下
select type, ref_id,count(1) counts from comments group by type, ref_id having counts > 1;

-- 修正资产明细的资产类型数据
-- 赞赏人通过裂变获得的收入
update assets_change_log set type='fission_income' where type='share income';
-- 赞赏支出
update assets_change_log set type='support_expenses' where type='support expenses' and signid in (select id from posts where channel_id=1);
-- 购买支出
update assets_change_log set type='buy_expenses' where type='support expenses' and signid in (select id from posts where channel_id=2);
-- 文章作者被赞赏的收入
update assets_change_log set type='author_supported_income' where type='sign income' and signid in (select id from posts where channel_id=1);
-- 商品作者销售的收入
update assets_change_log set type='author_sale_income' where type='sign income' and signid in (select id from posts where channel_id=2);

-- 只为生产环境使用, 更新商品的category_id
UPDATE posts SET category_id = 1 WHERE id IN (527);
UPDATE posts SET category_id = 2 WHERE id IN (599, 600, 601, 611, 613, 622, 623, 624, 626);
UPDATE posts SET category_id = 3 WHERE id IN (557, 558, 559, 615);

-------------------- 

-- 2019.07.03 橙皮书 广告
create table ads (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid int(10) UNSIGNED NOT NULL,
  title varchar(255),
  url varchar(255),
  link varchar(255),
  content text,
  create_time timestamp,
  update_time timestamp,
  PRIMARY KEY (id)
);

-- user表增加 source 字段
ALTER TABLE users ADD COLUMN source varchar(255) DEFAULT "ss";

create table users_login_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid int(10) UNSIGNED NOT NULL,
  ip varchar(255),
  source varchar(255),
  login_time timestamp,
  PRIMARY KEY (id)
);


alter table tags ADD COLUMN type varchar(255) DEFAULT "post";

-- 标签：1.门票、2.游戏、3.数字资产、4.开发工具
-- 商品顺序：22222 21111 31144 43332

insert into tags values (101, '门票', NOW(), "product");
insert into tags values (102, '游戏', NOW(), "product");
insert into tags values (103, '数字资产', NOW(), "product");
insert into tags values (104, '开发工具', NOW(), "product");

-- 手动新增商品标签示例，生产环境 id 要改。

insert into post_tag values (null, 647, 102);
insert into post_tag values (null, 646, 102);
insert into post_tag values (null, 645, 102);
insert into post_tag values (null, 644, 102);
insert into post_tag values (null, 643, 102);

insert into post_tag values (null, 631, 102);
insert into post_tag values (null, 626, 101);
insert into post_tag values (null, 624, 101);
insert into post_tag values (null, 623, 101);
insert into post_tag values (null, 622, 101);

insert into post_tag values (null, 615, 103);
insert into post_tag values (null, 613, 101);
insert into post_tag values (null, 611, 101);
insert into post_tag values (null, 601, 104);
insert into post_tag values (null, 600, 104);

insert into post_tag values (null, 599, 104);
insert into post_tag values (null, 559, 103);
insert into post_tag values (null, 558, 103);
insert into post_tag values (null, 557, 103);
insert into post_tag values (null, 527, 102);



-- 7.16 --

-- 广告位
ALTER TABLE ads ADD COLUMN hash varchar(255) DEFAULT "";
CREATE UNIQUE INDEX idx_ads_hash ON ads(hash);


-- 2019/08/08 spinrt8-v2.6.0
-- 增加用户注册IP、最后登陆时间、密码的哈希
ALTER TABLE users ADD COLUMN reg_ip VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN last_login_time DATETIME NULL;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(64) NULL;

-- 2019/08/14 sprint8-v2.6.0
-- 增加文章溯源URL(计划已经撤销)
-- ALTER TABLE posts ADD COLUMN origin_url VARCHAR(255) NULL;
-- ALTER TABLE drafts ADD COLUMN origin_url VARCHAR(255) NULL;
-- ALTER TABLE edit_history ADD COLUMN origin_url VARCHAR(255) NULL;
CREATE TABLE assets_points
(
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid INT unsigned default 0 NOT NULL,
    amount INT unsigned default 0 NOT NULL,
    CONSTRAINT idx_assets_points_uid
    unique (uid)
);

CREATE TABLE assets_points_log
(
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid INT unsigned default 0 NOT NULL,
    sign_id INT(10) NOT NULL,
    amount INT unsigned NOT NULL,
    create_time TIMESTAMP NOT NULL,
    type VARCHAR(50) NOT NULL,
    ip VARCHAR(50) NULL
);

CREATE INDEX idx_assets_points_log_uid ON assets_points_log (uid);

CREATE INDEX idx_assets_points_log_uid_signId ON assets_points_log (uid, sign_id, type);

ALTER TABLE posts ADD COLUMN hot_score float(11, 2) DEFAULT 0.00 NULL;
CREATE INDEX idx_posts_hotscore ON posts (hot_score);

ALTER TABLE post_read_count ADD COLUMN likes INT UNSIGNED DEFAULT 0 NULL;
ALTER TABLE post_read_count ADD COLUMN dislikes INT UNSIGNED DEFAULT 0 NULL;

-- 2019/08/21 sprint9-v2.7.0
-- create table search_log
-- (
-- 	id int(16) auto_increment,
-- 	word varchar(50) null comment '搜索词',
-- 	create_time timestamp null comment '搜索时间',
-- 	user int(10) null comment '执行搜索的用户',
-- 	constraint search_log_pk
-- 		primary key (id)
-- );

-- create table search_count
-- (
-- 	id int(20) auto_increment,
-- 	word varchar(50) null comment '搜索词',
-- 	create_time timestamp null comment '创建时间',
-- 	update_time timestamp null comment '更新时间',
-- 	search_count int(10) null comment '搜索次数总计',
-- 	constraint search_count_pk
-- 		primary key (id)
-- );

-- create unique index search_count_word_uindex
-- 	on search_count (word);

-- 2019/08/21 sprint9-v2.7.0
-- 搜索功能

create table search_count
(
	id int(20) auto_increment,
	word varchar(50) null comment '搜索词',
	create_time timestamp null comment '创建时间',
	update_time timestamp null comment '更新时间',
	search_count int(10) null comment '搜索次数总计',
	search_area int(8) null comment '搜索区域， 1为文章区， 3为用户区',
	constraint search_count_pk
		primary key (id)
);
CREATE UNIQUE INDEX idx_word_search_area ON search_count(word, search_area);

alter table users	add is_recommend tinyint(1) default 0 null comment '是否是被推荐的用户';


-- 2019/8/30 sprint9 v2.7.1
-- 增加推荐人功能
ALTER TABLE users ADD COLUMN referral_uid INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_ip varchar(50) DEFAULT "";
-- 更新数据
UPDATE assets_points_log SET type='read_like' WHERE type='reading_like';
UPDATE assets_points_log SET type='read_dislike' WHERE type='reading_dislike';
UPDATE assets_points_log SET type='read_new' WHERE type='reading_new';


-- 2019/9/5 sprint10 v2.8.0
-- supports 增加交易txhash字段
-- orders 增加交易txhash字段
-- assets_points_log增加reading_duration阅读时长
-- 新增vnt定价
ALTER TABLE orders ADD COLUMN txhash varchar(255) NULL COMMENT '交易hash';
ALTER TABLE supports ADD COLUMN txhash varchar(255) NULL COMMENT '交易hash';
ALTER TABLE assets_points_log ADD COLUMN reading_time INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '阅读时长';

ALTER TABLE post_read_count ADD COLUMN vnt_value_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'VNT赞赏金额统计';

-- 2019/9/10 sprint10 v2.8.1
-- posts表增加评论需要支付的积分

-- assets_points_log表amount字段去掉无符号，长度改为11

-- orders表增加索引idx_orders_signId、idx_orders_uid
-- supports表增加索引idx_supports_signId、idx_supports_uid
-- assets_points_log表增加status字段

-- orders表amount字段去掉无符号，长度改为11
-- supports表amount字段去掉无符号，长度改为11

-- drafts 增加comment_pay_point字段

ALTER TABLE posts ADD COLUMN comment_pay_point INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '评论需要支付的积分';

CREATE INDEX idx_orders_signId ON orders (signid);
CREATE INDEX idx_orders_uid ON orders (uid);

CREATE INDEX idx_supports_signId ON supports (signid);
CREATE INDEX idx_supports_uid ON supports (uid);

ALTER TABLE assets_points_log ADD COLUMN status INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态，0无效，1有效';

ALTER TABLE drafts ADD COLUMN comment_pay_point INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '评论需要支付的积分';

UPDATE posts SET comment_pay_point=5 WHERE comment_pay_point=0;

-- 创建job
create event test1
on schedule every 1 day
starts  '2019-09-12 0:10:00'
on completion not preserve 
do 
insert into report_daily(date,create_time,num,type) 
select DATE_FORMAT(date_sub(now(), interval 1 day),'%Y-%m-%d'), now(), count, 'login' 
from (select count(1) as count from users_login_log where login_time > DATE_FORMAT(date_sub(now(), interval 1 day),'%Y-%m-%d') and login_time<DATE_FORMAT(now(),'%Y-%m-%d')) t;


-- 2019/9/10 sprint11 v2.9，粉丝币
新增表：
minetokens
exchanges
exchange_orders
exchange_balances
assets_minetokens
assets_minetokens_log

post_read_count.down 人工干预热门排序
posts.time_down 人工干预时间排序，越大越靠后
users.level，等级，控制谁可以发币

ALTER TABLE users ADD COLUMN level INT NOT NULL DEFAULT 0 COMMENT '等级';
ALTER TABLE users ADD COLUMN status INT NOT NULL DEFAULT 0 COMMENT '用户状态';
ALTER TABLE posts ADD COLUMN time_down INT NOT NULL DEFAULT 0;
ALTER TABLE post_read_count ADD COLUMN down INT NOT NULL DEFAULT 0;

修改assets表amount类型，int -> bigint，长度20
修改assets_change_log表amount类型，int -> bigint，长度20


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for minetokens
-- ----------------------------
DROP TABLE IF EXISTS `minetokens`;
CREATE TABLE `minetokens`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL COMMENT 'userId',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'token name',
  `symbol` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'token symbol',
  `decimals` int(11) UNSIGNED NOT NULL COMMENT '精度',
  `total_supply` bigint(20) NOT NULL COMMENT '总发行量',
  `create_time` timestamp(0) NOT NULL COMMENT '创建时间',
  `status` int(11) NOT NULL DEFAULT 0 COMMENT '状态：0不可用，1可用',
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_uid`(`uid`) USING BTREE,
  UNIQUE INDEX `idx_symbol`(`symbol`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for exchanges
-- ----------------------------
DROP TABLE IF EXISTS `exchanges`;
CREATE TABLE `exchanges`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token_id` int(10) UNSIGNED NOT NULL,
  `total_supply` bigint(20) NOT NULL COMMENT '以cny计价的总的流动性',
  `create_time` datetime(0) NOT NULL,
  `exchange_uid` int(10) UNSIGNED NOT NULL COMMENT '为exchange交易对虚拟一个uid',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_tokenid`(`token_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for exchange_orders
-- ----------------------------
DROP TABLE IF EXISTS `exchange_orders`;
CREATE TABLE `exchange_orders`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(10) UNSIGNED NOT NULL COMMENT '操作人',
  `token_id` int(10) UNSIGNED NOT NULL,
  `cny_amount` bigint(20) NOT NULL COMMENT 'todo：待修改',
  `token_amount` bigint(20) NOT NULL COMMENT 'todo：待修改',
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '类型：add，buy_token，sale_token',
  `trade_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '微信或支付宝的订单号',
  `openid` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '微信或支付宝的openId',
  `status` int(11) NOT NULL COMMENT '状态，0初始，3支付中，6支付成功，9处理完成',
  `create_time` timestamp(0) NOT NULL,
  `pay_time` timestamp(0) NULL DEFAULT NULL COMMENT '支付成功的时间',
  `ip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `deadline` int(11) NOT NULL COMMENT '超时时间',
  `min_liquidity` bigint(20) NOT NULL COMMENT '做市商份额的最小值',
  `max_tokens` bigint(20) NOT NULL COMMENT '需要的token最大值',
  `min_tokens` bigint(20) NOT NULL DEFAULT 0 COMMENT '页面显示的可以购买token的最小值',
  `recipient` int(11) NOT NULL DEFAULT 0 COMMENT '接收者地址，默认填写操作人uid',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 89 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for exchange_balances
-- ----------------------------
DROP TABLE IF EXISTS `exchange_balances`;
CREATE TABLE `exchange_balances`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(10) UNSIGNED NOT NULL,
  `token_id` int(10) UNSIGNED NOT NULL,
  `liquidity_balance` bigint(20) NOT NULL COMMENT '以人民币计算的流动性份额',
  `create_time` timestamp(0) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_uid_tokenid`(`uid`, `token_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin COMMENT = '流动性池提供者的份额' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for assets_minetokens_log
-- ----------------------------
DROP TABLE IF EXISTS `assets_minetokens_log`;
CREATE TABLE `assets_minetokens_log`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_uid` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'from',
  `to_uid` int(10) NOT NULL DEFAULT 0 COMMENT 'to',
  `token_id` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `amount` bigint(20) UNSIGNED NOT NULL COMMENT '数量',
  `create_time` timestamp(0) NOT NULL,
  `ip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 146 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for assets_minetokens
-- ----------------------------
DROP TABLE IF EXISTS `assets_minetokens`;
CREATE TABLE `assets_minetokens`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `uid` int(10) UNSIGNED NOT NULL COMMENT '用户id',
  `token_id` int(10) UNSIGNED NOT NULL,
  `amount` bigint(20) UNSIGNED NOT NULL DEFAULT 0 COMMENT '数量',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_uid_tokenid`(`uid`, `token_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 149 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


-- 2019/10/10 sprint11 v2.10，持币阅读
新增表：
post_minetokens
exchange_purchase_logs
exchange_liquidity_logs

新增列：
assets_minetokens_log.type
posts.require_holdtokens

索引：
posts.uid

修改字段：
-- assets_minetokens_log.amount 去掉无符号


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for exchange_purchase_logs
-- ----------------------------
DROP TABLE IF EXISTS `exchange_purchase_logs`;
CREATE TABLE `exchange_purchase_logs`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `buyer` int(11) NOT NULL COMMENT '购买人',
  `sold_token_id` int(11) NOT NULL COMMENT '卖掉的tokenId',
  `sold_amount` bigint(20) NOT NULL COMMENT '卖掉的数量',
  `bought_token_id` int(11) NOT NULL COMMENT '购买的tokenId',
  `bought_amount` bigint(20) NOT NULL COMMENT '购买的数量',
  `recipient` int(11) NOT NULL COMMENT '接收人',
  `create_time` timestamp(0) NOT NULL COMMENT '创建时间',
  `ip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT 'IP',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for exchange_liquidity_logs
-- ----------------------------
DROP TABLE IF EXISTS `exchange_liquidity_logs`;
CREATE TABLE `exchange_liquidity_logs`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `token_id` int(11) NOT NULL,
  `cny_amount` bigint(20) NOT NULL,
  `token_amount` bigint(20) NOT NULL,
  `liquidity` bigint(20) NOT NULL,
  `create_time` timestamp(0) NOT NULL,
  `ip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for post_minetokens
-- ----------------------------
DROP TABLE IF EXISTS `post_minetokens`;
CREATE TABLE `post_minetokens`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sign_id` int(11) NOT NULL,
  `token_id` int(11) NOT NULL,
  `amount` bigint(20) NOT NULL,
  `create_time` timestamp(0) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 47 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;


ALTER TABLE assets_minetokens_log ADD COLUMN type varchar(50) NULL default '';

ALTER TABLE posts ADD COLUMN require_holdtokens tinyint(1) NOT NULL default 0 comment '是否需要持币阅读';

CREATE INDEX idx_uid ON posts (uid);



-- 2019-10-22 sprint13 
exchange_purchase_logs.buyer -> uid