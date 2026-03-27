---
name: Feature branch before code changes
description: User reminded to create feature branch before modifying code — always do this proactively per CLAUDE.md convention
type: feedback
---

Always create a feature/REQx branch before starting implementation, even when using subagent-driven development. The user had to remind us despite it being in CLAUDE.md.

**Why:** Convention is to create new feature branch for each requirement implementation (REQ1, REQ2, etc.)
**How to apply:** Before dispatching any code-writing subagent, create the branch first from main.
