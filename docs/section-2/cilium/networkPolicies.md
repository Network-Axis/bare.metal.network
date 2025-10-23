---
sidebar_position: 3
description: The equivalent of firewall rules
title: Network Policies
draft: true
---

- [Link to official tutorial](https://editor.cilium.io/)


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

![](https://play.instruqt.com/assets/tracks/ucdsyxm1sfzh/c8aefb5236f2b02b7c3d775ae88d8539/assets/identity_store.png)

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
:::tip To the point

Egress Gateway provides identity-based sNAT for Kubernetes workloads with deterministic IP addresses.

:::

specify which nodes should be used by a pod in order to reach the outside world.


This Cilium Egress Gateway policy targets pods labeled `org=empire`.
When these pods try to reach the `10.0.4.0/24` network, the traffic will leave the Kubernetes cluster through a node labeled `egress-gw=true`, masquerading the source IP from the net1 interface.

```
kubectl get node --show-labels
```


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



![](https://play.instruqt.com/assets/tracks/ylhikjm5qpjv/2c3d646c3afa919249c23a457a5248da/assets/egress_gw_schema.png)

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

The main issue when integrating with endpoints outside the Kubernetes cluster is identifying the source of the traffic.

For a database running outside the K8s cluster, you want to restrict access to specific applications.

When using [direct routing](./routing.md#2-native--direct-routing), external firewalls will still need to know which CIDR blocks are linked to the desired source workload. Using [IPAM](./IPAM.md) for this would not be scalable because we would have to assign entire IPAM CIDRs to the namespaces with the workloads. Instead, Egress Gateway allows us to associate a known IP or IP range to exit the cluster depending on the source identity.



Associate CIDR w/ K8s workload

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


---

```shell
kubectl get ciliumidentities --show-labels
```