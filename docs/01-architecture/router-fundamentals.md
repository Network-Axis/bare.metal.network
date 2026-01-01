---
sidebar_position: 1
---

# Router Fundamentals

When you run `kubectl get pods -o wide` and see pod IPs spanning different subnets across your cluster nodes, you're witnessing the result of routing decisions happening continuously throughout your infrastructure. Understanding how routers make these forwarding decisions is fundamental to diagnosing network issues, optimizing traffic flows, and designing resilient bare metal Kubernetes deployments.

## What Is a Router?

At its core, a router is a computer with multiple network interface cards (NICs) that makes forwarding decisions based on IP addresses. Unlike switches, which operate at Layer 2 using MAC addresses, routers work at Layer 3 using IP addresses to determine where packets should go next.

In a bare metal Kubernetes context, you'll encounter routers in several forms:
- **Worker nodes** running routing daemons (like FRR) that advertise pod networks
- **Top-of-Rack (ToR) switches** connecting server racks to the network fabric
- **Border routers** connecting your data center to external networks

The fundamental operation is always the same: examine the destination IP address, consult the routing table, and forward the packet toward its destination. What makes modern networking powerful is that this simple operation, repeated at every hop, enables complex, resilient traffic patterns across thousands of nodes.

## The Routing Table

Every router maintains a routing table—a database mapping destination networks to next-hop addresses and outgoing interfaces. When a packet arrives, the router performs a longest prefix match against this table to determine the best path forward.

Here's an example routing table from a Kubernetes worker node:

```
default via 10.0.0.1 dev eth0
10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.10
10.244.0.0/16 proto bgp metric 20
        nexthop via fe80::1 dev eth0 weight 1
        nexthop via fe80::2 dev eth1 weight 1
10.244.1.0/24 via fe80::1 dev eth0 proto bgp metric 20
```

Each entry contains:
- **Destination**: The network prefix (e.g., `10.244.1.0/24`)
- **Next hop**: Where to send packets (e.g., `via fe80::1`)
- **Interface**: Which NIC to use (e.g., `dev eth0`)
- **Metric**: Path cost for choosing between multiple routes

The longest prefix match algorithm ensures specificity wins. If a packet is destined for `10.244.1.50`, the router chooses the `/24` route (`10.244.1.0/24`) over the broader `/16` route (`10.244.0.0/16`), even though both match. This allows for fine-grained traffic engineering while maintaining a default route for everything else.

## Control Plane vs Data Plane

Understanding the separation between control plane and data plane is critical for diagnosing network behavior.

**Control Plane**: How routing tables are built and maintained. This includes:
- BGP sessions exchanging route advertisements between neighbors
- Route selection policies determining which paths to prefer
- Routing protocol updates when topology changes occur

In a Kubernetes cluster running FRR on worker nodes, the control plane handles BGP peering with ToR switches, advertising pod CIDR blocks, and learning routes to pods on other nodes.

**Data Plane**: The actual forwarding of packets. This includes:
- Longest prefix match lookups in the routing table
- TTL (Time To Live) decrementation
- VXLAN encapsulation for overlay networks
- Hardware forwarding in switch ASICs

For example, when a pod sends traffic to another pod, the data plane on the source node's kernel performs the route lookup and encapsulates the packet for VXLAN transport. The control plane was involved earlier—when BGP advertised that destination pod's existence—but packet-by-packet forwarding happens in the data plane.

This separation matters because:
- Control plane issues (like BGP session flaps) prevent learning new routes but don't immediately break existing traffic
- Data plane performance (like XDP acceleration) affects latency and throughput
- Different components handle each: FRR manages the control plane, while the Linux kernel (or eBPF/XDP) handles the data plane

See the [BGP ADR](./bgp.md) for control plane details and [eBPF-XDP ADR](./ebpf-xdp.md) for data plane optimization.

## Related Topics

Understanding routers provides the foundation for these protocol decisions:

- **[BGP](./bgp.md)**: How routes are advertised and selected in bare metal Kubernetes clusters
- **[ECMP](./ecmp.md)**: Load balancing traffic across multiple equal-cost paths
- **[BFD](./bfd.md)**: Detecting link failures in milliseconds for fast convergence
- **[VXLAN-EVPN](./vxlan-evpn.md)**: Creating overlay networks that span Layer 3 routing boundaries
- **[IPv6-SLAAC](./ipv6-slaac.md)**: Autoconfiguration eliminating manual IP address management
- **[eBPF-XDP](./ebpf-xdp.md)**: Programmable packet processing at the data plane level
