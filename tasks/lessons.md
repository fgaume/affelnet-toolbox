# Lessons Learned

- **Artifact vs Project Files**: When creating or editing files in the workspace (e.g. `tasks/todo.md`), `IsArtifact` must be set to `false`. Setting `IsArtifact: true` is strictly reserved for files created within the system's brain artifact directory (e.g., `/Users/fred/.gemini/antigravity-cli/brain/<conversation-id>/`).
