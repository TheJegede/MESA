import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from backend.config import GMAIL_USER, GMAIL_APP_PASSWORD


def send_email(to_addr: str, subject: str, body: str) -> dict:
    """Send plain-text email via Gmail SMTP. Returns {success: bool, error: str|None}."""
    try:
        msg = MIMEMultipart()
        msg["From"] = GMAIL_USER
        msg["To"] = to_addr
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls(context=context)
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_addr, msg.as_string())
        return {"success": True, "error": None}
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_with_attachment(to_addr: str, subject: str, body: str, filepath: str) -> dict:
    """Send email with optional file attachment. Returns {success: bool, error: str|None}."""
    try:
        msg = MIMEMultipart()
        msg["From"] = GMAIL_USER
        msg["To"] = to_addr
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        if filepath and os.path.exists(filepath):
            with open(filepath, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename={os.path.basename(filepath)}",
            )
            msg.attach(part)
        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls(context=context)
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_addr, msg.as_string())
        return {"success": True, "error": None}
    except Exception as e:
        return {"success": False, "error": str(e)}
