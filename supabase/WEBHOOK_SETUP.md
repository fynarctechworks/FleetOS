# WhatsApp Webhook Setup — FleetOS

## Prerequisites
1. Meta Business Account with WhatsApp Business API access
2. Supabase project with Edge Functions deployed
3. `send-whatsapp` and `whatsapp-webhook` Edge Functions deployed

## Step 1: Set Supabase Secrets

```bash
supabase secrets set META_WHATSAPP_TOKEN=<your-meta-permanent-token>
supabase secrets set META_PHONE_NUMBER_ID=<your-phone-number-id>
supabase secrets set WEBHOOK_SECRET=<your-random-secret-string>
```

Generate WEBHOOK_SECRET:
```bash
openssl rand -hex 32
```

## Step 2: Deploy Edge Functions

```bash
supabase functions deploy send-whatsapp
supabase functions deploy whatsapp-webhook
```

## Step 3: Register Webhook in Meta Dashboard

1. Go to https://developers.facebook.com → Your App → WhatsApp → Configuration
2. Under "Webhook", click "Edit"
3. Set **Callback URL** to:
   ```
   https://<your-project-ref>.supabase.co/functions/v1/whatsapp-webhook
   ```
4. Set **Verify token** to the same value as your `WEBHOOK_SECRET`
5. Click "Verify and Save"
6. Under "Webhook fields", subscribe to:
   - `messages` (required — incoming messages)
   - `message_deliveries` (optional — delivery receipts)

## Step 4: Submit WhatsApp Templates

Submit these templates in Meta Business Manager → WhatsApp Manager → Message Templates:

| Template Name | Category | Body |
|---|---|---|
| `lr_booked_consignee` | UTILITY | Your shipment {{1}} from {{2}} to {{3}} has been booked. Track: {{4}} |
| `lr_delivered` | UTILITY | Your shipment {{1}} has been delivered. Thank you, {{2}}! |
| `trip_departed_driver` | UTILITY | Trip {{1}} to {{2}} has started. Drive safe! |
| `trip_arrived_driver` | UTILITY | Trip {{1}} arrived at {{2}}. Reply DONE when delivery is complete. |
| `trip_completed_driver` | UTILITY | Trip {{1}} completed. Thank you for your service! |
| `compliance_expiry` | UTILITY | ALERT: {{1}} for {{2}} expires in {{3}} days. Please renew immediately. |
| `diesel_theft_alert` | ALERT | WARNING: Diesel theft suspected on vehicle {{1}}. Actual: {{2}} km/L vs expected: {{3}} km/L. |
| `monthly_pl_summary` | UTILITY | Monthly P&L Summary for {{1}}: Revenue ₹{{2}}, Costs ₹{{3}}, Profit ₹{{4}} |

**Note:** Template approval takes 24-72 hours. Submit early.

## Step 5: Test the Webhook

### Mock Mode (no Meta credentials needed)
Set `META_WHATSAPP_TOKEN=test` in Supabase secrets. The webhook will:
- Accept all incoming requests without signature verification
- Log messages to console instead of sending via Meta API
- Still update trip statuses and LR records in the database

### Live Test
1. Send "DEPART" from your WhatsApp to the registered business number
2. Check the trips table — status should update to 'departed'
3. Send a photo — check the lr_entries table for pod_photo_url

## Webhook Payload Format (for reference)

Meta sends POST requests with this structure:
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "contacts": [{ "wa_id": "919876543210", "profile": { "name": "Driver Name" } }],
        "messages": [{
          "from": "919876543210",
          "type": "text",
          "text": { "body": "DEPART" }
        }]
      }
    }]
  }]
}
```

For images:
```json
{
  "messages": [{
    "from": "919876543210",
    "type": "image",
    "image": { "id": "media_id_from_meta", "mime_type": "image/jpeg" }
  }]
}
```
