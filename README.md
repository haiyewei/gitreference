# Git Reference (grf)

English | [简体中文](https://github.com/haiyewei/grf-cli/blob/main/README.zh-CN.md)

A lightweight CLI tool for managing reference code from Git repositories. Easily add, load, and sync reference code into your projects without cluttering your main codebase.

## Features

- **Add and manage Git reference repositories** - Track multiple reference repositories with custom aliases
- **Load reference code into your working directory** - Selectively load files and directories from references
- **Shallow clone support** - Save disk space with shallow clones by default
- **Automatic .gitignore management** - Automatically adds loaded references to .gitignore
- **Repository update and sync** - Keep your reference code up-to-date with simple commands

## Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **Git** >= 2.0.0

### Install via npm

```bash
# Global installation (recommended)
npm install -g grf-cli

# Or use npx without installation
npx grf-cli <command>
```

## Quick Start

```bash
# Initialize grf in your project
grf config init

# Add a reference repository
grf add https://github.com/example/awesome-utils.git --name utils

# List all reference repositories
grf list

# Load reference code into your project
grf load utils src/helpers

# Update all references to latest
grf update

# Unload reference code when no longer needed
grf unload utils
```

## Commands

### add

Add a reference repository.

**Syntax:**

```bash
grf add <url> [options]
```

**Arguments:**

| Argument | Type   | Required | Default | Description        |
| -------- | ------ | -------- | ------- | ------------------ |
| url      | string | ✅ Yes   | -       | Git repository URL |

**Options:**

| Option       | Short | Type    | Default | Description                      |
| ------------ | ----- | ------- | ------- | -------------------------------- |
| --name       | -n    | string  | -       | Custom repository name           |
| --branch     | -b    | string  | -       | Specify branch                   |
| --shallow    | -     | boolean | true    | Shallow clone (default: enabled) |
| --no-shallow | -     | boolean | -       | Full clone                       |
| --depth      | -     | string  | "1"     | Shallow clone depth              |

**Examples:**

```bash
# Add a repository with default settings
grf add https://github.com/example/repo.git

# Add with a custom name
grf add https://github.com/example/repo.git --name my-ref

# Add a specific branch
grf add https://github.com/example/repo.git --branch develop

# Add with full clone (no shallow)
grf add https://github.com/example/repo.git --no-shallow

# Add with custom shallow depth
grf add https://github.com/example/repo.git --depth 10
```

---

### clean

Clean cached repositories.

**Syntax:**

```bash
grf clean [name] [options]
```

**Arguments:**

| Argument | Type   | Required | Default | Description               |
| -------- | ------ | -------- | ------- | ------------------------- |
| name     | string | ❌ No    | -       | Repository name to remove |

**Options:**

| Option  | Short | Type    | Default | Description                    |
| ------- | ----- | ------- | ------- | ------------------------------ |
| --all   | -a    | boolean | false   | Remove all cached repositories |
| --force | -f    | boolean | false   | Skip confirmation              |

**Examples:**

```bash
# Remove a specific cached repository
grf clean my-ref

# Remove all cached repositories (with confirmation)
grf clean --all

# Remove all cached repositories without confirmation
grf clean --all --force

# Remove a specific repository without confirmation
grf clean my-ref -f
```

---

### config

Manage global configuration.

**Syntax:**

```bash
grf config [key] [value] [options]
```

**Arguments:**

| Argument | Type   | Required | Default | Description         |
| -------- | ------ | -------- | ------- | ------------------- |
| key      | string | ❌ No    | -       | Configuration key   |
| value    | string | ❌ No    | -       | Configuration value |

**Options:**

| Option | Short | Type    | Default | Description                  |
| ------ | ----- | ------- | ------- | ---------------------------- |
| --list | -l    | boolean | false   | Show all configuration       |
| --path | -     | boolean | false   | Show configuration file path |

**Valid Configuration Keys:**

| Key           | Type    | Description                            |
| ------------- | ------- | -------------------------------------- |
| defaultBranch | string  | Default branch name                    |
| shallowClone  | boolean | Enable shallow clone (true/false)      |
| shallowDepth  | number  | Shallow clone depth (positive integer) |

**Examples:**

```bash
# Show all configuration
grf config --list

# Show configuration file path
grf config --path

# Get a configuration value
grf config defaultBranch

# Set a configuration value
grf config defaultBranch main

# Enable shallow clone
grf config shallowClone true

# Set shallow clone depth
grf config shallowDepth 5
```

---

### list

List all cached repositories.

**Syntax:**

```bash
grf list [options]
```

**Options:**

| Option    | Short | Type    | Default | Description                              |
| --------- | ----- | ------- | ------- | ---------------------------------------- |
| --json    | -     | boolean | false   | Output in JSON format                    |
| --load    | -     | boolean | false   | List loaded references in current project |
| --verbose | -v    | boolean | false   | Show detailed output                     |

**Examples:**

```bash
# List all cached repositories
grf list

# List in JSON format
grf list --json

# List loaded references in current project
grf list --load

# Show detailed output
grf list --verbose
```

---

### load

Copy reference repository to current directory (supports Git URL).

**Syntax:**

```bash
grf load <name> [path] [options]
```

**Arguments:**

| Argument | Type   | Required | Default                     | Description                             |
| -------- | ------ | -------- | --------------------------- | --------------------------------------- |
| name     | string | ✅ Yes   | -                           | Repository name, short name, or Git URL |
| path     | string | ❌ No    | .gitreference/\<repo-path\> | Target path                             |

**Options:**

| Option      | Short | Type    | Default | Description                       |
| ----------- | ----- | ------- | ------- | --------------------------------- |
| --subdir    | -s    | string  | -       | Copy only a specific subdirectory |
| --no-ignore | -     | boolean | -       | Do not update .gitignore          |
| --branch    | -b    | string  | -       | Specify branch (only for Git URL) |

**Examples:**

```bash
# Load a repository by name
grf load my-ref

# Load to a specific path
grf load my-ref src/helpers

# Load only a specific subdirectory
grf load my-ref --subdir src/utils

# Load without updating .gitignore
grf load my-ref --no-ignore

# Load directly from a Git URL
grf load https://github.com/example/repo.git

# Load from a Git URL with specific branch
grf load https://github.com/example/repo.git --branch develop
```

---

### unload

Remove reference code from current project.

**Syntax:**

```bash
grf unload [name] [options]
```

**Arguments:**

| Argument | Type   | Required | Default | Description               |
| -------- | ------ | -------- | ------- | ------------------------- |
| name     | string | ❌ No    | -       | Repository name to remove |

**Options:**

| Option        | Short | Type    | Default | Description                                          |
| ------------- | ----- | ------- | ------- | ---------------------------------------------------- |
| --all         | -a    | boolean | false   | Remove all reference code                            |
| --force       | -f    | boolean | false   | Skip confirmation prompt                             |
| --dry-run     | -     | boolean | false   | Show what would be deleted without actually deleting |
| --list        | -l    | boolean | false   | List all loaded reference code                       |
| --keep-empty  | -     | boolean | false   | Keep empty .gitreference/ directory after removal    |
| --clean-empty | -     | boolean | false   | Clean empty directory structures in .gitreference/   |
| --verbose     | -v    | boolean | false   | Show detailed deletion progress                      |

**Examples:**

```bash
# Remove a specific reference
grf unload my-ref

# Remove all reference code
grf unload --all

# Remove without confirmation
grf unload my-ref --force

# Preview what would be deleted
grf unload my-ref --dry-run

# List all loaded references
grf unload --list

# Remove but keep empty .gitreference/ directory
grf unload my-ref --keep-empty

# Clean empty directories after removal
grf unload my-ref --clean-empty

# Show detailed progress
grf unload my-ref --verbose
```

---

### update

Update cached repositories and optionally sync to workspace.

**Syntax:**

```bash
grf update [name] [options]
```

**Arguments:**

| Argument | Type   | Required | Default | Description                                   |
| -------- | ------ | -------- | ------- | --------------------------------------------- |
| name     | string | ❌ No    | -       | Repository name (update all if not specified) |

**Options:**

| Option      | Short | Type    | Default | Description                                       |
| ----------- | ----- | ------- | ------- | ------------------------------------------------- |
| --check     | -     | boolean | false   | Only check for updates, do not pull               |
| --status    | -     | boolean | false   | Show sync status between workspace and cache      |
| --sync      | -s    | boolean | false   | Sync to workspace after updating cache            |
| --sync-only | -     | boolean | false   | Only sync to workspace (skip cache update)        |
| --force     | -f    | boolean | false   | Force sync even if versions match                 |
| --dry-run   | -     | boolean | false   | Show what would be done without actually doing it |

**Examples:**

```bash
# Update all cached repositories
grf update

# Update a specific repository
grf update my-ref

# Check for updates without pulling
grf update --check

# Show sync status
grf update --status

# Update and sync to workspace
grf update --sync

# Only sync to workspace (skip cache update)
grf update --sync-only

# Force sync even if versions match
grf update --sync --force

# Preview what would be done
grf update --dry-run
```

---

## Configuration

### Configuration Files

grf uses a global configuration directory to store settings and cached repositories:

| Location                      | Description                         |
| ----------------------------- | ----------------------------------- |
| `~/.gitreference/config.json` | Global configuration file           |
| `~/.gitreference/repos/`      | Cached repository storage           |
| `.gitreference/`              | Working directory (in project root) |

### Configuration File Structure

The global configuration file (`~/.gitreference/config.json`) contains:

```json
{
  "defaultBranch": "main",
  "shallowClone": true,
  "shallowDepth": 1,
  "repositories": [
    {
      "name": "example-repo",
      "url": "https://github.com/example/repo.git",
      "branch": "main",
      "shallow": true,
      "depth": 1
    }
  ]
}
```

---

## How It Works

grf follows a two-stage workflow to manage reference code:

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│   Remote Repo   │────▶│      Global Cache       │────▶│  Project Work   │
│   (GitHub etc)  │     │ (~/.gitreference/repos) │     │ (.gitreference) │
└─────────────────┘     └─────────────────────────┘     └─────────────────┘
        │                       │                       │
        │      grf add          │      grf load         │
        │      grf update       │      grf update --sync│
        └───────────────────────┴───────────────────────┘
```

### Workflow Steps

1. **`grf add`** - Clones the repository to the global cache directory (`~/.gitreference/repos/`)
2. **`grf load`** - Copies the cached repository to the current project's `.gitreference/` directory
3. **Automatic .gitignore** - The `.gitreference/` directory is automatically added to `.gitignore`
4. **`grf update`** - Updates the cache from remote and optionally syncs to the working directory
5. **`grf unload`** - Removes loaded reference code from the project

### Benefits

- **Centralized caching** - Repositories are cloned once and shared across projects
- **Clean project history** - Reference code is excluded from version control
- **Easy updates** - Keep reference code in sync with upstream changes
- **Selective loading** - Load only the files or directories you need

---

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/haiyewei/grf-cli/blob/main/LICENSE) file for details.

---

## Contributing

Contributions are welcome! Here's how you can help:

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/grf-cli.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

### Development

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Submitting Changes

1. Make your changes and commit with clear, descriptive messages
2. Push to your fork: `git push origin feature/your-feature`
3. Open a Pull Request with a clear description of your changes

### Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and atomic
