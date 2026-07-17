import type { GetServerSideProps } from 'next'
import PublicLegalPage, { LegalSection } from '@/components/PublicLegalPage'
import { getPublicLegalConfig, type PublicLegalConfig } from '@/lib/public-legal'

type TermsPageProps = {
  config: PublicLegalConfig
}

export const getServerSideProps: GetServerSideProps<TermsPageProps> = async () => ({
  props: { config: getPublicLegalConfig() },
})

export default function TermsPage({ config }: TermsPageProps) {
  const contact = config.contactEmail ? (
    <a className="text-cozy-primary hover:underline" href={`mailto:${config.contactEmail}`}>
      {config.contactEmail}
    </a>
  ) : (
    'the contact address shown on this page once configured'
  )

  return (
    <PublicLegalPage
      title="Terms of Service"
      description="The rules for using this private HouseFlow household service and its read-only bank connection."
      config={config}
    >
      <LegalSection title="1. The service">
        <p>
          These terms apply to this private HouseFlow deployment, operated by{' '}
          <strong className="text-cozy-text">{config.controllerName}</strong>. HouseFlow helps invited household members manage shared
          information and, when enabled, view selected Bank of Valletta account information through Enable Banking. By using HouseFlow,
          you agree to these terms and the <a className="text-cozy-primary hover:underline" href="./privacy">Privacy Policy</a>.
        </p>
      </LegalSection>

      <LegalSection title="2. Private and authorised use">
        <p>
          HouseFlow is for the operator&apos;s private household and invited users. You must give accurate account information, keep your sign-in
          details secure and promptly report suspected unauthorised access. You may only enter or connect information that you are legally
          authorised to use and share. Do not use HouseFlow for unlawful, abusive or security-disrupting activity.
        </p>
      </LegalSection>

      <LegalSection title="3. Read-only bank access">
        <p>
          Only the designated finance owner can create or manage an open-banking connection. You must be an authorised holder or user of
          every bank account you connect. Bank access is read-only: HouseFlow displays account details, balances and transactions but does
          not initiate transfers or payments. Authorisation takes place with BOV through Enable Banking and remains subject to their terms,
          security checks, consent duration and availability.
        </p>
      </LegalSection>

      <LegalSection title="4. Sharing with the household">
        <p>
          Imported bank accounts start private. If the finance owner chooses to share an account, members of the active HouseFlow household
          can see its cached account details, balance and transactions. The finance owner is responsible for having authority to make that
          disclosure and can stop sharing without disconnecting the bank. Other HouseFlow content may also be visible to household members
          according to the feature and permissions in use.
        </p>
      </LegalSection>

      <LegalSection title="5. Accuracy and availability">
        <p>
          Bank information may be delayed, incomplete or temporarily unavailable because it comes from BOV and Enable Banking. HouseFlow
          is a convenience view, not an official bank statement, accounting system or financial-advice service. Verify important balances
          and transactions directly with BOV. The operator may maintain, change, suspend or discontinue the private deployment when needed.
        </p>
      </LegalSection>

      <LegalSection title="5A. Finance patterns and optional AI">
        <p>
          Subscription detection, merchant correction rules, spending limits and coaching observations are estimates based on imported
          transaction patterns. They can be incomplete or wrong and should not be treated as financial, accounting, medical or behavioural
          advice. Users remain responsible for reviewing the underlying transactions and managing any subscription with the merchant.
        </p>
        <p>
          DeepSeek analysis is optional and manual. The finance owner must review the redacted aggregate payload and consent before it is
          sent. AI output may be inaccurate and never changes transactions, rules, subscriptions or limits automatically.
        </p>
      </LegalSection>

      <LegalSection title="5B. Child health journal">
        <p>
          The child health journal is a private household record of information entered by parents or carers. It is not a medical device,
          diagnostic service, prescription, or substitute for product packaging, a pharmacist, a doctor, or emergency care. Medicine
          schedules must be copied from the exact product packaging or leaflet, or from a clinician instruction. Users remain responsible
          for checking the formulation, concentration, dose, interval and daily maximum before administration.
        </p>
        <p>
          HouseFlow may warn when a recorded administration conflicts with a verified schedule, but it preserves explicitly confirmed
          entries so the journal reflects what actually happened. Child-health information is not sent to DeepSeek. Optional Web Push
          reminders contain no child or medicine details on the lock screen.
        </p>
      </LegalSection>

      <LegalSection title="6. Privacy and third-party services">
        <p>
          Use of personal data is described in the Privacy Policy. The bank connection also involves Enable Banking and Bank of Valletta,
          whose own terms and privacy notices apply to their services. HouseFlow is not endorsed by, operated by or a replacement for either
          provider. If optional AI analysis is requested, DeepSeek&apos;s own terms and privacy policy also apply to its processing.
        </p>
      </LegalSection>

      <LegalSection title="7. Ending access and deleting bank data">
        <p>
          You can stop using HouseFlow at any time. The finance owner can unshare an account or disconnect the bank connection. Disconnecting
          requests revocation of the Enable Banking session and deletes the connection and its cached banking data from the live HouseFlow
          database; temporary protected backup copies expire under the deployment&apos;s backup-retention schedule. You can also end an active
          consent in Enable Banking&apos;s data-sharing consent portal.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsibility and limitations">
        <p>
          Use reasonable care when relying on household or financial information shown in HouseFlow. To the extent permitted by applicable
          law, the private operator is not responsible for losses caused by inaccurate upstream bank data, provider outages, unauthorised use
          of credentials, or decisions made from the convenience view. Nothing in these terms excludes responsibility that cannot legally be
          excluded.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes, law and contact">
        <p>
          These terms may be updated when the service or its providers change. The updated date appears at the top of the page. These terms
          are governed by the laws applicable in Malta, without removing any mandatory rights you have under applicable law. Questions can
          be sent to {contact}.
        </p>
      </LegalSection>
    </PublicLegalPage>
  )
}
