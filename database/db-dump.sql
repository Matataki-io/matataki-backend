-- MySQL dump 10.13  Distrib 5.7.42, for Linux (x86_64)
--
-- Host: localhost    Database: ss
-- ------------------------------------------------------
-- Server version	5.7.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_admin_action_logs`
--

DROP TABLE IF EXISTS `_admin_action_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_admin_action_logs` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) unsigned NOT NULL,
  `data` text COLLATE utf8mb4_bin NOT NULL,
  `timestamp` double(14,0) NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '日志类型',
  `source` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '日志来源模块',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=773 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_admin_user`
--

DROP TABLE IF EXISTS `_admin_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_admin_user` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8mb4 NOT NULL DEFAULT '' COMMENT '用户名',
  `nickname` varchar(255) CHARACTER SET utf8mb4 NOT NULL DEFAULT '' COMMENT '昵称',
  `wallet` char(42) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL COMMENT '以太坊钱包',
  `password` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '' COMMENT '使用SHA256 in HEX',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_governance_action_logs`
--

DROP TABLE IF EXISTS `_governance_action_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_governance_action_logs` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) unsigned NOT NULL COMMENT '用户UID',
  `data` text COLLATE utf8mb4_bin NOT NULL,
  `timestamp` double(14,0) NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '日志类型',
  `source` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '日志来源模块',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `account_hosting`
--

DROP TABLE IF EXISTS `account_hosting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_hosting` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL COMMENT '用户id',
  `public_key` varchar(255) NOT NULL COMMENT '公钥',
  `private_key` varchar(255) NOT NULL COMMENT '私钥',
  `blockchain` varchar(20) DEFAULT 'ETH' COMMENT '所属区块链',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `nonce` int(10) unsigned NOT NULL DEFAULT '99999',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13795 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `actions`
--

DROP TABLE IF EXISTS `actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `actions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `act_account` varchar(100) DEFAULT NULL,
  `act_name` varchar(100) DEFAULT NULL,
  `act_data` text,
  `author` varchar(100) DEFAULT NULL,
  `memo` varchar(100) DEFAULT NULL,
  `amount` int(11) DEFAULT '0',
  `sign_id` int(10) unsigned DEFAULT '0',
  `type` varchar(100) DEFAULT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sign_id` (`sign_id`),
  KEY `type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=4316 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ads`
--

