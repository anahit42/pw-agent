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

Create a `.env` file in the root directory with the content from `.env.example` file. Add  your OpenAI API key.

```env
OPENAI_API_KEY=your-openai-api-key
...
...
```

### 4. Start services (MinIO, PostgreSQL, Redis)

```bash
docker-compose up -d
```

### 5. Set up the database

Run Prisma migrations and generate the client (for TS types):

```bash
npm run init-db
```

### 6. Start the backend

```bash
npm run dev
```

The server will start at [http://localhost:3000](http://localhost:3000).

### 7. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will start at [http://localhost:5173](http://localhost:5173).


## Development

- Backend source code is in the `src/` directory
- Frontend source code is in `frontend/` directory
- Database schema is managed with Prisma (`prisma/schema.prisma`).

## Production Readiness

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for a comprehensive production readiness checklist and best practices
