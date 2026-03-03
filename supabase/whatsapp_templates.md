# FleetOS — WhatsApp Message Templates
# Submit ALL of these to Meta Business Manager BEFORE building the bot.
# Approval takes 24–72 hours. Submit on Day 1.
# URL: https://business.facebook.com → WhatsApp Manager → Message Templates

## How to Submit
1. Go to Meta Business Manager → WhatsApp Manager → Message Templates
2. Click "Create Template"
3. Category: UTILITY (for all operational messages)
4. Language: English first; then create Hindi + Telugu copies
5. Name must match EXACTLY (used in code)

---

## Template 1: lr_booked_consignee
**Category:** UTILITY
**Language:** English
**Body:**
Your consignment {{1}} has been booked by {{2}}. Track your delivery here: {{3}}

**Variables:**
- {{1}} = LR Number (e.g., VZG-000234)
- {{2}} = Company Name (e.g., Vizag Transport Co.)
- {{3}} = Tracking URL (e.g., https://fleetosin.com/track/abc123xyz)

---

## Template 2: lr_delivered
**Category:** UTILITY
**Language:** English
**Body:**
Your consignment {{1}} has been delivered at {{2}}. Thank you for choosing {{3}}.

**Variables:**
- {{1}} = LR Number
- {{2}} = Delivery time (e.g., 2:34 PM on March 15)
- {{3}} = Company Name

---

## Template 3: trip_departed_driver
**Category:** UTILITY
**Language:** English
**Body:**
Trip {{1}} to {{2}} has started. Reply ARRIVE when you reach destination. Reply DONE when delivery is complete.

**Variables:**
- {{1}} = Trip Number (e.g., T-000205)
- {{2}} = Destination city

---

## Template 4: diesel_theft_alert
**Category:** UTILITY
**Language:** English
**Body:**
⚠️ DIESEL ALERT: Truck {{1}} on Trip {{2}} — Actual mileage {{3}} km/L vs average {{4}} km/L. Possible diesel theft or vehicle issue. Check immediately.

**Variables:**
- {{1}} = Vehicle registration number
- {{2}} = Trip number
- {{3}} = Actual km/L (e.g., 3.2)
- {{4}} = Baseline km/L (e.g., 4.1)

---

## Template 5: compliance_expiry
**Category:** UTILITY
**Language:** English
**Body:**
Compliance Alert: {{1}} for {{2}} expires in {{3}} days ({{4}}). Renew before it lapses to avoid penalties.

**Variables:**
- {{1}} = Document type (e.g., Insurance, PUC)
- {{2}} = Vehicle number or driver name
- {{3}} = Days remaining (e.g., 30, 15, 7)
- {{4}} = Expiry date (e.g., April 5, 2026)

---

## Template 6: monthly_pl_summary
**Category:** UTILITY
**Language:** English
**Body:**
📊 FleetOS Monthly Report — {{1}}
Revenue: ₹{{2}} | Costs: ₹{{3}} | Net Profit: ₹{{4}}
Best Route: {{5}}
View full report: {{6}}

**Variables:**
- {{1}} = Month (e.g., February 2026)
- {{2}} = Total revenue (e.g., 4,25,000)
- {{3}} = Total costs (e.g., 3,10,000)
- {{4}} = Net profit (e.g., 1,15,000)
- {{5}} = Most profitable route (e.g., Vizag–Hyderabad)
- {{6}} = Report URL

---

## Template 7: ewb_expiring
**Category:** UTILITY
**Language:** English
**Body:**
⚠️ E-Way Bill Alert: EWB for LR {{1}} expires in 6 hours (at {{2}}). Vehicle last seen at {{3}}. Extend if needed.

**Variables:**
- {{1}} = LR number
- {{2}} = Expiry time
- {{3}} = Last known vehicle location

---

## Template 8: vendor_payment_due
**Category:** UTILITY
**Language:** English
**Body:**
Payment Reminder: Amount ₹{{1}} is due to vendor {{2}}. Overdue by {{3}} days. Clear payment to maintain good relations.

**Variables:**
- {{1}} = Amount due
- {{2}} = Vendor name
- {{3}} = Days overdue

---

## Hindi Translations (Create Copies)
Submit Hindi versions of all 8 templates with _hi suffix:
- lr_booked_consignee_hi
- diesel_theft_alert_hi
- compliance_expiry_hi
- etc.

## Telugu Translations
Submit Telugu versions with _te suffix:
- lr_booked_consignee_te
- diesel_theft_alert_te
- etc.

## Code Reference
In the send-whatsapp Edge Function, use these exact template names:
```typescript
const TEMPLATES = {
  LR_BOOKED: 'lr_booked_consignee',
  LR_DELIVERED: 'lr_delivered',
  TRIP_DEPARTED: 'trip_departed_driver',
  DIESEL_ALERT: 'diesel_theft_alert',
  COMPLIANCE: 'compliance_expiry',
  MONTHLY_PL: 'monthly_pl_summary',
  EWB_EXPIRING: 'ewb_expiring',
  VENDOR_PAYMENT: 'vendor_payment_due',
} as const;
```
