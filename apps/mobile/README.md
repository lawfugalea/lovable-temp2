# Clankeep mobile foundation

This Expo application is isolated from the existing Next.js web client. It uses
versioned `/api/mobile/v1` endpoints and does not reuse browser cookies.

## Local setup

1. Use Node 22 and run `npm install` in this directory.
2. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to the
   development server address reachable by the simulator or physical device.
3. Apply the repository's Prisma migrations to the approved database.
4. Start the isolated API from the repository root without copying secrets:
   `CLANKEEP_ENV_FILE=/path/to/ignored/.env npm run mobile:api:dev`.
5. Run `npm start` in this directory.

The foundation milestone supports secure login, token rotation, household
switching, and a read-only dashboard. It does not write household domain data.
