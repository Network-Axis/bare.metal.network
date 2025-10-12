---
title: Architectural Decision Records (ADR)
draft: true
---

## Why Kubernetes?

Controllers are in charge of managing desired state, taking corrective actions until the desired state is reached.

This means Kubernetes can be leveraged as a generic automation API -- used to manage containers, networking, and even CI/CD pipelines.


- Pods share:
    - the same network stack
    - the same data volumes
    - the same IP address(es)
- Containers within a Pod communicate with each other via localhost.

The `kube-system` namespace is reserved for administrative pods.


The pods that use the host network share their network stack with the node they are running on.

Reasons not to use host-networking for all pods:
- each port number could only be used once per node
- voids the network isolation provided by containers


Host-networking should only be used when explicitly required by the application.


Metadata used to configure resources:
1. Labels: key-value pairs; used to select resources.
2. Annotations: free-form; used to control resource behavior.


Due to the transient nature of pods, labels are used rather than IP addresses to identify workloads in a scalable way to control replication and load-balance traffic.


Kubernetes is designed to be infrastructure-agnostic. Container Network Interface (CNI) is an abstraction layer for network implementation. This allows Kubernetes to run on any on-premises infrastructure without needing to know the specifics of the underlying network.

CNI plugins, like Cilium, manage the integration between the container network and the host network. This includes setting up network interfaces and ensuring correct routing of traffic to and from the pods.

---


The Kubelet is responsible for:
- managing node status
- managing the lifecycle of pods and containers by communicating with the Container Runtime Interface (CRI)
- managing volumes and secrets
- logs and metrics retrieval

CRI interactions with the CNI to configure networking for containers

CRI and Kubelet are responsible for creating, stopping, and deleting containers/pods.

Cilium makes the kernel aware of metadata to identify workloads. These identities can be used directly in kernel logic to make networking and security decisions, thus making the kernel Cloud Native.

labels are essential to identify, manage, scale and connect workloads 

pods get their IP address from the Kubelet, which gets it from the CNI.

IP Address Management (IPAM)

Cilium creates a `CiliumEndpoint` resource for each workload that it manages.

```shell
kubectl get ciliumendpoint -A
kubectl -n kube-system get ciliumendpoint -l k8s-app=kube-dns
```

::: info

Pods that use the host networking are not managed by Cilium, and will therefore not have a Cilium Endpoint associated with them.

:::

Each endpoint has a Security Identity associated with it, called `CiliumIdentities`.

```shell
kubectl get ciliumidentity -A
```

- a `CiliumEndpoint` represents a specific pod or workload and contains dynamic information such as IP addresses
- a `CiliumIdentity` (or Security Identity) represents the logical identity of a workload based on its labels, and can apply to multiply `CiliumEndpoints`.

When a Pod is added to a node, the Container Runtime Interface (CRI) creates a virtual Ethernet adapter (also called a "veth pair") to establish a connection between the host's network namespace and the Pod's network namespace.

One end of the veth pair is attached to the host and connected to the network infrastructure ~~(typically a bridge or a CNI-managed interface)~~, while the other end resides inside the Pod's network namespace. This Pod-side veth is responsible for maintaining the network namespace and serving as the network parent for all other containers in the Pod.

```shell
ip a
```

Example output:
```
8: eth0@if9: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
```

The `eth0@if9` interface is prefixed by an interface number `8`. This constitutes the veth pair.


Pod IPs are highly volatile and should not be used to access a workload.

Services provide L4 load-balancing for pods within the cluster.

Services are a stable network interface to access workloads.

::: info Service Types
- ClusterIP (the default) for internal load-balancing: https://play.instruqt.com/assets/tracks/ylhikjm5qpjv/e1cd4bda6570de6c5acf9bec9501a04c/assets/svc_clusterip.png or https://play.instruqt.com/assets/tracks/ylhikjm5qpjv/b85412d1e7b42c90b612d190c5ae6b3c/assets/svc_clusterip_routing.png
- NodePort to expose services outside the cluster
- LoadBalancer to attach an external load-balancer to a service

:::

![image](https://play.instruqt.com/assets/tracks/ylhikjm5qpjv/61bc450b3b38f30c9278703ee2c848d4/assets/svc_lb.png)


```shell
kubectl -n star-wars get endpoints deathstar
```


Every pod in the cluster can simply access a service by requesting a name in the form
`<service>.<namespace>.svc.cluster.local`

If the pod exists in the same namespace as the service, we can even just use the service name, without `<namespace>.svc.cluster.local`.

`ClusterIP` and `NodePort` are implemented by `kube-proxy`, which uses IP tables instead of labels.

eBPF programs are aware of the load-balanced identities via Kube-Proxy Replacement

 eBPF programs can be based directly on Cloud Native identities, while still running in the kernel. This allows eBPF to use per-CPU hash tables, and thus scale at a near-constant rate!

 iptables scales linearly, which means increasing the number of pods or services in a cluster by a factor of 100 will also increase the time it takes to route that traffic, and even to create the new pods

Cilium makes use of eBPF to provide a way to assign IPs to LoadBalancer Services


This will instruct Cilium to assign IP addresses taken from the 172.18.255.200/29 CIDR to each LoadBalancer Service in the cluster:

```yaml
---
apiVersion: "cilium.io/v2alpha1"
kind: CiliumLoadBalancerIPPool
metadata:
  name: "default"
spec:
  blocks:
    - cidr: "172.18.255.200/29"
```


We need to make sure the IP address is routed to one of the cluster nodes.

Cilium can advertise LoadBalancer services IP addresses using either ARP or BGP.

Kubernetes Services are limited as L4 load-balancers, and cannot perform TLS termination, SNI-based routing, or anything requiring parsing of the application (L7) network layer.

Gateway API implements North-South L7 load-balancing logic (ingress traffic from outside the cluster to workloads hosted in the cluster.). Implementation is handled by plugins called Ingress Controllers.

Cilium routes traffic directly to and from a single Envoy proxy per node for L7 routing logic inside the cluster.

The GAMMA project defines the specification of internal L7 routing, and uses Gateway API resources for in-cluster routing purposes.


### Gateway API

- a `Gateway` resource is for the platform implementation
- an `HTTPRoute` resource for the path-based routing logic to the service

```
kubectl get -f deathstar-svc.yaml
kubectl describe -f deathstar-svc.yaml
```


::: info
Cilium implements Gateway API resources using Envoy, and optimizes network paths with eBPF.
 
 :::

 ### Observability
 eBPF is used to collect data in the kernel, and Hubble acts as a frontend to query and visualize it.