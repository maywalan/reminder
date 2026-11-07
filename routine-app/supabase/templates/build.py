"""
Builds Tickle's Supabase auth email templates (confirmation.html, recovery.html) from one layout.

Run:  python3 supabase/templates/build.py
Then push them with the config in supabase/templates/README.md.

Each email picks English or Thai from the user's metadata (`language`, written by the app at
sign-up and whenever the app language changes). Anyone without it gets English.
Supabase fills the {{ ... }} placeholders (Go templates) when it sends.
"""

from pathlib import Path

HERE = Path(__file__).parent
ICON = "https://maywalan.github.io/reminder/email/tickle-icon.png"

# Tickle light theme (src/constants/theme.ts)
PAGE = "#F7FAFF"
CARD = "#FFFFFF"
INK = "#10203A"
INK_60 = "#5A6576"  # ink at ~60% on white, solid so every client renders it the same
INK_45 = "#7D8695"
ACCENT = "#1B76E8"
BORDER = "#E6ECF5"
FONT = "Anuphan, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

TH = '{{ if eq .Data.language "th" }}'


def bi(en: str, th: str) -> str:
    """English/Thai switch on the user's saved app language."""
    return f"{TH}{th}{{{{ else }}}}{en}{{{{ end }}}}"


NAME_EN = "{{ if .Data.full_name }}Hi {{ .Data.full_name }},{{ else }}Hi,{{ end }}"
NAME_TH = "{{ if .Data.full_name }}สวัสดี {{ .Data.full_name }}{{ else }}สวัสดี{{ end }}"

EMAILS = {
    "confirmation": {
        "preheader": ("One tap to finish setting up Tickle.", "กดครั้งเดียวก็เริ่มใช้ Tickle ได้เลย"),
        "heading": ("Confirm your email", "ยืนยันอีเมลของคุณ"),
        "body": (
            "Tap the button to confirm this email. Then your plans sync across your devices.",
            "กดปุ่มด้านล่างเพื่อยืนยันอีเมล แล้วแผนของคุณจะซิงก์ทุกเครื่อง",
        ),
        "button": ("Confirm Email", "ยืนยันอีเมล"),
        "note": (
            "Didn’t sign up for Tickle? You can ignore this email.",
            "ถ้าคุณไม่ได้สมัคร Tickle ไม่ต้องทำอะไร ปล่อยอีเมลนี้ไว้ได้เลย",
        ),
    },
    "recovery": {
        "preheader": ("Choose a new password for Tickle.", "ตั้งรหัสผ่านใหม่สำหรับ Tickle"),
        "heading": ("Set a new password", "ตั้งรหัสผ่านใหม่"),
        "body": (
            "Open this email on the iPhone that has Tickle and tap the button.<br>The link works once and expires in 1 hour.",
            "เปิดอีเมลนี้บน iPhone ที่มี Tickle แล้วกดปุ่มด้านล่าง<br>ลิงก์ใช้ได้ครั้งเดียว และหมดอายุใน 1 ชั่วโมง",
        ),
        "button": ("Set New Password", "ตั้งรหัสผ่านใหม่"),
        "note": (
            "Didn’t ask to reset your password? Ignore this email. Your password stays the same.",
            "ถ้าคุณไม่ได้ขอตั้งรหัสผ่านใหม่ ไม่ต้องทำอะไร รหัสผ่านเดิมยังใช้ได้ตามปกติ",
        ),
    },
}

FALLBACK = ("If the button doesn’t work, copy this link into Safari:", "ถ้ากดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดใน Safari")
FOOTER = ("Tickle · tickle.daily.app@gmail.com", "Tickle · tickle.daily.app@gmail.com")


def render(e: dict) -> str:
    t = lambda key: bi(*e[key])  # noqa: E731
    return f"""<!doctype html>
<html lang="{bi('en', 'th')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{t('heading')}</title>
<link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:{PAGE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{t('preheader')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{PAGE};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr>
          <td style="background:{CARD};border:1px solid {BORDER};border-radius:16px;padding:32px 28px;font-family:{FONT};color:{INK};">
            <img src="{ICON}" width="48" height="48" alt="Tickle" style="display:block;border:0;border-radius:12px;margin:0 0 24px 0;">
            <h1 style="margin:0 0 12px 0;font-size:22px;line-height:30px;font-weight:700;color:{INK};">{t('heading')}</h1>
            <p style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:{INK};">{bi(NAME_EN, NAME_TH)}</p>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:{INK_60};">{t('body')}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="{ACCENT}" style="border-radius:24px;">
                  <a href="{{{{ .ConfirmationURL }}}}" style="display:inline-block;padding:13px 28px;font-family:{FONT};font-size:15px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:24px;">{t('button')}</a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0 0;font-size:13px;line-height:20px;color:{INK_60};">{t('note')}</p>
            <p style="margin:16px 0 0 0;padding-top:16px;border-top:1px solid {BORDER};font-size:12px;line-height:18px;color:{INK_45};">{bi(*FALLBACK)}<br><a href="{{{{ .ConfirmationURL }}}}" style="color:{INK_45};word-break:break-all;">{{{{ .ConfirmationURL }}}}</a></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 8px 0 8px;font-family:{FONT};font-size:12px;line-height:18px;color:{INK_45};">{bi(*FOOTER)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
"""


SUBJECTS = {
    "confirmation": ("Confirm your Tickle account", "ยืนยันบัญชี Tickle ของคุณ"),
    "recovery": ("Reset your Tickle password", "ตั้งรหัสผ่าน Tickle ใหม่"),
}

if __name__ == "__main__":
    for name, e in EMAILS.items():
        (HERE / f"{name}.html").write_text(render(e))
    for name, s in SUBJECTS.items():
        print(f'{name}: subject = "{bi(*s)}"')
