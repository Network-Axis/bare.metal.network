---
title: Introduction to Egress Gateway
---

:::tip To the point

Egress Gateway provides identity-based sNAT for Kubernetes workloads with deterministic IP addresses.

:::

When using [direct routing](./cilium/routing.md#2-native--direct-routing), external firewalls will still need to know which CIDR blocks are linked to the desired source workload.
Using [IPAM](./cilium/IPAM.md) for this would not be scalable because we would have to assign entire IPAM CIDRs to the namespaces with the workloads.
Instead, Egress Gateway allows us to associate a known IP or IP range to exit the cluster depending on the source identity.

For a database running outside the K8s cluster, this would allow you to restrict access to specific applications. The main issue when integrating with endpoints outside the Kubernetes cluster is identifying the source of the traffic.

![](https://play.instruqt.com/assets/tracks/ylhikjm5qpjv/2c3d646c3afa919249c23a457a5248da/assets/egress_gw_schema.png)


This Cilium Egress Gateway policy targets pods labeled `org=empire`.
When these pods try to reach the `10.0.4.0/24` network, the traffic will leave the Kubernetes cluster through a node labeled `egress-gw=true`, masquerading the source IP from the `net1` interface.

```yaml
apiVersion: cilium.io/v2
kind: CiliumEgressGatewayPolicy
metadata:
  name: remote-outpost
spec:
  destinationCIDRs:
    - "10.0.4.0/24"
  selectors:
    - podSelector:
        matchLabels:
          org: empire
  egressGateway:
    nodeSelector:
      matchLabels:
        egress-gw: 'true'
    interface: net1
```

This manifest specifies which node(s) should be used by a pod in order to reach the outside world.

To show which nodes have the assigned label, run:
```shell
kubectl get node --show-labels
```
