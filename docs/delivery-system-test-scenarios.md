# Delivery System Test Scenarios

**Date**: 2025-11-14
**Status**: Testing delivery date calculation fixes

---

## ✅ **FIXES APPLIED**

### Fix #1: Delivery Date Calculation Logic
**File**: `src/utils/delivery.ts:164-177`
**Change**: Corrected cutoff logic to properly handle "after cutoff" scenarios

**Before**:
```typescript
if (!beforeCutoff) {
  if (schedule.dayOfWeek > currentDayOfWeek) {
    nextDeliveryDate = addDaysMountainTime(nextDeliveryDate, 7);
  }
}
```

**After**:
```typescript
if (!beforeCutoff) {
  const daysUntilDelivery = schedule.dayOfWeek - currentDayOfWeek;
  // If delivery day hasn't occurred yet this week (or is today),
  // push to next week because we missed the cutoff
  if (daysUntilDelivery >= 0) {
    nextDeliveryDate = addDaysMountainTime(nextDeliveryDate, 7);
  }
}
```

### Fix #2: Pickup Date Calculation Logic
**File**: `src/utils/delivery.ts:296-307`
**Change**: Applied same fix to pickup date calculations

### Fix #3: Empty ZIP Code Handling
**File**: `src/components/fulfillment-method-selector.tsx:273-280`
**Change**: Added warning message when logged-in user has no ZIP code

### Fix #4: No Schedules Configured Message
**File**: `src/components/fulfillment-method-selector.tsx:378-391`
**Change**: Added clearer error messages for different failure scenarios

---

## 🧪 **TEST SCENARIOS**

### **Setup Requirements**

1. **Delivery Schedules** (Admin → Delivery Settings):
   - Thursday Delivery: Cutoff Tuesday 23:59, Window 10:00 AM - 4:00 PM MT
   - Saturday Delivery: Cutoff Tuesday 23:59, Window 9:00 AM - 2:00 PM MT

2. **Delivery Zones**:
   - Local Boise: 83702, 83703, 83704, 83705, 83706 - $5.00
   - Extended Treasure Valley: 83642, 83646, 83713, 83714, 83716 - $10.00

3. **Pickup Locations**:
   - Main Store: Thursday & Saturday, 9:00 AM - 6:00 PM, Cutoff Tuesday 23:59

---

## **Scenario 1: Before Cutoff (Monday 3:00 PM MT)**

**Current Time**: Monday, November 18, 2025, 3:00 PM MT
**Current Day of Week**: 1 (Monday)
**Cutoff Day**: 2 (Tuesday)
**Cutoff Time**: 23:59

### Expected Behavior:
- `isBeforeMountainCutoff()` returns `true` (Monday < Tuesday)
- `beforeCutoff` = `true`
- No additional week added
- **Delivery options**:
  - Thursday, November 20 (3 days away) - Cutoff: Tuesday 11:59 PM
  - Saturday, November 22 (5 days away) - Cutoff: Tuesday 11:59 PM

### Test Steps:
1. Visit checkout page on Monday 3:00 PM MT
2. Select "Delivery"
3. Enter ZIP: 83702
4. Verify delivery dates shown:
   - ✅ Thursday, November 20
   - ✅ Saturday, November 22
5. Verify delivery fee: $5.00 (Local Boise)

---

## **Scenario 2: After Cutoff (Wednesday 9:00 AM MT)**

**Current Time**: Wednesday, November 20, 2025, 9:00 AM MT
**Current Day of Week**: 3 (Wednesday)
**Cutoff Day**: 2 (Tuesday)
**Cutoff Time**: 23:59

### Expected Behavior:
- `isBeforeMountainCutoff()` returns `false` (Wednesday > Tuesday)
- `beforeCutoff` = `false`
- Thursday delivery: `daysUntilDelivery` = 4 - 3 = 1 (>= 0) → Add 7 days
- Saturday delivery: `daysUntilDelivery` = 6 - 3 = 3 (>= 0) → Add 7 days
- **Delivery options**:
  - Thursday, November 27 (8 days away) - Cutoff: Tuesday 11:59 PM
  - Saturday, November 29 (10 days away) - Cutoff: Tuesday 11:59 PM

