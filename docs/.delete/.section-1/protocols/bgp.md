---
title: Border Gateway Protocol
draft: true
sidebar_position: 3
---

Cilium natively supports BGP and enables you to set up BGP peering with network devices and advertise Kubernetes IP ranges (Pod CIDRs and Service IPs) to the broader (data center) network.

Cilium is configured to peer with BGP using `CiliumBGPClusterConfig` resources.

The key aspects of the policy are:

- the remote peer IP address (peerAddress) and AS Number (peerASN)
- your own local AS Number (localASN)

BGP sessions will be eBGP (external BGP) if the Autonomous System (AS) numbers are different.


``` yaml title="kubectl get ciliumbgpclusterconfig control-plane -o yaml | yq '.spec'" {12-26}
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPClusterConfig
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"cilium.io/v2alpha1","kind":"CiliumBGPClusterConfig","metadata":{"annotations":{},"name":"control-plane"},"spec":{"bgpInstances":[{"localASN":65001,"name":"instance-65001","peers":[{"name":"peer-65000","peerASN":65000,"peerAddress":"fd00:10:0:1::1","peerConfigRef":{"name":"generic"}}]}],"nodeSelector":{"matchLabels":{"kubernetes.io/hostname":"kind-control-plane"}}}}
  creationTimestamp: "2025-10-22T15:35:54Z"
  generation: 1
  name: control-plane
  resourceVersion: "1106"
  uid: f037e901-66e9-4019-ba10-9a1ecc836885
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
status:
  conditions:
  - lastTransitionTime: "2025-10-22T15:35:54Z"
    message: ""
    observedGeneration: 1
    reason: ConflictingClusterConfigs
    status: "False"
    type: cilium.io/ConflictingClusterConfig
  - lastTransitionTime: "2025-10-22T15:35:55Z"
    message: ""
    observedGeneration: 1
    reason: MissingPeerConfigs
    status: "False"
    type: cilium.io/MissingPeerConfigs
  - lastTransitionTime: "2025-10-22T15:35:54Z"
    message: No node matches spec.nodeSelector
    observedGeneration: 1
    reason: NoMatchingNode
    status: "False"
    type: cilium.io/NoMatchingNode
```




```shell
kubectl get ciliumbgpclusterconfig
```


:::note CLI: `cilium bgp peers` and `cilium bgp routes`

Verify that the sessions have been established and that routes are learned

:::
