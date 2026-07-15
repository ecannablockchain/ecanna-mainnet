# Print enode for bootnodes / multinode (validator-1 must be running).
param(
    [string]$Container = "ecna-validator-1",
    [string]$Ipc = "/data/geth.ipc"
)
docker exec $Container geth attach $Ipc --exec "admin.nodeInfo.enode"