### Test Steps:
1. Visit checkout page on Wednesday 9:00 AM MT
2. Select "Delivery"
3. Enter ZIP: 83713
4. Verify delivery dates shown:
  - ✅ Thursday, November 27 (NEXT week)
  - ✅ Saturday, November 29 (NEXT week)
5. Verify delivery fee: $10.00 (Extended Treasure Valley)

---

## **Scenario 3: Edge Case - Tuesday 11:58 PM MT (Before Cutoff)**

**Current Time**: Tuesday, November 19, 2025, 11:58 PM MT
**Current Day of Week**: 2 (Tuesday)
**Cutoff Day**: 2 (Tuesday)
**Cutoff Time**: 23:59

### Expected Behavior:
- `isBeforeMountainCutoff()` returns `true` (same day, 11:58 < 23:59)
- `beforeCutoff` = `true`
- **Delivery options**:
  - Thursday, November 20 (2 days away) - Cutoff: Tuesday 11:59 PM
  - Saturday, November 22 (4 days away) - Cutoff: Tuesday 11:59 PM

### Test Steps:
1. Set system time to Tuesday 11:58 PM MT
2. Visit checkout page
3. Select "Delivery", Enter ZIP: 83702
4. Verify delivery dates:
   - ✅ Thursday, November 20 (THIS week)
   - ✅ Saturday, November 22 (THIS week)

---

## **Scenario 4: Edge Case - Tuesday 12:01 AM MT (Wednesday, After Cutoff)**

**Current Time**: Wednesday, November 20, 2025, 12:01 AM MT
**Current Day of Week**: 3 (Wednesday)
**Cutoff Day**: 2 (Tuesday)

### Expected Behavior:
- `isBeforeMountainCutoff()` returns `false` (Wednesday > Tuesday)
- `beforeCutoff` = `false`
- **Delivery options**:
  - Thursday, November 27 (NEXT week)
  - Saturday, November 29 (NEXT week)

### Test Steps:
1. Set system time to Wednesday 12:01 AM MT
2. Visit checkout page
3. Select "Delivery", Enter ZIP: 83702
4. Verify delivery dates:
   - ✅ Thursday, November 27 (NEXT week, not this Thursday)
   - ✅ Saturday, November 29 (NEXT week)

---

## **Scenario 5: Pickup Selection (Always Free)**

**Current Time**: Wednesday 9:00 AM MT (after cutoff)

### Expected Behavior:
- Pickup dates follow same cutoff logic as delivery
- **Pickup options**:
  - Main Store - Thursday, November 27 (NEXT week)
  - Main Store - Saturday, November 29 (NEXT week)
- **Delivery Fee**: $0.00 (FREE)

### Test Steps:
1. Visit checkout page on Wednesday 9:00 AM MT
2. Select "Pickup"
3. Select "Main Store"
4. Verify pickup dates:
   - ✅ Thursday, November 27 (NEXT week)
   - ✅ Saturday, November 29 (NEXT week)
5. Verify in order summary:
   - ✅ Delivery Fee: FREE (or $0.00)

---

## **Scenario 6: No ZIP Code in Profile**

### Expected Behavior:
- Logged-in user with no ZIP code sees warning message
- Cannot select delivery until ZIP code added

### Test Steps:
1. Log in as user with empty `zipCode` field
2. Visit checkout page
3. Verify warning message displayed:
   - ⚠️ "No delivery address on file"
   - "Please add your delivery address to your profile to see delivery options."
4. Click "Edit" button
5. Add delivery address with ZIP
6. Return to checkout
7. Verify delivery options now visible

---

## **Scenario 7: ZIP Code Not in Delivery Zones**

### Expected Behavior:
- ZIP code lookup fails
- Show error: "Delivery not available to this ZIP code"
- Suggest pickup alternative

