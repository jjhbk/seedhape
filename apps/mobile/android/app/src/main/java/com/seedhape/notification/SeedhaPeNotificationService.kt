package com.seedhape.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.facebook.react.bridge.Arguments
import java.time.Instant

/**
 * Listens for status bar notifications from UPI apps.
 * Parses payment details and forwards to React Native via the bridge.
 */
class SeedhaPeNotificationService : NotificationListenerService() {

    // UPI app packages we monitor
    private val upiPackages = setOf(
        "com.phonepe.app",
        "com.google.android.apps.nbu.paisa.user",
        "net.one97.paytm",
        "in.org.npci.upiapp",
        "in.amazon.mShop.android.shopping",
        "com.whatsapp",
        "com.dreamplug.androidapp"
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName !in upiPackages) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getString("android.title") ?: ""
        val body = extras.getCharSequence("android.text")?.toString() ?: ""

        if (body.isBlank()) return

        val parsed = NotificationParser.parse(sbn.packageName, title, body) ?: return

        val map = Arguments.createMap().apply {
            putString("packageName", sbn.packageName)
            putString("title", title)
            putString("body", body)
            putDouble("amount", parsed.amountPaise.toDouble())
            parsed.utr?.let { putString("utr", it) }
            parsed.transactionNote?.let { putString("transactionNote", it) }
            parsed.senderName?.let { putString("senderName", it) }
            putString("upiApp", getAppName(sbn.packageName))
            putString("receivedAt", Instant.now().toString())
            putString("rawTitle", title)
            putString("rawBody", body)
        }

        NotificationListenerModule.instance?.emitNotification(map)
    }

    private fun getAppName(packageName: String): String = when (packageName) {
        "com.phonepe.app" -> "PhonePe"
        "com.google.android.apps.nbu.paisa.user" -> "Google Pay"
        "net.one97.paytm" -> "Paytm"
        "in.org.npci.upiapp" -> "BHIM"
        "in.amazon.mShop.android.shopping" -> "Amazon Pay"
        "com.whatsapp" -> "WhatsApp Pay"
        "com.dreamplug.androidapp" -> "CRED"
        else -> packageName
    }
}
