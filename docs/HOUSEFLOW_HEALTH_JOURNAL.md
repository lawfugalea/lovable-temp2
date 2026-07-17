# HouseFlow child health journal

The health journal stores illness episodes, saved medicines, administered doses, temperatures, and weight history in the same self-hosted PostgreSQL database as the rest of HouseFlow. It is a shared household record, not a diagnostic or prescribing service.

## Medicine schedule safety

Recording a factual dose does not require a schedule. A parent can select a saved medicine or enter a new medicine name and amount directly; a new entry is saved for reuse in the same transaction as the dose. Medicines without a schedule remain journal-only and do not produce timing guidance or reminders.

To enable timing checks and reminders, parents must copy the exact product, formulation, concentration, dose, minimum interval, and 24-hour maximum from product packaging, its leaflet, or a clinician instruction. Migrated free-text medicine records remain journal-only until these details are confirmed.

As-needed medicines show when another dose is eligible but do not become “due” and do not generate automatic reminders. If an actual administration conflicts with the verified limits, HouseFlow warns the parent and requires explicit confirmation while preserving the real event.

HouseFlow does not send child-health data to DeepSeek. The existing optional DeepSeek integration remains limited to redacted finance aggregates.

## Episode grouping

The first entry after more than 72 hours without a dose or temperature asks whether to start a new episode or continue the prior one. Historical data is grouped into clearly marked inferred episodes during migration. Episode grouping does not diagnose an illness.

## Web Push setup

Web Push requires a trusted HTTPS deployment and these server-side settings:

```dotenv
VAPID_PUBLIC_KEY=replace-with-generated-public-key
VAPID_PRIVATE_KEY=replace-with-generated-private-key
VAPID_SUBJECT=mailto:monitored-address@example.com
REMINDER_WORKER_SECRET=replace-with-at-least-32-random-bytes
```

Generate a VAPID key pair with the locally installed package:

```bash
npx web-push generate-vapid-keys
```

The `reminder` Compose service calls the internal dispatcher once per minute. Delivery rows have a database uniqueness constraint, so restarts and overlapping polls cannot send the same scheduled occurrence twice. Expired browser subscriptions are disabled automatically.

Notifications deliberately contain only “HouseFlow medicine reminder due.” Child and medicine details are loaded after the member opens the authenticated app.

## Deployment

Take and verify a database backup before deploying the journal migration:

```bash
./scripts/backup-houseflow-db.sh
docker compose --env-file .env.deploy up -d --build db migrate app backup reminder
```

After deployment, confirm the app is served over HTTPS, install it on each parent’s phone, and enable reminders from the health journal on every desired device.
