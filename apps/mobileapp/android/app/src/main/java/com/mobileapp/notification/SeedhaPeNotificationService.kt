package com.mobileapp.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.media.AudioManager
import android.media.ToneGenerator
import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.Arguments
import java.time.Instant
import java.util.Locale

/**
 * Listens for status bar notifications from UPI apps.
 * Parses payment details and forwards to React Native via the bridge.
 */
class SeedhaPeNotificationService : NotificationListenerService() {
    private val toneGenerator by lazy {
        ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90)
    }
    private var textToSpeech: TextToSpeech? = null
    private var ttsReady: Boolean = false

    // UPI app packages we monitor
    private val upiPackages = setOf(
        "com.phonepe.app",
        "com.google.android.apps.nbu.paisa.user",  // GPay personal
        "com.google.android.apps.pay.merchant",     // GPay for Business / Merchant
        "net.one97.paytm",
        "in.org.npci.upiapp",
        "in.amazon.mShop.android.shopping",
        "com.whatsapp",
        "com.dreamplug.androidapp",
        "com.samsung.android.spay",
        "com.csam.icici.bank.imobile",
        "com.sbi.lotusintouch",
        "com.axis.mobile",
        "com.mobikwik_new",
        "com.slicepay",
        "in.juspay.hypersdk",
        "com.nextbillion.groww",
    )

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName !in upiPackages) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        // Use getCharSequence + toString() for both fields — GPay and Paytm use SpannableString
        // instead of plain String, so getString() throws ClassCastException on those apps.
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        // Prefer bigText (expanded notification) — it contains the full detail including
        // transaction note / tn field. Fall back to the standard single-line text.
        val body = extras.getCharSequence("android.bigText")?.toString()?.takeIf { it.isNotBlank() }
            ?: extras.getCharSequence("android.text")?.toString()
            ?: ""

        if (body.isBlank()) return

        val parsed = NotificationParser.parse(sbn.packageName, title, body) ?: return
        val upiApp = getAppName(sbn.packageName)
        announcePayment(parsed.amountPaise)

        val map = Arguments.createMap().apply {
            putString("packageName", sbn.packageName)
            putString("title", title)
            putString("body", body)
            putDouble("amount", parsed.amountPaise.toDouble())
            parsed.utr?.let { putString("utr", it) }
            parsed.transactionNote?.let { putString("transactionNote", it) }
            parsed.senderName?.let { putString("senderName", it) }
            putString("upiApp", upiApp)
            putString("receivedAt", Instant.now().toString())
            putString("rawTitle", title)
            putString("rawBody", body)
        }

        // Send directly from native for background reliability, independent of JS runtime state.
        BackgroundSyncNetwork.sendNotification(this, sbn.packageName, title, body, parsed, upiApp)
        NotificationListenerModule.instance?.emitNotification(map)
    }

    override fun onCreate() {
        super.onCreate()
        initTextToSpeech()
    }

    override fun onDestroy() {
        runCatching { textToSpeech?.stop() }
        runCatching { textToSpeech?.shutdown() }
        textToSpeech = null
        ttsReady = false
        runCatching { toneGenerator.release() }
        super.onDestroy()
    }

    private fun initTextToSpeech() {
        textToSpeech = TextToSpeech(applicationContext) { status ->
            if (status != TextToSpeech.SUCCESS) {
                ttsReady = false
                return@TextToSpeech
            }

            val engine = textToSpeech ?: return@TextToSpeech
            val result = engine.setLanguage(Locale("en", "IN"))
            ttsReady =
                result != TextToSpeech.LANG_MISSING_DATA &&
                    result != TextToSpeech.LANG_NOT_SUPPORTED
            if (ttsReady) {
                engine.setSpeechRate(1.0f)
                engine.setPitch(1.0f)
            }
        }
    }

    private fun announcePayment(amountPaise: Int) {
        val now = System.currentTimeMillis()
        if (now - lastAnnouncementAtMs < ANNOUNCEMENT_THROTTLE_MS) return
        lastAnnouncementAtMs = now

        val amountText = formatAmountRupees(amountPaise)
        val message = "Received payment of $amountText rupees"
        val spoken = runCatching {
            val engine = textToSpeech
            if (ttsReady && engine != null) {
                engine.speak(message, TextToSpeech.QUEUE_FLUSH, null)
                true
            } else {
                false
            }
        }.getOrDefault(false)

        if (!spoken) {
            // Fallback to a short beep when TTS is unavailable.
            runCatching { toneGenerator.startTone(ToneGenerator.TONE_PROP_ACK, 300) }
        }
    }

    private fun formatAmountRupees(amountPaise: Int): String {
        val rupees = amountPaise / 100
        val paise = amountPaise % 100
        return if (paise == 0) {
            rupees.toString()
        } else {
            String.format(Locale.ENGLISH, "%.2f", amountPaise / 100.0)
        }
    }

    private fun getAppName(packageName: String): String = when (packageName) {
        "com.phonepe.app" -> "PhonePe"
        "com.google.android.apps.nbu.paisa.user" -> "Google Pay"
        "com.google.android.apps.pay.merchant" -> "Google Pay Business"
        "net.one97.paytm" -> "Paytm"
        "in.org.npci.upiapp" -> "BHIM"
        "in.amazon.mShop.android.shopping" -> "Amazon Pay"
        "com.whatsapp" -> "WhatsApp Pay"
        "com.dreamplug.androidapp" -> "CRED"
        "com.samsung.android.spay" -> "Samsung Pay"
        "com.csam.icici.bank.imobile" -> "iMobile Pay"
        "com.sbi.lotusintouch" -> "SBI YONO"
        "com.axis.mobile" -> "Axis Mobile"
        "com.mobikwik_new" -> "MobiKwik"
        "com.slicepay" -> "Slice"
        "in.juspay.hypersdk" -> "Jupiter"
        "com.nextbillion.groww" -> "Groww"
        else -> packageName
    }

    companion object {
        private const val ANNOUNCEMENT_THROTTLE_MS = 2000L
        @Volatile
        private var lastAnnouncementAtMs: Long = 0
    }
}
