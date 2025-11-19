# SEO Strategy for OpenJobMarket

## Overview
This document outlines the comprehensive SEO strategy implemented for OpenJobMarket to rank for 100+ target keywords and phrases.

## Target Keywords (100+)

### Primary Keywords (High Priority)
1. **General Job Search** (9 keywords)
   - jobs near me
   - find jobs near me
   - local jobs
   - job search
   - job vacancies
   - employment opportunities
   - career opportunities
   - hiring near me
   - work near me

2. **Map-Based Search** (6 keywords)
   - map based job search
   - jobs on map
   - find jobs on map
   - interactive job map
   - location based jobs
   - geographic job search

3. **Trade & Professional Services** (22 keywords)
   - plumber near me, electrician near me, carpenter near me
   - builder near me, painter near me, roofer near me
   - handyman near me, contractor near me
   - available plumber, available electrician, available carpenter
   - emergency plumber, emergency electrician
   - local tradespeople, find tradesperson, hire tradesperson
   - + 100+ combinations (trade + location)

4. **Professional Job Titles** (10 keywords)
   - programmer job, developer jobs
   - software engineer jobs, web developer jobs
   - IT jobs, tech jobs
   - designer jobs, marketing jobs
   - accountant jobs, nurse jobs

5. **Remote & Flexible Work** (9 keywords)
   - remote jobs, work from home jobs
   - freelance jobs, freelancer opportunities
   - flexible jobs, part time jobs
   - full time jobs, contract jobs, temporary jobs

6. **Experience Level** (8 keywords)
   - no experience jobs, entry level jobs
   - no experience remote jobs, junior jobs
   - senior jobs, graduate jobs
   - apprenticeships, training provided jobs

7. **UK Location-Based** (15 cities × multiple combinations)
   - jobs in London, jobs in Manchester, jobs in Birmingham
   - jobs in Leeds, jobs in Glasgow, jobs in Liverpool
   - jobs in Edinburgh, jobs in Bristol, jobs in UK
   - + 30 more city combinations

8. **Job Actions** (8 keywords)
   - post job, post vacancy, advertise job
   - hire employees, find employees, recruit staff
   - post small job, quick hire

9. **Comparison & Search** (6 keywords)
   - compare jobs, compare vacancies
   - compare salaries, compare tradespeople
   - find best job, job comparison

10. **Job Types & Sectors** (15 keywords)
    - hourly jobs, daily jobs, weekend jobs
    - construction jobs, healthcare jobs
    - retail jobs, hospitality jobs
    - engineering jobs, finance jobs
    - + 10 more sector combinations

### Long-Tail Keywords (15+)
- how to find jobs near me
- best job search website
- local job opportunities in my area
- emergency plumber available now
- hire electrician same day
- remote jobs no experience required
- work from home jobs UK
- freelance jobs for beginners
- compare job offers online
- post job vacancy free
- find local tradespeople
- verified tradesperson near me
- jobs with training provided
- immediate start jobs
- walk in interviews near me

## Implementation Strategy

### 1. Sitemap Enhancement
**File:** `app/sitemap.ts`

The sitemap now includes:
- Static pages (20 pages)
- Dynamic job listings (up to 1000 jobs)
- Dynamic professional profiles (up to 1000 profiles)
- 15 UK city-specific job search pages (30 URLs)
- 8 job type pages (remote, full-time, etc.)
- 10 trade category pages

**Total:** 2000+ indexed URLs

### 2. SEO Metadata System
**File:** `lib/seo-metadata.ts`

Functions provided:
- `generateSEOMetadata()` - General page metadata
- `generateJobMetadata()` - Job listing pages
- `generateProfileMetadata()` - Professional profiles
- `generateSearchMetadata()` - Search result pages

Each function automatically includes:
- Title optimization
- Meta description (150-160 chars)
- Keywords meta tag
- Open Graph tags (Facebook, LinkedIn)
- Twitter Card tags
- Canonical URLs
- Robots directives

### 3. Structured Data (Rich Snippets)
**File:** `lib/structured-data.ts`

Implemented schemas:
- **JobPosting** - Makes jobs appear in Google Jobs
- **LocalBusiness** - For tradesperson profiles
- **Organization** - Company information
- **WebSite** - Search functionality
- **BreadcrumbList** - Navigation structure

### 4. Keywords Library
**File:** `lib/seo-keywords.ts`

