import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { modules, type ModuleEntry } from '@/lib/modules'

/**
 * The module registry filtered to what the signed-in user may see.
 *
 * Banking is limited to individually allowlisted accounts (the session carries
 * the server's verdict as `user.bankingEnabled`), so for everyone else the
 * module must not appear in any navigation surface. While the session is still
 * loading the module stays hidden — appearing is the exception, not the
 * default.
 */
export function useVisibleModules(): ModuleEntry[] {
  const { data: session } = useSession()
  const bankingEnabled = (session?.user as { bankingEnabled?: boolean } | undefined)?.bankingEnabled === true
  return useMemo(
    () => modules.filter((module) => module.key !== 'banking' || bankingEnabled),
    [bankingEnabled],
  )
}
