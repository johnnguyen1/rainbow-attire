# Rainbow Attire

B2B e-commerce platform for customized business apparel — Next.js rewrite of the legacy Angular app (`business-swag`), backed by the existing `corporate-threads` Firebase project.

## Architecture

- **Next.js 16 (App Router)** with `output: 'export'` — the app builds to fully static files in `out/`, deployable to classic Firebase Hosting. There is no server runtime.
- **Firebase Web SDK in the browser** for everything: Auth (email/password + email verification), Firestore (products, carts, orders, users, companies), Storage (company logos), and the existing `setCustomClaims` Cloud Function for role changes.
- **Security lives in `firestore.rules` / `storage.rules`**, versioned in this repo.
- **shadcn/ui + Tailwind CSS** for the UI.

Because the export is static, dynamic resources use query params instead of path params (`/products/detail/?id=…`, `/orders/confirmation/?orderId=…`).

### Key directories

```
src/
├── app/                  # Routes (all client components)
│   ├── (auth)/auth/      # login, register, forgot-password, verification-pending
│   ├── (shop)/           # products, cart, orders, account (requires verified user)
│   ├── manager/          # company order dashboard, products, users (manager/admin)
│   └── admin/            # products, companies, users (admin only)
├── components/           # UI components, AuthProvider, CartProvider, guards
└── lib/
    ├── firebase-client.ts# Firebase SDK initialization
    └── services/         # Firestore/Storage data access
```

### Roles

- **user** — browse company catalog, cart, place/cancel orders, profile
- **manager** — plus company order lifecycle (approve → processing → shipped → delivered), tracking info, CSV exports, company user management
- **admin** — plus product catalog management (JSON import, CSV buyer costs), company management with logo uploads, and user role management

Role changes go through a single path (`lib/services/roles.ts`) that updates both the Firestore profile and Firebase Auth custom claims via the deployed `setCustomClaims` function, fixing the role-drift bug in the legacy app.

## Development

```bash
pnpm install
cp .env.example .env.local   # fill in the Firebase web app config
pnpm dev
```

## Deployment

```bash
pnpm build                          # writes static site to out/
firebase deploy --only hosting      # deploy the app
firebase deploy --only firestore:rules,storage   # deploy security rules
```

The Firebase project is configured in `.firebaserc` (`corporate-threads`).
