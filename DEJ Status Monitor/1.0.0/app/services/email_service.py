"""
Email notification service
Supports SendGrid API (recommended) or SMTP fallback
"""
import os
from typing import List
import logging

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        # Load from environment variables (never hardcode)
        self.email_provider = os.getenv("EMAIL_PROVIDER", "sendgrid").lower()
        
        if self.email_provider == "sendgrid":
            # SendGrid API configuration
            self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
            self.sender_email = os.getenv("NOTIFICATION_EMAIL", "josh.thurman@curbstone.com")
            self.sender_name = os.getenv("NOTIFICATION_SENDER_NAME", "Terminal Status Monitor")
        else:
            # SMTP configuration (fallback)
            self.smtp_server = os.getenv("SMTP_SERVER", "smtp.office365.com")
            self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
            self.sender_email = os.getenv("NOTIFICATION_EMAIL", "josh.thurman@curbstone.com")
            self.sender_password = os.getenv("NOTIFICATION_EMAIL_PASSWORD")
        
    async def send_notification(
        self,
        to_emails: List[str],
        subject: str,
        body: str
    ):
        """Send email notification"""
        if self.email_provider == "sendgrid":
            return await self._send_via_sendgrid(to_emails, subject, body)
        else:
            return await self._send_via_smtp(to_emails, subject, body)
    
    async def _send_via_sendgrid(
        self,
        to_emails: List[str],
        subject: str,
        body: str
    ):
        """Send email via SendGrid API"""
        if not self.sendgrid_api_key:
            logger.warning("SendGrid API key not configured, skipping notification")
            return False
        
        try:
            import httpx
            
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            # Build SendGrid API payload
            payload = {
                "personalizations": [{
                    "to": [{"email": email} for email in to_emails],
                    "subject": subject
                }],
                "from": {
                    "email": self.sender_email,
                    "name": self.sender_name
                },
                "content": [{
                    "type": "text/html",
                    "value": body
                }]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                response.raise_for_status()
            
            logger.info(f"Notification email sent via SendGrid to {to_emails}")
            return True
        except ImportError:
            logger.error("httpx not available for SendGrid API calls")
            return False
        except Exception as e:
            logger.error(f"Failed to send notification email via SendGrid: {e}", exc_info=True)
            return False
    
    async def _send_via_smtp(
        self,
        to_emails: List[str],
        subject: str,
        body: str
    ):
        """Send email via SMTP (fallback)"""
        if not self.sender_email or not self.sender_password:
            logger.warning("SMTP credentials not configured, skipping notification")
            return False
            
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = ", ".join(to_emails)
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            logger.info(f"Notification email sent via SMTP to {to_emails}")
            return True
        except Exception as e:
            logger.error(f"Failed to send notification email via SMTP: {e}", exc_info=True)
            return False
