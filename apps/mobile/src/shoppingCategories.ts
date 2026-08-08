import type { MobileShoppingCategoryKey } from '@clankeep/contracts'

export const MOBILE_SHOPPING_CATEGORIES: readonly { key: MobileShoppingCategoryKey; label: string }[] = [
  { key: 'fruit_veg', label: 'Fruit & Veg' }, { key: 'bakery', label: 'Bakery' },
  { key: 'meat_fish', label: 'Meat & Fish' }, { key: 'chilled_dairy', label: 'Chilled & Dairy' },
  { key: 'pantry', label: 'Pantry' }, { key: 'drinks', label: 'Drinks' },
  { key: 'frozen', label: 'Frozen' }, { key: 'household', label: 'Household' },
  { key: 'personal_care', label: 'Personal Care' }, { key: 'baby_pet', label: 'Baby & Pet' },
  { key: 'other', label: 'Other' },
]

export const MOBILE_DEFAULT_SHOPPING_CATEGORY_ORDER: MobileShoppingCategoryKey[] = MOBILE_SHOPPING_CATEGORIES.map(item => item.key)
