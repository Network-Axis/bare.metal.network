---
title: Working with Netkit
sidebar_position: 3
draft: true
---

```shell
export PRIMARY_INTERFACE=nk-host
export PEER_INTERFACE=nk-container
export NETWORK_NAMESPACE=lab

# 1) create the namespace and the netkit pair
sudo ip netns add "$NETWORK_NAMESPACE"
sudo ip link add "$PRIMARY_INTERFACE" type netkit blackhole peer blackhole name "$PEER_INTERFACE"

# 2) move the peer into the namespace
sudo ip link set "$PEER_INTERFACE" netns "$NETWORK_NAMESPACE"

# 3) configure IPv6 inside the namespace
sudo ip netns exec "$NETWORK_NAMESPACE" ip link set lo up
sudo ip netns exec "$NETWORK_NAMESPACE" ip link set "$PEER_INTERFACE" up
sudo ip link set "$PRIMARY_INTERFACE" up

# 4) verify the auto-assigned link-locals
sudo ip netns exec "$NETWORK_NAMESPACE" ip -6 addr show dev "$PEER_INTERFACE"
ip -6 addr show dev "$PRIMARY_INTERFACE"
```
