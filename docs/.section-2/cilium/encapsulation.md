---
draft: true
---

# GENEVE Encapsulation

In the Cilium helm chart, summarize the correlation between the following options based on comments and/or other authoritative sources:

```
routingMode
tunnelProtocol
loadBalancer.mode
loadBalancer.dsrDispatch
```

Now explain how GENEVE is used in the context of NFVs (more specifically, CNFs) and SFC. What are the pros/cons of using `routingMode=tunnel` vs `routingMode=native`, but still using GENEVE via
```
tunnelProtocol=geneve
loadBalancer.mode=dsr
loadBalancer.dsrDispatch=geneve
```

## NFVs, CNFs, and SFCs

In NFV, traditional hardware-based network functions (like firewalls, load balancers, etc.) are virtualized. When this model is containerized (e.g., with CNFs), you still need advanced packet steering, traffic classification, and metadata propagation, even across distributed cloud-native systems.

GENEVE was designed with maximum extensibility. Its key advantage over VXLAN is its support for arbitrary metadata via TLVs (Type-Length-Value fields). This is critical for NFV because you often need to pass contextual information with each packet (e.g., tenant ID, QoS, service function path).

SFC is a model where packets are routed through an ordered list of service functions (like firewall → DPI → NAT → LB), rather than via fixed IP-based routing. GENEVE effectively encodes the service function path into the packet, so that each CNF along the chain knows how to handle it — without relying on complex SDN controller interventions for every hop.

### How This Looks in Practice

Each CNF or VNF reads the TLVs to:
- Identify the flow
- Determine whether it’s the next in the chain
- Apply relevant policy
- Forward to the next CNF or SFC hop

```
+------------------------------+
| Outer IP/UDP (transport)     |
+------------------------------+
| GENEVE Header                |
|  - VNI (Tenant ID)           |
|  - TLVs:                     |
|     - SFC path ID            |
|     - Current service index  |
|     - QoS tag                |
+------------------------------+
| Inner Ethernet Frame         |
| (original L2/L3 packet)      |
+------------------------------+
```

### Cilium Configuration
Cilium also supports Direct Server Return (DSR) in conjunction with GENEVE encapsulation. This configuration allows for efficient load balancing by enabling backend pods to respond directly to clients, bypassing the load balancer for return traffic.

```
routingMode=tunnel // or native
tunnelProtocol=geneve
loadBalancer.mode=dsr
loadBalancer.dsrDispatch=geneve
```

:::note
When GENEVE is specified in native routing mode, it will be used for the request path from the load balancer to the backend pod.
This encapsulation happens only for the DSR request dispatch, not for general pod-to-pod communication.
:::

---

Performance is dictated by:
- The configuration and the choice of network protocols
- The network interface cards
- The underlying hardware
- ...

- kube-proxy watches the k8s control plane to ensure that rules on the underlying OS packet filtering are up-to-date.
- kube-proxy manages network rules for routing traffic, including NAT, to ensure packets reach their intended destination.
- IPtables is sequential. Wasn't designed for the churn of K8s. Scaling results in performance strain.