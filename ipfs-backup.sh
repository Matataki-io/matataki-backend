#!/usr/bin/env bash

cd /root
echo "正在进行打包.."
tar czf ipfs-data-volumes_$(date +'%m%d').tar.gz ipfs-data-volumes
echo "打包完成,  传输到目标服务器.."
scp ipfs-data-volumes_$(date +'%m%d').tar.gz root@47.52.2.146:/root/ipfs-prod-backup
echo "传输到目标服务器成功..备份完成$(date +'%m%d')"