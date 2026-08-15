# Visitor notification sounds

Spoken WAV files used for visitor push notifications.

| File | Used when | Spoken text |
|------|-----------|-------------|
| `visitor_arrived.wav` | Member — new visitor at gate | Please verify. A new visitor is waiting at the gate. |
| `visitor_approved.wav` | Gate keeper — resident approved | Visitor approved. |
| `visitor_rejected.wav` | Gate keeper — resident rejected | Visitor rejected. |

## How playback works

1. **App open (foreground):** plays WAV via `expo-av` in the notification handler.
2. **App in background (still in memory):** plays WAV via `BACKGROUND-VISITOR-NOTIFICATION-TASK`.
3. **App fully killed / locked tray sound:** OS plays the channel sound from the native build.

For (2) and (3) you **must rebuild** the native app after adding sounds + `expo-task-manager` + `expo-av`:

```bash
npx expo run:android
```

Then uninstall the old app once (Android locks channel sounds), install the new build, and re-login.
