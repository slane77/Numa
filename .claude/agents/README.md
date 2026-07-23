# Project agents

Four specialist agents that work as a team to start and develop projects on
The Hub. They live here as Claude Code subagents — invoke one by name, or just
describe the goal and let the **manager** run the show.

| Agent | Role | Use it to… |
| --- | --- | --- |
| **manager** | Project lead | Start a project/feature, plan it, and delegate to the others. **Best first stop.** |
| **system-architect** | Designer | Decide *how* to build it: data model, RLS/security, file layout, trade-offs. |
| **coder** | Builder | Write and edit the actual code and migrations. |
| **tester** | Verifier | Write/run tests, check the build, security and edge cases; report defects. |

## Typical flow

```
You → manager:  "Let's build a staff-poll feature."
manager → system-architect:  design the schema, RLS and file layout
manager → coder:             implement the approved design
manager → tester:            verify it builds, works, and RLS holds
manager → you:               summary of what shipped + what's left
```

The manager sequences dependent work and runs independent work in parallel.
Security-sensitive changes (HR data, RLS, auth) always go through the architect
first. Nothing is committed or pushed unless you explicitly ask.

## How to invoke

- Say what you want ("start a new project to…", "add feature X") and the
  manager will plan and delegate.
- Or call one directly: e.g. "have the **tester** check the holidays module."
