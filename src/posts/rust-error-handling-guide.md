---
title: "Error Handling in Rust"
description: "Structure recoverable vs unrecoverable failures, attach context, and keep APIs ergonomic with thiserror and anyhow."
date: 2025-10-15
category: "Error Handling"
readMinutes: 8
postTags:
  - rust
  - error-handling
  - anyhow
  - thiserror
---

Robust services distinguish between domain errors, infrastructure failures, and programmer bugs.
In Rust, a clean way to model this is: use typed errors (`thiserror`) at boundaries and add context
(`anyhow`) in application glue code.

## 1) Keep domain errors explicit

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CreateUserError {
    #[error("email is invalid")]
    InvalidEmail,
    #[error("user already exists")]
    DuplicateUser,
    #[error("storage failure: {0}")]
    Storage(String),
}
```

Typed errors preserve intent and make matching behavior straightforward.

## 2) Add context at call sites

```rust
use anyhow::{Context, Result};

pub async fn create_user(req: CreateUserRequest, repo: &UserRepo) -> Result<User> {
    let email = parse_email(&req.email).context("validating user email")?;
    let user = repo
        .insert(email)
        .await
        .context("inserting user into repository")?;
    Ok(user)
}
```

Context makes on-call debugging faster because logs say what operation failed, not only where.

## 3) Convert once at API boundary

```rust
impl From<CreateUserError> for StatusCode {
    fn from(err: CreateUserError) -> Self {
        match err {
            CreateUserError::InvalidEmail => StatusCode::BAD_REQUEST,
            CreateUserError::DuplicateUser => StatusCode::CONFLICT,
            CreateUserError::Storage(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
```

This keeps internals expressive while exposing stable client semantics.
