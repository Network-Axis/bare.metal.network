---
draft: true
---

:::info
Dual Stack IPv4/IPv6 are supported since Kubernetes 1.23.

In a Dual Stack cluster, Cilium advertise both routes over BGP.

To verify that both IPv4 and IPv6 have been activated in the cluster:

```
root@server:~# cilium config view | grep -i 'enable-ipv. '
enable-ipv4                                       true
enable-ipv6                                       true
```

:::

```yaml {12}
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/name: deathstar
  name: deathstar
  namespace: batuu
  labels:
    org: empire
spec:
  type: LoadBalancer
  ipFamilyPolicy: RequireDualStack
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
      name: http
  selector:
    org: empire
    class: deathstar
```

```x title="kubectl -n batuu describe pods -l class=deathstar | grep -A 2 IPs"
IPs:
  IP:           10.1.1.94
  IP:           fd00:10:1:1::3d7d
--
IPs:
  IP:           10.1.2.88
  IP:           fd00:10:1:2::35f
```

```yaml title="lb-pool.yaml"
---
apiVersion: "cilium.io/v2alpha1"
kind: CiliumLoadBalancerIPPool
metadata:
  name: "empire-ip-pool"
spec:
  blocks:
    - cidr: "172.18.255.200/29"
    - cidr: "2001:db8:dead:beef::0/64"
  serviceSelector:
    matchLabels:
```
