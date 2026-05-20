# SEO Structured Data Schemas - Complete Guide

## What are Schemas?

Think of schemas as a **language you speak to Google**. Instead of just showing HTML to humans, you also tell Google (and other search engines) what your data MEANS in a structured format.

```
Without schema:
<h1>Best Restaurants in Trichy</h1>
→ Google: "This is just text, I don't know what it means"

With schema:
<h1>Best Restaurants in Trichy</h1>
<script type="application/ld+json">
{
  "@type": "ItemList",
  "name": "Best Restaurants in Trichy",
  "itemListElement": [...]
}
</script>
→ Google: "Ah! This is a LIST of items, and it's about restaurants in Trichy"
```

---

## 1. ItemList Schema

### What it does:
Tells Google "I'm showing a **LIST of items**" (like search results)

### Real-world analogy:
Imagine you show Google a shopping list. Without schema, it just sees a bunch of names. With ItemList schema, Google knows it's a RANKED list.

### Your current code:
```javascript
const itemListSchema = {
  "@context": "https://schema.org",     // "I'm speaking the schema.org language"
  "@type": "ItemList",                   // "This is a list of items"
  name: `Best ${searchText} in ${locationText}`,  // List title
  itemListElement: results.map((business, index) => ({
    "@type": "ListItem",                 // Each item in the list
    position: index + 1,                 // Position (1st, 2nd, 3rd...)
    name: business.businessName,         // Item name
    url: `https://www.massclick.in/...`  // Link to the item
  }))
}
```

### What Google shows:
```
SEARCH RESULTS:
1. Saravana Bhavan Restaurant - 4.5 ⭐ (from ItemList schema)
2. Pondi Chettinad - 4.2 ⭐
3. A.M. Jain Hotel - 4.0 ⭐
```

### Issues with your current code:
❌ Missing important details that Google wants:
- No **image** of each restaurant
- No **rating/reviews** count
- No **description**

### Better version:
```javascript
itemListElement: results.map((business, index) => ({
  "@type": "ListItem",
  position: index + 1,
  name: business.businessName,
  url: `https://www.massclick.in/${createSlug(business.location)}/${createSlug(business.businessName)}/${business._id}`,
  
  // ADD THESE ⬇️
  description: business.description || business.businessDetails,  // Short description
  image: business.bannerImage,  // Restaurant photo
  
  // Rating info
  ...(business.averageRating && business.totalReviews > 0 ? {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: business.averageRating,
      reviewCount: business.totalReviews
    }
  } : {})
}))
```

---

## 2. BreadcrumbList Schema

### What it does:
Shows Google the **path** users took to reach this page (like breadcrumbs in fairy tales)

### Real-world analogy:
```
Home > Trichy > Restaurants > Saravana Bhavan
 ↑      ↑        ↑           ↑
 1st    2nd      3rd         4th
```

### Your current code:
```javascript
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { position: 1, name: "Home", item: "https://www.massclick.in" },
    { position: 2, name: locationText, item: `https://www.massclick.in/${locationSlug}` },
    { position: 3, name: searchText, item: canonicalUrl }
  ]
}
```

### What Google shows in search results:
```
Massclick > Trichy > Best Restaurants
massclick.in › trichy › restaurants
```

### Why it matters:
- ✅ Users can click each breadcrumb to navigate
- ✅ Google understands your site structure
- ✅ Better search result appearance

### No issues here - your code is good! ✅

---

## 3. WebSite Schema

### What it does:
Tells Google about your **entire website**

### Your current code:
```javascript
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Massclick",
  url: "https://massclick.in"
}
```

### What's missing:
```javascript
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Massclick",
  url: "https://massclick.in",
  
  // ADD THESE ⬇️
  description: "Find trusted local businesses near you",
  
  // Search box markup - improves search feature in Google results
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://massclick.in/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### Why it matters:
Google might show a **search box directly in your search result** if you add the SearchAction!

---

## 4. Organization Schema

### What it does:
Tells Google who **you are** as a company

### Your current code:
```javascript
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Massclick",
  url: "https://massclick.in",
  logo: "https://massclick.in/logo.png"
}
```

### What's missing (a LOT):
```javascript
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Massclick",
  url: "https://massclick.in",
  logo: "https://massclick.in/logo.png",
  
  // ADD THESE ⬇️
  description: "Find trusted local businesses near you",
  
  // Contact info
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
    telephone: "+91-xxxx-xxxx-xxx",
    email: "support@massclick.in"
  },
  
  // Social profiles
  sameAs: [
    "https://facebook.com/massclick",
    "https://instagram.com/massclick",
    "https://twitter.com/massclick"
  ],
  
  // When company was founded
  foundingDate: "2020",
  
  // Which countries/areas you serve
  areaServed: "IN",
  
  // Your rating (if you have reviews)
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: 4.5,
    reviewCount: 1000
  }
}
```

### What Google might show:
```
Massclick ⭐⭐⭐⭐⭐ 4.5 (1,000 reviews)
massclick.in
"Find trusted local businesses near you"
Facebook | Instagram | Twitter
Customer Service: +91-xxxx-xxxx
```

---

## 5. FAQPage Schema

### What it does:
Shows your **FAQ questions and answers** in search results

