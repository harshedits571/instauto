import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || 're_QjX6fv1Y_LZzBFmvsvhswfDmVLG5ymuNb';
const resend = new Resend(resendApiKey);

// Default sender in Resend sandbox. Can be overridden in .env.local with a verified domain (e.g. noreply@yourdomain.com)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'InstaAuto <onboarding@resend.dev>';

interface SendAuthEmailOptions {
  to: string;
  type: 'verification' | 'password_reset';
  displayName?: string;
  actionUrl: string;
}

export async function sendCustomAuthEmail({
  to,
  type,
  displayName,
  actionUrl
}: SendAuthEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const isVerification = type === 'verification';
    const name = displayName?.trim() || to.split('@')[0] || 'Creator';

    const subject = isVerification 
      ? 'Verify your email for InstaAuto' 
      : 'Reset your InstaAuto password';

    const headline = isVerification 
      ? 'Verify your email address' 
      : 'Reset your password';

    const introText = isVerification
      ? 'Welcome to InstaAuto! Automate your Instagram comments and DMs safely with official Meta API compliance. Click the button below to verify your email and activate your account:'
      : 'We received a request to reset your password for your InstaAuto account. Click the button below to choose a new password:';

    const buttonText = isVerification 
      ? 'Verify Email Address' 
      : 'Reset Password';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center;">
              <!-- Instagram Gradient Logo -->
              <div style="display: inline-block; width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); text-align: center; line-height: 52px; color: #ffffff; font-size: 26px; font-weight: bold; margin-bottom: 16px;">
                ⚡
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">
                InstaAuto
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">
                Official Instagram Comment to DM Automation
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #f1f5f9; width: 100%;"></div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 36px 36px 36px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #0f172a;">
                Hello ${name},
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${introText}
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);">
                  ${buttonText} →
                </a>
              </div>

              <!-- Fallback Direct URL -->
              <div style="margin-top: 28px; padding: 14px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                  Or click this direct link:
                </p>
                <a href="${actionUrl}" target="_blank" style="font-size: 12px; color: #4f46e5; text-decoration: underline; word-break: break-all; line-height: 1.4;">
                  ${actionUrl}
                </a>
              </div>

              <!-- Security Notice -->
              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                If you did not request this email, please ignore it or contact our team. Your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} InstaAuto Platform &bull; Meta Graph API v21.0 Compliant
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    console.log(`[Resend] Sending ${type} email to ${to} via Resend...`);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: subject,
      html: htmlContent
    });

    if (result.error) {
      console.error('[Resend Error]:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('[Resend Success]: Email sent with ID:', result.data?.id);
    return { success: true };
  } catch (err: any) {
    console.error('[Email Service Exception]:', err);
    return { success: false, error: err.message || 'Failed to send email' };
  }
}
