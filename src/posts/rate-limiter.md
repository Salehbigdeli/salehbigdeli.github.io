---
# Copy this file to `src/posts/your-article-slug.md` and edit front matter + body.
title: "Rate Limiter"
description: "What is a rate limiter and how does it work?"
date: 2026-01-15
category: "rust" # broad bucket for categories/ page, e.g. Error Handling, Async Systems
readMinutes: 16
postTags:
  - rust
  - distributed system
  - rate limiter
---

## What is a rate limiter?

You deploy a service. Everything works fine—until one client suddenly sends thousands of requests in a short period of time.

At that point:
- CPU usage spikes
- Other users experience slow responses
- Your service becomes unreliable

This is where a rate limiter becomes essential.


You may have encountered a 429 error code when making requests to a REST API. This typically indicates that you’ve hit a rate limit enforced by the service you’re trying to access. A rate limiter is a mechanism that restricts how frequently a client can call an API within a given period of time, preventing excessive or abusive usage.
### Why rate limiters are used?
Prevent overload – stops servers from being flooded with too many requests
Protect against abuse – like bots or denial-of-service (DoS) attacks
Ensure fairness – so one user doesn’t hog all the resources
Control costs – especially in paid APIs or cloud services
## Let’s build one!
Let’s say we want to limit users of our service to 10 requests every 10 seconds. With these parameters, a rate limiter would allow up to 10 requests at around time ~0.0s. Any additional requests within the same 10-second window would be rejected until approximately ~10.0s has passed.
For the first version, we simplify the logic. We keep track of the number of requests made to our service so far, and if it exceeds the limit (10 in our case), we reject any further requests. Every 10 seconds, we reset the counter so that it can allow up to 10 new requests from the client.

```rust
use std::{
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
    thread,
    time::{self, Duration},
};

struct RateLimiterState {
    duration: Duration,
    max_requests: u64,
    requests_count: Arc<AtomicU64>,
}

impl RateLimiterState {
    fn start(&self) {
        let duration = self.duration;
        let requests_count = Arc::clone(&self.requests_count);
        thread::spawn(move || {
            loop {
                thread::sleep(duration);
                requests_count.store(0, Ordering::Relaxed);
            }
        });
    }
}
struct RateLimiter {
    state: RateLimiterState,
}

impl RateLimiter {
    fn new(max_reqs: u64, duration: Duration) -> Self {
        let state = RateLimiterState {
            duration,
            max_requests: max_reqs,
            requests_count: Arc::new(AtomicU64::new(0)),
        };
        state.start();
        Self { state }
    }
    fn is_available(&mut self) -> bool {
        if self.state.requests_count.load(Ordering::Relaxed) < self.state.max_requests {
            self.state.requests_count.fetch_add(1, Ordering::Relaxed);
            true
        } else {
            false
        }
    }
}
```

In this code, to simulate two services, I implemented the counting and resetting of the counter in a separate thread. Since the counter is accessed from multiple threads, it needs to be wrapped in an Arc<AtomicU64>, which is a Rust-specific implementation detail for safe concurrent access.
An example user of this rate limiter will look like the following code snippet:

