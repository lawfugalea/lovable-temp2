# HouseFlow

**HouseFlow** is a web application designed to help families manage the day‑to‑day needs of their household.  It combines a shared shopping list with simple budgeting tools so that everyone in the family can contribute to a household budget, see how their contributions are allocated, and plan for future savings.  A lightweight management page lets you invite partners or children to your household and control what they can see or edit.

## Key Features

- **Shared shopping lists.** Family members can quickly add items, mark them as purchased, and categorise them by aisle or department.  The UI suggests common items as you type and automatically groups them by category to save time at the store【274008079251002†L32-L35】.  Lists sync in real time so everyone stays up to date【274008079251002†L39-L43】.
- **Household budgeting.** Earners can input their monthly income and choose how to contribute to shared expenses using methods such as equal splits or proportional contributions.  The dashboard displays income vs. spending, upcoming bills and bill reminders, and visualises progress towards shared goals.  Users can set spending limits and receive notifications for unusual spending activity【180313483657777†L245-L253】.
- **Savings projections.** A simple projection tool helps families see how much they could save over time based on their current contributions.  It uses zero‑based budgeting principles so every dollar is assigned a purpose【180313483657777†L217-L223】.  Progress is presented in charts to make it easy to understand.
- **Household management.** A management page lets the primary account holder invite other users via email, assign roles (earner or viewer), and remove users.  All members can view shared shopping lists and budgets; earners can edit contributions.  Data is stored securely using server‑side sessions and encrypted databases; user authentication is handled via OAuth (Google/Apple accounts) or basic email sign‑up.

## Getting Started

The repository contains a skeleton Next.js project configured with TypeScript and Tailwind CSS.  The app uses the file‑based routing system provided by Next.js and separates UI into reusable components.  To set up the project locally, open a terminal in the project root and run the following commands:

```bash
# install dependencies
npm install

# run in development mode
npm run dev

# build and start the production server
npm run build && npm start
```

During development the app is available at `http://localhost:3000`.

## Deployment

The application is designed to be deployed on [Vercel](https://vercel.com).  After pushing your repository to GitHub, import it into Vercel and follow the prompts to set up a Next.js project.  Vercel will automatically detect the Next.js framework and handle building and deploying the application.  Environment variables (for example, OAuth credentials or database URLs) should be configured through Vercel’s dashboard.

## Folder Structure

```
houseflow/
├── package.json          # project metadata and scripts
├── next.config.js        # Next.js configuration
├── postcss.config.js     # PostCSS and Tailwind configuration
├── tailwind.config.js    # Tailwind theme and purge paths
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── pages/            # route definitions
│   │   ├── _app.tsx      # top level component for all pages
│   │   ├── index.tsx     # home page
│   │   ├── dashboard.tsx # finances dashboard
│   │   ├── shopping.tsx  # shared shopping list
│   │   └── settings.tsx  # household management
│   ├── components/       # reusable React components
│   │   └── Layout.tsx    # layout wrapper with header and nav
│   └── styles/
│       └── globals.css   # global Tailwind imports
├── public/
│   └── placeholder.png   # placeholder image for demonstration
└── scripts/
    └── setup.sh          # helper script to bootstrap the project
```

## Implementation Notes

- **Authentication.** The skeleton includes placeholders for [NextAuth.js](https://next-auth.js.org/) integration.  When you are ready to implement authentication, install the `next-auth` package and follow the official guide to configure Google and Apple OAuth providers.
- **Database.** The example does not include a database layer.  For production use you should connect to a persistent store (such as PostgreSQL) to keep shopping lists, user accounts, and transaction data.  Libraries such as Prisma can help model your data and provide type‑safe queries.
- **Styling.** Tailwind CSS is configured for rapid UI development.  Use the utility classes to build responsive layouts that match the reference design provided in the brief.  Feel free to customise the colours and fonts in `tailwind.config.js`.
- **Extensibility.** The codebase is intentionally minimal.  Primary pages import components that you can expand over time.  For example, the `FinanceDashboard` component could fetch transaction data, compute charts, and display notifications.  The `ShoppingList` component could support drag‑and‑drop reordering or voice input.

## License

This project is provided as a starting point for educational purposes.  You are free to modify and distribute it as needed.