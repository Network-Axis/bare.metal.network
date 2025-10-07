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

---

## Troubleshooting

| Use case                                     | Kubernetes Networking             |
|---------------------------------------------|----------------------------------|
| check TCP/IP connectivity                   | ping                             |
| check HTTP connectivity                     | curl                             |
| check the status of the network             | kubectl or cilium CLI            |
| capture logs from network                   | kubectl logs                     |
| capture traffic patterns and bandwidth usage| Hubble                           |
| analyze network traffic                     | tcpdump/Wireshark/Hubble         |
| generate traffic for performance testing    | iperf                            |

It may be necessary to deploy an ephemeral container. The [netshoot](https://github.com/nicolaka/netshoot) image contains many of the tools detailed above. This can be accomplished with the following command:

```
kubectl debug <pod> -it --image=nicolaka/netshoot -- tcpdump -i eth0
```