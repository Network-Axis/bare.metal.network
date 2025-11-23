---
draft: true
---

# Cilium

The Cilium CLI tool can be used to install, manage, and configure Cilium.

Cilium's configuration is stored in two separate entities:
1. ConfigMap: stores Cilium configuration that is considered non-confidential. The name of the ConfigMap is `cilium-config`.
```shell
kubectl get -n kube-system configmap cilium-config -o yaml
```
2. Custom Resource Definitions (CRDs): define and manage Cilium policies for network security, BGP, etc. Examples include `CiliumNetworkPolicies` and `CiliumBGPPeeringPolicies`.

---

- A DHCP server allocates IP addresses to a server as it comes online
- Nodes receive their IP addresses over DHCP
- Pods use IP Address Management (IPAM).

- The CNI is responsible for assigning an IP address to a pod.
- The IP assigned to a pod comes from a subnet referred to as `PodCIDR`.
- Classless Inter-Domain Routing (CIDR).

[^1]: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
