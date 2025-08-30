# Integrating Cilium with the Underlay Network

With our Talos cluster up, we need to ensure Pod and Service networking mesh seamlessly with the data center underlay (the pure L3 fabric). **Cilium** is a powerful Container Network Interface (CNI) that uses eBPF for routing, network policy, and more. We'll leverage Cilium to align Kubernetes networking with our IPv6 fabric.

## Direct Routing (No Overlays)

By default, many Kubernetes CNIs use overlays (like VXLAN) to encapsulate Pod traffic. In our design, we prefer direct routing:
- Each Kubernetes node's Pod CIDR is routed in the underlay.
- No encapsulation: packets from Pod A to Pod B are IP-routed via the fabric, just like any host traffic.

Cilium supports this via its **tunnel disabled** mode. In `cilium-config` (Helm values or ConfigMap):
```yaml
tunnel: "disabled"
ipv6:
  enabled: true
  nativeRoutingCIDR: "fd00:cafe::/56"  # Example Pod CIDR range
```

This config disables VXLAN and tells Cilium that Pod IPs are routable.

On each node, Cilium will program the Linux kernel to route Pod IPs via that node’s interface. We ensure our fabric’s routing knows how to reach those Pod subnets:
	•	One approach: assign each node a unique IPv6 Pod subnet and use BGP to advertise those routes from the node.
	•	Simpler: use a cluster-wide unique prefix and static routes on the spines to each node (not very scalable, but fine for a lab).

## BGP Advertisement (Optional)

Cilium has an optional BGP addon (beta) that can announce Pod or Service IPs to physical routers. In a production-grade design, we’d enable Cilium’s BGP control plane:
	•	Each node’s Cilium agent establishes BGP sessions with the fabric (for instance, the leaf it’s connected to).
	•	The node advertises the Pod CIDR it hosts, allowing the spines/leaves to forward traffic directly to that node for any destination Pod.

This keeps traffic optimal: no unnecessary hops or encap/decap.

## Network Policy and Hubble

Even with direct routing, Cilium’s eBPF datapath enforces network policies at line rate. We can define Kubernetes NetworkPolicies to restrict traffic, and Cilium will apply them using eBPF programs attached to each node’s network interface.

Additionally, Hubble (Cilium’s observability layer) gives us visibility into flows. For example:

```shell
hubble observe --last 10 --pod default/web
```

This would show the last 10 flows involving the pod "web" in default namespace – useful to verify that traffic is taking the expected routed path across our fabric.

:::tip
If you’re curious about Cilium’s internals, use cilium status to check health and cilium bpf route list to see routes Cilium has programmed. You’ll notice entries mapping Pod CIDRs to underlay interfaces.
:::

By aligning Cilium with our underlay, we achieve a unified network: Pods can talk to other Pods or external endpoints with minimal overhead, and underlay routing treats Pod traffic like any other. In the labs, we’ll set up Cilium accordingly and verify that Pod ping/traceroute flows go via the expected leaf-spine path.