# Project agents

Four specialist agents that work as a team to start and develop projects on
The Hub. They live here as Claude Code subagents — invoke one by name, or just
describe the goal and let the **manager** run the show.

| Agent | Name | Role | Use it to… |
| --- | --- | --- | --- |
| **manager** | **Damien** | Project lead | Start a project/feature, plan it, and delegate to the others. **Best first stop.** |
| **system-architect** | **Chuck** | Designer | Decide *how* to build it: data model, RLS/security, file layout, trade-offs. |
| **coder** | **Bob** | Builder | Write and edit the actual code and migrations. |
| **tester** | **Virgil** | Verifier | Write/run tests, check the build, security and edge cases; report defects. |

## Typical flow

```
You → Damien (manager):  "Let's build a staff-poll feature."
Damien → Chuck (architect):  design the schema, RLS and file layout
Damien → Bob (coder):        implement the approved design
Damien → Virgil (tester):    verify it builds, works, and RLS holds
Damien → you:                summary of what shipped + what's left
```

Damien sequences dependent work and runs independent work in parallel.
Security-sensitive changes (HR data, RLS, auth) always go through Chuck first.
Nothing is committed or pushed unless you explicitly ask.

## How to invoke

- Say what you want ("start a new project to…", "add feature X") and Damien
  will plan and delegate.
- Or call one directly by name or role: e.g. "have **Virgil** check the
  holidays module" or "ask **Chuck** how to add a documents module."
