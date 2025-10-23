---
sidebar_position: 2
title: Routing
draft: true
---

# Networking
Cilium provides two methods to connect pods on different nodes in the same cluster

## 1. Encapsulation / Overlay
> The underlying network must support IPv4. IPv6-based tunneling in a work-in-progress.

A network overlay (either VXLAN or GENEVE) is created in the cluster, and a group of tunnels is created between all the nodes.

Using this method, there is no reliance on the underlying network: the network that connects nodes does not need to be aware of the PodCIDRs configuration.
As long as the nodes can communicate, the Pods can as well.
This also increases the the pool of IP addresses available to Pods, since there is no dependence on the underlying network.
Additionally, new nodes that join the cluster are automatically added to overlay.


This auto-configuration provides simplicity, as risks of CIDR clashes are limited.
Connections to outside the cluster will be source-NATed by Cilium nodes (traffic will appear to come form the node where the pod is deployed, unless using [Egress Gateway](./networkPolicies.md#egress-gateway)).

One drawback is that network overlays (or encapsulation in general) adds overhead to every packet.

See [Encapsulation](./encapsulation.md)

## 2. Native / Direct routing
Packets sent by the pods would be routed based on the node's networking configuration.
Therefore, the host network of each node must know how to forward/route packets to the PodCIDRs.
On a single flat L2 network, the `auto-direct-node-routes: true` option can be enabled to allow Cilium to advertise the PodCIDR to every node using ARP.
Otherwise, an external router or internal [BGP](./gatewayAPI.md#border-gateway-protocol-bgp) daemon must be configured.




Yields better performance.
No source-NAT
external endpoints see the Pod's IP as source.
Cluster nodes need a method to exchange routing tables

---

# QoS
- Priority Marker for preferential treatment
- Congestion management on egress
- Congestion avoidance (Building Secure & Reliable Systems refers to this as water shedding)
- Traffic Shaping: throughput management

QoS within the physical network is out of scope for Cilium.


- QoS is performed on the node;s network interface.
- All pods on a node typically share a single network interface, which could lead to resource starvation if a pod were to consume too much bandwidth.

Cilium Bandwidth Manager can add

Pod annotations are used to shape the egress traffic of the pod.