/**
 * Single source of truth for user-facing explanations of what ClanKeep does.
 *
 * Four consumers read this file, which is the point — the /help page, the
 * per-module first-run empty states, the command palette and the landing FAQ
 * used to carry four independent copies of the same claims and drift apart.
 *
 * Plan honesty is structural rather than editorial: a module or capability that
 * needs a paid feature declares `requiresFeature`, and the renderers turn that
 * into a badge or an upgrade link. No prose has to remember to hedge.
 */

import type { ModuleKey } from './modules'
import type { EntitlementFeature } from './entitlements-core'

export type FaqAudience = 'public' | 'app' | 'both'

export interface HelpFaq {
  id: string
  question: string
  answer: string
  /** 'public' = landing only, 'app' = in-app only, 'both' = everywhere. */
  audience: FaqAudience
}

export interface ModuleHelp {
  key: ModuleKey
  /** One line. Command palette, nav tooltips, the welcome grid. */
  tagline: string
  /** Search terms for the command palette and the /help filter. */
  keywords: string[]
  /** One or two sentences: what this area is for. /help intro + first-run empty state. */
  summary: string
  /** The single next thing to do when there is nothing here yet. */
  firstAction: { label: string; hint: string }
  /** Three to five short "what you can do here" bullets. /help only. */
  capabilities: string[]
  /** Set when the whole area needs a paid feature. */
  requiresFeature?: EntitlementFeature
  /** Availability caveat that is not about the plan. */
  regionNote?: string
}

