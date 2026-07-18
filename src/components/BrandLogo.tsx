import Image from 'next/image'
import { cn } from '@/lib/utils'
import clankeepLogo from '@/assets/clankeep-logo.png'

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
          className="absolute -left-[12px] -top-[22px] h-auto w-[162px] max-w-none"
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
        className="absolute left-0 -top-[18px] h-auto w-40 max-w-none"
      />
    </span>
  )
}