Contains:
- 100+ primary keywords
- 15+ long-tail keywords
- Trade categories (12 types)
- Professional categories (10 types)
- Location modifiers (4 types)
- Function to generate 200+ keyword combinations

### 5. Robots.txt Configuration
**File:** `public/robots.txt`

Configured to:
- Allow all major search engines (Google, Bing)
- Allow AI crawlers (GPT, Claude, etc.)
- Block private areas (dashboard, admin, auth)
- Block editing pages
- Point to sitemap.xml

## How to Use

### For New Pages
```typescript
import { generateSEOMetadata } from "@/lib/seo-metadata"

export const metadata = generateSEOMetadata({
  title: "Your Page Title",
  description: "Your meta description",
  keywords: ["additional", "keywords"],
  path: "/your-page"
})
```

### For Job Listings
```typescript
import { generateJobMetadata } from "@/lib/seo-metadata"
import { generateJobPostingSchema } from "@/lib/structured-data"

export const metadata = generateJobMetadata({
  title: job.title,
  location: job.location,
  company: job.company,
  salary: job.salary,
  description: job.description
})

// Add structured data to page
const jobSchema = generateJobPostingSchema({
  title: job.title,
  description: job.description,
  company: job.company,
  location: job.location,
  datePosted: job.created_at,
  validThrough: job.expires_at
})
```

### For Professional Profiles
```typescript
import { generateProfileMetadata } from "@/lib/seo-metadata"
import { generateLocalBusinessSchema } from "@/lib/structured-data"

export const metadata = generateProfileMetadata({
  name: profile.name,
  title: profile.title,
  location: profile.location,
  skills: profile.skills
})
```

## Monitoring & Optimization

### Tools to Use
1. **Google Search Console** - Monitor search performance
2. **Google Analytics** - Track organic traffic
3. **Bing Webmaster Tools** - Bing search performance
4. **Rich Results Test** - Verify structured data

### Submit Sitemap To:
- Google Search Console: https://search.google.com/search-console
- Bing Webmaster Tools: https://www.bing.com/webmasters

Sitemap URL: `https://openjobmarket.com/sitemap.xml`

### Key Metrics to Track
- Organic search traffic
- Keyword rankings for target terms
- Click-through rate (CTR)
- Job posting impressions in Google Jobs
- Professional profile views from search

## Content Guidelines

### Page Titles
- Include primary keyword
- Keep under 60 characters
- Include location if relevant
- End with "| OpenJobMarket"

### Meta Descriptions
- Include primary and secondary keywords
- Keep between 150-160 characters
- Include call-to-action
- Be descriptive and compelling

### Content Structure
- Use H1 for main page title (include primary keyword)
- Use H2 for section headings (include secondary keywords)
- Use H3 for subsections
- Include keywords naturally in content
- Add alt text to images with relevant keywords

### URL Structure
- Use lowercase
- Separate words with hyphens
- Include keywords when possible
- Keep URLs short and descriptive

## Future Enhancements

1. **Landing Pages** - Create dedicated pages for:
   - "Plumber near me" for each major city
   - "Remote jobs" by category
   - "No experience jobs" by sector

2. **Blog Content** - Create SEO articles:
   - "How to find a plumber near me"
   - "Best remote jobs for beginners"
   - "Complete guide to job searching in UK"

3. **Location Pages** - Dynamic pages for:
   - /jobs-in-[city]
   - /plumbers-in-[city]
   - /electricians-in-[city]

4. **Schema Markup Expansion**:
   - Review schema for user ratings
   - FAQ schema for common questions
   - HowTo schema for guides

5. **Link Building**:
   - Guest posts on UK job boards
   - Partnerships with trade associations
   - Local directory listings

## Expected Results

### Short Term (1-3 months)
- 50-100+ pages indexed
- Appearing for brand searches
- Basic keyword rankings established

### Medium Term (3-6 months)
- 500+ pages indexed
- Rankings for long-tail keywords
- Appearing in Google Jobs
- Local search visibility for tradespeople

### Long Term (6-12 months)
- 2000+ pages indexed
- Top 10 rankings for primary keywords
- Significant organic traffic growth
- Featured snippets for key terms
- Rich results in search

## Maintenance

### Weekly
- Monitor new job postings are indexed
- Check for crawl errors in Search Console
- Review top performing pages

### Monthly
- Analyze keyword rankings
- Update underperforming content
- Add new keywords based on search queries
- Review competitor SEO strategies

### Quarterly
- Comprehensive SEO audit
- Update keyword strategy
- Refresh outdated content
- Expand structured data implementation
