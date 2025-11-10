---
sidebar_position: 2
title: Routing
draft: true
---

# Networking
Cilium provides two methods to connect pods on different nodes in the same cluster

## 1. Encapsulation / Overlay
> The underlying network must support IPv4. IPv6-based tunneling in a work-in-progress.

A network overlay (either VXLAN or GENEVE) is created in the cluster, and a group of tunnels is created between all the nodes.

Using this method, there is no reliance on the underlying network: the network that connects nodes does not need to be aware of the PodCIDRs configuration.
As long as the nodes can communicate, the Pods can as well.
This also increases the the pool of IP addresses available to Pods, since there is no dependence on the underlying network.
Additionally, new nodes that join the cluster are automatically added to overlay.


This auto-configuration provides simplicity, as risks of CIDR clashes are limited.
Connections to outside the cluster will be source-NATed by Cilium nodes (traffic will appear to come form the node where the pod is deployed, unless using [Egress Gateway](./networkPolicies.md#egress-gateway)).

One drawback is that network overlays (or encapsulation in general) adds overhead to every packet.

See [Encapsulation](./encapsulation.md)

## 2. Native / Direct routing
Packets sent by the pods would be routed based on the node's networking configuration.
Therefore, the host network of each node must know how to forward/route packets to the PodCIDRs.
On a single flat L2 network, the `auto-direct-node-routes: true` option can be enabled to allow Cilium to advertise the PodCIDR to every node using ARP.
Otherwise, an external router or internal [BGP](./gatewayAPI.md#border-gateway-protocol-bgp) daemon must be configured.




Yields better performance.
No source-NAT
external endpoints see the Pod's IP as source.
Cluster nodes need a method to exchange routing tables

---

# QoS
- Priority Marker for preferential treatment
- Congestion management on egress
- Congestion avoidance (Building Secure & Reliable Systems refers to this as water shedding)
- Traffic Shaping: throughput management

QoS within the physical network is out of scope for Cilium.


- QoS is performed on the node;s network interface.
- All pods on a node typically share a single network interface, which could lead to resource starvation if a pod were to consume too much bandwidth.

Cilium Bandwidth Manager can add

Pod annotations are used to shape the egress traffic of the pod.





---


Desired State:

![](https://play.instruqt.com/assets/tracks/gggstirg1fvs/651232f082f7d5086a6fe575a67cb640/assets/lb_4nodes_rebel-base.png)

:::info

The Isovalent Load Balancer features a two-tier architecture operating respectively at Layer 3/4 and Layer 7. In this lab, it has been set up with 4 nodes: 2 tier-1 and 2 tier-2.

Each of these types of nodes can be scaled independently by adding new nodes to the cluster.

:::

The `LBVIP` resource defines the virtual IP and port clients will connect to:
```yaml
---
apiVersion: isovalent.com/v1alpha1
kind: LBVIP
metadata:
  namespace: default
  name: https-proxy
spec:
  ipv4Request: "100.64.0.101"
```


The `LBService` ties them together, specifying the load balancing algorithm and linking the VIP to the backend pool.

`spec.applications.httpsProxy.tlsConfig` points to the secret containing the SSL certificate to use for TLS termination
`spec.applications.routes[].match.hostNames` specifies the host name to match with SNI for routing

```yaml
---
apiVersion: isovalent.com/v1alpha1
kind: LBService
metadata:
  namespace: default
  name: https-proxy
spec:
  vipRef:
    name: https-proxy
  port: 443
  applications:
    httpsProxy:
      tlsConfig:
        certificates:
          - secretRef:
              name: "https-proxy"
      routes:
        - match:
            hostNames:
              - "https-proxy.acme.io"
          backendRef:
            name: https-proxy
          persistentBackend:
          headers:
              - name: sticky
      auth:
        basic:
          users:
            secretRef:
              name: base-users
```

Example with TLS Passthrough

```
  applications:
    tlsPassthrough:
      routes:
        - match:
            hostNames:
              - "deathstar.empire.galaxy"
          backendRef:
            name: deathstar
```

The `LBBackendPool` lists the actual application servers and how load balancers will check their health.
```yaml
---
apiVersion: isovalent.com/v1alpha1
kind: LBBackendPool
metadata:
  namespace: default
  name: https-proxy
spec:
  backendType: IP
  healthCheck:
    intervalSeconds: 2
    timeoutSeconds: 2
    http:
      path: "/health"
  backends:
    - ip: 172.18.0.7
      port: 8080
    - ip: 172.18.0.8
      port: 8080
      weight: 2
  loadbalancing:
    algorithm:
      consistentHashing: {}
```

Instead of http, use
```
  healthCheck:
    intervalSeconds: 30
    timeoutSeconds: 30
    tcp: {}
```


The `IsovalentBGPAdvertisement` configuration ensures that the LBVIP IP Address is advertised to the datacenter using BGP.
```yaml
---
apiVersion: isovalent.com/v1alpha1
kind: IsovalentBGPAdvertisement
metadata:
  name: https-proxy
  labels:
    advertise: https-proxy
spec:
  advertisements:
    - advertisementType: "Service"
      service:
        addresses:
          - LoadBalancerIP
      selector:
        matchExpressions:
          - { key: loadbalancer.isovalent.com/vip-name, operator: In, values: ["https-proxy"] }
```

:::info

To match any LB service, update spec.advertisements.advertisementType.selector.matchExpressions to:
```yaml
{key: somekey, operator: NotIn, values: ["never-used-value"]}
```

:::


the `IsovalentBGPClusterConfig` resource configures Cilium to peer with the FRR container, which has address 192.168.121.201.
the `IsovalentBGPPeerConfig` configures that peering by linking to two other types of resources:
`IsovalentBGPAdvertisement` resources with label advertisement=ilb, which announces IPv4 Load Balancer IP of all services.
the `IsovalentBFDProfile` named router-bfd to tune the BGP protocol.

```yaml
---
apiVersion: isovalent.com/v1
kind: IsovalentBGPClusterConfig
metadata:
  name: router-bgp
spec:
  nodeSelector:
    matchLabels:
      service.cilium.io/node: t1
  bgpInstances:
    - name: instance0
      localASN: 64512
      peers:
        - name: peer0
          peerAddress: 192.168.121.201
          peerASN: 64512
          peerConfigRef:
            name: router-peer-config
---
apiVersion: isovalent.com/v1
kind: IsovalentBGPPeerConfig
metadata:
  name: router-peer-config
spec:
  families:
    - afi: ipv4
      safi: unicast
      advertisements:
        matchLabels:
          advertisement: ilb
  bfdProfileRef: router-bfd
---
apiVersion: isovalent.com/v1
kind: IsovalentBGPAdvertisement
metadata:
  name: ilb-service-advertisement
  labels:
    advertisement: ilb
spec:
  advertisements:
    - advertisementType: Service
      service:
        addresses:
          - LoadBalancerIP
      selector:
        matchExpressions:
          # match any LB service
          - {key: somekey, operator: NotIn, values: ["never-used-value"]}
---
apiVersion: isovalent.com/v1alpha1
kind: IsovalentBFDProfile
metadata:
  name: router-bfd
spec:
  detectMultiplier: 3
  receiveIntervalMilliseconds: 300
  transmitIntervalMilliseconds: 300
```

Cilium's LB-IPAM subsystem assigns the specific IP address to the service using service annotations


`lbipam.cilium.io/ips: 100.64.0.101` assigns the specific IP address to the service using Cilium's LB-IPAM subsystem.
`lbipam.cilium.io/sharing-key: rebel-base` enables the application service to share its IP with the VIP service.
`service.cilium.io/no-advertisement: "true"` prevents the VIP itself from being advertised via BGP; instead, each service is advertised individually.


```yaml
apiVersion: "cilium.io/v2alpha1"
kind: CiliumLoadBalancerIPPool
metadata:
  name: "lb-pool"
spec:
  blocks:
    - cidr: "100.64.0.0/24"
```

```shell
cilium lb status
```


All T1 nodes should receive the `100.64.0.101/32` route to be able to advertise the VIP:


![](https://play.instruqt.com/assets/tracks/gggstirg1fvs/02441865699769c81f4b50320ecd5d38/assets/lb_resources_rebel-base.png)



TLS/SSL encrypts data between clients and servers, protecting it from eavesdropping and tampering. It is crucial for maintaining privacy, data integrity, and trust in digital communications. TLS 1.3 is recommended for its modern features and efficiency.



TLS Passthrough forwards encrypted traffic directly to backend servers, preserving end-to-end encryption and ensuring data privacy with minimal load balancer intervention.

🔑 TLS Termination
TLS Termination decrypts traffic at the load balancer, reducing backend workload and enabling efficient routing. Internal communication must still be secured.


SSL Authentication verifies the identities of clients and servers, establishing trust. Mutual TLS (mTLS) enhances security by requiring certificates from both sides.

External backend using TLS Passthru:

```yaml
spec:
  healthCheck:
    tcp: {}
  backends:
    - host: swapi.dev
      port: 443
  backendType: "Hostname"
  dnsResolverConfig:
    resolvers:
      - ip: 1.1.1.1
        port: 53
```