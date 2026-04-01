# SeedhaPe MCP Server

MCP server for the SeedhaPe API so AI agents can create and monitor payment orders.

## Tools

- `create_order`: Create a payment order (requires API key)
- `get_order`: Fetch full order details (requires API key)
- `get_order_status`: Fetch lightweight status (requires API key)
- `verify_payment`: Poll order status until terminal or timeout (requires API key)
- `get_public_order`: Fetch public payment-page order data (no auth)
- `set_expected_sender_name`: Save payer name on public order (no auth)
- `create_payment_link`: Create payment link via internal API-key route
- `list_payment_links`: List payment links via internal API-key route
- `update_payment_link`: Update payment link via internal API-key route
- `get_public_payment_link`: Fetch public link details (no auth)
- `initiate_payment_link`: Generate order from public payment link (no auth)
- `get_device_profile`: Merchant profile via internal API-key route
- `list_transactions`: Transactions via internal API-key route
- `list_disputes`: Disputes via internal API-key route
- `resolve_dispute`: Approve/reject dispute via internal API-key route
- `verify_device_api_key`: Validate API key + merchant summary

## Environment

- `SEEDHAPE_API_KEY`: SeedhaPe API key (`sp_live_*` or `sp_test_*`)
- `SEEDHAPE_BASE_URL` (optional): defaults to `https://seedhape.onrender.com`

## Run locally

```bash
pnpm install
pnpm --filter @seedhape/mcp-server build
SEEDHAPE_API_KEY=sp_test_xxx pnpm --filter @seedhape/mcp-server start
```

## MCP client config example

Use this in your MCP-enabled client config (adapt path/env values):

```json
{
  "mcpServers": {
    "seedhape": {
      "command": "node",
      "args": ["/home/jjhbk/seedhape/apps/mcp-server/dist/index.js"],
      "env": {
        "SEEDHAPE_API_KEY": "sp_test_xxxxxxxxx",
        "SEEDHAPE_BASE_URL": "https://seedhape.onrender.com"
      }
    }
  }
}
```

## Notes

- You can override `apiKey` and `baseUrl` per tool call.
- `amount` is in paise (for example `49900` = `INR 499.00`).
- `internal/device/alerts` is device-token based and currently not implemented as a live call in this MCP server.
