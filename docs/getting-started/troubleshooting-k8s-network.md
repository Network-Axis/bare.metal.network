---
title: Troubleshooting a Kubernetes Network
---


The [netshoot](https://github.com/nicolaka/netshoot) image contains many tools to debug network connectivity. 

| Use case                                     | Kubernetes Networking             |
|---------------------------------------------|----------------------------------|
| check TCP/IP connectivity                   | ping                             |
| check HTTP connectivity                     | curl                             |
| check the status of the network             | kubectl or cilium CLI            |
| capture logs from network                   | kubectl logs                     |
| capture traffic patterns and bandwidth usage| Hubble                           |
| analyze network traffic                     | tcpdump/Wireshark/Hubble         |
| generate traffic for performance testing    | iperf                            |

To deploy an ephemeral container:
```shell
kubectl debug <pod> -it --image=nicolaka/netshoot -- tcpdump -i eth0
```