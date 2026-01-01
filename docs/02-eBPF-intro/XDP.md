---
draft: true
---

XDP Programs on packets almost immediately upon receipt, before a socket buffer is allocated


XDP programs operate on raw ethernet frames immediately after a packet is received, while regular eBPF programs operate on sk_buff (socket buffer) structs.

sk_buffs are easier to work with, as they expose additional metadata and helper functions that facilitate packet parsing and modification.

Source: https://www.samd.is/2022/06/13/egress-XDP.html