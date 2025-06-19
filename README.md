# pw-agent

AI agent app to analyze Playwright traces.

## Features

- Analyze Playwright trace files using OpenAI models
- Stores trace files and analysis results in PostgreSQL and S3-compatible storage (MinIO by default)
- REST API with health check and trace analysis endpoints

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (for local MinIO and PostgreSQL)
- An OpenAI API key

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/anahit42/pw-agent
cd pw-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the content from .env.example file:

```env
OPENAI_API_KEY=your-openai-api-key
...
...
```

### 4. Start services (MinIO & PostgreSQL)

```bash
docker-compose up -d
```

### 5. Set up the database

Run Prisma migrations and generate the client:

```bash
npx prisma migrate dev
npx prisma generate
```

### 6. Start the application

```bash
npm run dev
```

The server will start at [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Start the server in development mode
- `npm test` — Run tests

## Development

- Source code is in the `src/` directory.
- Database schema is managed with Prisma (`prisma/schema.prisma`).

