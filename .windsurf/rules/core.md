---
trigger: always_on
description: Core project rules for consistent, high-quality code and process.
globs: **/*
---

# Core Rules

- Always and always update the PRD and Plan with every tasks if the tasks is referenced from it.
- Keep answers short, concise and upto the point.
- Never elaborate if not specifically asked.
- Only do the task which is asked or suggested and never extend.
- DOn't start any implementation until asked for or confirmed/
- Follow the project's coding standards and best practices (e.g., TypeScript, React, functional components, named exports).
- Ask for clarification if any requirement or instruction is ambiguous.
- Only touch files where implementation is needed and nothing outside the scope.


# PRD enforcement

- Always update PRD.md tasks after any code change as mentioned or described by checking the checkboxes primarily.
- The canonical product-requirements doc is `.windsurf/PRD.md`.
- After generating or modifying code, the agent must:
  1. Append a concise changelog entry to `.windsurf/PRD.md` as described or mentioned inside it.
  2. Never Ask for confirmation before committing the update to PRD.


# Technical Plan enforcement

- Always update Plan.md after any code change as mentioned or described.
- The canonical product-requirements doc is `.windsurf/Plan.md`.
- After generating or modifying code, the agent must:
  1. Append a concise changelog entry to `.windsurf/Plan.md` as described or mentioned inside it.
  2. Never Ask for confirmation before committing the update to Plan.