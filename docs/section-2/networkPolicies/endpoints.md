---
title: Endpoints
sidebar_position: 3
---

`kubectl get ciliumendpoints --all-namespaces --show-labels` can be used to retrieve all endpoints managed by Cilium.

```
root@server:~# kubectl get cep --all-namespaces
NAMESPACE            NAME                                      SECURITY IDENTITY   ENDPOINT STATE   IPV4           IPV6
default              deathstar-86f85ffb4d-7d86t                4916                ready            10.244.1.238   
default              deathstar-86f85ffb4d-dxp9z                4916                ready            10.244.2.32    
default              tiefighter                                48742               ready            10.244.1.197   
default              xwing                                     1071                ready            10.244.2.34    
kube-system          coredns-674b8bbfcf-4wzs9                  25125               ready            10.244.0.131   
kube-system          coredns-674b8bbfcf-cbk2f                  25125               ready            10.244.0.135   
local-path-storage   local-path-provisioner-7dc846544d-rp98n   3532                ready            10.244.0.216   
```

Associate CIDR w/ K8s workload

- Enables external-facing firewall to control Internet-bound traffic from the cluster.

- Egress Gateway is a Kubernetes-Aware Source-NAT:
    - Force traffic to exitvia a certain interface and NATed with a specific IP (enabling the firewall to apply a rule)
    - Distinguish traffic between nodes and pods, and make it granular down to the namespace.

- The Egress node becomes a single point of failure.
- Enterprise edition supports multiple egress nodes, and will load balance the egress gateways.
