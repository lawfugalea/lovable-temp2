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
    <a className="text-primary hover:underline" href={`mailto:${config.contactEmail}`}>
      {config.contactEmail}
    </a>
  ) : (
    'the contact address shown on this page once configured'
  )

  return (
    <PublicLegalPage
      title="Terms of Service"
      description="The rules for using Clankeep, the shared household service."
      config={config}
    >
      <LegalSection title="1. The service">
        <p>
          These terms apply to Clankeep, operated by{' '}
          <strong className="text-foreground">{config.controllerName}</strong>. Clankeep is a shared household service:
          shopping lists, meal planning, chores, a child health and medicine journal, a household money planner, and
          shared notes. By creating an account or using Clankeep, you agree to
          these terms and the <a className="text-primary hover:underline" href="./privacy">Privacy Policy</a>.
        </p>
        <p>
          Clankeep offers a Free plan and a paid Family plan. The features included in each plan are shown before you
          subscribe and may change as the service develops.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and acceptable use">
        <p>
          You must give accurate account information, keep your sign-in details secure and promptly report suspected
          unauthorised access. You may only enter or share information that you are legally authorised to use and share,
          including information about other members of your household. Do not use Clankeep for unlawful, abusive or
          security-disrupting activity.
        </p>
      </LegalSection>

      <LegalSection title="3. The money planner">
        <p>
          The Clankeep money planner works from information you type in yourself: incomes, commitments, budgets,
          savings goals and planning accounts that can mirror how you organise money at your bank. Monthly transfer
          check-offs record only that a household member marked a planned transfer complete. Clankeep cannot initiate
          transfers or payments. Planner figures are a convenience view, not an accounting system or financial advice.
        </p>
      </LegalSection>

      <LegalSection title="4. Sharing with the household">
        <p>
          Clankeep is built around a shared household: lists, plans, chores, notes, planner entries and health records
          you add are visible to the members of your household according to the feature and permissions in use. You are
          responsible for having authority to share what you add. Household owners can invite and remove members.
        </p>
      </LegalSection>

      <LegalSection title="5. Planner insights and optional AI">
        <p>
          Spending observations, set-aside suggestions and coaching insights are estimates based on the planner
          information you enter. They can be incomplete or wrong and should not be treated as financial, accounting,
          medical or behavioural advice. You remain responsible for reviewing your own figures.
        </p>
        <p>
          Optional AI finance tools (powered by DeepSeek) are manual and opt-in. The requesting member must review the
          exact redacted payload and consent before it is sent. Account organisation uses opaque references, roles,
          categories and rounded monthly figures rather than names or labels. Every proposed change requires separate
          selection and approval. AI output may be inaccurate and cannot move money at a bank.
        </p>
      </LegalSection>

      <LegalSection title="6. Child health journal">
        <p>
          The child health journal is a private household record of information entered by parents or carers. It is not
          a medical device, diagnostic service, prescription, or substitute for product packaging, a pharmacist, a
          doctor, or emergency care. Medicine schedules must be copied from the exact product packaging or leaflet, or
          from a clinician instruction. Users remain responsible for checking the formulation, concentration, dose,
          interval and daily maximum before administration.
        </p>
        <p>
          Clankeep may warn when a recorded administration conflicts with a verified schedule, but it preserves
          explicitly confirmed entries so the journal reflects what actually happened. Child-health information is not
          sent to DeepSeek. Optional Web Push reminders contain no child or medicine details on the lock screen.
        </p>
      </LegalSection>

      <LegalSection title="7. Plans, billing and cancellation">
        <p>
          The Free plan is free for as long as we offer it. The Family plan is billed through Stripe, our payment
          processor, monthly or yearly at the prices shown at checkout (VAT included). You can cancel at any time from
          Settings; your Family features remain active until the end of the paid period, after which your household
          returns to the Free plan. Your data stays and everything in the Free plan keeps working. Clankeep never sees
          or stores your full card number.
        </p>
      </LegalSection>

      <LegalSection title="8. Ending access and deleting your data">
        <p>
          You can stop using Clankeep at any time and can permanently delete your account from Settings. Deleting your
          account removes it from the live database; where you are the sole remaining owner of a household, the
          household&apos;s shared data — including children&apos;s health records — is deleted with it. Temporary
          protected backup copies expire under the backup-retention schedule described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsibility and limitations">
        <p>
          Use reasonable care when relying on household information shown in Clankeep. To the extent permitted by
          applicable law, the operator is not responsible for losses caused by provider outages, unauthorised use of
          credentials, or decisions made from the convenience views. Nothing in these terms
          excludes responsibility that cannot legally be excluded.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes, law and contact">
        <p>
          These terms may be updated when the service or its providers change. The updated date appears at the top of
          the page. These terms are governed by the laws applicable in Malta, without removing any mandatory rights you
          have under applicable law. Questions can be sent to {contact}.
        </p>
      </LegalSection>
    </PublicLegalPage>
  )
}
