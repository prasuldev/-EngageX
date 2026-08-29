import os
import aiosmtplib
from email.mime.text import MIMEText

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

async def send_reset_email(to_email: str, reset_link: str, sender_name: str):
    message = MIMEText(
        f"""
        <p>Someone requested a password reset for this account.</p>
        <p><a href="{reset_link}">Click here to reset your password</a></p>
        <p>This link expires in 5 minutes. If you didn't request this, ignore this email.</p>
        """,
        "html"
    )
    message["From"] = f"{sender_name} <{GMAIL_ADDRESS}>"
    message["To"] = to_email
    message["Subject"] = f"Reset your {sender_name} password"

    await aiosmtplib.send(
        message,
        hostname="smtp.gmail.com",
        port=587,
        start_tls=True,
        username=GMAIL_ADDRESS,
        password=GMAIL_APP_PASSWORD,
    )