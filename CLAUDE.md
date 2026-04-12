# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Chrome DevTools MCP is a Model Context Protocol server that enables AI coding assistants to control and inspect Chrome browsers via Chrome DevTools. It uses Puppeteer for browser automation and provides tools for performance analysis, network inspection, and debugging.

## Development Commands

```bash
# Install dependencies (use node v22 per .nvmrc)
npm ci

# Build TypeScript to build/ directory
npm run build

# Build production bundle (clean + build + rollup)
# IMPORTANT: Use this before npm publish - it bundles dependencies into build/src/third_party/index.js
npm run bundle

# Run all tests
npm run test

# Run a specific test (mark with `{ only: true }` in test file)
npm run test:only

# Skip build when iterating on tests
npm run test:only:no-build

# Update test snapshots
npm run test:update-snapshots

# Type check without emitting
npm run typecheck

# Format and lint code
npm run format

# Check format without fixing
npm run check-format

# Generate/update tool documentation (run after tool changes)
npm run docs

# Start server with debug logs
npm run start-debug

# Test with MCP inspector
npx @modelcontextprotocol/inspector node build/src/index.js
```

## Architecture

### Entry Point Flow

- `src/index.ts` - CLI entry with Node version validation (requires Node 20.19+, 22.12+, or 23+)
- `src/main.ts` - MCP server initialization, tool registration, and browser lifecycle
- `src/cli.ts` - Command-line argument parsing with yargs

### Core Components

- `src/McpContext.ts` - Central state manager for browser pages, snapshots, network/console collectors, and trace results. Implements the `Context` interface used by all tools.
- `src/McpResponse.ts` - Response builder for MCP tool results (text, images, snapshots)
- `src/browser.ts` - Puppeteer browser launch/connect logic with user data directory management
- `src/PageCollector.ts` - Tracks network requests and console messages per page

### Tool System

Tools are defined in `src/tools/` using `defineTool()` from `src/tools/ToolDefinition.ts`:

- Each tool exports a `ToolDefinition` with name, description, schema (Zod), and async handler
- Tools are registered in `main.ts` and can be filtered by category via CLI flags
- Categories: Input automation, Navigation, Emulation, Performance, Network, Debugging

### Performance Trace Processing

- `src/trace-processing/parse.ts` - Parses Chrome trace files using DevTools frontend modules
- Integrates with `chrome-devtools-frontend` npm package for insight extraction

### Third-Party Bundling

- `src/third_party/index.ts` - Re-exports Puppeteer, MCP SDK, Zod, and polyfills (core-js)
- Rollup config bundles these into a single file for the npm package
- Dependencies in devDependencies get inlined during `npm run bundle`

## Testing

Tests use Node's built-in test runner (`node:test`). Test files are in `tests/` mirroring `src/` structure.

- `tests/setup.ts` - Global test setup and snapshot path configuration
- `tests/server.ts` - Test utilities for MCP server testing
- `tests/utils.ts` - Shared test helpers

Run tests with `npm run test`. For focused testing during development, add `{ only: true }` to individual tests and use `npm run test:only`.

## CI Requirements

PRs must pass:

1. Format check (`npm run check-format`)
2. Docs up-to-date (`npm run docs` should produce no diff)
3. Tests on Node 20, 22, 23, 24 across ubuntu/windows/macos

## Key Conventions

- Follow [conventional commits](https://www.conventionalcommits.org/) for PR/commit titles
- After adding/modifying tools, run `npm run docs` to regenerate documentation
- Version is managed via release-please markers in `main.ts`