export const moduleHelp: Record<ModuleKey, ModuleHelp> = {
  home: {
    key: 'home',
    tagline: 'Everything your household has on today, in one place',
    keywords: ['dashboard', 'home', 'main', 'overview', 'summary'],
    summary:
      'The overview pulls together today’s chores, what is left to buy, medicines that are due and recent activity, so you can see where the household stands without opening every area.',
    firstAction: { label: 'Add your first shopping item', hint: 'The overview fills in as you use the other areas.' },
    capabilities: [
      'See today’s chores and tick them off without leaving the page',
      'Spot medicines that are due for a child',
      'Check what the household has added recently',
      'Jump straight into any area from the summary cards',
    ],
  },
  shopping: {
    key: 'shopping',
    tagline: 'Shared lists everyone can add to, from anywhere',
    keywords: ['shopping', 'lists', 'groceries', 'supermarket', 'prices', 'basket'],
    summary:
      'Keep as many shopping lists as you need and let everyone in the household add to them. Items group themselves by aisle, and anything you buy regularly can be saved as a template.',
    firstAction: { label: 'Create your first list', hint: 'Most households start with one called “Groceries”.' },
    capabilities: [
      'Add items by searching a product catalogue, or just type them',
      'Items group by aisle so the shop reads in walking order',
      'Save a list as a template to reuse it next week',
      'Tidy a messy list with AI, or plan a route round the shop',
      'Compare a basket across Maltese supermarkets and see current offers',
    ],
    regionNote: 'Price comparison and offers cover Maltese supermarkets only.',
  },
  meals: {
    key: 'meals',
    tagline: 'Plan the week’s dinners and turn them into a shop',
    keywords: ['meals', 'dinner', 'recipes', 'cooking', 'ingredients', 'plan', 'week'],
    summary:
      'Plan meals across the week, keep your household’s recipes in one place, and push the ingredients you need straight onto a shopping list.',
    firstAction: { label: 'Plan your first meal', hint: 'Pick any day this week and choose what you are cooking.' },
    capabilities: [
      'Fill in breakfast, lunch and dinner for each day of the week',
      'Save recipes your household actually cooks',
      'Generate a shopping list from everything you have planned',
      'Price the week’s ingredients across supermarkets',
    ],
  },
  chores: {
    key: 'chores',
    tagline: 'The recurring jobs your home runs on, shared out',
    keywords: ['chores', 'tasks', 'cleaning', 'rota', 'housework', 'recurring'],
    summary:
      'Set up the jobs that come round again and again — bins, laundry, watering the plants — assign them to someone, and let ClanKeep work out what is due today.',
    firstAction: { label: 'Create your first chore', hint: 'Try the one that gets forgotten most.' },
    capabilities: [
      'Repeat a chore weekly, monthly, or every few days',
      'Assign it to a household member, or leave it open to anyone',
      'Tick off or skip today’s jobs in one list',
      'Look back over the last 30 days to see what actually got done',
    ],
  },
  notes: {
    key: 'notes',
    tagline: 'Shared and private notes for the household',
    keywords: ['notes', 'writing', 'shared', 'personal', 'memo', 'journal', 'documents'],
    summary:
      'Somewhere to put the things that do not fit in a list — the wifi password, school dates, the plumber’s number. Keep a note to yourself or share it with the household.',
    firstAction: { label: 'Write your first note', hint: 'The wifi password is a good place to start.' },
    capabilities: [
      'Write with proper formatting, headings, checklists and images',
      'Keep a note private, or share it with the household',
      'Search across everything you have written',
      'Attach files to a note so they stay with the context',
    ],
  },
  medicine: {
    key: 'medicine',
    tagline: 'Track doses and temperatures when a child is ill',
    keywords: ['medicine', 'medication', 'children', 'kids', 'health', 'fever', 'dose', 'temperature'],
    summary:
      'When a child is unwell, log each dose and temperature so anyone looking after them can see what has already been given and when the next dose is safe.',
    firstAction: { label: 'Add a child', hint: 'Then record the first dose or temperature.' },
    capabilities: [
      'See at a glance when the next dose is due, and when it is too early',
      'Track a fever episode as a timeline of doses and temperatures',
      'Everyone in the household sees the same record, so doses are not doubled',
      'Get push reminders when a dose falls due',
      'Export an episode as a PDF to take to the doctor',
    ],
  },
  finances: {
    key: 'finances',
    tagline: 'Map income and commitments to see what is really spare',
    keywords: ['finance', 'money', 'plan', 'planner', 'goals', 'commitments', 'budget', 'savings'],
    summary:
      'Lay out what comes in and what is already committed each month, so you can see what is genuinely left to direct — and set savings goals against it.',
    firstAction: { label: 'Add your income', hint: 'Then add the bills that go out every month.' },
    capabilities: [
      'Record income and recurring commitments per household member',
      'See what is left over each month once commitments are covered',
      'Set savings goals and put a monthly amount aside for each',
      'Ask the AI coach how to reach a goal sooner, from redacted totals only',
    ],
    requiresFeature: 'finance',
  },
  banking: {
    key: 'banking',
    tagline: 'Connected balances and transactions, read-only',
    keywords: ['banking', 'bank', 'balance', 'transactions', 'open banking', 'account', 'statement'],
    summary:
      'Connect a bank account to see balances and transactions inside ClanKeep. The connection is read-only — ClanKeep can never move money.',
    firstAction: { label: 'Connect an account', hint: 'You choose which accounts the household can see.' },
    capabilities: [
      'See balances and transactions across connected accounts',
      'Filter and search transactions, and correct how one is categorised',
      'Spot recurring subscriptions you may have forgotten',
      'Choose which accounts are shared with the household and which stay yours',
    ],
    requiresFeature: 'finance',
  },
}

export interface HelpTopic {
  id: string
  title: string
  summary: string
  points: string[]
  href?: string
  hrefLabel?: string
}

