---
title: Global Variables
draft: true
---

Global variables in eBPF are stored in the data section of compiled eBPF programs.
When you load the eBPF program into the kernel, these variables get their initial values.
The neat part is that user-space can modify these values before the program starts running, effectively passing configuration parameters into your kernel code.
When the eBPF program is loaded into the kernel and executed, these global variables are retained in the kernel and can be accessed through BPF system calls.