# Relevant RFCs

A selection of RFC documents related to the technologies in this course:

- **RFC 7938:** *Use of BGP for Routing in Large-Scale Data Centers* – Documents design and operational experience for using BGP in Clos data center networks [oai_citation:2‡docs.nvidia.com](https://docs.nvidia.com/networking-ethernet-software/cumulus-linux-44/Layer-3/Border-Gateway-Protocol-BGP/#:~:text=BGP%20is%20an%20increasingly%20popular,BGP%20in%20the%20data%20center).
- **RFC 5549:** *Advertising IPv4 NLRI with an IPv6 Next Hop* – Allows BGP to carry IPv4 routes with IPv6 next-hop addresses (foundation of BGP unnumbered) [oai_citation:3‡blog.ipspace.net](https://blog.ipspace.net/2022/11/bgp-unnumbered-duct-tape/#:~:text=We%20know%20that%20unnumbered%20BGP,now%20RFC%208950).
- **RFC 5880:** *Bidirectional Forwarding Detection (BFD)* – Defines the BFD protocol for fast detection of faults between two forwarding engines.
- **RFC 5881:** *BFD for IPv4 and IPv6 (Single Hop)* – Details using BFD in a single-hop environment (e.g., between adjacent routers).
- **RFC 8950:** *Advertising IPv4 Routes with IPv6 Next Hops* – Updates RFC 5549, with clarifications for IPv4/IPv6 interworking in BGP.
- **RFC 9199:** *Forwarding Layer Managed Service Chaining* – Discusses considerations for service function chaining in networks (provides context though our approach uses eBPF rather than segment routing).

These RFCs provide deeper context and background. While not required reading for the course, they are excellent resources if you want to understand the wider industry practices and standards underlying our implementations.