---
title: Linux Primer
description: Introducing the concepts of user space and kernel space.
draft: true
---

In Linux system, the interaction between processes and files is achieved through system calls (syscall). System calls serve as the interface between user space programs and kernel space programs, allowing user programs to request specific operations from the kernel.

The `sys_openat` system call is used to open files.

When a process opens a file, it issues a `sys_openat` system call to the kernel and passes relevant parameters (such as file path, open mode, etc.).
The kernel handles this request and returns a file descriptor, which serves as a reference for subsequent file operations.
By capturing the `sys_openat` system call, we can understand when and how a process opens a file.