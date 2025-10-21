# AWS SNS SMS Setup Guide

This guide walks through configuring AWS Simple Notification Service (SNS) for sending SMS messages in the Sweet Angel Bakery application.

## Prerequisites

- AWS account with billing enabled
- Basic familiarity with AWS Console
- Admin access to configure IAM users

## Cost Information

- **SMS Pricing**: ~$0.006/SMS for US numbers (varies by country)
- **No monthly fees**: Pay only for messages sent
- **Free tier**: None for SMS (charges apply from first message)
- See [AWS SNS SMS Pricing](https://aws.amazon.com/sns/sms-pricing/) for latest rates

## Part 1: AWS Account Setup

### 1.1 Create/Login to AWS Account

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Sign in or create a new account
3. Complete billing setup if not already done

### 1.2 Request SMS Spending Limit Increase (Sandbox → Production)

By default, AWS SNS starts in "sandbox mode" with a $1.00/month spending limit.

1. Navigate to [SNS Console](https://console.aws.amazon.com/sns/)
2. In the left sidebar, click **"Text messaging (SMS)"**
3. Scroll to **"Account information"** section
4. Click **"Request production access"**
5. Fill out the form:
   - **Company/Website Name**: Sweet Angel Bakery
   - **Use Case**: Transactional messages (order notifications, delivery updates)
   - **Expected Monthly Volume**: Estimate based on your needs
   - **Opt-out Mechanism**: Customers can reply STOP
   - **Target Countries**: United States (or your target market)
6. Submit request (approval typically takes 24-48 hours)

> **Note**: While waiting for approval, you can still test with verified phone numbers (see Testing section).

## Part 2: IAM User Configuration

### 2.1 Create IAM User for SNS

1. Navigate to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **"Users"** in left sidebar
3. Click **"Create user"**
4. Enter details:
   - **User name**: `sweet-angel-bakery-sms`
   - **AWS access type**: Select **"Programmatic access"** only
5. Click **"Next"**

### 2.2 Set Permissions

1. Select **"Attach policies directly"**
2. Search for **"SNS"**
3. Select **"AmazonSNSFullAccess"**

   > **Security Note**: For production, create a custom policy with minimal permissions (see Security Best Practices below)

4. Click **"Next"** → **"Create user"**

### 2.3 Generate Access Keys

1. After user creation, click on the new user name
2. Click **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"** → **"Create access key"**
7. **IMPORTANT**: Copy both values:
   - **Access Key ID** → This is your `AWS_SNS_ACCESS_KEY`
   - **Secret Access Key** → This is your `AWS_SNS_SECRET_KEY`

   > ⚠️ **Warning**: The secret key is only shown once. Save it securely!

8. Click **"Done"**

## Part 3: SNS Configuration

### 3.1 Configure Default SMS Settings

1. Go to [SNS Console](https://console.aws.amazon.com/sns/)
2. Click **"Text messaging (SMS)"** in left sidebar
3. Click **"Edit"** in Account information section
4. Configure:
   - **Default message type**: Select **"Transactional"**
     - Transactional = Time-sensitive (order updates, confirmations)
     - Promotional = Marketing messages
   - **Default sender ID**: Leave blank for US (not supported)
   - **Monthly spend limit**: Set your budget (e.g., $50)
5. Click **"Save changes"**

### 3.2 Register Sender ID (Optional - International Only)

> **Note**: Skip this for US. Sender ID is not supported in the US.

For international markets (UK, India, etc.):
1. In SNS Console → Text messaging (SMS)
2. Click **"Manage sender IDs"**
3. Follow country-specific registration process
4. Use **"SweetAngel"** or your business name

### 3.3 Set Up Opt-Out Management

AWS SNS automatically handles STOP/UNSUBSCRIBE replies:
1. When a customer texts "STOP", AWS blocks future messages
2. Check opt-out list: SNS Console → Text messaging (SMS) → Opt-out list
3. Customers can text "START" to opt back in

## Part 4: Application Configuration

### 4.1 Add Credentials to Environment Variables

Add these to your `.env` file (local) and Cloudflare Worker secrets (production):

```bash
# AWS SNS Configuration
AWS_SNS_ACCESS_KEY=AKIA...your-access-key...
AWS_SNS_SECRET_KEY=abc123...your-secret-key...
AWS_REGION=us-east-1
```

### 4.2 Set Cloudflare Worker Secrets (Production)

```bash
# Navigate to your project directory
cd /path/to/sweet-angel-bakery

# Set secrets using wrangler
npx wrangler secret put AWS_SNS_ACCESS_KEY
# Paste your access key when prompted

npx wrangler secret put AWS_SNS_SECRET_KEY
# Paste your secret key when prompted

npx wrangler secret put AWS_REGION
# Enter: us-east-1 (or your preferred region)
```

### 4.3 Choose AWS Region

Available regions for SNS SMS:
- `us-east-1` (N. Virginia) - **Recommended**
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-southeast-1` (Singapore)
- [See full list](https://docs.aws.amazon.com/sns/latest/dg/sns-supported-regions-countries.html)

> **Tip**: Use the region closest to your primary customer base.

## Part 5: Testing

### 5.1 Test in Sandbox Mode (Before Production Approval)

While in sandbox mode, you can only send to verified numbers:

1. Go to SNS Console → Text messaging (SMS)
2. Scroll to **"Sandbox destination phone numbers"**
3. Click **"Add phone number"**
4. Enter your test phone number (E.164 format: +12085551234)
5. Verify via OTP code sent to your phone

### 5.2 Send Test Message via Console

1. In SNS Console, click **"Publish message"**
2. Select **"Publish to a phone number"**
3. Enter:
   - **Phone number**: Your verified number (+12085551234)
   - **Message**: "Test from Sweet Angel Bakery"
4. Click **"Publish message"**
5. Check your phone for the SMS

### 5.3 Test via Application Code

Create a test script or use your app in dev mode:

```typescript
import { sendSMS } from "@/utils/sms";

// In development, this will log to console
// In production, it will send actual SMS
await sendSMS({
  to: "+12085551234",
  message: "Test order confirmation from Sweet Angel Bakery"
});
```

Run dev server and trigger the SMS flow (e.g., complete a test order).

## Part 6: Production Deployment

### 6.1 After Production Access Approved

Once AWS approves your production access request:

1. Check approval email from AWS
2. Verify increased spending limit in SNS Console
3. Test sending to unverified numbers
4. Monitor usage in [CloudWatch](https://console.aws.amazon.com/cloudwatch/)

### 6.2 Set Up CloudWatch Monitoring (Recommended)

1. Go to [CloudWatch Console](https://console.aws.amazon.com/cloudwatch/)
2. Click **"Alarms"** → **"Create alarm"**
3. Select metric:
   - Namespace: SNS
   - Metric: SMSSuccessRate, NumberOfMessagesFailed
4. Set thresholds and email notifications
5. Monitor your SMS delivery success rate

## Security Best Practices

### Minimal IAM Policy (Production)

Instead of `AmazonSNSFullAccess`, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:GetSMSAttributes",
        "sns:SetSMSAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

Apply this policy:
1. IAM Console → Policies → Create policy
2. Paste JSON above
3. Name: `SweetAngelBakerySMSPolicy`
4. Attach to `sweet-angel-bakery-sms` user
5. Remove `AmazonSNSFullAccess`

### Secret Rotation

Rotate access keys every 90 days:
1. Generate new access key
2. Update environment variables
3. Test in staging
4. Deploy to production
5. Delete old access key after 24 hours

### Environment Protection

- **Never commit** `.env` to git
- Use Cloudflare Worker secrets for production
- Use different IAM users for dev/staging/prod
- Enable MFA on AWS root account

## Troubleshooting

### Issue: "AuthorizationError" when sending SMS

**Solution**: Check IAM permissions
```bash
# Verify access key is correct
aws sns get-sms-attributes --profile sweet-angel-bakery
```

### Issue: Messages not delivered

**Possible causes**:
1. **Sandbox mode**: Verify destination number in SNS Console
2. **Invalid format**: Ensure E.164 format (+12085551234)
3. **Opt-out list**: Recipient may have texted STOP previously
4. **Regional restrictions**: Some countries block promotional SMS

Check CloudWatch Logs for detailed error messages.

### Issue: High costs

**Solutions**:
1. Verify you're using "Transactional" message type (cheaper)
2. Set monthly spending limit in SNS Console
3. Monitor usage in CloudWatch
4. Implement rate limiting in application code

### Issue: "Account in sandbox mode"

**Solution**: Request production access (see Part 1.2)
- Takes 24-48 hours
- Check spam folder for AWS response email
- Can test with verified numbers while waiting

## Alternative: Using AWS SDK (Recommended for Production)

The current implementation uses direct HTTP calls. For production, upgrade to the official SDK:

### Install AWS SDK

```bash
pnpm add @aws-sdk/client-sns
```

### Update `src/utils/sms.ts`

```typescript
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

async function sendSNSMessage({ to, message }: SendSMSOptions) {
  const client = new SNSClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_SNS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SNS_SECRET_KEY!,
    },
  });

  const command = new PublishCommand({
    PhoneNumber: to,
    Message: message,
    MessageAttributes: {
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    },
  });

  await client.send(command);
}
```

## Compliance & Legal

### US Regulations (TCPA)

- ✅ Get explicit consent before sending SMS
- ✅ Provide opt-out mechanism (STOP keyword)
- ✅ Only send transactional messages unless customer opted in for marketing
- ✅ Include business name in messages
- ✅ Honor opt-outs immediately

### GDPR (EU Customers)

- Get explicit consent with clear language
- Store consent records
- Allow customers to withdraw consent easily
- Include privacy policy link in signup

### Message Templates

All message templates in `src/utils/sms.ts` include:
- Business name (Sweet Angel Bakery)
- Opt-out instruction ("Reply STOP to opt out")
- Clear purpose (order confirmation, ready for pickup, etc.)

## Support & Resources

- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/latest/dg/sns-sms-messaging.html)
- [SMS Best Practices](https://docs.aws.amazon.com/sns/latest/dg/sms_best-practices.html)
- [Supported Countries](https://docs.aws.amazon.com/sns/latest/dg/sns-supported-regions-countries.html)
- [Pricing Calculator](https://calculator.aws/)
- [AWS Support](https://console.aws.amazon.com/support/)

## Quick Reference

| Environment Variable | Example | Required |
|---------------------|---------|----------|
| `AWS_SNS_ACCESS_KEY` | `AKIAIOSFODNN7EXAMPLE` | Yes |
| `AWS_SNS_SECRET_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Yes |
| `AWS_REGION` | `us-east-1` | Yes |
| `SMS_FROM_NUMBER` | `+12085551234` | No (US) |

## Next Steps

1. ✅ Complete this guide
2. Test in sandbox mode
3. Request production access
4. Deploy to staging environment
5. Monitor first 100 messages
6. Deploy to production
7. Set up CloudWatch alarms
8. Schedule first key rotation (90 days)
