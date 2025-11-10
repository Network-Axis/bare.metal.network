---
draft: true
---

Use the `LoadBalancer` Kubernetes Service type to expose Kubernetes applications outside of the cluster.

To allocate an IP address, you will need to configure a Cilium LB IP Pool, using the `CiliumLoadBalancerIPPool` CRD.

```yaml
---
apiVersion: "cilium.io/v2alpha1"
kind: CiliumLoadBalancerIPPool
metadata:
  name: "empire-ip-pool"
spec:
  blocks:
    - cidr: "2001:db8:dead:beef::0/64"
  serviceSelector:
    matchLabels:
      org: empire
```


```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPAdvertisement
metadata:
  labels:
    advertise: generic
  name: generic
spec:
  advertisements:
  - advertisementType: PodCIDR
  - advertisementType: Service
    selector:
      matchLabels:
        announced: bgp
    service:
      addresses:
      - LoadBalancerIP
```

The service will load balance traffic to all pods with labels ... e.g. `env=prod`.


```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    announced: bgp
    org: empire
  name: deathstar
  namespace: batuu
spec:
  allocateLoadBalancerNodePorts: true
  clusterIP: 10.2.216.60
  clusterIPs:
  - 10.2.216.60
  - fd00:10:2::fb24
  externalTrafficPolicy: Cluster
  internalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  - IPv6
  ipFamilyPolicy: RequireDualStack
  ports:
  - name: http
    nodePort: 30247
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    class: deathstar
    org: empire
  sessionAffinity: None
  type: LoadBalancer
status:
  conditions:
  - lastTransitionTime: "2025-10-24T00:55:31Z"
    message: ""
    reason: satisfied
    status: "True"
    type: cilium.io/IPAMRequestSatisfied
  loadBalancer:
    ingress:
    - ip: 172.18.255.200
      ipMode: VIP
    - ip: '2001:db8:dead:beef::'
      ipMode: VIP
```


```yaml
apiVersion: v1
items:
- apiVersion: cilium.io/v2alpha1
  kind: CiliumBGPClusterConfig
  metadata:
    annotations:
      kubectl.kubernetes.io/last-applied-configuration: |
        {"apiVersion":"cilium.io/v2alpha1","kind":"CiliumBGPClusterConfig","metadata":{"annotations":{},"name":"control-plane"},"spec":{"bgpInstances":[{"localASN":65001,"name":"instance-65001","peers":[{"name":"peer-65000","peerASN":65000,"peerAddress":"fd00:10:0:1::1","peerConfigRef":{"name":"generic"}}]}],"nodeSelector":{"matchLabels":{"kubernetes.io/hostname":"kind-control-plane"}}}}
    creationTimestamp: "2025-10-24T00:25:25Z"
    generation: 1
    name: control-plane
    resourceVersion: "1647"
    uid: 8ec83377-8ba1-4afd-b9b4-e6a81dfc75dd
  spec:
    bgpInstances:
    - localASN: 65001
      name: instance-65001
      peers:
      - name: peer-65000
        peerASN: 65000
        peerAddress: fd00:10:0:1::1
        peerConfigRef:
          group: cilium.io
          kind: CiliumBGPPeerConfig
          name: generic
    nodeSelector:
      matchLabels:
        kubernetes.io/hostname: kind-control-plane
```


```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPNodeConfig
metadata:
  creationTimestamp: "2025-10-24T00:25:25Z"
  generation: 1
  name: kind-control-plane
  ownerReferences:
  - apiVersion: cilium.io/v2alpha1
    controller: true
    kind: CiliumBGPClusterConfig
    name: control-plane
    uid: 8ec83377-8ba1-4afd-b9b4-e6a81dfc75dd
  resourceVersion: "7857"
  uid: 5ea3e4fa-8d8f-470d-82a6-956acc3e218b
spec:
  bgpInstances:
  - localASN: 65001
    name: instance-65001
    peers:
    - name: peer-65000
      peerASN: 65000
      peerAddress: fd00:10:0:1::1
      peerConfigRef:
        group: cilium.io
        kind: CiliumBGPPeerConfig
        name: generic
```

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPPeerConfig
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"cilium.io/v2alpha1","kind":"CiliumBGPPeerConfig","metadata":{"annotations":{},"name":"generic"},"spec":{"families":[{"advertisements":{"matchLabels":{"advertise":"generic"}},"afi":"ipv4","safi":"unicast"},{"advertisements":{"matchLabels":{"advertise":"generic"}},"afi":"ipv6","safi":"unicast"}]}}
  creationTimestamp: "2025-10-24T00:25:25Z"
  generation: 1
  name: generic
  resourceVersion: "1643"
  uid: 8ba80f75-17e8-40d9-8897-e8c5a8e8315f
spec:
  ebgpMultihop: 1
  families:
  - advertisements:
      matchLabels:
        advertise: generic
    afi: ipv4
    safi: unicast
  - advertisements:
      matchLabels:
        advertise: generic
    afi: ipv6
    safi: unicast
```