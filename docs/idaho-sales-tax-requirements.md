# Idaho Sales Tax Requirements for Bakery Products

**Date:** October 21, 2025
**Research Scope:** Sales tax applicability for cookies, cakes, and baked goods in Idaho
**Operating Area:** Boise and Caldwell, Idaho

## Executive Summary

Bakery items (cookies, cakes, pastries) sold in Idaho are **fully taxable** at the state sales tax rate. Idaho is one of only four states that taxes groceries without exemption.

**Tax Rate for Operations:** 6.0%

## Research Findings

### Tax Applicability

- **Bakery items ARE taxable** - Idaho provides no exemption for baked goods
- All groceries and food items sold at retail are subject to sales tax
- No distinction between "prepared food" and "grocery items" for tax purposes
- Unlike states like Washington that exempt certain bakery items, Idaho taxes them all

### Tax Rates

#### State Level
- Idaho state sales tax: **6%**
- No exemptions for food or groceries

#### Local Rates (Boise & Caldwell Area)
- **Boise:** 6.0% total (6% state + 0% local)
- **Caldwell:** 6.0% total (6% state + 0% local)
- Neither city imposes additional local sales tax beyond the state rate

#### Implementation Rate
**Use 6.0% for all sales in the Boise/Caldwell operating area**

### Idaho's Grocery Tax Context

- Idaho is one of only 4 states that fully tax groceries (along with Alabama, Mississippi, and South Dakota)
- Idaho has the 2nd highest grocery tax rate in the nation (after Mississippi)
- State offers a "Grocery Tax Credit" on income tax returns to offset burden (averages $120/person/year)
- The credit is for residents, not businesses collecting the tax

### Legal Framework

According to the Idaho State Tax Commission:
- "Grocers must charge tax on most sales, including retail sales of food, drink, cosmetics, and household supplies to the final consumer"
- "Baked goods (bread, rolls, cakes, donuts, and pies) are among the food items subject to Idaho's sales tax"
- Sales are taxable unless specifically exempted by Idaho or federal law
- No bakery-specific exemptions exist

### Exemptions (Not Applicable to Retail Sales)
- Sales to Idaho/U.S. government agencies
- Sales with food stamps/EBT/WIC
- In-store bakery production equipment (production exemption for resale purchases, not consumer sales)

## Implementation Requirements

### Checkout Calculation
- Calculate tax on order subtotal (all items)
- Tax = Subtotal × 0.06
- Display subtotal, tax, and total separately

### Display Requirements
- Show itemized breakdown:
  - Subtotal: $XX.XX
  - Tax (6%): $X.XX
  - **Total: $XX.XX**

### Record Keeping
- Store tax amount with each order
- Store tax rate used (6%) for historical accuracy
- Include in order confirmations and receipts
- Track for tax remittance to Idaho State Tax Commission

### Tax Remittance
- Collected sales tax must be remitted to Idaho State Tax Commission
- Filing frequency depends on sales volume (monthly, quarterly, or annually)
- Requires Idaho Sales Tax Permit

## Sources

- Idaho State Tax Commission - Food, Meals, and Drinks Guide
- Idaho State Tax Commission - Sales Tax Rates (2025)
- Avalara Tax Rate Tools (2025)
- Sales Tax Handbook - Idaho Rates

## Next Steps

1. Obtain Idaho Sales Tax Permit (if not already acquired)
2. Implement 6% tax calculation in checkout flow
3. Update order schema to store tax amounts
4. Display tax breakdown on checkout page
5. Include tax in order confirmations
6. Set up sales tax remittance schedule with Idaho State Tax Commission

## Notes

- Tax rate is fixed at 6% for Boise/Caldwell area (no geographic calculation needed)
- All products in catalog are taxable (no per-product tax settings needed)
- Consider consulting with Idaho tax professional for business registration requirements
