import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to landing page
    router.replace('/landing')
  }, [router])

  return (
    <>
      <Head>
        <title>Clankeep - Redirecting...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-cozy-warm flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cozy-text-muted">Redirecting to your cozy home...</p>
        </div>
      </div>
    </>
  )
}