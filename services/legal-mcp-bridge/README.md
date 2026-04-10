# Legal MCP Bridge

Small HTTP bridge for the premium legal consultation flow.

It runs `korean-law-mcp` as a local MCP server and exposes a simple JSON API that the main app can call.

## What It Does

- starts `korean-law-mcp` over stdio
- calls legal MCP tools such as:
  - `search_korean_law`
  - `read_legal_resource`
  - `explore_legal_chain`
  - `get_external_links`
- normalizes the MCP response into JSON for the main app

## Local Setup

1. Put your open law credential in the main repo `.env` or `.env.local`

```powershell
LAW_OC=your-open-law-id
```

2. Install bridge dependencies

```powershell
npm install
```

3. Install the Python MCP server into the local bridge venv

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install korean-law-mcp
```

4. Start the bridge

```powershell
npm run dev
```

The bridge auto-detects these in order:

1. `KOREAN_LAW_MCP_COMMAND`
2. local `.venv\Scripts\korean-law-mcp.exe`
3. `uvx korean-law-mcp`

It also auto-loads env files from:

- repo root `.env.local`
- repo root `.env`
- bridge folder `.env.local`
- bridge folder `.env`

## Environment Variables

- `LAW_OC` or `OPEN_LAW_ID`
- `PORT` default: `8788`
- `LEGAL_MCP_BRIDGE_TOKEN` optional
- `KOREAN_LAW_MCP_COMMAND` optional override
- `KOREAN_LAW_MCP_ARGS` optional override
- `KOREAN_LAW_MCP_CWD` optional override

## Endpoints

### `GET /health`

Returns bridge status and MCP connection health.

### `POST /legal/search`

Example request:

```json
{
  "question": "민법 750조 기준으로 손해배상 책임 설명해줘",
  "keywords": ["민법", "손해배상"],
  "searchType": "both",
  "articleHint": "750조"
}
```

## Main App Connection

Set these in the main app env:

```powershell
LEGAL_RESEARCH_PROVIDER=auto
LEGAL_MCP_BRIDGE_URL=http://localhost:8788
```

If you use a bridge token:

```powershell
LEGAL_MCP_BRIDGE_TOKEN=your-secret
```
