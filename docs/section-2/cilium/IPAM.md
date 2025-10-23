---
sidebar_position: 4
draft: true
---

# IP Address Management (IPAM)
Cilium supports multiple IPAM modes:

1. Kubernetes Host Scope: each node is assigned subnet from a cluster-wide prefix (aka PodCIDR). The responsibility of allocating IP addresses to Pods is delegated to Cilium, which runs on each individual node in the cluster. This is the default IPAM mode.

2. Cluster Scope: Cilium is responsible for the entire lifecycle of PodCIDRs. This provides cluster administrators the ability to add more prefixes to the PodCIDR.

3. Multi-pool: Allows cluster operators to configure different pools for different types of nodes or workloads. Pods on the same node can receive IP addresses from various ranges. PodCIDRs can be dynamically added to nodes. This is configured by adding the `ipam.cilium.io/ip-pool` annotation to a pod or node.

| IPAM Mode|CIDR Configuration|Multiple CIDRs per Cluster|Multiple CIDRs per Node|Dynamic CIDR Allocation|
|---|---|---|---|---|
|Kubernetes Host Scope|Kubernetes|❌|❌|❌|
|Cluster Scope|Cilium|✅|❌|❌|
|Multi-Pool Scope|Cilium|✅|✅|✅|

---

Pods in different namespaces on the same node may pick up IP addresses from the same range.

In Kubernetes, IP addresses are irrelevant as they no longer represent an identity.

The LoadBalancer IP Address Management (LB-IPAM) feature allows Cilium to provision IP addresses for Kubernetes LoadBalancer Services.

Cilium 1.13: "North-South" Load Balancer services announced to the underlying networking using BGP.