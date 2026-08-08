export type MobilePlatform = 'ios' | 'android'

export interface MobileApiError {
  error: string
  code?: string
}

export interface MobileUserSummary {
  id: string
  email: string
  name: string
  isAdmin: boolean
  isDemo: boolean
}

export interface MobileHouseholdSummary {
  id: string
  name: string
  role: 'OWNER' | 'MEMBER'
  country: string
}

export interface MobileTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
}

export interface MobileLoginRequest {
  email: string
  password: string
  deviceName?: string
  platform?: MobilePlatform
}

export interface MobileBootstrapResponse {
  user: MobileUserSummary
  households: MobileHouseholdSummary[]
  activeHouseholdId: string | null
}

export interface MobileLoginResponse extends MobileTokens {
  bootstrap: MobileBootstrapResponse
}

export interface MobileCaptchaResponse { id: string; question: string }
export interface MobileRegisterRequest {
  name: string
  email: string
  password: string
  captchaId: string
  captchaAnswer: string
  acceptedTerms: true
}
export interface MobileRegisterResponse { ok: true; message: string }
export interface MobileForgotPasswordRequest { email: string }
export interface MobileForgotPasswordResponse { ok: true; message: string }

export interface MobileRefreshRequest {
  refreshToken: string
}

export interface MobileRefreshResponse extends MobileTokens {}

export interface MobileDashboardResponse {
  household: MobileHouseholdSummary
  generatedAt: string
  shopping: { activeItems: number; lists: number }
  chores: { dueToday: number; completedToday: number }
  medicine: { activeCourses: number; dosesLastSevenDays: number }
  meals: { tonight: string | null }
}

export type MobileShoppingItemStatus = 'ACTIVE' | 'DONE'
export type MobileShoppingCategoryKey = 'fruit_veg' | 'bakery' | 'meat_fish' | 'chilled_dairy' | 'pantry' | 'drinks' | 'frozen' | 'household' | 'personal_care' | 'baby_pet' | 'other'

export interface MobileShoppingList {
  id: string
  name: string
  archivedAt: string | null
  updatedAt: string
  activeItemCount: number
  doneItemCount: number
}