DROP TABLE IF EXISTS `ads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ads` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL,
  `content` text,
  `create_time` timestamp NULL DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL,
  `hash` varchar(255) DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ads_hash` (`hash`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `announcement`
--

DROP TABLE IF EXISTS `announcement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `announcement` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sender` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '发送者（后台管理员的账号',
  `title` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '标题',
  `content` varchar(1000) COLLATE utf8mb4_bin NOT NULL COMMENT '内容',
  `inform_instant` tinyint(1) unsigned NOT NULL DEFAULT '1' COMMENT '即时通知',
  `inform_new_user` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '新用户通知',
  `expire_time` datetime DEFAULT NULL COMMENT '失效时间。\r\n用于新用户通知，失效时间后注册的用户不会收到通知',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=13488 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `contract` varchar(255) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `amount` bigint(20) unsigned DEFAULT '0',
  `decimals` int(10) unsigned DEFAULT '0',
  `platform` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uid` (`uid`,`contract`,`symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=38264 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets_change_log`
--

DROP TABLE IF EXISTS `assets_change_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets_change_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `contract` varchar(255) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `amount` bigint(20) DEFAULT '0',
  `signid` int(10) unsigned DEFAULT NULL,
  `platform` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  `toaddress` varchar(255) DEFAULT '',
  `memo` varchar(255) DEFAULT '',
  `status` int(11) DEFAULT '2',
  `trx` varchar(255) DEFAULT '',
  `object_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=77992 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets_minetokens`
--

DROP TABLE IF EXISTS `assets_minetokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets_minetokens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL COMMENT '用户id',
  `token_id` int(10) unsigned NOT NULL,
  `amount` bigint(20) unsigned NOT NULL DEFAULT '0' COMMENT '数量',
  `memo` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '转账备注',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_uid_tokenid` (`uid`,`token_id`) USING BTREE,
  KEY `idx_token_id_amount` (`token_id`,`amount`)
) ENGINE=InnoDB AUTO_INCREMENT=23960 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets_minetokens_log`
--

DROP TABLE IF EXISTS `assets_minetokens_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets_minetokens_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_uid` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'from',
  `to_uid` int(10) NOT NULL DEFAULT '0' COMMENT 'to',
  `token_id` int(10) unsigned NOT NULL DEFAULT '0',
  `amount` bigint(20) unsigned NOT NULL COMMENT '数量',
  `memo` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '转账备注',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ip` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_bin DEFAULT '',
  `tx_hash` varchar(256) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '同步到链上的哈希',
  `on_chain_tx_status` int(2) DEFAULT '0' COMMENT '0待查询, 1 成功, -1 失败',
  `post_id` int(10) unsigned DEFAULT NULL COMMENT '打赏的文章id',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=24296 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets_points`
--

DROP TABLE IF EXISTS `assets_points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets_points` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `amount` int(10) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_assets_points_uid` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=24636 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets_points_log`
--

DROP TABLE IF EXISTS `assets_points_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets_points_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL DEFAULT '0',
  `sign_id` int(10) NOT NULL,
  `amount` int(11) NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `type` varchar(50) NOT NULL,
  `ip` varchar(50) DEFAULT NULL,
  `reading_time` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '阅读时长',
  `status` int(10) unsigned NOT NULL DEFAULT '1' COMMENT '状态，0无效，1有效',
  PRIMARY KEY (`id`),
  KEY `idx_assets_points_log_uid` (`uid`),
  KEY `idx_assets_points_log_uid_signId` (`uid`,`sign_id`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=28216 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) DEFAULT NULL,
  `sign_id` int(10) unsigned DEFAULT '0',
  `comment` varchar(3000) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '评论内容 500 上限，但是包含Html所以暂时放大为3000',
  `create_time` timestamp NULL DEFAULT NULL,
  `uid` int(10) unsigned DEFAULT NULL,
  `type` int(10) unsigned NOT NULL DEFAULT '1' COMMENT '类型，1support，2order',
  `ref_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '关联对应表的id',
  `parents_id` int(10) unsigned DEFAULT NULL COMMENT '所在顶层评论的id',
  `like_num` int(10) unsigned DEFAULT '0' COMMENT '点赞数',
  `reply_id` int(10) unsigned DEFAULT NULL COMMENT '回复评论的id',
  `reply_uid` int(10) unsigned DEFAULT NULL COMMENT '回复评论的用户id',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12314 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `direct_trade_log`
--

DROP TABLE IF EXISTS `direct_trade_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `direct_trade_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `market_id` int(10) unsigned NOT NULL COMMENT '市场ID',
  `uid` int(10) unsigned NOT NULL COMMENT '购买用户ID',
  `token_id` int(10) unsigned NOT NULL COMMENT 'token_id',
  `price` int(10) unsigned NOT NULL COMMENT '交易价格',
  `amount` bigint(20) unsigned DEFAULT NULL COMMENT '交易量',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '购买时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `direct_trade_market`
--

DROP TABLE IF EXISTS `direct_trade_market`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `direct_trade_market` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL COMMENT '所属的用户id',
  `token_id` int(10) unsigned NOT NULL COMMENT 'token_id',
  `market` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '交易市场',
  `price` int(10) unsigned NOT NULL COMMENT '价格',
  `amount` bigint(20) unsigned DEFAULT NULL COMMENT '总量',
  `exchange_uid` int(10) unsigned NOT NULL COMMENT '为exchange交易对虚拟一个uid',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '更新时间',
  `status` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否启用',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `draft_edit_minetokens`
--

DROP TABLE IF EXISTS `draft_edit_minetokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `draft_edit_minetokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `draft_id` int(11) NOT NULL COMMENT '草稿 id',
  `token_id` int(11) NOT NULL COMMENT '编辑 token id',
  `amount` bigint(20) NOT NULL COMMENT '编辑 token 数量',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1882 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `draft_minetokens`
--

DROP TABLE IF EXISTS `draft_minetokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `draft_minetokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `draft_id` int(11) NOT NULL COMMENT '草稿 id',
  `token_id` int(11) NOT NULL COMMENT '阅读 token id',
  `amount` bigint(20) NOT NULL COMMENT '阅读 token 数量',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3178 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `draft_prices`
--

DROP TABLE IF EXISTS `draft_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `draft_prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `draft_id` int(11) NOT NULL COMMENT '草稿 id',
  `token_id` int(11) NOT NULL COMMENT '支付 Id (0 目前是RMB)',
  `amount` bigint(20) NOT NULL COMMENT '支付数量',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drafts`
--

DROP TABLE IF EXISTS `drafts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drafts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` mediumtext,
  `status` int(10) unsigned DEFAULT '0',
  `create_time` timestamp NULL DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL,
  `fission_factor` int(11) DEFAULT '2000',
  `cover` varchar(255) DEFAULT NULL,
  `is_original` int(1) NOT NULL DEFAULT '0',
  `tags` varchar(255) DEFAULT '',
  `comment_pay_point` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '评论需要支付的积分',
  `short_content` varchar(300) DEFAULT NULL COMMENT '短摘要',
  `cc_license` varchar(255) DEFAULT NULL COMMENT '文章的授权许可协议',
  `require_holdtokens` tinyint(1) NOT NULL COMMENT '是否需要持币阅读',
  `require_buy` tinyint(1) NOT NULL COMMENT '是否需要购买阅读',
  `editor_require_holdtokens` tinyint(1) NOT NULL COMMENT '是否可以持币编辑',
  `ipfs_hide` tinyint(1) NOT NULL COMMENT '是否隐藏IPFS哈希和历史记录',
  `assosiate_with` int(255) DEFAULT NULL COMMENT '关联 Fan 票的 Id',
  PRIMARY KEY (`id`),
  KEY `idx_uid_update_time` (`uid`,`update_time`)
) ENGINE=InnoDB AUTO_INCREMENT=17737 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drafts_copy1`
--

DROP TABLE IF EXISTS `drafts_copy1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drafts_copy1` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text,
  `status` int(10) unsigned DEFAULT '0',
  `create_time` timestamp NULL DEFAULT NULL,
  `update_time` timestamp NULL DEFAULT NULL,
  `fission_factor` int(11) DEFAULT '2000',
  `cover` varchar(255) DEFAULT NULL,
  `is_original` int(1) NOT NULL DEFAULT '0',
  `tags` varchar(255) DEFAULT '',
  `comment_pay_point` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '评论需要支付的积分',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=312 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dynamic_media`
--

DROP TABLE IF EXISTS `dynamic_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dynamic_media` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(10) unsigned NOT NULL COMMENT '文章 ID',
  `type` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '文件类型',
  `url` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '资源地址',
  `width` int(10) unsigned DEFAULT NULL COMMENT '宽度',
  `high` int(10) unsigned DEFAULT NULL COMMENT '高度',
  `duration` int(10) unsigned DEFAULT NULL COMMENT '时长',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `edit_history`
--

DROP TABLE IF EXISTS `edit_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `edit_history` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sign_id` int(10) unsigned DEFAULT '0',
  `hash` varchar(100) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `sign` varchar(255) DEFAULT NULL,
  `cover` varchar(255) DEFAULT NULL,
  `public_key` varchar(100) DEFAULT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  `is_original` int(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4763 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `edit_minetokens`
--

DROP TABLE IF EXISTS `edit_minetokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `edit_minetokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sign_id` int(11) NOT NULL,
  `token_id` int(11) NOT NULL,
  `amount` bigint(20) NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=722 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exchange_balances`
--

DROP TABLE IF EXISTS `exchange_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_balances` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `token_id` int(10) unsigned NOT NULL,
  `liquidity_balance` bigint(20) NOT NULL COMMENT '以人民币计算的流动性份额',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_uid_tokenid` (`uid`,`token_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=505 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC COMMENT='流动性池提供者的份额';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exchange_liquidity_logs`
--

DROP TABLE IF EXISTS `exchange_liquidity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_liquidity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `token_id` int(11) NOT NULL,
  `cny_amount` bigint(20) NOT NULL,
  `token_amount` bigint(20) NOT NULL,
  `liquidity` bigint(20) NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ip` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_token_id_create_time` (`token_id`,`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=656 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exchange_orders`
--

DROP TABLE IF EXISTS `exchange_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL COMMENT '操作人',
  `token_id` int(10) unsigned NOT NULL,
  `pay_cny_amount` bigint(20) NOT NULL DEFAULT '0' COMMENT '实际支付的金额',
  `cny_amount` bigint(20) NOT NULL COMMENT 'todo：待修改',
  `token_amount` bigint(20) NOT NULL COMMENT 'todo：待修改',
  `type` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT '类型：add，buy_token_input，buy_token_output',
  `trade_no` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '微信或支付宝的订单号',
  `openid` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '微信或支付宝的openId',
  `status` int(11) NOT NULL COMMENT '状态，0初始，3支付中，6支付成功，9处理完成',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pay_time` timestamp NULL DEFAULT NULL COMMENT '支付成功的时间',
  `ip` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL,
  `deadline` int(11) NOT NULL COMMENT '超时时间',
  `min_liquidity` bigint(20) NOT NULL COMMENT '做市商份额的最小值',
  `max_tokens` bigint(20) NOT NULL COMMENT '需要的token最大值',
  `min_tokens` bigint(20) NOT NULL DEFAULT '0' COMMENT '页面显示的可以购买token的最小值',
  `recipient` int(11) NOT NULL DEFAULT '0' COMMENT '接收者地址，默认填写操作人uid',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=7370 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exchange_purchase_logs`
--

DROP TABLE IF EXISTS `exchange_purchase_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchange_purchase_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL COMMENT '购买人',
  `sold_token_id` int(11) NOT NULL COMMENT '卖出的tokenId，0表示cny',
  `sold_amount` bigint(20) NOT NULL COMMENT '卖出的数量',
  `bought_token_id` int(11) NOT NULL COMMENT '买入的tokenId，0表示cny',
  `bought_amount` bigint(20) NOT NULL COMMENT '买入的数量',
  `recipient` int(11) NOT NULL COMMENT '接收人',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  `ip` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'IP',
  `cny_reserve_before` bigint(20) NOT NULL DEFAULT '0' COMMENT '交易前CNY流动性余额',
  `token_reserve_before` bigint(20) NOT NULL DEFAULT '0' COMMENT '交易前Token流动性余额',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5817 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exchanges`
--

DROP TABLE IF EXISTS `exchanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `exchanges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token_id` int(10) unsigned NOT NULL,
  `total_supply` bigint(20) NOT NULL COMMENT '以cny计价的总的流动性',
  `create_time` datetime NOT NULL,
  `exchange_uid` int(10) unsigned NOT NULL COMMENT '为exchange交易对虚拟一个uid',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_tokenid` (`token_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `favorites`
--

DROP TABLE IF EXISTS `favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `favorites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL COMMENT 'user id',
  `name` varchar(20) COLLATE utf8mb4_bin NOT NULL,
  `brief` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL,
  `status` int(11) NOT NULL COMMENT '0 公开 1 私有 3...',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=336 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `favorites_list`
--

DROP TABLE IF EXISTS `favorites_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `favorites_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fid` int(11) NOT NULL COMMENT '收藏夹 ID',
  `pid` int(11) NOT NULL COMMENT '文章 ID',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1046 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `follows`
--

DROP TABLE IF EXISTS `follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `follows` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) DEFAULT NULL,
  `followed` varchar(100) DEFAULT NULL,
  `status` tinyint(1) DEFAULT '1',
  `create_time` timestamp NULL DEFAULT NULL,
  `uid` int(10) unsigned DEFAULT NULL,
  `fuid` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_follows_uid_fuid` (`uid`,`fuid`),
  KEY `idx_follows_uid_status` (`uid`,`status`),
  KEY `idx_follows_fuid_status` (`fuid`,`status`),
  KEY `idx_follows_fuid_status_create_time` (`fuid`,`status`,`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=30207 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `github`
--

DROP TABLE IF EXISTS `github`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `github` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL COMMENT '用户id',
  `access_token` varchar(255) NOT NULL COMMENT 'GitHub Access token',
  `article_repo` varchar(255) DEFAULT 'matataki-save',
  `site_status` int(11) DEFAULT '0' COMMENT '子站创建状态。0：没有创建，1：已经创建',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=315 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minetoken_collaborators`
--

DROP TABLE IF EXISTS `minetoken_collaborators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minetoken_collaborators` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `create_time` datetime NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minetoken_resources`
--

DROP TABLE IF EXISTS `minetoken_resources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minetoken_resources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token_id` int(11) NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `content` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  `name` varchar(20) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '【可选】名称',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3893 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minetoken_tags`
--

DROP TABLE IF EXISTS `minetoken_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minetoken_tags` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `token_id` int(10) unsigned NOT NULL,
  `tag` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=754 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minetokens`
--

DROP TABLE IF EXISTS `minetokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minetokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL COMMENT 'userId',
  `name` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'token name',
  `symbol` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT 'token symbol',
  `decimals` int(11) unsigned NOT NULL COMMENT '精度',
  `total_supply` bigint(20) NOT NULL COMMENT '总发行量',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '状态：0不可用，1可用',
  `logo` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `brief` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '简介',
  `introduction` varchar(1000) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '介绍',
  `contract_address` char(42) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '以太坊饭票合约地址',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_uid` (`uid`) USING BTREE,
  UNIQUE KEY `idx_symbol` (`symbol`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=322 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minetokens_application`
--

DROP TABLE IF EXISTS `minetokens_application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minetokens_application` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL COMMENT 'user id',
  `logo` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '名称',
  `symbol` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '缩写',
  `brief` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '拒绝原因',
  `tag` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '标签',
  `decimals` int(11) NOT NULL COMMENT '精度',
  `total_supply` bigint(20) NOT NULL COMMENT '总发行量',
  `status` int(11) NOT NULL COMMENT '状态 0 申请成功 1 申请未提交 2 申请中 3申请失败',
  `reason` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '拒绝原因',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3388 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minetokens_application_queue`
--

DROP TABLE IF EXISTS `minetokens_application_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minetokens_application_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `application_id` int(11) NOT NULL COMMENT '申请列表 id',
  `uid` int(11) NOT NULL COMMENT 'user id',
  `token_id` int(11) DEFAULT NULL COMMENT 'token id',
  `status` int(11) DEFAULT NULL COMMENT '状态 0 未执行1 已执行',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `update_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minetokens_survey`
--

DROP TABLE IF EXISTS `minetokens_survey`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minetokens_survey` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL COMMENT 'user id',
  `introduction` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '自我介绍',
  `age` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '年龄',
  `number` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '手机号码',
  `career` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '职业领域',
  `field` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '领域',
  `platform` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '平台',
  `nickname` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '昵称',
  `link` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '链接',
  `interview` int(10) DEFAULT NULL COMMENT '是否愿意参与Fan票产品的用户访谈？ 0 愿意 1 不愿意',
  `know` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '您如何了解到了Fan票？',
  `publish` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '为什么想要发行Fan票？',
  `info` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '您希望了解什么信息？',
  `promote` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '您会如何推广自己的Fan票？',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1327 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `uid` int(10) unsigned NOT NULL,
  `provider` varchar(32) NOT NULL,
  `check_time` timestamp NULL DEFAULT NULL COMMENT '不显示该时间之前的通知',
  `read_time` timestamp NULL DEFAULT NULL COMMENT '最近已读通知的时间',
  PRIMARY KEY (`uid`,`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notify_event`
--

DROP TABLE IF EXISTS `notify_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notify_event` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) unsigned NOT NULL COMMENT '创建者的id',
  `action` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '动作，如：关注、评论、点赞… @ at',
  `object_id` int(11) unsigned NOT NULL COMMENT '对象id，如：用户id、文章id…',
  `object_type` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '对象类型，如：用户、文章… @ at',
  `remark` int(10) DEFAULT NULL COMMENT '备注信息，上述字段不足以记录的内容在此补充',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=78648 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notify_event_recipients`
--

DROP TABLE IF EXISTS `notify_event_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notify_event_recipients` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `event_id` int(10) unsigned NOT NULL COMMENT '事件id',
  `user_id` int(10) unsigned NOT NULL COMMENT '接收事件的用户id',
  `state` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '是否已读',
  `notify_time` datetime DEFAULT NULL COMMENT '通知时间',
  `read_time` datetime DEFAULT NULL COMMENT '阅读时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=81257 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `notify_event_recipients_desc`
--

DROP TABLE IF EXISTS `notify_event_recipients_desc`;
/*!50001 DROP VIEW IF EXISTS `notify_event_recipients_desc`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `notify_event_recipients_desc` AS SELECT 
 1 AS `id`,
 1 AS `event_id`,
 1 AS `user_id`,
 1 AS `state`,
 1 AS `notify_time`,
 1 AS `read_time`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `orange_actions`
--

DROP TABLE IF EXISTS `orange_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orange_actions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `act_account` varchar(100) DEFAULT NULL,
  `act_name` varchar(100) DEFAULT NULL,
  `act_receiver` varchar(100) DEFAULT NULL,
  `act_data` text,
  `user` varchar(100) DEFAULT NULL,
  `amount` varchar(100) DEFAULT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=62209 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `order_headers`
--

DROP TABLE IF EXISTS `order_headers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_headers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `trade_no` varchar(100) COLLATE utf8mb4_bin NOT NULL COMMENT '订单号',
  `amount` bigint(20) NOT NULL COMMENT '实际支付的金额',
  `total` bigint(20) NOT NULL COMMENT '总的金额',
  `pay_time` timestamp NULL DEFAULT NULL,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` int(11) NOT NULL,
  `ip` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL,
  `use_balance` int(11) NOT NULL COMMENT '是否使用余额支付',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_trade_no` (`trade_no`) USING BTREE,
  KEY `idx_uid` (`uid`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=7145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orders` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `signid` int(10) unsigned NOT NULL COMMENT 'posts.id',
  `referreruid` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '邀请人',
  `num` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '数量',
  `contract` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `symbol` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `amount` int(11) NOT NULL DEFAULT '0' COMMENT '总价',
  `price` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '单价',
  `decimals` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '精度',
  `platform` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `status` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '状态：0未处理，1已验证已发货',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `txhash` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '交易hash',
  `trade_no` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '订单号',
  `category` int(11) NOT NULL DEFAULT '0' COMMENT '商品类别/编号，用于处理一个文章有多种商品的情况 \r\n0阅读权限（默认），1编辑权限',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_orders_signId` (`signid`),
  KEY `idx_orders_uid` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=737 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pegged_assets`
--

DROP TABLE IF EXISTS `pegged_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pegged_assets` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `chain` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `tokenId` int(11) unsigned NOT NULL,
  `contractAddress` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pegged_assets_deposit`
--

DROP TABLE IF EXISTS `pegged_assets_deposit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pegged_assets_deposit` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(11) unsigned NOT NULL,
  `rinkebyHash` varchar(255) COLLATE utf8mb4_bin DEFAULT '',
  `fromChain` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `burnTx` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `value` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '     * 开始初始状态为0\\n     * 触发了BURN EVENT（回收跨链Token）为1\\n     * BURN EVENT 被 12 个区块确认了，为 2\\n     * 数据库和Rinkeby Fan票转入账户交易创建，为3\\n     * RINKEBY 的交易到账（被确认）了，为4',
  `atBlock` int(11) unsigned NOT NULL,
  `tokenId` int(11) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pegged_assets_permit`
--

DROP TABLE IF EXISTS `pegged_assets_permit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pegged_assets_permit` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT 'mint',
  `nonce` int(11) DEFAULT NULL,
  `token` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `to` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `value` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `deadline` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `v` int(11) NOT NULL,
  `r` char(66) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `s` char(66) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `forUid` int(11) unsigned NOT NULL,
  `chain` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT 'bsc',
  PRIMARY KEY (`id`),
  KEY `forUid` (`forUid`),
  CONSTRAINT `forUid` FOREIGN KEY (`forUid`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=239 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_action_log`
--

DROP TABLE IF EXISTS `post_action_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_action_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned DEFAULT NULL COMMENT '用户 id',
  `post_id` int(10) unsigned NOT NULL COMMENT '文章 id',
  `action` varchar(16) COLLATE utf8mb4_bin NOT NULL COMMENT '行为',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1112132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_bookmarks`
--

DROP TABLE IF EXISTS `post_bookmarks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_bookmarks` (
  `uid` int(11) NOT NULL,
  `pid` int(11) NOT NULL,
  `create_time` datetime NOT NULL,
  PRIMARY KEY (`uid`,`pid`),
  KEY `uid` (`uid`,`create_time`),
  KEY `idx_uid_create_time` (`uid`,`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_ipfs`
--

DROP TABLE IF EXISTS `post_ipfs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_ipfs` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '单纯索引',
  `articleId` int(11) unsigned NOT NULL COMMENT '文章的ID，必须在 posts 里有的ID',
  `metadataHash` varchar(255) CHARACTER SET utf8mb4 NOT NULL DEFAULT '' COMMENT '元数据的哈希',
  `htmlHash` varchar(255) CHARACTER SET utf8mb4 DEFAULT '' COMMENT '渲染后HTML的哈希',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建的时间',
  PRIMARY KEY (`id`),
  KEY `link` (`articleId`),
  CONSTRAINT `link` FOREIGN KEY (`articleId`) REFERENCES `posts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16713 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_minetokens`
--

DROP TABLE IF EXISTS `post_minetokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_minetokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sign_id` int(11) NOT NULL,
  `token_id` int(11) NOT NULL,
  `amount` bigint(20) NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1245 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_read_count`
--

DROP TABLE IF EXISTS `post_read_count`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_read_count` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `post_id` int(10) unsigned DEFAULT '0',
  `real_read_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '文章阅读统计',
  `sale_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '商品销量统计,只对商品文章有效',
  `support_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '文章赞赏统计',
  `eos_value_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'EOS赞赏金额统计',
  `ont_value_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'ONT赞赏金额统计',
  `likes` int(10) unsigned DEFAULT '0',
  `dislikes` int(10) unsigned DEFAULT '0',
  `vnt_value_count` int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'VNT赞赏金额统计',
  `down` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_id` (`post_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1560855 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_references`
--

DROP TABLE IF EXISTS `post_references`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_references` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `draft_id` int(11) DEFAULT '0' COMMENT '草稿Id',
  `sign_id` int(11) DEFAULT '0' COMMENT '文章Id',
  `ref_sign_id` int(11) NOT NULL DEFAULT '0' COMMENT '被引用的站内文章Id',
  `url` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `summary` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `number` int(11) NOT NULL DEFAULT '1' COMMENT '序号',
  `status` tinyint(1) DEFAULT '0' COMMENT '状态，1删除',
  `cover` varchar(400) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '封面',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `idx_url` (`draft_id`,`sign_id`,`url`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=599 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_tag`
--

DROP TABLE IF EXISTS `post_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_tag` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sid` int(10) unsigned NOT NULL,
  `tid` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sid` (`sid`,`tid`)
) ENGINE=InnoDB AUTO_INCREMENT=22689 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `post_transfer_log`
--

DROP TABLE IF EXISTS `post_transfer_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `post_transfer_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `postid` varchar(255) NOT NULL,
  `fromuid` int(10) unsigned NOT NULL,
  `touid` int(10) unsigned NOT NULL,
  `type` varchar(255) NOT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1043 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `posts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `author` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `short_content` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '短摘要',
  `short_content_share` varchar(3000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '短摘要 分享 分享 1000字 包含html tag x3',
  `hash` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `sign` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `public_key` varchar(100) CHARACTER SET utf8 DEFAULT NULL,
  `status` int(10) unsigned DEFAULT '0',
  `onchain_status` int(10) unsigned DEFAULT '0',
  `create_time` timestamp NULL DEFAULT NULL,
  `fission_factor` int(11) DEFAULT '2000',
  `cover` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `platform` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `is_original` int(1) NOT NULL DEFAULT '0',
  `channel_id` int(11) DEFAULT '1',
  `fission_rate` int(11) NOT NULL DEFAULT '100',
  `referral_rate` int(11) NOT NULL DEFAULT '0',
  `uid` int(10) unsigned DEFAULT NULL,
  `is_recommend` tinyint(1) DEFAULT '0' COMMENT '是否是被推荐的商品,默认为0,不被推荐',
  `category_id` int(11) DEFAULT '0' COMMENT '商品的类别,默认为0无类别,只对商品文章有效',
  `hot_score` float(11,2) DEFAULT '0.00',
  `comment_pay_point` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '评论需要支付的积分',
  `time_down` int(11) NOT NULL DEFAULT '0',
  `require_holdtokens` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否需要持币阅读',
  `require_buy` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否需要购买阅读',
  `cc_license` varchar(255) CHARACTER SET utf8 DEFAULT NULL COMMENT '文章的授权许可协议',
  `editor_require_holdtokens` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否可以持币编辑',
  `ipfs_hide` tinyint(1) NOT NULL DEFAULT '0',
  `assosiate_with` int(10) unsigned DEFAULT NULL COMMENT '关联Fan票的 Token ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash` (`hash`),
  KEY `idx_posts_hotscore` (`hot_score`),
  KEY `idx_uid` (`uid`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB AUTO_INCREMENT=12614 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_prices`
--

DROP TABLE IF EXISTS `product_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `sign_id` int(11) NOT NULL COMMENT '商品id',
  `title` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '商品名称-sku级别',
  `sku` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'sku',
  `stock_quantity` int(11) NOT NULL DEFAULT '0' COMMENT '库存',
  `platform` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'token所在平台',
  `token_id` int(11) DEFAULT NULL,
  `symbol` varchar(50) COLLATE utf8mb4_bin NOT NULL COMMENT '货币符号',
  `price` int(11) NOT NULL COMMENT '价格',
  `decimals` int(11) NOT NULL DEFAULT '0' COMMENT '精度',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '状态：0不可用，1可用',
  `category` int(11) NOT NULL DEFAULT '0' COMMENT '商品类别/编号，用于处理一个文章有多种商品的情况 \r\n0阅读权限（默认），1编辑权限',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_product_prices_sign_id` (`sign_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=213 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC COMMENT='产品价格表，按照sku、symbol定价';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `product_stock_keys`
--

DROP TABLE IF EXISTS `product_stock_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_stock_keys` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `sign_id` int(11) NOT NULL COMMENT '商品id',
  `sku` varchar(100) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'sku',
  `digital_copy` varchar(100) COLLATE utf8mb4_bin NOT NULL COMMENT '数字copy，steam key/下载链接等',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '状态：0未销售，1已销售',
  `support_id` int(11) NOT NULL DEFAULT '0' COMMENT '赞赏id/订单id',
  `order_id` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '订单id',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_product_stock_keys_sign_id` (`sign_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1083 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC COMMENT='digital copy 库存表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `search_count`
--

DROP TABLE IF EXISTS `search_count`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `search_count` (
  `id` int(20) NOT NULL AUTO_INCREMENT,
  `word` varchar(50) DEFAULT NULL COMMENT '搜索词',
  `create_time` timestamp NULL DEFAULT NULL COMMENT '创建时间',
  `update_time` timestamp NULL DEFAULT NULL COMMENT '更新时间',
  `search_count` int(10) DEFAULT NULL COMMENT '搜索次数总计',
  `search_area` int(8) DEFAULT NULL COMMENT '搜索区域， 1为文章区， 3为用户区',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_word_search_area` (`word`,`search_area`)
) ENGINE=InnoDB AUTO_INCREMENT=49056 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `support_quota`
--

DROP TABLE IF EXISTS `support_quota`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `support_quota` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `signid` int(10) unsigned NOT NULL,
  `contract` varchar(255) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `quota` int(10) unsigned NOT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uid` (`uid`,`signid`,`contract`,`symbol`)
) ENGINE=InnoDB AUTO_INCREMENT=424 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supports`
--

DROP TABLE IF EXISTS `supports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supports` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `signid` int(10) unsigned NOT NULL,
  `contract` varchar(255) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `amount` int(11) DEFAULT '0',
  `platform` varchar(255) NOT NULL,
  `referreruid` int(10) unsigned DEFAULT '0',
  `status` int(10) unsigned DEFAULT '0',
  `create_time` timestamp NULL DEFAULT NULL,
  `txhash` varchar(255) DEFAULT NULL COMMENT '交易hash',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uid` (`uid`,`signid`),
  KEY `idx_supports_signId` (`signid`),
  KEY `idx_supports_uid` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=862447 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  `type` varchar(255) DEFAULT 'post',
  `num` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3633 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `timed_post`
--

DROP TABLE IF EXISTS `timed_post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `timed_post` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `draft_id` int(10) unsigned NOT NULL COMMENT '草稿的主键',
  `triggered` tinyint(1) NOT NULL DEFAULT '0' COMMENT '已触发',
  `trigger_time` datetime NOT NULL COMMENT '触发时间',
  PRIMARY KEY (`id`,`draft_id`) USING BTREE,
  UNIQUE KEY `draft_id` (`draft_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `twitter_user_timeline_switch`
--

DROP TABLE IF EXISTS `twitter_user_timeline_switch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `twitter_user_timeline_switch` (
  `user_id` int(11) NOT NULL,
  `timeline_switch` int(1) unsigned zerofill DEFAULT '0' COMMENT '开启个人主页的 twitter 时间轴',
  PRIMARY KEY (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_accounts`
--

DROP TABLE IF EXISTS `user_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_accounts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL COMMENT '用户id',
  `account` varchar(255) NOT NULL COMMENT '账号',
  `password_hash` varchar(64) DEFAULT NULL COMMENT '邮箱的密码的二次散列值',
  `platform` varchar(255) DEFAULT NULL COMMENT '用户来源平台',
  `is_main` tinyint(1) DEFAULT '0' COMMENT '是否是主账号',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `status` tinyint(1) DEFAULT '1' COMMENT '账号状态',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16574 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_social_accounts`
--

DROP TABLE IF EXISTS `user_social_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_social_accounts` (
  `uid` int(11) NOT NULL,
  `wechat` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL,
  `qq` varchar(20) COLLATE utf8mb4_bin DEFAULT NULL,
  `weibo` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL,
  `github` varchar(40) COLLATE utf8mb4_bin DEFAULT NULL,
  `telegram` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL,
  `twitter` varchar(16) COLLATE utf8mb4_bin DEFAULT NULL,
  `facebook` varchar(50) COLLATE utf8mb4_bin DEFAULT NULL,
  `email` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '邮箱',
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_third_party`
--

DROP TABLE IF EXISTS `user_third_party`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_third_party` (
  `uid` int(11) NOT NULL COMMENT '用户在本网站的用户ID',
  `platform` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '用户的第三方账户平台名字，应该为全小写',
  `platform_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '用户在第三方平台唯一不变的ID（区块链则应该是账户名字或者公钥）',
  `challenge_text` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '用于验证的信息',
  UNIQUE KEY `unique_index` (`uid`,`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_twitter_credential`
--

DROP TABLE IF EXISTS `user_twitter_credential`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_twitter_credential` (
  `user_id` int(11) NOT NULL COMMENT '用户 ID',
  `oauth_token` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Twitter Oauth Token',
  `oauth_token_secret` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Twitter Oauth Token Secret',
  `twitter_id` varchar(16) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Twitter User ID',
  `screen_name` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Twitter 用户名',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`user_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_websites`
--

DROP TABLE IF EXISTS `user_websites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_websites` (
  `uid` int(11) NOT NULL,
  `website_id` smallint(6) NOT NULL,
  `url` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(20) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '【可选】网站名称',
  PRIMARY KEY (`uid`,`website_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `create_time` timestamp NULL DEFAULT NULL,
  `platform` varchar(255) DEFAULT NULL,
  `introduction` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `accept` tinyint(1) DEFAULT '1',
  `source` varchar(255) DEFAULT 'ss',
  `reg_ip` varchar(50) DEFAULT NULL,
  `last_login_time` datetime DEFAULT NULL,
  `password_hash` varchar(64) DEFAULT NULL,
  `is_recommend` tinyint(1) DEFAULT '0' COMMENT '是否是被推荐的用户',
  `referral_uid` int(10) unsigned NOT NULL DEFAULT '0',
  `last_login_ip` varchar(50) DEFAULT '',
  `level` int(11) NOT NULL DEFAULT '0' COMMENT '等级',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '用户状态',
  `banner` varchar(255) DEFAULT NULL,
  `no_captcha` tinyint(1) unsigned NOT NULL DEFAULT '0' COMMENT '0代表需要验证码（默认状态），1则无需验证码',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_nickname` (`nickname`),
  UNIQUE KEY `idx_users_username_platform` (`username`,`platform`)
) ENGINE=InnoDB AUTO_INCREMENT=14100 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users_login_log`
--

DROP TABLE IF EXISTS `users_login_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users_login_log` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `ip` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT NULL,
  `login_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=72999 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `notify_event_recipients_desc`
--

/*!50001 DROP VIEW IF EXISTS `notify_event_recipients_desc`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=TEMPTABLE */
/*!50013 DEFINER=`ss_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `notify_event_recipients_desc` AS select `notify_event_recipients`.`id` AS `id`,`notify_event_recipients`.`event_id` AS `event_id`,`notify_event_recipients`.`user_id` AS `user_id`,`notify_event_recipients`.`state` AS `state`,`notify_event_recipients`.`notify_time` AS `notify_time`,`notify_event_recipients`.`read_time` AS `read_time` from `notify_event_recipients` order by `notify_event_recipients`.`id` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-05-30  8:22:26
