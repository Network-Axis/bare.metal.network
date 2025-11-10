import CodeBlock from '@theme/CodeBlock';

By default, all workloads can communicate with each other without restrictions, regardless of their namespace.

Kubernetes namespaces are a useful way to organize workloads.

- use labels to secure the access.

```yaml title="k8s-network-policy.yaml" showLineNumbers {5-9}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deathstar-allow-empire
spec:
  podSelector:
    matchLabels:
      org: empire
      class: deathstar
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              org: empire
      ports:
        - port: 80
          protocol: TCP
```

The `spec.podSelector` indicates to which identity this rule applies. In this case, it applies to all pods tagged `org=empire` and `class=deathstar`.

<CodeBlock language="yaml" title="cilium-network-policy.yaml">
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: deathstar-allow-empire
  namespace: star-wars
spec:
  endpointSelector:
    matchLabels:
      class: deathstar
      org: empire
  ingress:
    - fromEndpoints:
        - matchLabels:
            org: empire
      toPorts:
        - rules:
            http:
              - path: /v1/request-landing
                method: POST
          ports:
            - port: "80"
              protocol: TCP
```
</CodeBlock>

:::info

Cilium implements the above policy in two tiers:

1. Enforce L3/L4 in the kernel using eBPF
2. If the L3/L4 rules pass, send traffic to the Envoy proxy on the node to enforce L7 rules

:::

While L3/L4 rules enforced via eBPF lead to dropped packets, L7 rules applied by Envoy return denied codes for the application protocol. In this case, we're parsing HTTP traffic so it returns 403 for a denied request.

Envoy provides powerful features such as traffic routing, retries, and observability, ensuring efficient handling of HTTP and gRPC traffic.




<CodeBlock language="yaml" title="k8s-network-policy.yaml">{`
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deathstar-allow-empire
spec:
  podSelector:
    matchLabels:
      org: empire
      class: deathstar
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              org: empire
      ports:
        - port: 80
          protocol: TCP
`}</CodeBlock>



applying a Network Policy to a namespace affects only the pods selected by that policy.

By default, any traffic not explicitly allowed by the applied Network Policies is denied for those pods.

kubectl -n star-wars diff -f cilium-network-policy-ingress.yaml


```diff
-  generation: 1
+  generation: 2
   name: deathstar-allow-empire
   namespace: star-wars
   resourceVersion: "23726"
   uid: c90ff400-8b81-4cf3-8f0e-5fd53eb0bfbd
 spec:
+  description: L7 policy to restrict access to specific HTTP call
   endpointSelector:
     matchLabels:
       class: deathstar
       org: empire
   ingress:
+  - fromEntities:
+    - ingress
   - fromEndpoints:
     - matchLabels:
         org: empire
```


:::info
The ingress Entity is used for any traffic involving Envoy, whether it is controlled via an Ingress, a Gateway, or GAMMA.

:::

Cilium uses the labels assigned to pods to define security policies.


Secure access to pods with a specific label
```yaml
spec:
  podSelector:
    matchLabels:
      org: empire
      class: deathstar
```

Allow only traffic from pods tagged with specific labels. This occurs at L3 and uses eBPF.
```yaml
spec:
  ingress:
    - from:
        - podSelector:
            matchLabels:
              org: empire
```

Allow only TCP/80 traffic. This occurs at L4 and uses eBPF.
```
spec:
  ingress:
      ports:
        - port: 80
          protocol: TCP
```


---

 layer 3 (IP protocol) 
 layer 4 (TCP protocol)

 often referred to as a L3/L4 network security policy


We can use Network Policies to restrict access and enforce least-privilege isolation between microservices.
We achieve this by specifying which HTTP requests are allowed.