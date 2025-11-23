---
title: Service Function Chaining with Netkit
description: Building and operating multi-function network service chains
draft: true
tags: ["cilium 1.16"]
---


|**Function**|**Layer**|**Description**|
|---|---|---|
|Packet Filtering|L3/L4|Drop/allow packets based on IP, port, protocol (firewall)|
|Routing/Forwarding|L3|Determine next-hop or interface and forward the packet|
|NAT (Network Address Translation)|L3/L4|Modify source/destination IP/port in transit|
|Encapsulation/Decapsulation|L2/L3|Add/remove tunnel headers (e.g., VXLAN, GRE)|
|Traffic Shaping/Policing|L2/L3|Limit bandwidth or enforce rate limits per flow/class|
|Load Balancing|L4/L7|Distribute traffic across backends or services|
|Packet Mirroring|L2/L3|Copy packets to a monitoring interface or buffer|
|TLS Offload / Proxying|L7|Terminate or inspect encrypted traffic (rare in eBPF)|
|Flow Classification|L3-L7|Identify sessions and categorize traffic (QoS, DPI)|

![](/img/cilium/sfc.png)