export interface MobileShoppingItem {
  id: string
  listId: string
  title: string
  qty: string | null
  quantityCount: number
  category: MobileShoppingCategoryKey | null
  /** Always null while retailer catalogue features are parked pending consent. */
  store: string | null
  status: MobileShoppingItemStatus
  doneAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MobileShoppingListsResponse {
  householdId: string
  lists: MobileShoppingList[]
}

export interface MobileShoppingItemsResponse {
  list: MobileShoppingList
  items: MobileShoppingItem[]
}

export interface MobileShoppingCategoryOrderResponse {
  order: MobileShoppingCategoryKey[]
}

export interface MobileShoppingAiPayload {
  schemaVersion: 1
  privacy: string
  activeItems: Array<{ ref: string; title: string; qty: string | null; quantityCount: number; category: MobileShoppingCategoryKey }>
  mealPlan: null | { from: string; to: string; ingredients: Array<{ ref: string; title: string; qty: string | null; quantityCount: number }> }
}

export type MobileShoppingAiOperation =
  | { id: string; kind: 'update'; itemId: string; before: { title: string; qty: string | null; quantityCount: number; category: MobileShoppingCategoryKey }; after: { title: string; qty: string | null; quantityCount: number; category: MobileShoppingCategoryKey }; reason: string }
  | { id: string; kind: 'merge'; keepItemId: string; removeItemIds: string[]; before: Array<{ id: string; title: string; qty: string | null; quantityCount: number; category: MobileShoppingCategoryKey }>; after: { title: string; qty: string | null; quantityCount: number; category: MobileShoppingCategoryKey }; reason: string }
  | { id: string; kind: 'add'; mealRef: string; after: { title: string; qty: string | null; quantityCount: number; category: MobileShoppingCategoryKey }; reason: string }

export interface MobileShoppingAiPreviewResponse { configured: boolean; inputHash: string; payload: MobileShoppingAiPayload }
export interface MobileShoppingAiProposalResponse { summary: string; operations: MobileShoppingAiOperation[]; proposalToken: string; expiresAt: string }
export interface MobileShoppingAiApplyResponse { applied: number }

export interface MobileCreateShoppingListRequest {
  householdId: string
  name: string
}

export interface MobileCreateShoppingListResponse {
  list: MobileShoppingList
}

export interface MobileUpdateShoppingListRequest {
  name: string
}

export interface MobileUpdateShoppingListResponse {
  list: MobileShoppingList
}

export interface MobileCreateShoppingItemRequest {
  title: string
  qty?: string
  quantityCount?: number
}

export interface MobileCreateShoppingItemResponse {
  item: MobileShoppingItem
}

export interface MobileUpdateShoppingItemRequest {
  title?: string
  qty?: string | null
  quantityCount?: number
  status?: MobileShoppingItemStatus
  category?: MobileShoppingCategoryKey
}

export interface MobileUpdateShoppingItemResponse {
  item: MobileShoppingItem
}

export type MobileChoreStatus = 'PENDING' | 'DONE' | 'SKIPPED'

export interface MobileTodayChore {
  id: string
  title: string
  notes: string | null
  schedule: string
  assigneeName: string | null
  dueDate: string
  overdue: boolean
  status: MobileChoreStatus
  completedByName: string | null
}

export interface MobileTodayChoresResponse {
  householdId: string
  date: string
  items: MobileTodayChore[]
}

export type MobileChoreRecurrenceType = 'WEEKLY' | 'EVERY_N_DAYS' | 'MONTHLY'

export interface MobileChore {
  id: string
  title: string
  notes: string | null
  active: boolean
  assignee: { id: string; name: string | null } | null
  recurrenceType: MobileChoreRecurrenceType
  daysOfWeek: number[]
  intervalDays: number | null
  anchorDate: string | null
  dayOfMonth: number | null
  schedule: string
}

export interface MobileChoreMember {
  id: string
  name: string
}

export interface MobileChoresResponse {
  householdId: string
  chores: MobileChore[]
  members: MobileChoreMember[]
}

export interface MobileSaveChoreRequest {
  householdId: string
  title: string
  notes?: string | null
  active?: boolean
  assigneeId?: string | null
  recurrenceType: MobileChoreRecurrenceType
  daysOfWeek?: number[]
  intervalDays?: number
  anchorDate?: string
  dayOfMonth?: number
}

export interface MobileSaveChoreResponse { chore: MobileChore }

export interface MobileCompleteChoreRequest {
  householdId: string
  choreId: string
  dueDate: string
  status?: 'DONE' | 'SKIPPED'
}

export interface MobileMealRecipeSummary {
  id: string
  name: string
  servings: number
  ingredientCount: number
}

export interface MobileRecipeIngredient {
  id?: string
  name: string
  quantity: number
  unit: string | null
}

export interface MobileRecipe {
  id: string
  name: string
  servings: number
  notes: string | null
  ingredients: MobileRecipeIngredient[]
}

export interface MobileRecipesResponse { householdId: string; recipes: MobileRecipe[] }
export interface MobileSaveRecipeRequest {
  householdId: string
  name: string
  servings: number
  notes?: string | null
  ingredients: MobileRecipeIngredient[]
}
export interface MobileSaveRecipeResponse { recipe: MobileRecipe }

export interface MobileMealPlanEntry {
  id: string
  date: string
  recipe: { id: string; name: string; servings: number } | null
  freeText: string | null
}

export interface MobileMealWeekResponse {
  householdId: string
  from: string
  to: string
  entries: MobileMealPlanEntry[]
  recipes: MobileMealRecipeSummary[]
}

export interface MobileUpdateMealPlanRequest {
  householdId: string
  date: string
  recipeId?: string | null
  freeText?: string | null
}

export interface MobileUpdateMealPlanResponse {
  entry: MobileMealPlanEntry | null
}

export interface MobileGenerateMealShoppingRequest {
  householdId: string
  from: string
  to: string
  listId: string
}

export interface MobileGenerateMealShoppingResponse {
  listId: string
  listName: string
  plannedRecipeCount: number
  created: number
  merged: number
}

export interface MobileMedicineSummary {
  id: string
  childId: string
  childName: string
  name: string
  dosage: string
  frequency: string
  isPrn: boolean
  scheduleVerified: boolean
  nextDoseAt: string | null
  isDue: boolean
  lastDoseAt: string | null
  canGiveAt: string | null
  canGiveNow: boolean
  dosesLast24h: number
  maxDosesPer24h: number | null
  dailyLimitReached: boolean
  isOverride: boolean
  description: string | null
  notes: string | null
  startDate: string
  endDate: string | null
  activeIngredient: string | null
  formulation: string | null
  concentration: string | null
  doseAmount: number | null
  doseUnit: string | null
  minGapHours: number | null
  scheduleSource: 'PACKAGING' | 'LEAFLET' | 'CLINICIAN' | null
  scheduleSourceNotes: string | null
  episodeId: string | null
}

export interface MobileMedicineDoseSummary {
  id: string
  childId: string
  medicineId: string
  episodeId: string
  childName: string
  medicineName: string
  dosage: string
  notes: string | null
  takenAt: string
}

export interface MobileMedicineChildSummary {
  id: string
  name: string
  dateOfBirth: string
  notes: string | null
  isActive: boolean
}

export interface MobileFeverReadingSummary {
  id: string
  childId: string
  childName: string
  temperature: number
  unit: string
  method: string
  episodeId: string
  notes: string | null
  takenAt: string
}

export interface MobileHealthEpisodeSummary {
  id: string
  childId: string
  childName: string
  title: string | null
  notes: string | null
  startedAt: string
  endedAt: string | null
  isInferred: boolean
  doseCount: number
  feverReadingCount: number
}

export interface MobileWeightMeasurementSummary {
  id: string
  childId: string
  childName: string
  weightKg: number
  measuredAt: string
  notes: string | null
}

export interface MobileMedicineOverviewResponse {
  householdId: string
  generatedAt: string
  children: MobileMedicineChildSummary[]
  medicines: MobileMedicineSummary[]
  recentDoses: MobileMedicineDoseSummary[]
  recentFeverReadings: MobileFeverReadingSummary[]
  recentEpisodes: MobileHealthEpisodeSummary[]
  recentWeights: MobileWeightMeasurementSummary[]
}

export interface MobileSaveChildRequest { householdId: string; name: string; dateOfBirth: string; notes?: string | null; isActive?: boolean }
export interface MobileSaveEpisodeRequest { householdId: string; childId: string; title?: string | null; notes?: string | null; startedAt?: string }
export interface MobileUpdateEpisodeRequest { householdId: string; action: 'close' | 'continue'; endedAt?: string }
export interface MobileSaveFeverRequest { householdId: string; childId: string; episodeId: string; temperature: number; unit: 'C' | 'F'; method: 'oral' | 'rectal' | 'axillary' | 'ear' | 'forehead'; takenAt?: string; notes?: string | null }
export interface MobileSaveWeightRequest { householdId: string; childId: string; weightKg: number; measuredAt?: string; notes?: string | null }
export interface MobileSaveMedicineRequest {
  householdId: string; childId: string; episodeId?: string | null; name: string; description?: string | null; dosage: string; frequency: string;
  notes?: string | null; startDate?: string; endDate?: string | null; isActive?: boolean; isPrn?: boolean; activeIngredient: string;
  formulation: string; concentration?: string | null; doseAmount: number; doseUnit: string; minGapHours: number; maxDosesPer24h: number;
  scheduleSource: 'PACKAGING' | 'LEAFLET' | 'CLINICIAN'; scheduleSourceNotes?: string | null
}
export interface MobileRecordDoseRequest { householdId: string; childId: string; medicineId: string; episodeId: string; takenAt?: string; dosage: string; notes?: string | null; force?: boolean; warningReason?: string | null }
export interface MobileDoseWarning { kind: 'too-early' | 'daily-limit'; earliestSafeTime?: string; nearestDoseAt?: string; minGapHours?: number; count?: number; max?: number }
export interface MobileHealthMutationResponse { ok: true; id: string }

export interface MobileWorkspaceMember { id: string; membershipId: string; name: string; email: string; role: 'OWNER' | 'MEMBER'; isCurrentUser: boolean }
export interface MobileWorkspaceChild { id: string; name: string; dateOfBirth: string; isActive: boolean }
export interface MobileWorkspaceInvite { id: string; email: string | null; role: 'OWNER' | 'MEMBER'; expiresAt: string }
export interface MobileWorkspaceResponse {
  household: { id: string; name: string; country: string; role: 'OWNER' | 'MEMBER' }
  profile: { id: string; name: string; email: string }
  members: MobileWorkspaceMember[]
  children: MobileWorkspaceChild[]
  invites: MobileWorkspaceInvite[]
}
export interface MobileWorkspaceUpdateResponse { workspace: MobileWorkspaceResponse }
export interface MobileCreateHouseholdRequest { name: string; country?: string }
export interface MobileCreateHouseholdResponse { householdId: string; name: string }
export interface MobileCreateInviteRequest { householdId: string; email: string; role: 'OWNER' | 'MEMBER' }
export interface MobileCreateInviteResponse { invite: MobileWorkspaceInvite; emailSent: boolean }

export type MobileNoteColor = 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'gray'
export interface MobileNoteSummary {
  id: string
  title: string
  contentText: string
  isShared: boolean
  isPinned: boolean
  isArchived: boolean
  color: MobileNoteColor
  updatedAt: string
  ownerName: string
  canEdit: boolean
  canDelete: boolean
  mobilePlainText: boolean
  contentJson: unknown | null
  attachments: Array<{ id: string; filename: string; createdAt: string }>
}
export interface MobileNotesResponse { householdId: string; notes: MobileNoteSummary[] }
export interface MobileCreateNoteRequest { householdId: string; title: string; contentText: string; contentJson?: unknown; isShared?: boolean; color?: MobileNoteColor }
export interface MobileUpdateNoteRequest { householdId: string; title?: string; contentText?: string; contentJson?: unknown; isShared?: boolean; isPinned?: boolean; isArchived?: boolean; color?: MobileNoteColor }
export interface MobileNoteResponse { note: MobileNoteSummary }

export type MobilePlannerFrequency = 'WEEKLY' | 'FOUR_WEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'ANNUAL'
export type MobileFinancePlanAccountType = 'PERSONAL' | 'HOUSEHOLD_SPENDING' | 'COMMITMENTS' | 'SAVINGS' | 'OTHER'
export type MobileFinancePlanAccountVisibility = 'SHARED' | 'PRIVATE'
export interface MobileFinanceIncome { id: string; userId: string | null; label: string; amountCents: number; frequency: MobilePlannerFrequency; planAccountId: string | null }
export interface MobileFinanceCommitment { id: string; userId: string | null; label: string; category: string; amountCents: number; frequency: MobilePlannerFrequency; essential: boolean; planAccountId: string | null }
export interface MobileFinanceGoal { id: string; name: string; targetCents: number; savedCents: number; targetDate: string | null; remainingCents: number; progress: number; monthsRemaining: number | null; requiredMonthlyCents: number | null; achievable: boolean | null; planAccountId: string | null; monthlyContributionCents: number; monthlyContributionOverrideCents: number | null }
export interface MobileFinancePlanSummary {
  monthlyIncomeCents: number
  monthlyCommitmentsCents: number
  essentialCents: number
  lifestyleCents: number
  disposableCents: number
  safeToSpendWeeklyCents: number
  commitmentRatio: number | null
  categories: Array<{ category: string; monthlyCents: number; essentialCents: number }>
  setAsides: Array<{ id: string; label: string; category: string; frequency: MobilePlannerFrequency; amountCents: number; monthlyCents: number }>
}
export interface MobileFinancePlannerResponse {
  incomes: MobileFinanceIncome[]
  commitments: MobileFinanceCommitment[]
  goals: MobileFinanceGoal[]
  members: Array<{ userId: string; name: string }>
  summary: MobileFinancePlanSummary
  period: string
  accounts: MobileFinancePlanAccount[]
  fundingRules: MobileFinanceFundingRule[]
  moneyFlow: MobileFinanceMoneyFlowSummary
  suggestedEmergencyFundCents: number
  aiConfigured: boolean
  bankEnabled: boolean
}
export interface MobileFinancePlanAccount {
  id: string
  name: string
  type: MobileFinancePlanAccountType
  visibility: MobileFinancePlanAccountVisibility
  monthlyBufferCents: number
  owned: boolean
  canEdit: boolean
  canManagePrivacy: boolean
  monthlyIncomeCents: number
  monthlyCommitmentsCents: number
  monthlyGoalsCents: number
  incomingTransfersCents: number
  outgoingTransfersCents: number
  monthlyNeedCents: number
  monthlyInflowCents: number
  remainingCents: number
  weeklySpendingCents: number | null
}
export interface MobileFinanceFundingRule {
  id: string
  sourceAccountId: string | null
  sourceName: string
  sourcePrivate: boolean
  targetAccountId: string
  targetName: string
  amountCents: number
  completed: boolean
  completedAt: string | null
  canComplete: boolean
  canEdit: boolean
}
export interface MobileFinanceMoneyFlowSummary {
  monthlyIncomeCents: number
  monthlyCommitmentsCents: number
  monthlyGoalsCents: number
  monthlyBuffersCents: number
  plannedAllocationCents: number
  unallocatedCents: number
  accounts: MobileFinancePlanAccount[]
}
export interface MobileMoneyFlowAiPayload {
  schemaVersion: 1
  privacy: string
  period: string
  accounts: Array<{ ref: string; type: MobileFinancePlanAccountType; visibility: MobileFinancePlanAccountVisibility; monthlyNeedEur: number; monthlyInflowEur: number; remainingEur: number }>
  incomes: Array<{ ref: string; monthlyEur: number; accountRef: string | null }>
  commitments: Array<{ ref: string; category: string; essential: boolean; monthlyEur: number; accountRef: string | null }>
  goals: Array<{ ref: string; monthsRemaining: number | null; monthlyEur: number; accountRef: string | null }>
  fundingRules: Array<{ ref: string; sourceRef: string; targetRef: string; monthlyEur: number }>
}
export type MobileMoneyFlowAiOperation =
  | { id: string; kind: 'assign_entry'; entryKind: 'income' | 'commitment' | 'goal'; entryId: string; accountId: string; reason: string }
  | { id: string; kind: 'set_account_type'; accountId: string; accountType: MobileFinancePlanAccountType; reason: string }
  | { id: string; kind: 'set_account_buffer'; accountId: string; amountCents: number; reason: string }
  | { id: string; kind: 'set_goal_contribution'; goalId: string; amountCents: number; reason: string }
  | { id: string; kind: 'upsert_funding_rule'; sourceAccountId: string; targetAccountId: string; amountCents: number; reason: string }
export interface MobileMoneyFlowAiPreviewResponse { payload: MobileMoneyFlowAiPayload; stateHash: string }
export interface MobileMoneyFlowAiSuggestResponse { operations: MobileMoneyFlowAiOperation[]; proposalToken: string; expiresInSeconds: number }
export interface MobileFinanceCoachPreview {
  schemaVersion: 1
  privacy: string
  memberCount: number
  monthlyIncomeEur: number
  monthlyCommitmentsEur: number
  essentialEur: number
  lifestyleEur: number
  disposableEur: number
  commitmentRatioBand: string
  categories: Array<{ category: string; monthlyEur: number }>
  setAsideCount: number
  goals: Array<{ label: string; targetEur: number; savedEur: number; monthsRemaining: number | null; requiredMonthlyEur: number | null }>
}
export interface MobileFinanceCoachObservation { title: string; explanation: string; suggestion: string; confidence: number | null }
export type MobileFinanceCoachResponse =
  | { requiresConsent: true; preview: MobileFinanceCoachPreview }
  | { requiresConsent: false; summary: string; observations: MobileFinanceCoachObservation[]; generatedAt: string }
export interface MobileFinanceTransaction {
  id: string
  account: { id: string; displayName: string; maskedIdentifier: string | null }
  amount: string
  currency: string
  status: string
  bookingDate: string | null
  valueDate: string | null
  counterparty: string | null
  description: string | null
  merchantName: string
  detail: string | null
  category: string
  signedAmount: number
}
export interface MobileFinanceOverviewResponse {
  bankEnabled: boolean
  canManage: boolean
  accounts: Array<{ id: string; displayName: string; maskedIdentifier: string | null; currency: string; shared: boolean; owned: boolean; balance: { amount: string; currency: string; type: string; updatedAt: string } | null }>
  totals: Array<{ currency: string; amount: string }>
  recentTransactions: MobileFinanceTransaction[]
}
export interface MobileFinanceTransactionsResponse { transactions: MobileFinanceTransaction[]; nextCursor: string | null }
export interface MobileFinanceInsightsResponse {
  periodDays: number
  dateFrom: string
  dateTo: string
  currencies: Array<{
    currency: string
    summary: { income: number; outgoing: number; net: number; averageOutgoing: number; transactionCount: number; outgoingChangePercent: number | null; incomeChangePercent: number | null; netChangePercent: number | null; savingsRate: number | null; averageTransaction: number; largestExpense: number; billsTotal: number; groceriesTotal: number }
    categories: Array<{ category: string; amount: number; previousAmount: number; changePercent: number | null; count: number; percentage: number; average: number; largest: number; merchantCount: number }>
    merchants: Array<{ merchantName: string; amount: number; count: number; average: number; percentage: number; category: string }>
  }>
}
export interface MobileFinanceSubscription {
  id: string | null
  displayName: string
  status: string
  cadence: string
  expectedAmount: string | number | null
  currency: string
  nextExpectedDate: string | null
  lastSeenAt: string | null
  reminderDays: number
  occurrenceCount: number
  confidence: number
  dueState: string | null
  priceChanged: boolean
  account: { id: string; displayName: string } | null
}
export interface MobileFinanceSubscriptionsResponse { subscriptions: MobileFinanceSubscription[]; reminders: MobileFinanceSubscription[] }
