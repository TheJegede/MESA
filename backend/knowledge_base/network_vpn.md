# Network & VPN — Campus Connectivity

## Overview
Mines provides campus Wi-Fi, wired Ethernet in buildings, and GlobalProtect VPN for secure off-campus access to internal systems.

## Campus Wi-Fi

### Connecting to Mines Wi-Fi
- Primary network: **MinesAir** — requires MultiPass login. Use for all campus computing.
- Guest network: **MinesGuest** — for visitors, no Mines account required. Limited to basic internet.
- eduroam: available for visitors from partner institutions — use their home institution credentials.

### Cannot connect to MinesAir
1. Forget the MinesAir network on your device and reconnect.
2. Ensure you are entering your full mines.edu email as the username.
3. Accept the security certificate if prompted.
4. On Windows: go to Network Settings → Manage Known Networks → Remove MinesAir → reconnect.
5. On Mac: System Preferences → Network → Wi-Fi → Advanced → remove MinesAir → reconnect.
6. If still failing, register your device's MAC address at network.mines.edu.

### Slow Wi-Fi or frequent disconnections
- Avoid connecting in high-density areas during peak hours (10 AM–2 PM in lecture halls).
- Use 5GHz band when available (shows as MinesAir-5G on some access points).
- Wired Ethernet is available in all classrooms, offices, and the library — always faster and more stable.

## VPN — GlobalProtect

### Installing GlobalProtect VPN
1. Download the GlobalProtect client from vpn.mines.edu.
2. Install and launch GlobalProtect.
3. Enter portal address: `vpn.mines.edu`.
4. Sign in with your MultiPass credentials and complete Duo MFA.

### VPN not connecting
1. Ensure you are not already on the campus network — VPN is for off-campus use.
2. Check your internet connection works without VPN.
3. Disconnect and reconnect GlobalProtect.
4. Restart the GlobalProtect service: on Windows, open Services → find "PanGPS" → Restart.
5. If "Authentication failed": reset your MultiPass password (see Password Reset article).

### Which systems require VPN
- Edify analytics platform (off-campus access)
- Internal department file shares
- Some administrative applications
- Banner and Canvas do NOT require VPN — accessible directly from the internet.

### Split tunneling
- GlobalProtect uses split tunneling by default: only Mines-internal traffic routes through VPN, regular internet traffic goes direct.
- If you notice all internet traffic is slow on VPN, contact IT — this may indicate a misconfiguration.

## When to Escalate
- Entire building has no network access (infrastructure issue).
- VPN installation fails or client crashes repeatedly.
- MAC address registration required but not resolving connection.