```rust
fn main() {
    // usage pattern 1:
    println!("First scenario");
    let started = time::Instant::now();
    let mut rl = RateLimiter::new(10, Duration::from_secs(10));
    for _ in 0..12 {
        println!(
            "    is service available at {:?}? {}",
            time::Instant::now() - started,
            rl.is_available()
        );
    }
    thread::sleep(Duration::from_secs(10));
    for _ in 0..5 {
        println!(
            "    is service available at {:?}? {}",
            time::Instant::now() - started,
            rl.is_available()
        );
    }
    // end of pattern 1

    // usage pattern 2:
    // our rate limiter is not good for this pattern. It allows 20 requests in almost 2 seconds!
    println!("Second scenario");
    let started = time::Instant::now();
    let mut rl = RateLimiter::new(10, Duration::from_secs(10));
    thread::sleep(Duration::from_secs(9));
    for _ in 0..10 {
        println!(
            "    is service available at {:?}? {}",
            time::Instant::now() - started,
            rl.is_available()
        );
    }
    thread::sleep(Duration::from_secs(2));
    for _ in 0..10 {
        println!(
            "    is service available at {:?}? {}",
            time::Instant::now() - started,
            rl.is_available()
        );
    }
    // end of pattern 2
}
```
The output should look like:
```
First scenario
    is service available at 63.125µs? true
    is service available at 89.292µs? true
    is service available at 91.459µs? true
    is service available at 93.5µs? true
    is service available at 95.5µs? true
    is service available at 97.292µs? true
    is service available at 99.25µs? true
    is service available at 101µs? true
    is service available at 102.75µs? true
    is service available at 104.625µs? true
    is service available at 106.459µs? false
    is service available at 108.667µs? false
    is service available at 10.005152917s? true
    is service available at 10.005202417s? true
    is service available at 10.0052085s? true
    is service available at 10.005212917s? true
    is service available at 10.005216375s? true
Second scenario
    is service available at 9.005130958s? true
    is service available at 9.005184125s? true
    is service available at 9.005192333s? true
    is service available at 9.005196875s? true
    is service available at 9.005201375s? true
    is service available at 9.005205375s? true
    is service available at 9.005209208s? true
    is service available at 9.005212291s? true
    is service available at 9.005215416s? true
    is service available at 9.005218458s? true
    is service available at 11.008598875s? true
    is service available at 11.008649375s? true
    is service available at 11.008655375s? true
    is service available at 11.008659916s? true
    is service available at 11.008663833s? true
    is service available at 11.008667208s? true
    is service available at 11.008670583s? true
    is service available at 11.008673916s? true
    is service available at 11.008677291s? true
    is service available at 11.008680875s? true
```
As you may have noticed in the code comments, this basic version of a rate limiter is not ideal. In certain edge cases, it can allow more requests than intended. This version of the code is on github [rate-limiter, simple branch](https://github.com/Salehbigdeli/rate-limiter/tree/simple).

We can improve this implementation by changing how the request counter works. Instead of resetting the counter after the rate-limiting interval, we gradually decrease it over time. Specifically, by one request every `(rate limiting duration) / max_requests`. With this approach, after the initial burst of requests, new requests are allowed in a steady, one-by-one manner.

Here is the changed implementation: 
```rust
impl RateLimiterState {
    fn start(&self) {
        let millis = self.duration.as_millis() as u64 / self.max_requests;
        let duration = Duration::from_millis(millis);
        let requests_count = Arc::clone(&self.requests_count);
        thread::spawn(move || {
            loop {
                thread::sleep(duration);
                let _ = requests_count
                    .fetch_update(Ordering::SeqCst, Ordering::Relaxed, |x| {
                        if x > 0 { Some(x - 1) } else { None }
                    });
            }
        });
    }
}
```
In this version we decrease the current value of `request_count` if it is more than `0`. With this change we see the output similar to:
```
Second scenario
    is service available at 9.005093458s? true
    is service available at 9.005213166s? true
    is service available at 9.00521925s? true
    is service available at 9.005224208s? true
    is service available at 9.005228208s? true
    is service available at 9.005231416s? true
    is service available at 9.005234416s? true
    is service available at 9.005237375s? true
    is service available at 9.00524075s? true
    is service available at 9.005244208s? true
    is service available at 11.010282541s? true
    is service available at 11.010333416s? true
    is service available at 11.010339416s? false
    is service available at 11.010343708s? false
    is service available at 11.010347416s? false
    is service available at 11.010350833s? false
    is service available at 11.010354166s? false
    is service available at 11.010357583s? false
    is service available at 11.010361041s? false
    is service available at 11.010364666s? false
```
This version is better, but it seems that we now reject some requests that should actually be allowed. How can we fix this issue? This version is in `one-by-one` branch. 

## Accurate Rate Limiter
Our simple counter does not track the arrival time of each request, so it cannot allow a new request exactly 10 seconds after a previous one.

We can address this by incorporating timing information into our rate limiter. In this version, we use a queue. When a request arrives, we add its timestamp to the queue. If the queue is already full, the request is rejected. After 10 seconds, the timestamp expires and can be removed from the queue.

An important advantage of this approach is its efficiency. Since timestamps are inserted in order, we only need to check the first element. If the first timestamp has not yet expired, we can be sure that none of the subsequent timestamps have expired either.

I also simplified the final implementation by removing the extra thread required in previous versions. You can find this version in the `accurate` branch on [GitHub](https://github.com/Salehbigdeli/rate-limiter/tree/accurate).

```rust
use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
    thread,
    time::{self, Duration, Instant},
};

struct RateLimiter {
    duration: Duration,
    requests: Arc<Mutex<VecDeque<Instant>>>,
    max_request: usize,
}

impl RateLimiter {
    fn new(max_reqs: usize, duration: Duration) -> Self {
        Self {
            duration,
            requests: Arc::new(Mutex::new(VecDeque::new())),
            max_request: max_reqs,
        }
    }
    fn is_available(&mut self) -> bool {
        let now = Instant::now();
        let mut requests = self.requests.lock().unwrap();

        while let Some(&oldest) = requests.front() {
            if now.duration_since(oldest) >= self.duration {
                requests.pop_front();
            } else {
                break;
            }
        }

        if requests.len() < self.max_request {
            requests.push_back(now);
            true
        } else {
            false
        }
    }
}

fn main() {
    // usage pattern 2:
    // our rate limiter is not good for this pattern. It allows 20 requests in almost 2 seconds!
    println!("Second scenario");
    let started = time::Instant::now();
    let mut rl = RateLimiter::new(10, Duration::from_secs(10));
    thread::sleep(Duration::from_secs(9));
    let mut r = 0;
    for _ in 0..10 {
        r += 1;
        println!(
            "  {}  is service available at {:?}? {}",
            r,
            time::Instant::now() - started,
            rl.is_available()
        );
    }
    thread::sleep(Duration::from_secs(2));
    for _ in 0..10 {
        r += 1;
        println!(
            "  {}  is service available at {:?}? {}",
            r,
            time::Instant::now() - started,
            rl.is_available()
        );
        thread::sleep(Duration::from_secs(2));
    }
    // end of pattern 2
}
```
Outputs:
```
Second scenario
  1  is service available at 9.003235542s? true
  2  is service available at 9.003331917s? true
  3  is service available at 9.003335167s? true
  4  is service available at 9.003337042s? true
  5  is service available at 9.003338709s? true
  6  is service available at 9.00334675s? true
  7  is service available at 9.003348209s? true
  8  is service available at 9.0033495s? true
  9  is service available at 9.003350917s? true
  10  is service available at 9.003352875s? true
  11  is service available at 11.006592417s? false
  12  is service available at 13.010735875s? false
  13  is service available at 15.013489959s? false
  14  is service available at 17.018568334s? false
  15  is service available at 19.022927584s? true
  16  is service available at 21.026395709s? true
  17  is service available at 23.031257834s? true
  18  is service available at 25.035619584s? true
  19  is service available at 27.039765042s? true
  20  is service available at 29.04483875s? true
```
## Conclusion
In this post, we explored several approaches to implementing a rate limiter, starting from a simple fixed-window counter and gradually improving its accuracy and behavior.

Our first implementation followed the idea of a **Fixed Window Counter**, which is straightforward but suffers from burstiness at window boundaries. We then improved the design by gradually decreasing the request count over time. An approach that approximates the behavior of a **Leaky Bucket**, smoothing out traffic but potentially rejecting some valid requests. Finally, we implemented a more precise solution using a queue of timestamps, which aligns with the **Sliding Window Log** algorithm and allows for accurate enforcement of rate limits.

Each of these approaches highlights a different trade-off between simplicity, performance, and correctness. In practice, choosing the right algorithm depends on the requirements of your system, whether you prioritize ease of implementation, memory efficiency, or strict fairness.

Understanding these trade-offs is essential for building reliable and scalable system.

In the future, we can explore how to implement these algorithms in a way that scales to thousands or even millions of users. As you might expect, the current implementations are not suitable for handling scenarios like one million rate limiters for one million users.

## References
* Cloudflare – [What is Rate Limiting?](https://www.cloudflare.com/learning/bots/what-is-rate-limiting)

* NGINX – [Rate Limiting Module Documentation](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

* Wikipedia – [Leaky Bucket Algorithm](https://en.wikipedia.org/wiki/Leaky_bucket)

* Wikipedia – [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)

* GeeksforGeeks – [Rate Limiting Algorithms (System Design)](https://www.geeksforgeeks.org/rate-limiting-algorithms-system-design/)


