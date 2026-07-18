# ClanKeep — Finance help content for the Kelma agent

Paste the **Knowledge** section below into Kelma as a Text source, and add the
**Q&A pairs** individually so the agent uses this exact wording for the
questions that matter. Everything here reflects actual product behaviour.

---

## Knowledge (paste as a text source)

### What the Finances page is

Finances gives a household one calm, shared view of its money. It connects to
your bank through official **open banking** and is strictly **read-only**:
ClanKeep can see balances and transactions but can never move money, make
payments, or change anything at your bank. Connections are made through
**Enable Banking**, a licensed open-banking provider, and currently support
**Bank of Valletta (BOV)** in Malta.

Finances is part of the **Family plan** (€4.99/month or €49/year, VAT
included). On the free plan the Finances page shows what the feature does and
how to upgrade.

### Connecting a bank

Only the **household owner** can connect or disconnect bank accounts. The
owner clicks "Connect bank" on the Finances page and is redirected to the
bank's own login to approve read-only access — ClanKeep never sees banking
credentials. A bank consent lasts **90 days** (an EU open-banking rule), after
which the bank asks the owner to renew it. Transactions are refreshed with the
"Sync" button on the Finances page.

### Sharing controls — you choose what the household sees

Connected accounts are private to the person who connected them until they are
explicitly shared. Each account has its own sharing toggle, so you can share
the joint account with the household while keeping a personal account private.
Household members only ever see accounts that were shared with them.

### Subscription radar

ClanKeep automatically spots recurring payments (streaming services, gym
memberships, utilities) in the shared transactions and lists them with their
amount and expected next charge, so renewals never surprise you.

### AI spending insights

Family-plan members can ask for AI observations about spending patterns. This
is strictly opt-in per person. Before anything is analysed, ClanKeep strips
and redacts the data: the AI receives only aggregated, anonymised spending
summaries — never raw transactions, account numbers, names, or balances.
Results are cached for 24 hours and each person can run at most 3 fresh
analyses per hour.

### Privacy

ClanKeep is self-hosted: financial data lives in the household's own ClanKeep
database and is never sold or used for advertising. This chat assistant has no
access to any household's data — it can only explain how the product works.
If a household cancels the Family plan, finance data is not deleted: access
pauses, and resubscribing restores it. Bank consents can always be revoked
from the bank's side as well.

---

## Q&A pairs (add each in Kelma's Q&A tab)

**Q: Can ClanKeep move my money or make payments?**
A: No — never. ClanKeep's bank connection is read-only through official open banking. It can display balances and transactions, but it has no ability to move money, make payments, or change anything at your bank.

**Q: Which banks does ClanKeep support?**
A: Currently Bank of Valletta (BOV) in Malta, connected through Enable Banking, a licensed open-banking provider. More banks are on the roadmap.

**Q: Is Finances free?**
A: Finances is part of the Family plan — €4.99/month or €49/year, VAT included. The free plan includes shopping lists with supermarket price comparison, the meal planner, chores, notes, and medicine tracking for one child. You can upgrade in Settings → Plan & Billing.

**Q: How do I connect my bank?**
A: The household owner opens the Finances page and clicks "Connect bank". You're redirected to your bank's own secure login to approve read-only access — ClanKeep never sees your banking credentials. Afterwards, choose which accounts to share with your household.

**Q: Can other household members see my bank account?**
A: Only if you share it. Every connected account is private to the person who connected it until they turn on sharing for that specific account. You can share the joint account and keep a personal one private.

**Q: Why does my bank ask me to reconnect every few months?**
A: EU open-banking rules limit a consent to 90 days. When it expires, the household owner simply reconnects from the Finances page — nothing is lost.

**Q: What is the subscription radar?**
A: ClanKeep automatically detects recurring payments — streaming, gym, utilities — in your shared transactions and lists them with the amount and expected next charge, so renewals never catch you off guard.

**Q: How do the AI spending insights work? Is my data sent to an AI?**
A: AI insights are opt-in per person. Before analysis, ClanKeep redacts everything: the AI only receives aggregated, anonymised spending summaries — never raw transactions, account numbers, names, or balances. Results are cached for 24 hours, with a limit of 3 fresh analyses per person per hour.

**Q: Can you see my transactions? Can I ask you about my own spending?**
A: No — this assistant has no access to any household's data, so it can't see or discuss your transactions. For insights about your own spending, use the AI insights button on the Finances page itself, which analyses your data privately with your consent.

**Q: What happens to my finance data if I cancel the Family plan?**
A: Nothing is deleted. Access to the Finances page pauses, your data stays safely in your household's database, and everything reappears if you resubscribe. You can also revoke the bank consent from your bank at any time.

**Q: What does ClanKeep cost?**
A: The free plan is free forever: shopping lists with Malta supermarket price comparison and offers, meal planner, chores, notes, unlimited household members, and medicine tracking for one child. The Family plan is €4.99/month or €49/year (two months free), VAT included, and adds shared finances, the subscription radar, AI spending insights, medicine for unlimited children, push dose reminders, and PDF health reports. Cancel anytime.

**Q: Which supermarkets does the price comparison cover?**
A: ClanKeep reads the public online catalogues of Smart Supermarket, Greens, and Welbee's, refreshed every day. Prices are planning estimates — in-store prices can differ. Smart's catalogue lists a single price per product, so special offers can only be detected for Greens and Welbee's.

**Q: Is there a demo?**
A: Yes — the "Try the demo" button on clankeep.com creates a fully furnished sample household (the Borg family) you can explore for 24 hours without an account or card.

**Q: How do medicine reminders work?**
A: You record doses and optional schedules per child. With a schedule set, ClanKeep shows what's due and, on the Family plan, sends private push notifications to your devices at dose time. Dose logging itself is always free.

**Q: Is my data safe? Where is it stored?**
A: ClanKeep is self-hosted — your household's data lives in ClanKeep's own database, is never sold, and is never used for advertising. Access requires authenticated household membership on every request, and sensitive areas like finances add their own sharing controls on top.
