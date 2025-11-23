---
title: Implement a Network Policy on the Host
sidebar_position: 2
draft: true
---

## Node/Host Level Filtering
The host is treated as a cluster-wide entity, and does not belong to a specific namespace.
Therefore, we can use `CiliumClusterwideNetworkPolicy` to apply rules to the node.
This is referred to as a Host Policy.

For a Host Policy to be effective, Cilium’s Host Firewall feature must be enabled. This feature extends Network Policy enforcement to the host's ingress/egress traffic.

Set: `hostFirewall.enabled: true` to enable this feature.
These network policies will effect:
- Host processes
- Pods using `hostNetwork: true`
- Node-to-node and node-to-external traffic.

There are multiple ways to configure a Host Policy.

### Method 1: `endpointSelector`

This method is used to target pods and reserved identities. In the following example, `reserved:host` will target all nodes in a cluster.

```
spec:
    endpointSelector:
        matchLabels:
            "reserved:host": ""
```

<details>
<summary> Reserved Identities </summary>

Reserved Identities are especially useful when no Kubernetes label exists for the traffic source.

| Identity       | Description                                                                                                          |
|----------------|----------------------------------------------------------------------------------------------------------------------|
| world          | All traffic from or to outside the cluster                                                                           |
| cluster        | Internal cluster traffic between pods that are managed by Cilium                                                    |
| kube-apiserver | Allow or restrict traffic to/from the control plane                                                                  |
| host           | Matches traffic to/from the host, rather than a pod. This applies to all nodes in the cluster.                      |
| unmanaged      | Matches endpoints not managed by Cilium                                                                              |
| remote-node    | Node IPs of other Cilium-managed nodes; helpful for securing node-to-node traffic when using encrypted tunneling.   |

Reserved Identities are best used in `fromEntities` / `toEntities`, e.g.:

```
ingress:
- fromEntities:
  - world
```

</details>

### Method 2: `nodeSelector`
This is the recommended method. A Network Policy that uses `nodeSelector` targets specific nodes based on Kubernetes labels. This provides greater granularity in specifying which nodes to target.

```
spec:
    nodeSelector:
        matchLabels:
            node-access: example
```

:::tip
A label can be applied to a node using the following command: `kubectl label node my-node node-access=example`
:::
