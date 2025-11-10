---
sidebar_position: 1
description: The equivalent of firewall rules
title: Introduction to Network Policies
draft: true
---

:::warning Word of Caution

While Cilium Network Policies offer advanced Layer 7 filtering, they do not replace a web-facing firewall or an advanced IDS/IPS.

:::

Cilium's approach to security is based on identities rather than IP addresses.
Identities are derived from labels and other metadata that are assigned to pods.
For example, we would create a rule allowing traffic from a pod with the label `role=frontend` to connect to any pod with the label `role=backend`.

![](https://play.instruqt.com/assets/tracks/ucdsyxm1sfzh/c8aefb5236f2b02b7c3d775ae88d8539/assets/identity_store.png)


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


Cilium Network Policies also provide application visibility and control using Layer 7 filtering.
- Parameter examples: HTTP path, method, domain names.

- Cilium Network Policies filter: 
    - pod-to-pod traffic within a cluster
    - pod-to-service traffic
    - Pod Ingress and Egress to External IPs

- Traditional IP-based firewalling approaches are going to be mostly ineffective since the IP addresses of pods are unpredictable.

- Standard Network Policies define how a pod can communicate with various entities.
- Filter based on Layer 3 (IP addresses) or Layer 4 (Port and Protocol).


- Use `podSelector` to determine what entities the filters will apply to. If empty, it applies to all pods in the namespace.
- `ingress` block indicates the rules apply to traffic entering into the ...



L3/L4 (IP, TCP/UDP) rules are enforced for the host, but L7 filtering is not supported.

Host processes are not managed by Kubernetes, so they visibility into an application’s socket-level traffic, and also lack metadata (e.g. labels). We discussed earlier how Cilium's Network Policy is based on identity.

---



Enterprise Edition of Cilium: Hubble lists all the flows in the cluster, and a NetworkPolicy can be created by clicking on the flow.


---

```shell
kubectl get ciliumidentities --show-labels
```

`CiliumNetworkPolicy` is scoped to a namespace, so it cannot directly control node-to-node traffic.
`CiliumClusterwideNetworkPolicy`, on the other hand, is scoped to a cluster.