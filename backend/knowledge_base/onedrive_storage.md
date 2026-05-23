# OneDrive — Storage Sync Errors

## Overview
All Mines students, faculty, and staff have OneDrive for Business storage as part of the Microsoft 365 subscription. OneDrive is accessed through the Microsoft 365 portal at office.com or via the desktop sync client.

## Common Issues & Solutions

### OneDrive not syncing on desktop
1. Check the OneDrive icon in the system tray — a red X indicates a sync error; click for details.
2. Common causes: file name contains invalid characters (: * ? < > | "), file path is too long (>260 characters on Windows), or file is locked by another application.
3. Pause and resume sync: right-click OneDrive tray icon → Pause syncing → Resume.
4. Sign out and sign back in: OneDrive tray → Settings → Account → Sign out, then sign in with your mines.edu account.
5. Reset OneDrive client: press Win+R, run `%localappdata%\Microsoft\OneDrive\onedrive.exe /reset`.

### Files missing from OneDrive
- Check the Recycle Bin on OneDrive web (office.com → OneDrive → Recycle Bin). Files are retained for 93 days.
- If shared files are missing, the owner may have revoked access or deleted them.
- Check "Shared with me" section for files shared by others.

### Cannot upload — "Storage quota exceeded"
- Mines provides 1TB of OneDrive storage per user.
- Check your storage usage: OneDrive web → Settings → Storage.
- Delete or move old files to free space.
- Contact IT if you need a quota increase for research or department purposes.

### Sharing permissions not working
- External sharing (outside mines.edu) may be restricted by IT policy.
- Internal sharing: use "Share" → enter the person's mines.edu email.
- If "Anyone with the link" option is unavailable, your account is restricted to internal sharing only.

### OneDrive files not accessible offline
- Enable offline access: right-click the folder in File Explorer → Always keep on this device.
- Ensure OneDrive sync client is installed and running.

### Sync conflicts
- OneDrive creates a conflict copy when the same file is edited on multiple devices simultaneously.
- Look for files named "filename (User's conflicted copy)".
- Manually compare and merge the versions, then delete the conflict copy.

## When to Escalate
- Sync errors persist after reset and re-sign-in.
- Large volumes of files missing that are not in the Recycle Bin.
- Storage quota issues that require admin override.
