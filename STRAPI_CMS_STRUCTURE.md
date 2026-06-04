# Aaushadhi Strapi CMS Structure

## Overview

The CMS will power:

1. Product Grid Page
2. Product Detail Page
3. Category-based Product Filtering

---

# Collection Types

## 1. Category

### Fields

| Field       | Type           | Required |
| ----------- | -------------- | -------- |
| name        | Text           | Yes      |
| slug        | UID            | Yes      |
| description | Long Text      | No       |
| image       | Media (Single) | No       |

### Initial Categories

```text
Wellness Powders
Personal Care
Digestive Health
Hair Care
Immunity & Wellness
```

---

## 2. Product

### Core Identity

| Field            | Type                | Required |
| ---------------- | ------------------- | -------- |
| productName      | Text                | Yes      |
| slug             | UID                 | Yes      |
| category         | Relation → Category | Yes      |
| tagline          | Text                | Yes      |
| valueProposition | Long Text           | Yes      |

---

### Product Images

| Field         | Type             | Required |
| ------------- | ---------------- | -------- |
| mainImage     | Media (Single)   | No       |
| galleryImages | Media (Multiple) | No       |

---

### Pricing

| Field        | Type    | Required |
| ------------ | ------- | -------- |
| price        | Decimal | Yes      |
| comparePrice | Decimal | Yes      |
| featured     | Boolean | No       |

Note:

* Discount percentage should NOT be stored.
* Frontend should calculate discount using:

```ts
Math.round(
  ((comparePrice - price) / comparePrice) * 100
);
```

---

### Main Content

| Field              | Type                           | Required |
| ------------------ | ------------------------------ | -------- |
| description        | Rich Text                      | Yes      |
| keyBenefits        | Repeatable Component → Benefit | No       |
| ingredients        | Long Text                      | No       |
| whyCustomersLoveIt | Long Text                      | No       |
| whoCanUseIt        | Long Text                      | No       |
| bestFor            | Text                           | No       |
| purityInformation  | Long Text                      | No       |
| productFeatures    | Long Text                      | No       |
| productHighlights  | Long Text                      | No       |
| herbalProfile      | Long Text                      | No       |

---

### Ayurvedic Section

| Field            | Type                          | Required |
| ---------------- | ----------------------------- | -------- |
| ayurvedicProfile | Component → Ayurvedic Profile | No       |

Important:

* Single Component
* NOT Repeatable

---

### Usage Section

| Field     | Type                   | Required |
| --------- | ---------------------- | -------- |
| usageInfo | Component → Usage Info | No       |

---

### Benefits Table

| Field         | Type                               | Required |
| ------------- | ---------------------------------- | -------- |
| benefitsTable | Repeatable Component → Benefit Row | No       |

---

### Usage Table

| Field      | Type                             | Required |
| ---------- | -------------------------------- | -------- |
| usageTable | Repeatable Component → Usage Row | No       |

---

### FAQs

| Field | Type                       | Required |
| ----- | -------------------------- | -------- |
| faqs  | Repeatable Component → FAQ | No       |

---

### Safety

| Field             | Type      | Required |
| ----------------- | --------- | -------- |
| safetyInformation | Long Text | No       |
| precautions       | Long Text | No       |

---

### Trust & Marketing

| Field             | Type                                    | Required |
| ----------------- | --------------------------------------- | -------- |
| ctaText           | Text                                    | No       |
| trustBuildingText | Long Text                               | No       |
| whyChooseUs       | Long Text                               | No       |
| productComparison | Repeatable Component → Comparison Point | No       |

---

### SEO

| Field | Type            | Required |
| ----- | --------------- | -------- |
| seo   | Component → SEO | No       |

---

### Tags

Use repeatable text field.

| Field | Type            | Required |
| ----- | --------------- | -------- |
| tags  | Repeatable Text | No       |

Examples:

```text
Rasayana Rejuvenator
Immune Support
Hair Health
Adaptogenic
Stress Relief
Digestive Health
```

These are NOT categories.

---

### Related Products

| Field           | Type                            |
| --------------- | ------------------------------- |
| relatedProducts | Many-to-Many Relation → Product |

Configuration:

```text
Relation Type:
Product has and belongs to many Products

Left Field:
relatedProducts

Right Field:
relatedTo
```

Used for:

```text
You May Also Like
Related Products
Cross-selling
```

---

# Components

## product.benefit

| Field | Type | Required |
| ----- | ---- | -------- |
| title | Text | Yes      |

Example:

```text
Enhances Natural Immunity
Supports Hair Vitality
Improves Digestion
```

---

## product.ayurvedic-profile

| Field      | Type |
| ---------- | ---- |
| rasa       | Text |
| guna       | Text |
| virya      | Text |
| vipaka     | Text |
| doshaKarma | Text |

Single Component.

---

## product.usage-info

| Field             | Type      | Required |
| ----------------- | --------- | -------- |
| howToUse          | Long Text | No       |
| servingMethod     | Text      | No       |
| dailyDosage       | Text      | No       |
| bestTimeToConsume | Text      | No       |
| lifestylePairing  | Long Text | No       |

---

## product.benefit-row

| Field           | Type | Required |
| --------------- | ---- | -------- |
| targetArea      | Text | Yes      |
| mechanism       | Text | Yes      |
| expectedOutcome | Text | Yes      |

Repeatable Component.

---

## product.usage-row

| Field         | Type | Required |
| ------------- | ---- | -------- |
| dosage        | Text | No       |
| mixingVehicle | Text | No       |
| frequency     | Text | No       |
| optimalTiming | Text | No       |

Repeatable Component.

---

## product.faq

| Field    | Type      | Required |
| -------- | --------- | -------- |
| question | Text      | Yes      |
| answer   | Rich Text | Yes      |

Repeatable Component.

---

## product.comparison-point

| Field       | Type | Required |
| ----------- | ---- | -------- |
| brand       | Text | Yes      |
| description | Text | Yes      |

Repeatable Component.

---

## shared.seo

| Field                 | Type      |
| --------------------- | --------- |
| metaTitle             | Text      |
| metaDescription       | Long Text |
| seoProductDescription | Long Text |
| keywords              | Long Text |
| productTags           | Long Text |
| searchKeywords        | Long Text |

Optional Component.

---

# API Permissions

Enable Public Access:

```text
Settings
→ Users & Permissions
→ Public
```

Enable:

```text
Category
✓ find
✓ findOne

Product
✓ find
✓ findOne
```

---

# Frontend Usage

## Product Grid Page

Fetch:

```text
productName
slug
category
mainImage
price
comparePrice
```

## Product Detail Page

Fetch:

```text
populate=*
```

to retrieve complete product information and all nested components.
