---
name: unit-tests
description: Guidelines for writing and committing unit tests in this project.
---

# Claude Code Instructions

## Git Workflow

- **Never automatically commit or push changes.**
- Always show a summary of changes and wait for explicit user approval before staging, committing, or pushing anything.
- Do not run `git add`, `git commit`, `git push`, or any equivalent commands unless the user explicitly asks.

## Code Quality

- Always follow best practices and language-specific conventions (naming, formatting, structure, error handling, etc.).
- Write clean, readable, and maintainable code.
- Prefer explicit over implicit; avoid clever code that sacrifices clarity.
- Keep functions small and single-responsibility — aim for ~20-30 lines max.
- No magic numbers or strings — always use named constants.
- Follow consistent naming conventions: `kebab-case` for files, `PascalCase` for classes and components, `camelCase` for variables and functions.

## TypeScript

- Always use TypeScript; never use `any` — use `unknown` and narrow it with type guards.
- Define explicit return types on all functions.
- Use interfaces or types for all data shapes; avoid inline object type literals in function signatures.

## Error Handling

- Never swallow errors silently — no empty `catch` blocks.
- Always handle Promise rejections explicitly (use `try/catch` with `async/await`).
- Use custom error classes for domain-specific errors.

## Test-Driven Development (TDD)

- **Always write the unit test first**, before implementing any function or feature.
- Follow the Red → Green → Refactor cycle:
  1. **Red** – Write a failing test that defines the expected behavior.
  2. **Green** – Write the minimal implementation to make the test pass.
  3. **Refactor** – Clean up the code while keeping all tests green.
- Tests must be meaningful — cover edge cases, not just the happy path.
- Do not write implementation code without a corresponding test already in place.

## Testing Framework

- Use Jest as the testing framework for all unit tests.
- Use `describe` blocks to group related tests and `it`/`test` for individual cases.
- Use Jest matchers (`expect`, `toBe`, `toEqual`, `toThrow`, etc.) — do not introduce other assertion libraries.

## Code Cleanliness

- Never leave `console.log` statements in code (use a proper logger if needed).
- No commented-out code — delete it; Git history preserves it.
- Flag unfinished work with `// TODO(name): description` format — never leave unmarked TODOs.

## Dependencies

- Do not add a new dependency without flagging it first and getting explicit user approval.
- Prefer native language/runtime APIs over third-party libraries for simple tasks.

## Security

- Never hardcode secrets, tokens, API keys, or credentials — always use environment variables.
- Sanitize and validate all user input before use.

## Documentation

- Add JSDoc comments to all public functions, including parameter and return type descriptions.
- Follow Conventional Commits format for commit messages: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, etc.
- Maintain a `CHANGELOG.md` to log notable changes per version.