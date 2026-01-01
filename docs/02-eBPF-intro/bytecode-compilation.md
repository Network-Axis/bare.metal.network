---
title: Bytecode Compilation
draft: true
---

The LLVM Clang compiler supports an eBPF backend that compiles C into bytecode.
Object files containing this bytecode can then be directly loaded with the `bpf()` system call and `BPF_PROG_LOAD` command.
Its signature is:
```
int bpf(int cmd, union bpf_attr *attr, unsigned int size);
```

- The `bpf_attr` union allows data to be passed between the kernel and user space
- The `size` argument gives the size of the `bpf_attr` union object in bytes.
- The format of data depends on the `cmd` argument

Commands can be broken down into three categories:
6. Commands for working with eBPF programs
7. Commands for working with eBPF maps
8. Commands for working with both programs and maps (collectively known as objects).

The object file (eBPF bytecode) emitted by Clang needs to be loaded by a program that runs natively on your machine.

---

- Run `go generate` to compile the eBPF (kernel space) program, then run `go build` to compile the user space program.

- Include libbpf and bpftool as git sub-modules in your applications repo. We also note that developers should typically use libbpf by including it as a Git sub-module within their application program repositories. This ensures that they are always using the latest released version of libbpf instead of either the version from kernel source they might have on their development system or the version that is bundled by their Linux distribution.

