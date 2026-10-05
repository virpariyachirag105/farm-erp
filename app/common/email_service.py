import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("farm_erp")

# Brevo SMTP & Email Configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", os.getenv("SMTP_USERNAME", ""))
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", os.getenv("MAIL_FROM", "noreply@trackcove.io"))
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", os.getenv("MAIL_FROM_NAME", "Bhagavati Farm ERP"))
SMTP_TLS = os.getenv("SMTP_TLS", "True").lower() in ("true", "1", "yes")
APP_URL = os.getenv("APP_URL", os.getenv("FRONTEND_URL", "http://localhost:5173"))


def _send_smtp_message(to_email: str, subject: str, text_content: str, html_content: str, action_name: str, action_url: str) -> bool:
    """
    Internal helper to dispatch emails via Brevo / SMTP with development simulation fallback.
    """
    if not SMTP_HOST or not SMTP_USER:
        logger.info(
            f"[EMAIL SERVICE (DEV SIMULATION)] SMTP credentials not configured in .env.\n"
            f"--> Action: {action_name}\n"
            f"--> Intended recipient: {to_email}\n"
            f"--> Action URL: {action_url}\n"
        )
        print(f"\n====================================================================")
        print(f"[{action_name.upper()} EMAIL SIMULATION]")
        print(f"To: {to_email}")
        print(f"Action URL: {action_url}")
        print(f"====================================================================\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        if SMTP_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15)
            server.ehlo()

        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)

        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info(f"{action_name} email sent successfully to {to_email} via Brevo SMTP")
        return True
    except Exception as e:
        logger.error(f"Failed to send {action_name} email to {to_email}: {e}")
        print(f"[EMAIL SEND ERROR ({action_name})] {e}. Fallback URL: {action_url}")
        return False


def send_verification_email(to_email: str, token: str, user_name: str | None = None) -> bool:
    """
    Sends a secure email verification link to newly registered users via Brevo SMTP.
    """
    verify_url = f"{APP_URL.rstrip('/')}/verify-email?token={token}"
    display_name = user_name or to_email.split("@")[0].capitalize()
    subject = "Verify Your Email Address - Bhagavati Farm ERP"

    # Plain text version
    text_content = f"""Hello {display_name},

Thank you for registering with Bhagavati Farm ERP!

Please verify your email address by clicking the link below or pasting it into your browser:
{verify_url}

This verification link will expire in 24 hours. Once verified, you will be able to sign in to your account.

If you did not create this account, please ignore this email.

Best regards,
Bhagavati Farm Administration
"""

    # HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email Address</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:540px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(135deg, #15803d 0%, #166534 100%);text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Bhagavati Farm</h1>
              <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Enterprise Agri ERP</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;font-weight:700;">Welcome to Bhagavati Farm ERP!</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">Hello <strong>{display_name}</strong>,</p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">Thank you for registering. Please confirm your email address by clicking the button below to activate your account:</p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="{verify_url}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#15803d 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">Verify Email Address</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.5;">If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#16a34a;background-color:#f0fdf4;padding:12px;border-radius:6px;border:1px solid #bbf7d0;">
                <a href="{verify_url}" style="color:#15803d;text-decoration:none;">{verify_url}</a>
              </p>

              <div style="border-top:1px solid #f1f5f9;padding-top:20px;">
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                  <strong>Security Note:</strong> This verification link will expire in 24 hours. If you did not create an account with us, please disregard this email.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© Bhagavati Farm Management System. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    return _send_smtp_message(
        to_email=to_email,
        subject=subject,
        text_content=text_content,
        html_content=html_content,
        action_name="Email Verification",
        action_url=verify_url,
    )


def send_password_reset_email(to_email: str, reset_token: str, user_name: str | None = None) -> bool:
    """
    Sends a secure password reset email with the link to the frontend password reset page.
    """
    reset_url = f"{APP_URL.rstrip('/')}/reset-password?token={reset_token}"
    display_name = user_name or to_email.split("@")[0].capitalize()
    subject = "Password Reset Request - Bhagavati Farm ERP"

    # Plain text version
    text_content = f"""Hello {display_name},

We received a request to reset your password for your Bhagavati Farm ERP account.

To reset your password, please click the link below or copy and paste it into your browser:
{reset_url}

This link is valid for 30 minutes. If you did not request a password reset, please ignore this email.

Best regards,
Bhagavati Farm Administration
"""

    # HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:540px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(135deg, #15803d 0%, #166534 100%);text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Bhagavati Farm</h1>
              <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Enterprise Agri ERP</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;font-weight:700;">Password Reset Request</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">Hello <strong>{display_name}</strong>,</p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">We received a request to reset your password for your Bhagavati Farm ERP account. Click the button below to choose a new password:</p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="{reset_url}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#22c55e 0%,#15803d 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">Reset Password</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;color:#64748b;font-size:13px;line-height:1.5;">If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#16a34a;background-color:#f0fdf4;padding:12px;border-radius:6px;border:1px solid #bbf7d0;">
                <a href="{reset_url}" style="color:#15803d;text-decoration:none;">{reset_url}</a>
              </p>

              <div style="border-top:1px solid #f1f5f9;padding-top:20px;">
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                  <strong>Note:</strong> This link will expire in 30 minutes. If you did not request this password reset, no further action is required and your account remains safe.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© Bhagavati Farm Management System. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    return _send_smtp_message(
        to_email=to_email,
        subject=subject,
        text_content=text_content,
        html_content=html_content,
        action_name="Password Reset",
        action_url=reset_url,
    )
