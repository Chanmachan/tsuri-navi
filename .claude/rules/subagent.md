# Sub-Agent Routing Rules

## Parallel dispatch (ALL conditions must be met)
- 3+ unrelated tasks or independent domains
- No shared state between tasks
- Clear file boundaries with no overlap in tasks/tasks.jsonl

## Sequential dispatch (ANY condition triggers)
- Tasks have dependencies (B needs output from A)
- Shared files or state (merge conflict risk)
- Unclear scope (need to understand before proceeding)

## Sub-Agent constraints
- Must not modify files outside assigned scope
- Must report back to parent before touching shared files
- Must not run git commands
- Must not modify package.json or package-lock.json

## Workflow
1. Read `tasks/tasks.jsonl` to identify runnable tasks
2. Check `depends_on`: skip tasks whose dependencies are not `done`
3. Check `files`: group tasks with non-overlapping files for parallel dispatch
4. Assign each task to the agent specified in `agent` field
5. After all sub-agents complete, run integration tests
6. Update completed tasks to `status: "done"` in tasks.jsonl