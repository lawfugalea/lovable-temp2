import type { GetServerSideProps } from 'next'
import PublicLegalPage, { LegalSection } from '@/components/PublicLegalPage'
import { getPublicLegalConfig, type PublicLegalConfig } from '@/lib/public-legal'

type PrivacyPageProps = {
  config: PublicLegalConfig
}

export const getServerSideProps: GetServerSideProps<PrivacyPageProps> = async () => ({
  props: { config: getPublicLegalConfig() },
})

export default function PrivacyPage({ config }: PrivacyPageProps) {
  const contact = config.contactEmail ? (
    <a className="text-primary hover:underline" href={`mailto:${config.contactEmail}`}>
      {config.contactEmail}
    </a>
  ) : (
    'the contact address shown on this page once configured'
  )

  return (
    <PublicLegalPage
      title="Privacy Policy"
      description="How Clankeep handles your household's data."
      config={config}
    >
      <LegalSection title="1. Who is responsible for your data">
        <p>
          The data controller for Clankeep is <strong className="text-foreground">{config.controllerName}</strong>.
          Clankeep is an independent household service. Privacy questions and requests can be sent to {contact}.
        </p>
      </LegalSection>

      <LegalSection title="2. Data Clankeep processes">
        <p>Depending on the features you use, Clankeep processes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>account data such as your name, email address, password hash, household membership, role and your record of accepting the Terms;</li>
          <li>household content you enter, including shopping lists, meal plans, recipes, chores, notes, medicine schedules and health-related records;</li>
          <li>money-planner information you type in yourself — incomes, commitments, budgets, savings goals, planning-account names, monthly funding rules and transfer check-offs. These are manual planning records;</li>
          <li>your household&apos;s country, used to configure appropriate regional defaults;</li>
          <li>billing references when you subscribe to the Family plan — a Stripe customer and subscription identifier and subscription status. Clankeep never sees or stores your full card number;</li>
          <li>limited technical and security information needed to operate, troubleshoot and protect the service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Why the data is used and the legal basis">
        <p>
          Data is used to provide the Clankeep features requested by its users, authenticate accounts, keep household
          data in sync between members, take subscription payments, deliver account emails, prevent misuse and maintain
          the service.
        </p>
        <p>
          Most processing is necessary to provide the service you signed up for. Optional AI analysis and non-essential
          cookies rely on your explicit consent. Service security and maintenance rely on the operator&apos;s legitimate
          interest in running Clankeep safely. Health-related information should only be entered with the knowledge and
          authority of the person concerned and is processed only for the household feature in which it was supplied.
          Child-health records are never sent to DeepSeek. If a member enables medicine reminders, Clankeep sends a
          minimal, non-identifying notification through that device&apos;s browser push service; health details are
          displayed only after the authenticated app opens.
        </p>
      </LegalSection>

      <LegalSection title="4. Household sharing">
        <p>
          Clankeep is household-scoped by design: content you add is visible to members of your household according to
          the feature in use, and access is checked against authenticated household membership on every request. A
          private planning account is visible only to its owner; other members receive only the amount and completion
          status of a contribution that private account sends to a shared account.
        </p>
      </LegalSection>

      <LegalSection title="5. Who can receive the data">
        <p>Data is disclosed only as needed to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>members of your Clankeep household, for content shared within that household;</li>
          <li>Stripe, our payment processor, to take and manage Family-plan payments (Stripe receives your email and billing details; Clankeep never sees or stores your full card number);</li>
          <li>Resend, our email provider, to deliver welcome, household-invitation and password-reset emails (it receives the recipient name and email address);</li>
          <li>DeepSeek, only when a user explicitly requests an optional AI feature after previewing the exact payload; shopping tidy may include selected active item text and selected meal ingredients, while finance coaching uses redacted aggregates and account organisation uses opaque references, roles, categories and rounded monthly figures;</li>
          <li>Kelma, the optional chat assistant embedded on our public pages, which loads only if you accept non-essential cookies and then receives what you type into the chat and basic connection data;</li>
          <li>Meta, to measure how well Clankeep&apos;s own advertising works, and only if you accept non-essential cookies on our public pages. Meta then receives which of those public pages you visited, your IP address and browser identifier, Meta&apos;s own cookie identifiers, and — if you create an account or subscribe — a one-way cryptographic hash of your email address plus, for a subscription, the amount paid. Your email address itself is never sent, and nothing inside your household account is ever sent;</li>
          <li>the deployment&apos;s hosting, database and backup providers, where those services are configured; and</li>
          <li>public authorities where disclosure is legally required.</li>
        </ul>
        <p>
          Clankeep does not sell personal data. The content of your household — your lists, meals, chores, notes,
          medicines and finances — is never used for advertising or shared with any advertising platform. The
          measurement described above covers only visits to our public marketing pages, account creation and
          subscription, and only with your consent.
        </p>
      </LegalSection>

      <LegalSection title="6. International transfers">
        <p>
          Clankeep is hosted and backed up in the European Economic Area. Optional DeepSeek analysis involves processing
          in China according to DeepSeek&apos;s privacy notice and is disabled unless the requesting user gives explicit,
          informed consent after reviewing the exact information that will be sent. DeepSeek&apos;s{' '}
          <a className="text-primary hover:underline" href="https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html?locale=en_US" rel="noreferrer" target="_blank">
            privacy policy
          </a>{' '}
          states that submitted information may be used to improve its services. Finance sends only redacted totals or,
          for account organisation, opaque references, roles, categories and rounded monthly figures without account,
          commitment or goal names;
          shopping tidy sends only the selected active item names, quantities and categories plus any meal ingredients
          from the week you select. Neither flow sends names of people, completed shopping history, retailer data,
          catalogue links, prices or user identity.
        </p>
        <p>
          Advertising measurement, if you consent to it, involves Meta Platforms Ireland Limited, which may transfer
          data to the United States under its own safeguards; see{' '}
          <a className="text-primary hover:underline" href="https://www.facebook.com/privacy/policy" rel="noreferrer" target="_blank">
            Meta&apos;s privacy policy
          </a>. You can withdraw that consent at any time through the cookie banner on our public pages.
        </p>
        <p>
          Stripe and Resend are established under EU frameworks but may process limited billing or email-delivery data
          outside the EEA under their own safeguards; see the{' '}
          <a className="text-primary hover:underline" href="https://stripe.com/privacy" rel="noreferrer" target="_blank">Stripe</a>{' '}
          and{' '}
          <a className="text-primary hover:underline" href="https://resend.com/legal/privacy-policy" rel="noreferrer" target="_blank">Resend</a>{' '}
          privacy notices for details.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention and deletion">
        <p>
          Clankeep keeps your account and household data for as long as your account is active. You can delete your
          account at any time from Settings; this permanently removes your account from the live database and, where you
          are the sole remaining owner of a household, deletes that household&apos;s shared data — including shopping,
          notes, planner records and children&apos;s medicine and health records — as well. Health records for a child
          are kept only while the household maintains them or until the account or household is deleted.
        </p>
        <p>
          Deleted data may remain temporarily in protected backups until they expire under the backup-retention schedule
          (currently 30 days). Billing records required for tax and accounting, and limited legal or security records,
          may be kept longer where the law requires it. Password-reset links are single-use and expire after one hour.
        </p>
      </LegalSection>

      <LegalSection title="8. Your choices and rights">
        <p>
          Subject to applicable law, you may ask for access, correction, deletion, restriction, portability or an
          objection to processing. You can export your data and delete your account from Settings without asking us.
          Send other requests to {contact}; identity may need to be verified before a request is completed.
        </p>
        <p>
          The finance owner can decline optional AI analysis, review each redacted payload before sending it, or revoke
          AI consent from the coach. Revocation deletes cached AI analyses from the live database and prevents further
          requests until consent is given again. Withdrawal of a consent does not make earlier lawful processing
          unlawful.
        </p>
        <p>
          You may also lodge a complaint with Malta&apos;s{' '}
          <a className="text-primary hover:underline" href="https://idpc.org.mt/file-a-complaint/" rel="noreferrer" target="_blank">
            Information and Data Protection Commissioner
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="9. Security, cookies and automated decisions">
        <p>
          Clankeep uses access controls, authentication and deployment security measures intended to protect the data.
          No internet service can guarantee absolute security. Clankeep uses essential session and security cookies,
          which do not require consent. The optional Kelma chat assistant on our public pages is a third-party service
          that may set its own cookies; it loads only if you accept non-essential cookies through the cookie banner, and
          you can decline. Accepting non-essential cookies also enables Meta&apos;s advertising-measurement cookies on
          our public marketing pages, so we can tell which adverts lead to signups; declining leaves them off, and the
          rest of Clankeep works exactly the same either way. Planner observations and set-aside suggestions are
          calculated locally from figures you entered; they are explainable convenience features that you can correct,
          dismiss or ignore. Optional AI output is shown only as a suggestion and never changes your records
          automatically. Clankeep does not make automated decisions with legal or similarly significant effects.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes and contact">
        <p>
          This notice may be updated when Clankeep&apos;s features, providers or legal obligations change. The updated
          date will be shown at the top of this page. Questions and data-protection requests can be sent to {contact}.
        </p>
      </LegalSection>
    </PublicLegalPage>
  )
}
