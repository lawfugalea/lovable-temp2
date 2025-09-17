import { GetServerSideProps } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://galeahub.online'

// Static pages that should be indexed
const staticPages = [
  {
    url: '',
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: '1.0'
  },
  {
    url: '/notes',
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: '0.9'
  },
  {
    url: '/shopping',
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: '0.8'
  },
  {
    url: '/medicine',
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/finances',
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: '0.7'
  },
  {
    url: '/privacy',
    lastmod: new Date().toISOString(),
    changefreq: 'monthly',
    priority: '0.3'
  },
  {
    url: '/terms',
    lastmod: new Date().toISOString(),
    changefreq: 'monthly',
    priority: '0.3'
  }
]

function generateSiteMap() {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     ${staticPages
       .map(({ url, lastmod, changefreq, priority }) => {
         return `
       <url>
           <loc>${SITE_URL}${url}</loc>
           <lastmod>${lastmod}</lastmod>
           <changefreq>${changefreq}</changefreq>
           <priority>${priority}</priority>
       </url>
     `
       })
       .join('')}
   </urlset>
 `
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Generate the XML sitemap with the blog data
  const sitemap = generateSiteMap()

  res.setHeader('Content-Type', 'text/xml')
  // Write the XML to the response
  res.write(sitemap)
  res.end()

  return {
    props: {},
  }
}

export default SiteMap
