---
sidebar_position: 5
draft: true
---

# DNS
- DNS is not part of the CNI's role.
- The built-in DNS server (coreDNS) automatically assigns names based on the namespace and cluster name.

- Pod: `10-244-1-234.default.pod.cluster.local` e.g. `ip.my-namespace.pod.my-cluster.local`
- Service: `my-service.my-namespace.svc.my-cluster.local`

## DNS Policies
DNS policies can be set on a per-Pod basis.
- `ClusterFirst`: If a DNS query does not match the cluster domain suffix, the request is forwarded to an upstream nameserver by the DNS server. This is the default policy.
- `ClusterFirstWithHostNet`: This allows a Pod to resolve services within the cluster, even when the Pod uses the node’s network interface (e.g. when `hostNetwork: true` is set in the Pod spec.) Otherwise, the behavior will fallback to the `Default` policy.
- `Default`: The configuration for DNS resolution is inherited by the node.
- `None`: DNS settings are not configured by Kubernetes, and must be provided in the `dnsConfig` field of the Pod spec.

:::note[Nodes don’t resolve Kubernetes services by default, but Pods do.]
:::

- `kubelet` configures the `/etc/resolv.conf` file on each Pod so containers can look up Services by name rather than IP. The Pod's DNS search list includes the Pod's own namespace and the cluster's default domain.
- Example: there are two namespaces: `prod` and `staging`. If a Pod named `google` exists in the `prod` namespace, to resolve it from `staging` we must specify: `google.prod`. Otherwise, simply querying `google` from the `staging` namespace will provide no results (if there is not a Pod named `google` in the `staging` namespace). `google.prod` can also be expanded to `google.prod.svc.cluster.local`.


[^1]: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
[^2]: https://github.com/kubernetes/dns/blob/master/docs/specification.md
[^3]: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/