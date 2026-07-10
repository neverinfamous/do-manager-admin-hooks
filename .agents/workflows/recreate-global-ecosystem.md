---
description: Automatically tear down, launch, and bootstrap the global adamic unified database ecosystem.
---

# Recreate Global Ecosystem

This workflow safely and reliably tears down the current container state of the global unified database ecosystem and brings it back up. It includes an automated wait period and executes the InnoDB cluster bootstrap script to reinitialize MySQL Group Replication if it has lost quorum. 

This ecosystem serves as the master "god-tier" environment, housing everything from the MySQL cluster to Postgres, Mongo, Redis, and full Datadog APM tracing.

## 1. WSL Stability (Critical)

Because this ecosystem runs under native `docker-ce` in WSL2 Ubuntu, Windows may automatically terminate the distro (and Docker) if there are no active terminal sessions holding it open. 

Before using the ecosystem, ensure the background keepalive task is registered. This creates a hidden window that prevents WSL from shutting down:
```pwsh
pwsh -File C:\Users\chris\Desktop\adamic\docs\unified-database-ecosystem\scripts\register-wsl-keepalive.ps1
```

## 2. Execution

Run the `recreate-ecosystem.mjs` master script to automate the entire teardown, startup, image compilation, and bootstrapping process.

```pwsh
node C:\Users\chris\Desktop\adamic\docs\unified-database-ecosystem\scripts\recreate-ecosystem.mjs
```

## 3. Validation

The script will stream its output to the console. You should see:
1. `docker compose down -v` removing old containers and networks.
2. A brief sleep to allow the Windows Docker daemon to flush.
3. `docker compose up -d` creating the fresh containers.
4. The `create-cluster.mjs` script polling until the nodes are ready and successfully joining `mysql-node2` and `mysql-node3` to `mysql-node1`.

Once complete, the cluster will output its `ONLINE` topology status, and you can access Dozzle (http://localhost:8080) and Adminer (http://localhost:8081).
