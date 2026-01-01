---
title: First Program
draft: true
---

First, we import necessary header files such as vmlinux.h, bpf_helpers.h, bpf_tracing.h, and bpf_core_read.h. Then, we define a license to allow the program to run in the kernel.

```c
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

char LICENSE[] SEC("license") = "Dual BSD/GPL";
```
