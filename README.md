<!-- readme-seo: bannysukumar-professional-v4 -->

# CryptoPay

CryptoPay is a React and Vite web application for INR and crypto payments. The HTML title is "CryptoPay - INR ↔ Crypto Platform". Pages in `src/pages` cover landing, dashboard, deposit, withdraw, send, history, profile, and admin withdrawals.

## Overview

The repository name is `Crypto-Exchange`. The product name in the source is CryptoPay. The client uses React, Vite, Firebase, and the `web3` package. `src/config/contracts.ts` holds contract configuration. `src/config/cashfree.ts` and `env.example` refer to Cashfree. Server handlers live in `api/`.

This is a different repository from `crypto-pay`. The recorded homepage is https://crypto-exchange-ecru-chi.vercel.app.

## Features

- Landing, dashboard, deposit, withdraw, send, history, and profile pages
- Admin withdrawals page
- Auth, Web3, and crypto-price React contexts
- Cashfree config and an `env.example` file
- API files for orders, order status, transactions, users, history, and health

## Tech Stack

| Technology | Where it shows up |
|---|---|
| React | `package.json` and `src/` |
| TypeScript | `tsconfig.json` |
| Vite | `vite.config.ts` |
| Firebase | `src/config/firebase.ts` |
| web3 | `web3` dependency and `src/contexts/Web3Context.tsx` |
| Cashfree | `src/config/cashfree.ts` and `env.example` |

## Architecture

React client in `src/` → HTTP handlers in `api/` → Firebase and Web3 providers in the client. Contract settings are read from `src/config/contracts.ts`. No deployed contract address is documented in this README because none was taken from a verified public source during this update.

## Project Structure

```text
Crypto-Exchange/
├── api/
├── src/pages/
├── src/config/
├── src/contexts/
├── env.example
├── index.html
├── package.json
├── vercel.json
└── vite.config.ts
```

## Prerequisites

- Node.js
- npm

## Installation

```bash
git clone https://github.com/Bannysukumar/Crypto-Exchange.git
cd Crypto-Exchange
npm install
npm run dev
```

`npm run dev` starts Vite. `vite.config.ts` sets the dev server port to 3000.

## Configuration

Copy `env.example` to `.env`. That example names the Cashfree app settings and `VITE_API_BASE_URL`. Do not commit real keys. A `.env` file is already in the working tree on GitHub. Treat its values as secrets.

## Usage

Open the landing page, sign in through the auth flow, and use deposit, withdraw, send, and history. Admin withdrawal review is `src/pages/AdminWithdrawals.tsx`.

## API

Files in `api/`:

- `create-order.js`
- `order-status.js`
- `transactions.js`
- `users.js`
- `history.js`
- `health.js`

## Smart Contract

`src/config/contracts.ts` is the client contract configuration. This README does not publish a contract address.

## Deployment

`vercel.json` sets the Vite build output to `dist` and rewrites `/api` requests. Homepage: https://crypto-exchange-ecru-chi.vercel.app.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under MIT. See [LICENSE](LICENSE).

## Author

Banny Sukumar

GitHub: https://github.com/Bannysukumar
