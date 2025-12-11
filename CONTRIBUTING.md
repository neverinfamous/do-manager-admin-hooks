# Contributing to do-manager-admin-hooks

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/do-manager-admin-hooks.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/my-feature`

## Development

```bash
# Build the package
npm run build

# Run type checking
npm run typecheck
```

## Pull Request Guidelines

1. **One feature per PR** - Keep changes focused
2. **Update documentation** - If you change behavior, update README.md
3. **Follow existing style** - Match the code style in the project
4. **Write clear commit messages** - Use conventional commits (feat:, fix:, docs:, etc.)

## Code Style

- TypeScript strict mode
- No `any` types without justification
- Export types for public API

## Testing Changes

Test your changes by:
1. Building the package: `npm run build`
2. Linking locally: `npm link`
3. Testing in a real Durable Object project

## Questions?

Open an issue on GitHub.

