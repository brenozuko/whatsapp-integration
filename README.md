# WhatsApp Integration Project

This is a monorepo project built with Turborepo and managed using pnpm.

## Prerequisites

- Node.js (>=18)
- pnpm (>=8.15.6)

## Getting Started

1. Install pnpm globally (if you haven't already):

```bash
npm install -g pnpm
```

2. Install dependencies:

```bash
pnpm install
```

3. Generate Prisma

## Project Structure

This monorepo contains the following packages and applications:

- `apps/` - Contains all the applications
- `packages/` - Contains shared packages and utilities

## Development

To start the development server for all applications:

```bash
pnpm dev
```

This will start all applications in development mode with hot-reloading enabled.

## Docker Support

The project includes Docker configuration for containerized deployment. To start the services using Docker:

```bash
docker-compose up
```
