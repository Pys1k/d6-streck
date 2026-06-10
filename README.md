# D6 streck

Strecklista för D6-rummet. Lägg in vad du köpt så håller sidan koll på vem som är skyldig vad, med statistik och topplista så man kan skämmas lite extra. Finns även SnusSlump, ett hjul som bestämmer åt en när man inte kan välja själv.

Byggt med Next.js, Prisma och Postgres (samt lite Claude). Körs på Vercel för tillfället men ska flyttas till hemmaserver asap.

## Köra lokalt

```bash
npm install
cp .env.example .env   # fyll i databas och secrets
npx prisma db push
npm run db:seed
npm run dev
```

Adminpanelen finns på `/admin`. Användarnamn och lösenord sätts med `ADMIN_USERNAME` och `ADMIN_PASSWORD` i `.env` innan seed, byt annars lösenordet direkt i adminpanelen :^).
