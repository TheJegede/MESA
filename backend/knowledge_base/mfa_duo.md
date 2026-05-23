# MFA & Duo — Multi-Factor Authentication

## Overview
Mines uses Duo Security for multi-factor authentication (MFA) on all systems accessed via MultiPass SSO. MFA adds a second verification step beyond your password.

## Setup & Enrollment

### Enrolling in Duo for the first time
1. Go to duo.mines.edu.
2. Sign in with your MultiPass credentials.
3. Follow the enrollment wizard — choose your preferred authentication method:
   - **Duo Mobile app** (recommended): install on iOS or Android, scan QR code.
   - **SMS passcode**: receive a text message with a code.
   - **Hardware token**: available from IT Service Desk for users without smartphones.

### Adding a new device
1. Log in to duo.mines.edu → Manage Devices → Add a device.
2. Follow the same enrollment steps for the new device.
3. Keep your old device active until the new one is confirmed working.

## Common Issues

### Duo push notification not arriving
1. Check your phone has internet or cellular connectivity.
2. Open the Duo Mobile app and tap "Get a Duo Push" manually.
3. Check notification settings: Settings → Notifications → Duo Mobile → Allow Notifications (on).
4. If push does not work, use "Enter a Passcode" — open the Duo Mobile app to generate a 6-digit code.

### Lost or replaced phone
1. If you have a second device enrolled: use it to log in.
2. If you have no other device: call the IT Service Desk at 303-278-4357 to get a temporary bypass code. Have your Mines ID ready.
3. After getting a bypass code, immediately enroll your new device at duo.mines.edu.

### Duo says "Error: Access Denied"
- Your account may be restricted from MFA bypass. Contact IT Service Desk.
- If you are traveling internationally, Duo push may fail — use passcodes from the app instead (works offline).

### "Invalid device" error after phone upgrade
- Old device enrollment must be removed. Log in from a computer using a passcode or bypass code, then go to duo.mines.edu → Manage Devices → Remove old device.

### Duo prompting too frequently
- When logging in, check "Remember me for X days" to reduce prompts on trusted devices.
- If you're prompted every session despite "remember me," check if your browser blocks cookies for mines.edu.

## When to Escalate
- Cannot log in with any Duo method and need immediate system access.
- Bypass code from IT does not work.
- Account shows locked in Duo admin — requires IT admin intervention.