export const generalHelpTopics: HelpTopic[] = [
  {
    id: 'household',
    title: 'Your household and invites',
    summary:
      'Everything in ClanKeep belongs to a household. Anyone you invite sees the same shopping lists, chores, meals and medicine records that you do.',
    points: [
      'Invite people by email from the Household page — they get a link that expires',
      'You belong to one household at a time',
      'The owner can rename the household and set which country it is in',
      'Private notes stay private even inside a shared household',
    ],
    href: '/household',
    hrefLabel: 'Open Household',
  },
  {
    id: 'plans',
    title: 'Plans and billing',
    summary:
      'The Free plan covers shopping, meals, chores, notes and medicine for one child, with no time limit. The Family plan adds the money planner, connected banking and a few extras.',
    points: [
      'Free: shared lists, meals, chores, notes, unlimited members, one child in medicine',
      'Family: money planner and AI coach, connected banking, unlimited children, push dose reminders, PDF health reports',
      'Cancelling keeps your account and data — you only lose the paid extras',
    ],
    href: '/settings?tab=billing',
    hrefLabel: 'Plan & billing',
  },
  {
    id: 'privacy',
    title: 'Privacy and your data',
    summary:
      'Your household’s data lives on our own privately hosted servers. It is never sold and never used for advertising.',
    points: [
      'Every request is checked against your household membership',
      'You can export everything your account holds, at any time',
      'The AI coach only ever sees redacted totals — no names, no transaction descriptions',
    ],
    href: '/settings?tab=privacy',
    hrefLabel: 'Privacy & security',
  },
  {
    id: 'shortcuts',
    title: 'Getting around quickly',
    summary:
      'Search opens from anywhere with ⌘K on a Mac, or Ctrl+K on Windows. Type a page name to jump to it.',
    points: [
      'On a phone, the four areas you use most sit in the bottom bar — tap More for the rest',
      'On a tablet the sidebar collapses to icons; on a laptop it shows full labels',
      'The command palette can also replay the guided tour or bring back the getting-started checklist',
    ],
  },
]

export const helpFaqs: HelpFaq[] = [
  {
    id: 'free',
    question: 'Is ClanKeep really free?',
    answer:
      'Yes. The Free plan is free forever — shared shopping lists, meal planning, chores, notes, unlimited household members, and medicine tracking for one child. No card, no trial clock. The Family plan (€4.99/month or €49/year) adds the money planner with AI coach, unlimited children in medicine, push dose reminders, and PDF health reports.',
    audience: 'both',
  },
  {
    id: 'data-location',
    question: 'Where does my family’s data live?',
    answer:
      'On our own privately hosted servers with our own database — not on big-tech clouds. Your household’s data is never sold, never used for advertising, and never shared outside your household. Access is checked against authenticated household membership on every request.',
    audience: 'both',
  },
  {
    id: 'ai-scope',
    question: 'What does the AI savings coach actually see?',
    answer:
      'Only redacted totals from your money planner — no bank logins, no transaction descriptions, no names. It looks at the shape of your plan (income, outgoings, goals) and suggests how to reach your savings goals sooner. There is no open-banking connection to set up.',
    audience: 'both',
  },
  {
    id: 'outside-malta',
    question: 'Does it work outside Malta?',
    answer:
      'Yes. Shopping lists, meals, chores, medicine, the money planner, and notes work wherever your household lives.',
    audience: 'both',
  },
  {
    id: 'cancel',
    question: 'What happens if I cancel the Family plan?',
    answer:
      'You keep your account and all your data, and everything in the Free plan keeps working. You only lose the paid extras — the AI coach, multi-child medicine, push dose reminders and PDF reports — until you resubscribe.',
    audience: 'both',
  },
  {
    id: 'invite-not-arrived',
    question: 'I invited someone and they have not received the link.',
    answer:
      'Ask them to check their spam folder first. Invite links expire, so if it has been sitting a while, open the Household page and send a new one. They need to be signed in to ClanKeep — or create an account — before the link will add them to your household.',
    audience: 'app',
  },
  {
    id: 'multiple-households',
    question: 'Can I belong to more than one household?',
    answer:
      'Not at the moment — each account belongs to a single household. If you need to move to a different one, accept that household’s invite and you will be moved across.',
    audience: 'app',
  },
  {
    id: 'private-notes',
    question: 'Can other people in my household see my private notes?',
    answer:
      'No. A note is private until you explicitly share it with the household. Shopping lists, meals, chores and medicine records are always shared — that is the point of a household — but notes are the one area where you choose.',
    audience: 'app',
  },
  {
    id: 'delete-account',
    question: 'How do I export or delete my data?',
    answer:
      'Both live in Settings under Data & Storage. Export gives you everything your account holds as a file you can keep. Deleting is permanent and cannot be undone.',
    audience: 'app',
  },
]

export function faqsFor(audience: 'public' | 'app'): HelpFaq[] {
  return helpFaqs.filter((faq) => faq.audience === audience || faq.audience === 'both')
}
