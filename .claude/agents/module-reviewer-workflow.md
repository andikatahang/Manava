# Module Reviewer Workflow

Use these two subagents together when you want to review the project module-by-module:

- `module-reviewer-frontend` → review UI modules, pages, navigation, notifications, labels, and route behavior
- `module-reviewer-backend` → review API/server modules, validation, responses, persistence, side effects, and state transitions

## Recommended Order

1. **Frontend first**
   - Inspect the visible user flows
   - Look for duplicate pages, broken navigation, missing notifications, and UI regressions

2. **Backend second**
   - Inspect API routes, services, and database logic
   - Look for duplicate endpoints, wrong responses, missing validation, and persistence bugs

3. **Synthesize findings**
   - Merge duplicate reports
   - Rank issues by severity
   - Keep only concrete findings with reproduction steps

## Suggested Prompts

### Frontend
> Review the frontend modules one by one. Start from the main routes, then inspect pages, shared layout, navigation, and notification surfaces. Report concrete findings such as duplicate pages, broken links, missing notifications, wrong labels, and other user-facing issues.

### Backend
> Review the backend modules one by one. Start from the API entry points, then inspect routes, validation, services, persistence, and side effects. Report concrete findings such as duplicate endpoints, broken responses, missing validation, invalid state transitions, and other server-side issues.

## Output Format

For each finding, include:
- file or module name
- exact issue
- why it matters
- how to reproduce or observe it
- suggested fix

## When a Module Is Clean

If a module has no findings, say so clearly and move to the next one.
