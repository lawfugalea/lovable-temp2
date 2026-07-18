import Link from 'next/link'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'
import { modules } from '@/lib/modules'

/** App-like bottom navigation for the five core areas. Hidden on desktop. */
export default function BottomTabBar() {
  const router = useRouter()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <div className="grid grid-cols-5 pb-safe pt-1.5">
        {modules.map((module) => {
          const active = router.pathname === module.href
          const Icon = module.icon
          return (
            <Link
              key={module.key}
              href={module.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors',
                active ? module.textClass : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'grid h-7 w-12 place-items-center rounded-full transition-colors',
                  active && module.activeClass,
                )}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 2} aria-hidden="true" />
              </span>
              {module.shortName}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