### Test Steps:
1. Visit checkout page
2. Select "Delivery"
3. Enter ZIP: 99999 (not in any zone)
4. Verify error message:
   - "Delivery not available to this ZIP code. Please try pickup or contact us."

---

## **Scenario 8: No Delivery Schedules Configured**

### Expected Behavior:
- `getAvailableDeliveryDates()` returns empty array
- Show error: "No delivery schedules configured"

### Test Steps:
1. Admin → Delivery Settings
2. Disable all delivery schedules
3. Visit checkout page
4. Select "Delivery", Enter ZIP: 83702
5. Verify error message:
   - "No delivery schedules configured. Please contact us."

---

## **Scenario 9: Delivery Day on Closure Date**

### Expected Behavior:
- If Thursday Nov 27 marked as closure
- Skip to next available delivery date

### Test Steps:
1. Admin → Delivery Settings → Calendar Closures
2. Add closure: November 27, 2025, Affects Delivery: Yes
3. Visit checkout on Wednesday Nov 20 (after cutoff)
4. Verify delivery options:
   - ✅ Saturday, November 29 (Thursday skipped)
   - ✅ Thursday, December 4 (next Thursday)

---

## **Scenario 10: Order Summary Total Calculation**

### Expected Behavior:
- Subtotal + Delivery Fee + Tax = Total
- Pickup shows "FREE" delivery fee

### Test Steps (Delivery):
1. Add product to cart: $45.00
2. Select Delivery, ZIP: 83702 (Local $5.00)
3. Select Thursday delivery
4. Verify order summary:
   - Subtotal: $45.00
   - Delivery Fee: $5.00
   - Subtotal + Delivery: $50.00
   - Tax (6%): $3.00
   - **Total**: $53.00

### Test Steps (Pickup):
1. Same cart: $45.00
2. Select Pickup, Main Store
3. Verify order summary:
   - Subtotal: $45.00
   - Delivery Fee: FREE (or $0.00)
   - Tax (6%): $2.70
   - **Total**: $47.70

---

## 🐛 **KNOWN ISSUES (NOT FIXED)**

1. **Multi-day closure handling**: If both Thursday and Saturday are closed, should show following week's options
2. **Product-specific delivery rules**: Not yet implemented (Phase 4 of PRD)
3. **Delivery capacity limits**: Not implemented
4. **Time zone display inconsistency**: Some dates may show in local time instead of MT

---

## ✅ **VALIDATION CHECKLIST**

Before marking delivery system as "working":

- [ ] Scenario 1: Before cutoff shows THIS week's dates
- [ ] Scenario 2: After cutoff shows NEXT week's dates
- [ ] Scenario 3: Tuesday 11:58 PM shows THIS week (edge case)
- [ ] Scenario 4: Wednesday 12:01 AM shows NEXT week (edge case)
- [ ] Scenario 5: Pickup is always FREE
- [ ] Scenario 6: Empty ZIP shows warning
- [ ] Scenario 7: Invalid ZIP shows error
- [ ] Scenario 8: No schedules shows clear message
- [ ] Scenario 9: Closure dates are respected
- [ ] Scenario 10: Order totals calculate correctly

---

## 📊 **TEST RESULTS**

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Before Cutoff | ⏳ Pending | |
| 2. After Cutoff | ⏳ Pending | |
| 3. Tuesday 11:58 PM | ⏳ Pending | |
| 4. Wednesday 12:01 AM | ⏳ Pending | |
| 5. Pickup Free | ⏳ Pending | |
| 6. No ZIP Code | ⏳ Pending | |
| 7. Invalid ZIP | ⏳ Pending | |
| 8. No Schedules | ⏳ Pending | |
| 9. Closure Dates | ⏳ Pending | |
| 10. Order Totals | ⏳ Pending | |

---

**Instructions**: Run through each scenario and update status to ✅ (Pass) or ❌ (Fail) with notes.
