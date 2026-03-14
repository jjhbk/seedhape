package com.mobileapp.notification

data class ParsedPayment(
    val amountPaise: Int,
    val utr: String?,
    val transactionNote: String?,
    val senderName: String?
)

/**
 * Registry of per-app notification parsers.
 *
 * Each parser extracts: amount (paise), UTR, transaction note (tn field), sender name.
 *
 * These regex patterns are based on observed notification formats — they MUST be
 * validated against real devices for each app version.
 */
object NotificationParser {

    private val parsers: Map<String, (title: String, body: String) -> ParsedPayment?> = mapOf(
        "com.phonepe.app" to ::parsePhonePe,
        "com.google.android.apps.nbu.paisa.user" to ::parseGPay,
        "net.one97.paytm" to ::parsePaytm,
        "in.org.npci.upiapp" to ::parseBhim,
        "in.amazon.mShop.android.shopping" to ::parseAmazonPay,
        "com.whatsapp" to ::parseWhatsAppPay,
        "com.dreamplug.androidapp" to ::parseCred,
    )

    fun parse(packageName: String, title: String, body: String): ParsedPayment? {
        val appSpecific = parsers[packageName]?.invoke(title, body)
        return appSpecific ?: parseGeneric(title, body)
    }

    // ─── PhonePe ─────────────────────────────────────────────────────────────
    // Example: "₹500 paid to Merchant Name"
    // Body: "UPI Ref: 123456789012 | Note: sp_ord_abc123"
    private fun parsePhonePe(title: String, body: String): ParsedPayment? {
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""").find(title) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UPI Ref|Ref No)[:\s]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)
        val note = Regex("""Note[:\s]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)
        val sender = extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    // ─── Google Pay ──────────────────────────────────────────────────────────
    // Example title: "You received ₹500"
    // Body: "From Rahul Kumar • Ref: 123456789012"
    private fun parseGPay(title: String, body: String): ParsedPayment? {
        val amountMatch = Regex("""(?:received|got)\s+₹([\d,]+(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE)
            .find(title) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:Ref|UPI Ref)[:\s#]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)
        val sender = Regex("""From\s+(.+?)(?:\s*[•·]|\s*$)""")
            .find(body)?.groupValues?.get(1)?.trim()
        val note = Regex("""(?:Note|tn)[:\s]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)

        return ParsedPayment(amount, utr, note, sender ?: extractSenderName(title, body))
    }

    // ─── Paytm ───────────────────────────────────────────────────────────────
    private fun parsePaytm(title: String, body: String): ParsedPayment? {
        val amountMatch = Regex("""₹\s*([\d,]+(?:\.\d{1,2})?)""")
            .find(title + " " + body) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UTR|Ref)[:\s]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)
        val note = Regex("""(?:Remarks|Note|tn)[:\s]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)
        val sender = extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    // ─── BHIM ────────────────────────────────────────────────────────────────
    private fun parseBhim(title: String, body: String): ParsedPayment? {
        val amountMatch = Regex("""Rs\.?\s*([\d,]+(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE)
            .find(title + " " + body) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UPI Ref|Txn ID)[:\s]+(\w{12,20})""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)
        val note = Regex("""(?:Note|Remarks)[:\s]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)

        return ParsedPayment(amount, utr, note, null)
    }

    // ─── Amazon Pay ──────────────────────────────────────────────────────────
    private fun parseAmazonPay(title: String, body: String): ParsedPayment? {
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""")
            .find(title + " " + body) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null
        val utr = Regex("""(?:Ref|Transaction ID)[:\s]+(\w{12,20})""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)

        return ParsedPayment(amount, utr, null, extractSenderName(title, body))
    }

    // ─── WhatsApp Pay ────────────────────────────────────────────────────────
    private fun parseWhatsAppPay(title: String, body: String): ParsedPayment? {
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""")
            .find(body) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        return ParsedPayment(amount, null, null, extractSenderName(title, body) ?: title.trim())
    }

    // ─── CRED ────────────────────────────────────────────────────────────────
    private fun parseCred(title: String, body: String): ParsedPayment? {
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""")
            .find(title + " " + body) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null
        val utr = Regex("""(?:Ref|UTR)[:\s]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(body)?.groupValues?.get(1)

        return ParsedPayment(amount, utr, null, extractSenderName(title, body))
    }

    // ─── Helper ──────────────────────────────────────────────────────────────
    /**
     * Generic fallback parser for changing notification templates.
     * Handles notifications that only include payer name + amount.
     */
    private fun parseGeneric(title: String, body: String): ParsedPayment? {
        val text = "$title $body"
        val amountMatch = Regex("""(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE)
            .find(text) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UPI Ref|Ref|UTR|Txn(?:\s*ID)?)[:\s#-]+([A-Za-z0-9]{8,24})""", RegexOption.IGNORE_CASE)
            .find(text)?.groupValues?.get(1)
        val note = Regex("""(?:Note|Remarks|tn)[:\s]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(text)?.groupValues?.get(1)
        val sender = extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    private fun extractSenderName(title: String, body: String): String? {
        val text = "$title | $body"
        val sources = listOf(title, body, text)
        val patterns = listOf(
            Regex("""(?:^|[\s|•·,])([\p{L}][\p{L}\p{N} ._@&-]{1,80}?)\s+has\s+(?:sent|paid)\b""", RegexOption.IGNORE_CASE),
            Regex("""(?:received\s+from|from)\s+([\p{L}][\p{L}\p{N} ._@&-]{1,80}?)(?:\s*(?:[|•·,]|via|upi|ref|txn|to\b|$))""", RegexOption.IGNORE_CASE),
            Regex("""paid\s+by\s+([\p{L}][\p{L}\p{N} ._@&-]{1,80}?)(?:\s*(?:[|•·,]|via|upi|ref|txn|$))""", RegexOption.IGNORE_CASE),
            Regex("""sender[:\s]+([\p{L}][\p{L}\p{N} ._@&-]{1,80})""", RegexOption.IGNORE_CASE),
        )

        for (source in sources) {
            for (pattern in patterns) {
                val match = pattern.find(source)
                    ?.groupValues
                    ?.getOrNull(1)
                    ?.trim()
                    ?.trim('.', ',', '|', '•', '·', '-', ':')
                if (!match.isNullOrBlank()) return match
            }
        }
        return null
    }

    // ─── Helper ──────────────────────────────────────────────────────────────
    /**
     * Parse "1,234.56" or "1234" to paise (integer).
     */
    private fun parseAmount(str: String): Int? {
        val cleaned = str.replace(",", "")
        val rupees = cleaned.toDoubleOrNull() ?: return null
        return (rupees * 100).toInt()
    }
}
