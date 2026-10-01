# CryptoPay - INR ↔ Crypto Platform

CryptoPay - INR ↔ Crypto Platform is a Vite frontend titled "CryptoPay - INR ↔ Crypto Platform". Pages in the source include Admin Withdrawals, Dashboard, Deposit, History, Landing, Profile, Send, Withdraw.

[![License](https://img.shields.io/github/license/Bannysukumar/Crypto-Exchange)](https://github.com/Bannysukumar/Crypto-Exchange/blob/main/LICENSE) [![Stars](https://img.shields.io/github/stars/Bannysukumar/Crypto-Exchange)](https://github.com/Bannysukumar/Crypto-Exchange/stargazers) [![Last commit](https://img.shields.io/github/last-commit/Bannysukumar/Crypto-Exchange)](https://github.com/Bannysukumar/Crypto-Exchange/commits/main)

## Overview

CryptoPay - INR ↔ Crypto Platform is a Vite frontend titled "CryptoPay - INR ↔ Crypto Platform". Pages in the source include Admin Withdrawals, Dashboard, Deposit, History, Landing, Profile, Send, Withdraw.


What is actually in the repository: `api/`, `public/`, `src/`. GitHub reports the primary language as TypeScript.

Published site recorded on the repository: https://crypto-exchange-ecru-chi.vercel.app

## Features


- Admin Withdrawals
- Dashboard
- Deposit
- History
- Landing
- Profile
- Send
- Withdraw

## Tech Stack

| Technology | Where it shows up |
|---|---|
| React | User interface |
| Vite | Frontend build tool |
| Firebase | Backend services used by this repository |
| ethers.js or web3.js | Wallet and contract calls from the browser or app |
| API routes | Server endpoints in the api directory |

## Project Architecture

React client in src/ and HTTP handlers in api/.

## Project Structure

```text
Crypto-Exchange/
├── api/
├── public/
├── src/
├── env.example
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
├── vite.config.ts
```

## Getting Started

```bash
git clone https://github.com/Bannysukumar/Crypto-Exchange.git
cd Crypto-Exchange
npm install
npm run dev
```

Scripts defined in package.json:

- `npm run dev` — `vite`
- `npm run build` — `vite build`
- `npm run lint` — `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`

## API

Endpoint files present in `api/`:

- `api/create-order.js`
- `api/health.js`
- `api/history.js`
- `api/order-status.js`
- `api/test.js`
- `api/transactions.js`
- `api/users.js`

## Deployment

- vercel.json is in the repository root.
- The repository homepage is https://crypto-exchange-ecru-chi.vercel.app.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under MIT. See [LICENSE](LICENSE).

## Author

[Banny Sukumar](https://github.com/Bannysukumar)

- GitHub: [@Bannysukumar](https://github.com/Bannysukumar)
- Portfolio: [adepu-sukumar.vercel.app](https://adepu-sukumar.vercel.app/)
- LinkedIn: [Adepu Sukumar](https://www.linkedin.com/in/adepu-sukumar-59b423351)
