import Image from 'next/image'
import { cn } from '@/lib/utils'
import clankeepLogo from '@/assets/clankeep-logo.png'
import clankeepLogoDark from '@/assets/clankeep-logo-dark.png'

type BrandLogoProps = {
  className?: string
  compact?: boolean
  priority?: boolean
}

export default function BrandLogo({ className, compact = false, priority = false }: BrandLogoProps) {
  if (compact) {
    return (
      <span className={cn('relative block h-[42px] w-[42px] shrink-0 overflow-hidden', className)}>
        <Image
          src={clankeepLogo}
          alt="Clankeep"
          priority={priority}
          className="absolute -left-[12px] -top-[22px] h-auto w-[162px] max-w-none dark:hidden"
        />
        <Image
          src={clankeepLogoDark}
          alt="Clankeep"
          priority={priority}
          className="absolute -left-[12px] -top-[22px] hidden h-auto w-[162px] max-w-none dark:block"
        />
      </span>
    )
  }

  return (
    <span className={cn('relative block h-12 w-40 shrink-0 overflow-hidden', className)}>
      <Image
        src={clankeepLogo}
        alt="Clankeep — Together. Organised. At home."
        priority={priority}
        className="absolute left-0 -top-[18px] h-auto w-40 max-w-none dark:hidden"
      />
      <Image
        src={clankeepLogoDark}
        alt="Clankeep — Together. Organised. At home."
        priority={priority}
        className="absolute left-0 -top-[18px] hidden h-auto w-40 max-w-none dark:block"
      />
    </span>
  )
}
