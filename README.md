# finances

Household money app (interface in Brazilian Portuguese): bills to pay, projected balance, budgets and credit cards for a couple.

**Stack:** React 19 + Vite (in `web/`), a dependency-free Node HTTP server (`server.js`) that serves the build and stores everything in one JSON file. The shared design system lives in `design-system/`.

## Layout

```
server.js        Node server: serves dist/ and GET/PUT /api/data
web/             React app (Vite)
design-system/   Design tokens and components used by web/
dist/            Build output (generated)
```

## Requirements

- Node.js 22+
- Or Docker

## Run locally (development)

```bash
git clone https://github.com/Ciskow/finances.git
cd finances
cd web && npm install && cd ..

# terminal 1: API server (data saved to ./data/db.json)
DATA_FILE_PATH=./data/db.json node server.js

# terminal 2: web dev server, proxies /api to :8182
cd web && npm run dev
```

Open http://localhost:5173.

On Windows PowerShell, set the variable with `$env:DATA_FILE_PATH="./data/db.json"; node server.js`.

## Run in production without Docker

```bash
cd web && npm install && npm run build && cd ..
DATA_FILE_PATH=./data/db.json node server.js
```

Open http://localhost:8182.

## Run with Docker

```bash
docker build -t financas-app .
docker run -d --name financial -p 8182:8182 -v ./data:/data financas-app
```

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8182` | HTTP port |
| `DATA_FILE_PATH` | `/data/db.json` | JSON file with all app data |

### docker-compose

```yaml
financialApp:
  build: ./finances
  container_name: financial
  image: financas-app:latest
  restart: always
  ports:
    - "8182:8182"
  volumes:
    - ./finances/data:/data
```
