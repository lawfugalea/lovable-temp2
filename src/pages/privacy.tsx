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
      description="How this private Clankeep deployment handles household and connected banking data."
      config={config}
    >
      <LegalSection title="1. Who is responsible for your data">
        <p>
          The data controller for this Clankeep deployment is <strong className="text-foreground">{config.controllerName}</strong>.
          This is a privately operated household service, not a Bank of Valletta or Enable Banking service.
          Privacy questions and requests can be sent to {contact}.
        </p>
      </LegalSection>

      <LegalSection title="2. Data Clankeep processes">
        <p>Depending on the features you use, Clankeep processes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>account data such as your name, email address, password hash, household membership and role;</li>
          <li>household content you enter, including shopping lists, notes, medicine schedules and health-related records;</li>
          <li>connected banking data such as account names, masked identifiers, balances, currencies and transactions;</li>
          <li>finance preferences and derived information such as friendly account names, merchant corrections, subscriptions, spending limits and explainable spending patterns;</li>
          <li>open-banking connection details, consent/session identifiers, expiry dates and synchronisation errors; and</li>
          <li>limited technical and security information needed to operate, troubleshoot and protect the service.</li>
        </ul>
        <p>Clankeep does not receive or store your BOV online-banking password or authentication codes.</p>
      </LegalSection>

      <LegalSection title="3. Why the data is used and the legal basis">
        <p>
          Data is used to provide the Clankeep features requested by its users, authenticate accounts, keep household data in sync,
          connect authorised BOV accounts, display balances and transactions, prevent misuse and maintain the service.
        </p>
        <p>
          Open-banking access is based on the bank-account holder&apos;s explicit consent. Other processing is necessary to provide the
          requested private household service. Where applicable, service security and maintenance rely on the operator&apos;s legitimate
          interest in running Clankeep safely. Health-related information should only be entered with the knowledge and authority of
          the person concerned and is processed only for the private household feature in which it was supplied. Child-health records
          are not sent to DeepSeek. If a member enables medicine reminders, Clankeep sends a minimal, non-identifying notification through
          that device&apos;s browser push service; health details are displayed only after the authenticated app opens.
        </p>
      </LegalSection>

      <LegalSection title="4. Open banking and household sharing">
        <p>
          Clankeep uses Enable Banking to request read-only account information from Bank of Valletta after you approve access through
          the bank&apos;s own authorisation flow. Clankeep does not initiate payments. Imported accounts are private by default. The finance
          owner can explicitly share an individual account with the active household; household members then receive read-only access to
          that account&apos;s cached balance and transaction data.
        </p>
        <p>
          You can review or end Enable Banking consents through its{' '}
          <a className="text-primary hover:underline" href="https://enablebanking.com/data-sharing-consents/" rel="noreferrer" target="_blank">
            data-sharing consent portal
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="5. Who can receive the data">
        <p>Data is disclosed only as needed to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>members of your Clankeep household, for content and bank accounts that are shared with that household;</li>
          <li>Enable Banking and Bank of Valletta, to authorise and operate the read-only bank connection;</li>
          <li>DeepSeek, only when the finance owner explicitly requests optional AI analysis after previewing a redacted aggregate payload;</li>
          <li>Stripe, our payment processor, to take and manage subscription payments (Stripe receives your email and billing details; Clankeep never sees or stores your full card number);</li>
          <li>Resend, our email provider, to deliver account, household-invitation and password-reset emails (it receives the recipient name and email address);</li>
          <li>Kelma, the optional chat assistant embedded on our public pages, which loads only if you accept non-essential cookies and then receives what you type into the chat and basic connection data;</li>
          <li>the deployment&apos;s hosting, database and backup providers, where those services are configured; and</li>
          <li>public authorities where disclosure is legally required.</li>
        </ul>
        <p>Clankeep does not sell personal data and does not use connected banking data for advertising.</p>
      </LegalSection>

      <LegalSection title="6. International transfers">
        <p>
          Enable Banking states that its API cloud providers process data in the EEA. The location of Clankeep hosting, backups and email
          services depends on this deployment&apos;s configuration. Optional DeepSeek analysis involves processing in China according to
          DeepSeek&apos;s privacy notice and is disabled unless the finance owner gives explicit, informed consent after reviewing the redacted
          information that will be sent. If a provider processes data outside the EEA, the operator must assess and use an applicable GDPR
          transfer mechanism or derogation and make further information available on request. See{' '}
          <a className="text-primary hover:underline" href="https://tilisy.enablebanking.com/privacy" rel="noreferrer" target="_blank">
            Enable Banking&apos;s privacy notice
          </a>{' '}
          and{' '}
          <a className="text-primary hover:underline" href="https://www.bov.com/website-privacy-policy" rel="noreferrer" target="_blank">
            BOV&apos;s privacy notice
          </a>{' '}
          for their own processing.
        </p>
        <p>
          DeepSeek&apos;s{' '}
          <a className="text-primary hover:underline" href="https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html?locale=en_US" rel="noreferrer" target="_blank">
            privacy policy
          </a>{' '}
          states that submitted information may be used to improve its services. Clankeep therefore sends no raw transactions, account
          identifiers, exact dates, bank notes, references or user identity through this optional feature.
        </p>
        <p>
          Stripe and Resend are established under EU frameworks but may process limited billing or email-delivery data outside the EEA
          under their own safeguards; see the{' '}
          <a className="text-primary hover:underline" href="https://stripe.com/privacy" rel="noreferrer" target="_blank">Stripe</a>{' '}
          and{' '}
          <a className="text-primary hover:underline" href="https://resend.com/legal/privacy-policy" rel="noreferrer" target="_blank">Resend</a>{' '}
          privacy notices for details.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention and deletion">
        <p>
          Clankeep keeps your account and household data for as long as your account is active. You can delete your account at any time
          from Settings; this permanently removes your account from the live database and, where you are the sole remaining owner of a
          household, deletes that household&apos;s shared data — including shopping, notes, finance records and children&apos;s medicine and
          health records — as well. Health records for a child are kept only while the household maintains them or until the account or
          household is deleted.
        </p>
        <p>
          Disconnecting a bank connection requests revocation of the provider session and permanently removes that connection&apos;s cached
          accounts, balances, transactions and sharing records from the live database. Deleted data may remain temporarily in protected
          backups until they expire under the deployment&apos;s backup-retention schedule (currently 30 days). Billing records required for
          tax and accounting, and limited legal or security records, may be kept longer where the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="8. Your choices and rights">
        <p>
          Subject to applicable law, you may ask for access, correction, deletion, restriction, portability or an objection to processing.
          You may withdraw open-banking consent at any time by disconnecting the account in Clankeep or ending the consent through Enable
          Banking. Withdrawal does not make earlier lawful processing unlawful. Send requests to {contact}; identity may need to be verified
          before a request is completed.
        </p>
        <p>
          The finance owner can decline optional AI analysis, review each redacted payload before sending it, or revoke AI consent from the
          Spending Coach. Revocation deletes cached AI analyses from the live database and prevents further requests until consent is given again.
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
          Clankeep uses access controls, authentication and deployment security measures intended to protect the data. No internet service
          can guarantee absolute security. Clankeep uses essential session and security cookies, which do not require consent. The optional
          Kelma chat assistant on our public pages is a third-party service that may set its own cookies; it loads only if you accept
          non-essential cookies through the cookie banner, and you can decline. Clankeep does not use advertising cookies.
          Clankeep calculates recurring-payment candidates and neutral spending observations locally. These are explainable convenience
          features that users can correct, dismiss or disable. Optional AI output is shown only as a suggestion and never changes financial
          records automatically. Clankeep does not make automated decisions with legal or similarly significant effects.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes and contact">
        <p>
          This notice may be updated when Clankeep&apos;s features, providers or legal obligations change. The updated date will be shown at
          the top of this page. Questions and data-protection requests can be sent to {contact}.
        </p>
      </LegalSection>
    </PublicLegalPage>
  )
}
