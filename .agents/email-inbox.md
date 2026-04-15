# Agent: Email Inbox (A5)

## Purpose
Scannt Gmail-Inbox, klassifiziert Emails via Gemini, schreibt Drafts ins Gmail-Drafts-Folder. Niemals Auto-Send.

## Route
`GET /api/cron/email-inbox`

## Cron
`0 8,14 * * *` (2x taeglich)

## Input
- Gmail via `gmail-client` Helper (OAuth refresh token).
- Bis zu 20 Inbox-Messages pro Run.
- Dedup gegen `email_inbox.gmail_id`.

## Output
- Row in `email_inbox` mit Klassifikation.
- Gmail-Label `PraxisNova/<category>` gesetzt (silent fail OK).
- Gmail-Draft erstellt wenn `requires_action=true` und `suggestedReply` vorhanden.

## Kategorien
customer-inquiry, partner, admin, marketing-tool, spam-ish, personal.

## Error-Handling
- OAuth missing: `gmail-client` gibt [] zurueck + `recordBlockedTask('gmail-oauth')`.
- Gemini parse fail: `recordBlockedTask('classify-email')`, weiter mit naechstem Item.
- setLabel/createDraft fail: silent catch, Hauptdaten in DB sind wichtiger.

## Env-Vars
CRON_SECRET, GEMINI_API_KEY, GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN.

## Known Limitations
- Label muss in Gmail existieren oder Fehler wird still verschluckt. Setup-Task fuer Angie: Labels `PraxisNova/customer-inquiry`, `/partner`, `/admin`, `/marketing-tool`, `/spam-ish`, `/personal` manuell anlegen.
- Re-Classification nach Thread-Updates nicht implementiert (v1 single-pass).
