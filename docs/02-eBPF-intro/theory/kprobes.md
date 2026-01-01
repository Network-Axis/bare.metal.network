---
title: kprobes (legacy)
draft: true
---

::: note
krpobes are a legacy option. See [Function Entry and Exit)](./function-enter-exit.md) for the modern way.

:::


kprobes allow users to define custom callback functions into almost all functions in the kernel or modules

When the kernel execution flow reaches the specified probe function, it will invoke the callback function

The kernel will then return to the normal execution flow.

The probes can be dynamically removed, having minimal impact on the kernel execution flow.

`kprobe` provides three callback modes for probes:
1. pre_handler: called before the probed instruction is executed
2. post_handler: called after the probed instruction is completed
3. fault_handler: called when a memory access error occurs


`jprobe` is based on `kprobe` and is used to obtain the input values of the probed function.

`kretprobe` is also based on `kprobe` and is used to obtain the return values of the probed function.


## Hardware requirements (remove this section)
- CPU exception handling is used to make the program's execution flow enter the user-registered callback function
- single-step debugging is used to single-step execute the probed instruction.


---

"If an inline function is used as a probe point, `kprobes` may not be able to guarantee that probe points are registered for all instances of that function.
Since `gcc` may automatically optimize certain functions as inline functions, the desired probing effect may not be achieved." - https://eunomia.dev/tutorials/2-kprobe-unlink/

kretprobe is implemented by replacing the return address with the pre-defined trampoline address, so stack backtraces and gcc inline function __builtin_return_address() will return the address of the trampoline instead of the actual return address of the probed function;

---

`kprobe` traces kernel functions before the syscall execution, while `kretprobe` invokes the eBPF program after the syscall execution. Same with `uprobe` and `uretprobe` for userspace.