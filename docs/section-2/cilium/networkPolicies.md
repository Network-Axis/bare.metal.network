---
sidebar_position: 3
description: The equivalent of firewall rules
title: Network Policies
draft: true
---

- Network Policies are implemented by the CNI.
- Standard Network Policies define how a pod can communicate with various entities.
- Filter based on Layer 3 (IP addresses) or Layer 4 (Port and Protocol).
- Use `podSelector` to determine what entities the filters will apply to. If empty, it applies to all pods in the namespace.
- `ingress` block indicates the rules apply to traffic entering into the ...
- Traditional IP-based firewalling approaches are going to be mostly ineffective since the IP addresses of pods are unpredictable.
`CiliumNetworkPolicies` offer advanced Layer 7 filtering.
`CiliumNetworkPolicies` do not replace a web-facing firewall or an advanced IDS/IPS

---

Cilium's approach to security is based on identities rather than IP addresses.
Identities are derived from labels and other metadata that are assigned to pods.
For example, we would create a rule allowing traffic from a pod with the label `role=frontend` to connect to any pod with the label `role=backend`.


## Layer 7 filtering
Cilium Network Policies also provide application visibility and control using Layer 7 filtering.
- Parameter examples: HTTP path, method, domain names.

- Cilium Network Policies filter: 
    - pod-to-pod traffic within a cluster
    - pod-to-service traffic
    - Pod Ingress and Egress to External IPs

`CiliumNetworkPolicy` is scoped to a namespace, so it cannot directly control node-to-node traffic.
`CiliumClusterwideNetworkPolicy`, on the other hand, is scoped to a cluster.

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

---

L3/L4 (IP, TCP/UDP) rules are enforced for the host, but L7 filtering is not supported.

Host processes are not managed by Kubernetes, so they visibility into an application’s socket-level traffic, and also lack metadata (e.g. labels). We discussed earlier how Cilium's Network Policy is based on identity.


---

## Egress Gateway

- Enables external-facing firewall to control Internet-bound traffic from the cluster.

- Egress Gateway is a Kubernetes-Aware Source-NAT:
    - Force traffic to exitvia a certain interface and NATed with a specific IP (enabling the firewall to apply a rule)
    - Distinguish traffic between nodes and pods, and make it granular down to the namespace.

- The Egress node becomes a single point of failure.
- Enterprise edition supports multiple egress nodes, and will load balance the egress gateways.


---

Cilium Enforcement modes for NetworkPolicies:

| Mode     | Enforce If Policy Exists | Default Action Without Policy | Use Case                        |
|----------|---------------------------|-------------------------------|---------------------------------|
| default  | Yes                       | Allow                         | General-purpose usage           |
| never    | No                        | Allow                         | Auditing / Testing              |
| always   | Yes                       | Deny                          | High-security, zero-trust model |

<details>
<summary> Enforcement in-depth </summary>

### `default`
    - **Behavior**: Network policies are enforced only if they exist. If no policy applies to the endpoint, all traffic is allowed.
    - **Implication**: Once a policy is attached to an endpoint, enforcement kicks in — only traffic explicitly allowed by the policy is permitted. If no policies match, traffic is not denied by default.
    - **Use case**: This is the standard mode and is often the default behavior.

---

### `never`
    - **Behavior**: Cilium does not enforce any policy, regardless of whether one is defined.
    - **Implication**: All traffic is allowed, making it useful for auditing or testing policies without enforcing them.
    - **Use case**: Ideal for staging environments or when testing the impact of policies before enabling enforcement.

---

### `always`
    - **Behavior**: Cilium enforces policies even if none are defined.
    - **Implication**: In the absence of a matching policy, all traffic is dropped. This ensures that traffic is only allowed when explicitly permitted.
    - **Use case**: Highly secure environments where a deny-by-default stance is necessary, enforcing zero trust by default.

</details>

Enterprise Edition of Cilium: Hubble lists all the flows in the cluster, and a NetworkPolicy can be created by clicking on the flow.