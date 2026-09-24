# Three modules that won't run on Workers

`REQ-C.4`: three modules from past projects that won't run on Cloudflare Workers,
why each one fails on a V8 isolate, and an edge-friendly replacement. Each one
fails for a different reason. Measurements are from local workerd (Wrangler
4.136.3, `nodejs_compat`), taken on 2026-09-24.

**`bcrypt`: native code.** `bcrypt` isn't JavaScript. It's a C++ addon, shipped
as a prebuilt `.node` binary for each platform, which Node links into its own
process at runtime. A Worker has no process to link into. The V8 isolate
executes only JavaScript and WebAssembly, which is what lets thousands of
tenants share one runtime safely. Tellingly, the Worker *bundles* without error
and then fails on the first request with `ReferenceError: __dirname is not
defined`: the loader can't even locate the binary. The pure-JS `bcryptjs` does
run, but it's a trap. One cost-10 hash took 59 ms of CPU, against the Free
plan's 10 ms CPU per request, so a login route would be terminated under steady
use. **Replacement:** Web Crypto's `crypto.subtle.deriveBits` with
PBKDF2-SHA-256. It's implemented natively by the runtime, and 100,000
iterations took 5 ms. Better, use an auth library that targets the runtime:
Better Auth ships a `workerd` export condition that picks the runtime's native
`node:crypto` scrypt instead.

**`puppeteer` / `playwright`: launching a program.** Neither library renders
anything itself. `launch()` starts a real Chromium executable, well over
100 MB, as a child process and drives it over a pipe. A Worker can do neither
half. There's no `child_process` and no way to start an executable, and there's
nowhere to put a browser: the whole Worker upload is limited to a few megabytes
compressed, and it runs in 128 MB of memory. That's the difference between an
isolate and a container: a container brings its filesystem and binaries, and
an isolate brings only code. The same reason rules out `html-pdf` (which spawns
PhantomJS) and `ffmpeg`. **Replacement:** the **Browser Rendering** binding.
Cloudflare runs the browsers, and the Worker drives one remotely with
`@cloudflare/puppeteer`, a fork with the same API that connects instead of
launching. PDFs and screenshots are also a single REST call, which covers what
`html-pdf` was for.

**`socket.io`: a long-lived process that owns connections and memory.** A
Socket.IO server assumes it's one process that stays alive. It holds every open
connection, keeps rooms in its own memory ("who's in `grp_42`"), and broadcasts
by looping over the sockets it holds. A Worker is the opposite model.
Invocations are request-scoped; they're spread across many isolates in many
data centres; any isolate can be evicted at any time; and two messages from the
same user can land on different machines. An in-memory map of rooms would be a
different, partial map in every isolate, and it could vanish between messages.
It fails because the *architecture* doesn't fit the runtime, not because an API
is missing. The same holds for `node-cron` and `bullmq`, which are loops in a
process that never exits. **Replacement:** a **Durable Object** per room. It's
one addressable instance (`idFromName("grp_42")`) that every client for that
room reaches wherever they connect. It accepts the WebSockets itself, keeps the
room's state in memory and in its own storage, and uses WebSocket hibernation,
so idle connections cost nothing. It's the same primitive Splitr uses for its
contested write, for the same reason: it's how a Worker gets exactly one of
something. (Cron Triggers and Queues replace `node-cron` and `bullmq`.)
