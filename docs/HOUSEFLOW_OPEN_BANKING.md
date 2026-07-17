# HouseFlow personal open banking setup

HouseFlow uses Enable Banking for read-only Bank of Valletta balances and
transactions. The personal deployment is intended for Enable Banking's free
restricted-production mode: only accounts pre-linked to the Enable Banking
application can return data.

## Enable Banking

1. Create an Enable Banking account and register a production API application.
2. Activate it in restricted mode with **Activate by linking accounts**, then
   complete the Bank of Valletta flow for every account HouseFlow should read.
3. Keep the downloaded PEM private key. Configure the public HouseFlow origin
   and callback URL (`https://your-host/houseflow/api/finance/callback`) in the
   provider control panel when requested.
4. For the required production application details, use a monitored personal
   email address for the data-protection email. Use your public HouseFlow URLs:
   `https://your-host/houseflow/privacy` and
   `https://your-host/houseflow/terms`. These pages do not require sign-in.
5. Note the application UUID and encode the PEM for a single-line environment
   value. On Linux: `base64 -w0 application.pem`.

## HouseFlow environment

Configure these values in the deployment environment:

```dotenv
FINANCE_OWNER_EMAIL=your-houseflow-login@example.com
# These values are public. A personal operator can use their own name and the
# same monitored email as FINANCE_OWNER_EMAIL.
PRIVACY_CONTROLLER_NAME=Your full name
DATA_PROTECTION_EMAIL=your-monitored-email@example.com
ENABLE_BANKING_APPLICATION_ID=your-enable-banking-application-uuid
ENABLE_BANKING_PRIVATE_KEY_BASE64=the-single-line-base64-value
ENABLE_BANKING_ASPSP_NAME=Bank Of Valetta
ENABLE_BANKING_ASPSP_COUNTRY=MT
```

If `DATA_PROTECTION_EMAIL` is omitted, HouseFlow falls back to
`FINANCE_OWNER_EMAIL` on the public legal pages. Set it explicitly if you want
to publish a different address. The controller name should identify the person
operating this private deployment; it does not need to be a company name.

Apply the Prisma migration and restart HouseFlow. The configured finance owner
can then connect BOV from Finance. Imported accounts start private; use **Share**
on individual accounts to make them read-only for the active household.

Disconnecting first asks Enable Banking to revoke the bank session and then
permanently deletes the connection, cached balances, transactions, and shares.
Database backups created before disconnection may still contain historical
copies and should follow the deployment's normal backup-retention policy.

For mock testing, register a sandbox application and override the ASPSP name and
country with a sandbox institution exposed to that application. Never commit
the PEM or its base64 value.

## Optional DeepSeek spending analysis

Subscription detection, merchant rules, limits, and spending-coach signals run
locally and do not require AI. To enable the additional manual AI perspective,
add these server-side values to the ignored `.env` file and restart the app:

```dotenv
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
```

The key is never sent to the browser. The finance owner must open Spending
Coach, choose **Improve with AI**, review the exact redacted payload, and give
explicit consent before the first request. HouseFlow sends rounded aggregates
and sanitized merchant labels only. Raw BOV notes, references, account IDs,
masked identifiers, exact dates, and user identity are excluded. Revoking AI
consent from Spending Coach deletes cached analyses from the live database.
