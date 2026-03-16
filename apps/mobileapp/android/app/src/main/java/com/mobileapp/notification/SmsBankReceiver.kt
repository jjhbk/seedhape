package com.mobileapp.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsMessage

/**
 * BroadcastReceiver for incoming SMS messages.
 *
 * This is the fallback payment detection path for UPI apps whose notifications
 * are unreadable (GPay custom views, Paytm VISIBILITY_PRIVATE).
 *
 * Flow:
 *   SMS_RECEIVED → extract messages → SmsParser.parse() →
 *   BackgroundSyncNetwork.sendNotification() → same API matching pipeline
 *
 * The API matching engine will match on UTR (deduplicate) or amount+window.
 * If the UPI app notification already arrived, the UTR dedup guard prevents
 * double-counting.
 *
 * Requires: android.permission.RECEIVE_SMS
 */
class SmsBankReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "android.provider.Telephony.SMS_RECEIVED") return

        val bundle = intent.extras ?: return
        val pdus = bundle.get("pdus") as? Array<*> ?: return
        val format = bundle.getString("format") ?: "3gpp"

        // Reconstruct multi-part SMS into one body
        val messages = pdus.mapNotNull { pdu ->
            SmsMessage.createFromPdu(pdu as ByteArray, format)
        }
        if (messages.isEmpty()) return

        val sender = messages.first().originatingAddress ?: return
        val body = messages.joinToString("") { it.messageBody }

        val parsed = SmsParser.parse(sender, body) ?: return

        // Convert to ParsedPayment so we can reuse BackgroundSyncNetwork.sendNotification
        val parsedPayment = ParsedPayment(
            amountPaise = parsed.amountPaise,
            utr = parsed.utr,
            transactionNote = null,   // bank SMS never contains the UPI tn/order ID
            senderName = null,        // bank SMS contains payer's bank, not their name
        )

        BackgroundSyncNetwork.sendNotification(
            context = context,
            packageName = "sms.bank",
            title = "Bank SMS Credit",
            body = body,
            parsed = parsedPayment,
            upiApp = "Bank SMS (${parsed.senderBankCode})",
        )
    }
}
