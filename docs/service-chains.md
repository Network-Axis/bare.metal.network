# Service Function Chaining with netkit

Modern networks increasingly rely on *service chaining* – directing traffic through a sequence of network functions (firewalls, NATs, load balancers, monitors, etc.) before reaching its destination. In this module, we explore building and managing service chains using our eBPF-based CNFs and **netkit**.

## CNF Chains

Imagine a packet entering our network that needs to:
1. Pass through a firewall CNF (XDP program dropping disallowed traffic).
2. Then through a load balancer CNF (tc eBPF program redirecting to a set of service endpoints).
3. Finally through an observability CNF (tc eBPF program tagging or counting the packet for metrics).

With eBPF, these functions can be on the same host or distributed – netkit can coordinate them:
- netkit defines chain manifests, listing the CNFs in order.
- Each CNF is deployed (as a container or daemon) on the appropriate node/interface.
- Packets are steered through the chain via routing rules or eBPF redirects.

For instance, netkit might attach the firewall XDP on the ingress interface of a node, then configure that XDP program to redirect allowed traffic to a load balancer program running on the same node's egress (using an eBPF map for redirection or via normal routing to a veth pair where the LB program is attached).

## Observability and SLOs

When chaining multiple functions, it's critical to have observability at each hop:
- **Tracing flows:** With Hubble or custom eBPF tracepoints, we can follow a packet's journey through the chain. netkit can integrate with Hubble to correlate a flow ID across CNFs.
- **Metrics:** Each CNF should export metrics (e.g., firewall drop counts, LB connection counts) to a system like Prometheus. eBPF maps can be used to count events and these can be scraped or logged at intervals.

**Service Level Objectives (SLOs)** are performance targets (e.g., "end-to-end latency through the chain `<5ms` 99% of the time"). Achieving SLOs requires that each CNF is efficient:

- Using XDP for tasks that can run at the NIC (to minimize latency).
- Keeping chain length minimal (each additional hop adds overhead).
- Possibly pinning CNFs to specific CPU cores or using features like *AF_XDP* (bypassing kernel network stack in user space) if eBPF alone isn't sufficient.

## netkit Orchestration

netkit provides a declarative way to specify chains. For example, a YAML might define:

```yaml
chain: "web-service-chain"
functions:
  - name: "xdp-firewall"
    node: "edge-1"
    type: "xdp"
    interface: "eth0"
  - name: "tc-loadbalancer"
    node: "edge-1"
    type: "tc"
    interface: "eth0"
  - name: "tc-observer"
    node: "monitor-1"
    type: "tc"
    interface: "eth1"
```

This says: attach an XDP firewall on edge-1‘s eth0 (ingress), then a tc load balancer also on edge-1 (on the same interface after the firewall), and finally a tc observer on a monitor-1 node’s interface. netkit would set up routing such that after the load balancer, traffic is forwarded to monitor-1 for observation, then onward to its destination.

:::note
The above is just illustrative – in practice, you might chain all functions on one node for simplicity. But distributing them can emulate a multi-hop service path for testing.
:::

In the labs, you’ll build a simple service chain and even intentionally break parts of it (e.g., introduce a buggy eBPF program) to see how to detect and fix issues. This will solidify your understanding of both the power and challenges of eBPF-based service chaining.