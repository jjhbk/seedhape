package com.mobileapp.notification

/**
 * Parses bank credit SMS messages sent by Indian banks after a UPI payment.
 *
 * This is the fallback path for UPI apps (GPay, Paytm) that use custom notification
 * views or VISIBILITY_PRIVATE, making their notifications unreadable by
 * NotificationListenerService.
 *
 * When a customer pays via any UPI app, the recipient's bank ALWAYS sends an SMS
 * crediting the amount. That SMS is consistent, parseable, and comes from a
 * known alphanumeric sender (SBIINB, HDFCBK, etc.).
 *
 * Formats covered:
 *   SBI:      INR 500.00 credited to your a/c XX1234 on 16-03-26 by UPI ref 412112345678. -SBI
 *   HDFC:     Rs.500.00 credited to your HDFC Bank A/C XXXXXX1234 on 16/03/26 by transfer
 *             from VPA abc@ybl (UPI Ref No 412112345678).
 *   ICICI:    INR 500.00 credited to ICICI Bank Account XX1234. Info: UPI/412112345678/...
 *   Axis:     Rs.500.00 credited to your Axis Bank Account XX1234 by UPI. UPI Ref: 412112345678
 *   Kotak:    Rs.500.00 credited in your Kotak Bank ac XXXX1234. UPI Ref No. 412112345678
 *   Yes Bank: INR 500.00 credited to a/c XXXXXXXX1234 by IMPS/UPI. Ref no: 412112345678
 *   IndusInd: INR 500.00 has been credited to a/c XX1234 via UPI. Ref no.: 412112345678
 *   PNB:      INR 500.00 credited to your account XX1234 through UPI. UPI Ref: 412112345678
 *   BoB:      INR 500.00 credited in your account XX1234 on 16/03/26 by UPI 412112345678
 *   Federal:  Rs.500.00 has been credited to your Federal Bank a/c. UPI Ref: 412112345678
 *   Canara:   INR 500.00 credited to your Canara Bank a/c XX1234 via UPI. Ref: 412112345678
 *   RBL:      INR 500.00 credited to your RBL Bank a/c via UPI. UPI ref: 412112345678
 */
object SmsParser {

    /**
     * Known bank SMS sender IDs (alphanumeric short codes).
     * Only SMS from these senders are processed to prevent false positives.
     */
    private val bankSenders = setOf(
        // SBI
        "SBIINB", "SBIUPI", "SBIPSG", "SBMSME",
        // HDFC
        "HDFCBK", "HDFCBN", "HDFCBANKUPI",
        // ICICI
        "ICICIB", "ICICIN", "ICICIBANK",
        // Axis
        "AXISBK", "AXISBN",
        // Kotak
        "KOTAKB", "KOTAKBANK",
        // Yes Bank
        "YESBNK", "YESBANKUPI",
        // IndusInd
        "INDUSB", "INDUSINDBK",
        // PNB
        "PNBSMS", "PNBBANK",
        // Bank of Baroda
        "BOBIMT", "BOBSMS",
        // Canara Bank
        "CANBKL", "CANARABNK",
        // Federal Bank
        "FEDBK", "FEDBNK",
        // RBL Bank
        "RBLBNK", "RBLBANK",
        // IDFC First
        "IDFCFB", "IDFCBK",
        // AU Small Finance
        "AUBANK",
        // UCO Bank
        "UCOSMS",
        // Union Bank
        "UBISMS",
        // Bank of India
        "BOISMS", "BOISMS",
        // Central Bank
        "CBIUPI",
        // Indian Bank
        "INDBNK",
        // Karnataka Bank
        "KTKBNK",
        // South Indian Bank
        "SIBSMS",
        // Jammu & Kashmir Bank
        "JKBANK",
    )

    data class ParsedSmsCreditPayment(
        val amountPaise: Int,
        val utr: String?,
        val senderBankCode: String,
    )

    /**
     * Returns a parsed credit if the SMS is a UPI credit from a known bank, null otherwise.
     *
     * @param sender The originating address (e.g. "SBIINB", "HDFCBK")
     * @param body   The SMS body text
     */
    fun parse(sender: String, body: String): ParsedSmsCreditPayment? {
        val normalizedSender = sender.uppercase().trimStart('+')

        // Only process SMS from known bank sender codes
        if (bankSenders.none { normalizedSender.contains(it) }) return null

        val lower = body.lowercase()

        // Must mention a credit event and UPI
        if (!lower.contains("credit")) return null
        if (!lower.contains("upi") && !lower.contains("imps")) return null

        val amount = parseAmount(body) ?: return null
        val utr = parseUtr(body)

        return ParsedSmsCreditPayment(amount, utr, normalizedSender)
    }

    // ─── Amount ──────────────────────────────────────────────────────────────

    private fun parseAmount(body: String): Int? {
        // Matches: INR 500.00 / Rs.500 / Rs 500.00 / INR500.00
        val pattern = Regex(
            """(?:INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)""",
            RegexOption.IGNORE_CASE
        )
        // Take the first match that appears before the word "credited" or "debited"
        for (match in pattern.findAll(body)) {
            val rawAmount = match.groupValues[1].replace(",", "")
            val rupees = rawAmount.toDoubleOrNull() ?: continue
            if (rupees <= 0) continue
            return (rupees * 100).toInt()
        }
        return null
    }

    // ─── UTR ─────────────────────────────────────────────────────────────────

    private fun parseUtr(body: String): String? {
        // UPI reference numbers are 12 digits in India (some banks show up to 15)
        val patterns = listOf(
            // "UPI Ref No 412112345678" / "UPI Ref: 412112345678"
            Regex("""UPI\s*Ref(?:\s*No\.?)?[:\s#/]+(\d{12,15})""", RegexOption.IGNORE_CASE),
            // "Ref no: 412112345678" / "Ref no.: 412112345678"
            Regex("""Ref(?:\s*no\.?)[:\s]+(\d{12,15})""", RegexOption.IGNORE_CASE),
            // "UPI/412112345678/..." (ICICI format)
            Regex("""UPI/(\d{12,15})/""", RegexOption.IGNORE_CASE),
            // "ref 412112345678" (SBI generic)
            Regex("""(?:ref|upi)[:\s]+(\d{12,15})""", RegexOption.IGNORE_CASE),
            // Any 12-digit standalone number as last resort
            Regex("""\b(\d{12})\b"""),
        )
        for (pattern in patterns) {
            val match = pattern.find(body)?.groupValues?.get(1)
            if (!match.isNullOrBlank()) return match
        }
        return null
    }
}
