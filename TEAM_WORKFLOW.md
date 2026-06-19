# Team Workflow & Guidelines

## Git Workflow

### Branch Strategy

We follow a Git Flow strategy:

- **`main`** - Production-ready code, requires review and approval
- **`development`** - Integration branch for development features
- **`feature/*`** - Individual feature branches from `development`

### Workflow Steps

1. **Clone the repository and fetch all branches**

   ```bash
   git clone [repository-url]
   cd 499
   git fetch origin
   ```

2. **Switch to development branch**

   ```bash
   git checkout development
   ```

3. **Create a feature branch from `development`**

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Work on your feature**
   - Make commits regularly with clear messages
   - Push to remote when ready for review

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Create PR from `feature/*` → `development`
   - Add clear description of changes
   - Link any related issues

6. **Code Review**
   - Team members review and provide feedback
   - Address feedback and push changes
   - Once approved, feature is ready to merge

7. **Merge to development**
   - Once approved, merge to `development`
   - Delete feature branch after merge

8. **Prepare for Release**
   - When `development` is stable, create PR from `development` → `main`
   - Final review before merging

## Commit Message Guidelines

### Format

```
<type>: <subject>

<body>
```

### Types

| Type         | Description                                   |
| ------------ | --------------------------------------------- |
| **init**     | Initial service setup and directory structure |
| **feat**     | A new feature                                 |
| **fix**      | Bug fix                                       |
| **docs**     | Documentation changes                         |
| **build**    | Build, setup, dependencies, configuration     |
| **refactor** | Code restructuring without feature changes    |
| **test**     | Adding or updating tests                      |
| **style**    | Formatting, missing semicolons, etc.          |

### Sample Commit Messages

```
init: add project structure and team guidelines
feat: add user authentication module
fix: resolve API timeout on large datasets
docs: update README with setup instructions
build: add pre-commit hooks
refactor: simplify data processing logic
test: add unit tests for payment module
style: format code and fix indentation
```

### Guidelines

- Use imperative mood ("add" not "added") - Recommended
- Don't capitalize first letter - Preferred
- No period (.) at the end - Preferred
- Keep subject under 50 characters - so it will feat in viewpoint
- Use body for explaining why, not what - If needed
- Reference issues like `fixes #123` - When applicable

## Pull Request Process

1. **Title Format**

   ```
   [Service] Brief description - fixes #issue_number
   ```

   Example: `[Backend] Add user validation - fixes #42`

2. **Description**
   - Explain what changed and why
   - List any breaking changes

3. **Before Submitting PR**

   ```bash
   git fetch origin
   git push origin feature/your-feature-name
   ```

4. **PR Checklist**
   - [ ] Code follows project style
   - [ ] Documentation updated if needed
   - [ ] Branch is up to date with development

5. **Create PR**
   - Go to repository and create PR
   - Select `development` as base branch
   - Select your feature branch as compare branch

## Push/Pull Best Practices

### Before Pushing

```bash
git pull origin development       # Get latest changes
git commit -m "your message"      # Commit your work
git push origin feature/branch    # Push to remote
```

### If You Encounter Conflicts

- Contact the team immediately
- Team lead will help resolve

---

**Last Updated:** 2026-06-18
