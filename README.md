# Predict Naija (web)

A Next.js 15 frontend for a naira prediction market on Nigerian events: the 2027 presidential race (national and all 37 states), governorship races and the Spotify Nigeria weekly #1.

API: [`predictionMarketServer`](https://github.com/godfadatun/predictionMarketServer).

## Pages

| Route | What it does |
|---|---|
| `/` | Featured presidential market, category tabs and market cards with live odds |
| `/states` | Tile-grid map of the 37 states, coloured by the leading candidate, with a table view |
| `/markets/[slug]` | Odds, your position, resolution rules/source and a trade ticket. The ticket quotes trades client-side with the same LMSR maths as the server and sends a 2% slippage limit. |
| `/wallet` | Balance, ledger activity and Paystack deposits |
| `/wallet/callback` | Paystack redirect target; verifies the deposit with the API |
| `/portfolio` | Open and settled positions |
| `/login`, `/register` | Email + Nigerian phone + password |
| `/admin` | Create markets and run the two-step resolution (propose, then a second admin confirms) |

## Run

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm ci
npm run dev                  # http://localhost:3000
```

Set the Paystack callback URL on the API (`PAYSTACK_CALLBACK_URL`) to `<web-origin>/wallet/callback`.

## Design notes
- **Mobile-first.** It's tested at 390px and 1280px in light and dark mode, with no horizontal scroll.
- **Odds bars** are one series (the implied probability per outcome), drawn in a single hue, sorted high to low, and labelled with values on every row.
- **State map colours** follow the candidate, not their rank. There are three validated categorical slots (Tinubu, Atiku, Obi); everyone else is "Other". Each tile also shows text (name and %), so identity never depends on colour alone. A table view is included.
- **Session token** is kept in `localStorage` for the MVP. Move to an httpOnly cookie before launch.
