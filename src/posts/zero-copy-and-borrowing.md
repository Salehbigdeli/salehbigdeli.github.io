---
title: "Zero-Copy Patterns with Ownership and Borrowing"
description: "Build fast Rust pipelines by reducing allocations and embracing borrowed data safely."
date: 2025-10-20
category: "Performance"
readMinutes: 7
postTags:
  - rust
  - performance
  - memory
  - ownership
---

Many Rust performance wins come from avoiding allocations altogether. The most practical technique:
parse and transform data while borrowing slices instead of cloning owned strings.

## Borrow input as long as possible

```rust
#[derive(Debug)]
struct RequestLine<'a> {
    method: &'a str,
    path: &'a str,
}

fn parse_request_line(input: &str) -> Option<RequestLine<'_>> {
    let mut parts = input.split_whitespace();
    Some(RequestLine {
        method: parts.next()?,
        path: parts.next()?,
    })
}
```

## Use `Cow` when ownership is conditional

```rust
use std::borrow::Cow;

fn normalize_path(path: &str) -> Cow<'_, str> {
    if path.contains("//") {
        Cow::Owned(path.replace("//", "/"))
    } else {
        Cow::Borrowed(path)
    }
}
```

`Cow` lets you keep a borrowed fast path and pay allocation cost only when needed.
