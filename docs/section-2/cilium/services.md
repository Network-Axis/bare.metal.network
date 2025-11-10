---
sidebar_position: 7
description: The equivalent of Load Balancers
title: Services
draft: true
---

Load Balancers distribute traffic across multiple servers.
LB's make an application accessible through a single IP (referred to as a "virtual IP").
LB's monitor the health of the underlying applications/servers through health checks.

Kubernetes Services are primarily used for load balancing traffic to Pods.
We use selectors for this, based on labels.
This helps achieve resilience and scale because new and existing pods with a matching label will automatically be included in the service, without having to manually add IPs.

There are multiple types of services, which distinguish between Internal and External use cases.

## Load Balance Traffic Within the Cluster
- ClusterIP: expose the service only within the cluster.
- `kube-controller-manager` (which runs on the Control Plane) is responsible for assigning ClusterIPs from the service CIDR range. This is completely independent of the CNI or the [IPAM mode](./IPAM.md) in use for Pods.


<details>
<summary>Deep Dive: Assigning ClusterIPs</summary>

The `kube-controller-manager` runs various controllers, each responsible for a specific aspect of cluster state management. One of them is the `ServiceController`.

This controller is the one responsible for allocating ClusterIP addresses to Services.
It selects an IP from the Service ClusterIP CIDR range, and updates the Service resource with the chosen virtual IP.

`kube-apiserver` then validates and persists the state of resources (like Pods, Services, Deployments) into etcd.
</details>

## Load Balance Traffic Entering the Cluster
- A NodePort service lets external users access internal services by opening the same port on all nodes.
The nodes will act as NAT gateways by forwarding traffic targeting a specific port to healthy pods.

- ClusterIP load balances applications running on pods to clients that are internal to the cluster.
- NodeIP exposes applications running on pods to clients that are external to the cluster. There is no load balancing. Traffic is forwarded from the Node to the internal ClusterIP, then to the pod/application.

- A LoadBalancer Service
    - Provisions an external load balancer on a cloud provider
    - The cloud provider allocates an IP address or DNS name
    - The load balancer will forward and distribute traffic across nodes.


Cilium can act as a load balancer network provider. 
Cilium can assign an external IP addresses with the Load Balancer IP Address Management [LB-IPAM](https://docs.cilium.io/en/stable/network/lb-ipam/) feature
This IP address will be made accessible by [BGP](./gatewayAPI.md#border-gateway-protocol-bgp) or ARP.


---

Load balancing and security policies do not work across clusters.

Cilium Cluster Mesh discovers services in multiple clusters automatically and load balances traffic.

The main use case for Cluster Mesh is High Availability: replicas of the same services in each cluster, and the clusters resides in multiple regions or availability zones.
Also allows enforcing Network Policies across multiple clusters.

Cluster meshing occurs at L3/L4 using eBPF, up to 511 clusters.

Kubernetes doesn't have a standard feature for cross-cluster load-balancing

---

