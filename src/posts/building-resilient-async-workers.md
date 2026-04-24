---
title: "Building Resilient Async Workers with Tokio"
description: "Design background workers that retry intelligently, shut down cleanly, and report actionable metrics."
date: 2026-01-10
category: "Async Systems"
readMinutes: 9
postTags:
  - rust
  - async
  - tokio
---

Async workers need two things to survive production: bounded retries and graceful shutdown.
Tokio gives both with clear primitives.

## Retry with backoff and cap

```rust
use tokio::time::{sleep, Duration};

async fn process_with_retry(job: Job) -> Result<(), WorkerError> {
    let mut delay = Duration::from_millis(100);
    for _attempt in 0..5 {
        if try_process(&job).await.is_ok() {
            return Ok(());
        }
        sleep(delay).await;
        delay = (delay * 2).min(Duration::from_secs(2));
    }
    Err(WorkerError::RetryExhausted)
}
```

## Handle shutdown signals cleanly

```rust
loop {
    tokio::select! {
        _ = shutdown.recv() => {
            tracing::info!("shutdown signal received");
            break;
        }
        maybe_job = queue.recv() => {
            if let Some(job) = maybe_job {
                if let Err(err) = process_with_retry(job).await {
                    tracing::error!(?err, "job failed");
                }
            }
        }
    }
}
```

With this pattern, workers stop predictably and leave clear operational logs.
