
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
  name varchar(255) NOT NULL,
  symbol varchar(255) NOT NULL,
  amount INT UNSIGNED DEFAULT 0, 
  decimals INT UNSIGNED DEFAULT 0, 
  platform varchar(255) NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE posts ADD COLUMN platform varchar(255) DEFAULT 'eos';
ALTER TABLE users ADD COLUMN platform varchar(255) DEFAULT 'eos';


create table supports (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  uid INT UNSIGNED NOT NULL,
  signid INT UNSIGNED NOT NULL,
  contract varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  symbol varchar(255) NOT NULL,
  amount INT UNSIGNED DEFAULT 0, 
  decimals INT UNSIGNED DEFAULT 0, 
  platform varchar(255) NOT NULL,
  status INT UNSIGNED DEFAULT 0, 
  PRIMARY KEY (id)
);