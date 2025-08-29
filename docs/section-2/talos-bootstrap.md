# Bootstrapping a Talos Kubernetes Cluster

Talos is a container-optimized Linux distribution designed to securely run Kubernetes control plane and worker nodes. It has an immutable, minimal OS image and is managed entirely via an API (no SSH). In this section, we'll see how to bootstrap a Talos cluster for our network.

## Talos Configuration Model

Instead of manual OS setup, Talos uses declarative **machine configuration** files (YAML) to provision nodes. You generally:
1. Generate a cluster configuration (which includes cluster secrets, endpoint info, etc.).
2. Use the Talos CLI to convert that into per-node *machine config* files.
3. Provide each machine its config at boot (via cloud-init, ISO embed, or the Talos API).

For example, we might generate configs for a cluster with 1 control plane and 1 worker:
```shell
talosctl gen config --output ./cluster https://cluster-endpoint:6443 2001:db8::1
```

This creates a controlplane.yaml and worker.yaml. Each contains network and Kubernetes settings for that node role. In our case, we’d ensure the machine.networking section aligns with our IPv6 underlay addressing (or use DHCPv6 if available).

Key Talos config highlights:
- **Static vs. DHCP addressing**: Talos can use DHCP for simplicity, but static addressing ensures predictable node IPs. For our underlay, we might assign each node a unique IPv6.
- **BGP in Talos**: Talos itself doesn’t run BGP, but we ensure Cilium (in the next part) can peer or integrate with the underlay routing.
- **No SSH**: Admin access is via talosctl and the Talos API. For example, talosctl kubeconfig fetches the admin Kubeconfig once the control plane is up.

## Cluster Bootstrapping Workflow

Once configs are ready, the bootstrapping is straightforward:
- **Control Plane Node**: Boot the machine using the Talos image (ISO, PXE, etc.) and supply controlplane.yaml (often via an init RAM disk or by pointing the Talos ISO to a config URL).
    - The control plane node initializes Kubernetes (etcd, API server, etc.) with the settings from the config.
- **Worker Node(s)**: Boot each with the Talos image and its worker.yaml. The workers automatically join the cluster using the token and endpoint info from the config.

:::note
Talos machine configs are ephemeral. After boot, Talos stores the config in memory. To change settings, you typically update via the Talos API or reboot with a new config. This ensures immutability and consistency.
:::

After a few minutes, you have a running Kubernetes cluster on bare-metal, managed by Talos. Next, we’ll look at how Cilium will integrate with this cluster to align Pod networking with our underlying L3 fabric.