### Your current code:
```javascript
const faqSchema = extractedFaqs.length > 0
  ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: extractedFaqs  // Array of FAQs
    }
  : null
```

### How FAQs look:
```javascript
// extractedFaqs should be:
[
  {
    "@type": "Question",
    name: "What is Massclick?",
    acceptedAnswer: {
      "@type": "Answer",
      text: "Massclick is a local business directory..."
    }
  },
  {
    "@type": "Question",
    name: "How do I add my business?",
    acceptedAnswer: {
      "@type": "Answer",
      text: "Click on Add Business and fill the form..."
    }
  }
]
```

### What Google shows:
```
Massclick > Trichy > Restaurants

Q: What is Massclick?
A: Massclick is a local business directory...

Q: How do I add my business?
A: Click on Add Business and fill the form...
```

### Your issue:
You're using `extractFaqFromHtml()` which tries to extract FAQs from HTML. **This is risky** because:
- ❌ HTML might not have proper Q&A structure
- ❌ Extraction might fail or be inaccurate
- ✅ Better: Get FAQs from database/API

---

## 6. LocalBusiness Schema (Service Schema)

### What it does:
Tells Google "**I'm a business offering services in a location**"

### Your current code:
```javascript
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: `${searchText} in ${locationText}`,  // e.g., "Restaurants in Trichy"
  areaServed: {
    "@type": "City",
    name: locationText
  },
  provider: {
    "@type": "Organization",
    name: "Massclick"
  },
  ...(overallRating && totalReviewCount > 0
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number(overallRating),
          reviewCount: totalReviewCount,
          bestRating: 5,
          worstRating: 1
        }
      }
    : {})
}
```

### What Google shows:
```
Restaurants in Trichy ⭐ 4.3 (1,250 reviews)
"Find the best restaurants in Trichy with ratings and reviews"
```

### Issues:
❌ This schema is for a **single business**, not a **category**
- You're using it for "Restaurants in Trichy" (a category)
- It should be used for "Saravana Bhavan" (a specific restaurant)

❌ This is **redundant** - you already have ItemList for the list

---

## Quick Reference Table

| Schema | Use Case | When to use |
|--------|----------|------------|
| **ItemList** | List of search results | Search results page ✅ You have this |
| **BreadcrumbList** | Path to current page | Every page with navigation ✅ You have this |
| **LocalBusiness** | Single business info | Individual business detail page ❌ You use this for category |
| **FAQPage** | Q&A content | FAQ/Help pages ⚠️ Your extraction is risky |
| **Article/BlogPosting** | Blog posts | Blog pages ❌ Missing |
| **Organization** | Company info | Homepage + all pages ✅ You have this |
| **WebSite** | Site-wide info | Homepage ✅ You have this but incomplete |
| **Product** | Products for sale | Product pages ❌ Missing |
| **Event** | Events | Event listings ❌ Missing |

---

## JSON-LD vs Other Formats

You're using **JSON-LD** (JavaScript Object Notation for Linked Data):

```html
<!-- ✅ JSON-LD (what you're using) - BEST for React -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  ...
}
</script>

<!-- ❌ Microdata - harder to use in React -->
<div itemscope itemtype="https://schema.org/ItemList">
  <span itemprop="name">Best Restaurants</span>
</div>

<!-- ❌ RDFa - outdated -->
<div vocab="https://schema.org/" typeof="ItemList">
  ...
</div>
```

**Why JSON-LD is best for React:**
- ✅ Easy to generate JavaScript objects
- ✅ Can be injected anywhere (doesn't affect DOM)
- ✅ Google prefers it
- ✅ Easy to validate

---

## How to Test Your Schemas

### Test 1: Google Rich Results Test
Go to: https://search.google.com/test/rich-results

Paste your page URL → See how Google sees your schema

### Test 2: Schema.org Validator
Go to: https://validator.schema.org/

Paste your schema JSON → See errors

### Test 3: Local testing
Open browser DevTools → Inspect the `<script type="application/ld+json">` tags

---

## Summary: What You Should Have

### On EVERY page:
```javascript
✅ Organization Schema
✅ BreadcrumbList Schema
✅ WebSite Schema (only on homepage, but referenced everywhere)
```

### On Search Results page (where you are):
```javascript
✅ ItemList Schema (with images & ratings) - IMPROVE THIS
✅ Breadcrumbs
❌ DON'T use LocalBusiness for category
```

### On Business Detail page:
```javascript
✅ LocalBusiness Schema (for that specific business)
✅ Breadcrumbs
✅ Images (multiple)
```

### On Blog/Article pages:
```javascript
✅ Article/BlogPosting Schema - ADD THIS
✅ FAQ Schema (if you have FAQs) - FIX YOUR EXTRACTION
✅ Breadcrumbs
```

---

## Next Steps

1. **Understand:** You now know what each schema does ✅
2. **Improve ItemList:** Add images, ratings, descriptions
3. **Remove LocalBusiness from category page:** Use it only for single businesses
4. **Fix FAQ extraction:** Get from database, not HTML
5. **Add Article schema:** For blog pages
6. **Enhance Organization:** Add contact, social, founding date

---

Ready to improve these schemas? Which one should we fix first?
