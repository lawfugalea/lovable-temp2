import { Html, Head, Main, NextScript } from 'next/document'
import { withBasePath } from '@/lib/base-path'

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href={withBasePath('/favicon-32.png')} />
        <link rel="icon" type="image/png" sizes="16x16" href={withBasePath('/favicon-16.png')} />
        <link rel="apple-touch-icon" sizes="180x180" href={withBasePath('/apple-touch-icon.png')} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
