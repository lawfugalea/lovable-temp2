import Head from 'next/head'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  noindex?: boolean
  canonical?: string
}

const defaultSEO = {
  title: 'HouseFlow - Your Family\'s Cozy Home Hub',
  description: 'The all-in-one family management app. Shopping lists, budgeting, medicine tracking, and shared notes - all in one cozy place.',
  keywords: 'family management, household app, shopping lists, medicine tracking, family notes, home organization, family budgeting',
  image: '/logo.png',
  url: 'https://galeahub.online',
  type: 'website' as const,
}

export default function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type,
  publishedTime,
  modifiedTime,
  author,
  noindex = false,
  canonical,
}: SEOProps) {
  const seo = {
    title: title ? `${title} | HouseFlow` : defaultSEO.title,
    description: description || defaultSEO.description,
    keywords: keywords || defaultSEO.keywords,
    image: image ? (image.startsWith('http') ? image : `${defaultSEO.url}${image}`) : `${defaultSEO.url}${defaultSEO.image}`,
    url: url ? (url.startsWith('http') ? url : `${defaultSEO.url}${url}`) : defaultSEO.url,
    type: type || defaultSEO.type,
  }

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="keywords" content={seo.keywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical || seo.url} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seo.type} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:site_name" content="HouseFlow" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={seo.url} />
      <meta property="twitter:title" content={seo.title} />
      <meta property="twitter:description" content={seo.description} />
      <meta property="twitter:image" content={seo.image} />
      
      {/* Article specific meta tags */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      
      {/* Favicon and Icons */}
      <link rel="icon" href="/logo.png" />
      <link rel="apple-touch-icon" href="/logo.png" />
      
      {/* PWA Meta Tags */}
      <meta name="theme-color" content="#3b82f6" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="HouseFlow" />
      <meta name="mobile-web-app-capable" content="yes" />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "HouseFlow",
            "description": seo.description,
            "url": seo.url,
            "applicationCategory": "ProductivityApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "HouseFlow"
            },
            "featureList": [
              "Family Notes & Collaboration",
              "Shopping Lists & Price Tracking",
              "Medicine Tracking & Reminders",
              "Family Budgeting & Finances",
              "Real-time Collaboration"
            ]
          })
        }}
      />
    </Head>
  )
}
