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
 * After app-specific parsing, [parse] always runs a direct sp_ord_ scan over the full
 * notification text — this catches order IDs that UPI apps embed in the body without
 * a standard "Note:" prefix, and overrides the parser's transactionNote with higher
 * confidence.
 *
 * These regex patterns are based on observed notification formats — they MUST be
 * validated against real devices for each app version.
 */
object NotificationParser {

    private val parsers: Map<String, (title: String, body: String) -> ParsedPayment?> = mapOf(
        // Google Pay (personal + business)
        "com.google.android.apps.nbu.paisa.user" to ::parseGPay,
        "com.google.android.apps.pay.merchant" to ::parseGPay,
        // PhonePe
        "com.phonepe.app" to ::parsePhonePe,
        // Paytm
        "net.one97.paytm" to ::parsePaytm,
        // BHIM UPI
        "in.org.npci.upiapp" to ::parseBhim,
        // Amazon Pay
        "in.amazon.mShop.android.shopping" to ::parseAmazonPay,
        // WhatsApp Pay
        "com.whatsapp" to ::parseWhatsAppPay,
        // CRED
        "com.dreamplug.androidapp" to ::parseCred,
        // Samsung Pay
        "com.samsung.android.spay" to ::parseSamsungPay,
        // iMobile Pay (ICICI)
        "com.csam.icici.bank.imobile" to ::parseGenericBankApp,
        // SBI YONO
        "com.sbi.lotusintouch" to ::parseGenericBankApp,
        // Axis Mobile
        "com.axis.mobile" to ::parseGenericBankApp,
        // MobiKwik
        "com.mobikwik_new" to ::parseGenericBankApp,
        // Slice
        "com.slicepay" to ::parseGenericBankApp,
        // Jupiter
        "in.juspay.hypersdk" to ::parseGenericBankApp,
        // Groww
        "com.nextbillion.groww" to ::parseGenericBankApp,
    )

    /**
     * Entry point — routes to the app-specific parser then runs a direct order ID scan
     * over the full combined text. Direct order ID match wins over parser-extracted note.
     */
    fun parse(packageName: String, title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val result = parsers[packageName]?.invoke(title, body) ?: parseGeneric(title, body) ?: return null

        // Direct sp_ord_ scan: highest-confidence match.
        // Catches order IDs embedded anywhere in the notification without a "Note:" prefix.
        val directOrderId = extractOrderId(combined)
        return if (directOrderId != null) {
            result.copy(transactionNote = directOrderId)
        } else {
            result
        }
    }

    // ─── Google Pay ──────────────────────────────────────────────────────────
    // Formats observed in the wild:
    //  Title: "You received ₹500"  Body: "From Rahul Kumar • Ref: 412112345678"
    //  Title: "Google Pay"         Body: "Rahul Kumar paid ₹500.00 · Ref: 412112345678 · Note: sp_ord_abc"
    //  Title: "Payment received"   Body: "₹500.00 received from Rahul Kumar. UPI Ref: 412112345678"
    //  Title: "₹500 from Rahul"    Body: "UPI Ref No. 412112345678 tn: sp_ord_abc"
    private fun parseGPay(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"

        val amount = parseAmount(
            Regex("""(?:received|got|paid)\s+₹([\d,]+(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE).find(combined)?.groupValues?.get(1)
            ?: Regex("""₹([\d,]+(?:\.\d{1,2})?)\s+(?:received|paid|from)""", RegexOption.IGNORE_CASE).find(combined)?.groupValues?.get(1)
            ?: Regex("""₹([\d,]+(?:\.\d{1,2})?)""").find(combined)?.groupValues?.get(1)
            ?: return null
        ) ?: return null

        val utr = Regex("""(?:Ref(?:\s*No\.?)?|UPI\s*Ref|Transaction\s*ID|Txn\s*ID)[:\s.#]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)

        val note = Regex("""(?:Note|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)

        val sender = Regex("""From\s+([\p{L}][\p{L}\p{N} ._-]{1,60}?)(?:\s*[•·]|\s*$)""")
            .find(body)?.groupValues?.get(1)?.trim()
            ?: Regex("""([\p{L}][\p{L}\p{N} ._-]{1,60}?)\s+paid\b""", RegexOption.IGNORE_CASE)
                .find(combined)?.groupValues?.get(1)?.trim()
            ?: extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    // ─── PhonePe ─────────────────────────────────────────────────────────────
    // Title: "₹500 paid to Merchant Name"
    // Body:  "UPI Ref: 123456789012 | Note: sp_ord_abc123"
    private fun parsePhonePe(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""").find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UPI Ref|Ref No|Transaction ID)[:\s#]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val note = Regex("""(?:Note|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val sender = extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    // ─── Paytm ───────────────────────────────────────────────────────────────
    private fun parsePaytm(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""₹\s*([\d,]+(?:\.\d{1,2})?)""").find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UTR|Ref)[:\s]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val note = Regex("""(?:Remarks|Note|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val sender = extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    // ─── BHIM ────────────────────────────────────────────────────────────────
    // Body: "You have received Rs.500 from Rahul Kumar via UPI. UPI Ref: 123456789012"
    private fun parseBhim(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE)
            .find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UPI Ref|Txn ID|Ref No)[:\s]+(\w{12,20})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val note = Regex("""(?:Note|Remarks|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val sender = extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    // ─── Amazon Pay ──────────────────────────────────────────────────────────
    private fun parseAmazonPay(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""").find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null
        val utr = Regex("""(?:Ref|Transaction ID|UTR)[:\s]+(\w{12,20})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val note = Regex("""(?:Note|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)

        return ParsedPayment(amount, utr, note, extractSenderName(title, body))
    }

    // ─── WhatsApp Pay ────────────────────────────────────────────────────────
    private fun parseWhatsAppPay(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""").find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        return ParsedPayment(amount, null, null, extractSenderName(title, body) ?: title.trim())
    }

    // ─── CRED ────────────────────────────────────────────────────────────────
    private fun parseCred(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""₹([\d,]+(?:\.\d{1,2})?)""").find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null
        val utr = Regex("""(?:Ref|UTR)[:\s]+(\d{12,20})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val note = Regex("""(?:Note|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)

        return ParsedPayment(amount, utr, note, extractSenderName(title, body))
    }

    // ─── Samsung Pay ─────────────────────────────────────────────────────────
    private fun parseSamsungPay(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""₹\s*([\d,]+(?:\.\d{1,2})?)""").find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null
        val utr = Regex("""(?:Ref|UTR|Transaction ID)[:\s]+(\w{12,20})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val note = Regex("""(?:Note|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)

        return ParsedPayment(amount, utr, note, extractSenderName(title, body))
    }

    // ─── Generic bank UPI apps ────────────────────────────────────────────────
    // Covers iMobile, SBI YONO, Axis Mobile, MobiKwik, Slice, Jupiter, Groww, etc.
    private fun parseGenericBankApp(title: String, body: String): ParsedPayment? =
        parseGeneric(title, body)

    // ─── Generic fallback ────────────────────────────────────────────────────
    /**
     * Fallback parser for any app not explicitly registered, and for unknown notification
     * formats. Handles the most common UPI notification templates.
     */
    private fun parseGeneric(title: String, body: String): ParsedPayment? {
        val combined = "$title $body"
        val amountMatch = Regex("""(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)""", RegexOption.IGNORE_CASE)
            .find(combined) ?: return null
        val amount = parseAmount(amountMatch.groupValues[1]) ?: return null

        val utr = Regex("""(?:UPI Ref|Ref(?:\s*No\.?)?|UTR|Txn(?:\s*ID)?)[:\s.#-]+([A-Za-z0-9]{10,24})""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val note = Regex("""(?:Note|Remarks|tn)[:\s=]+(\S+)""", RegexOption.IGNORE_CASE)
            .find(combined)?.groupValues?.get(1)
        val sender = extractSenderName(title, body)

        return ParsedPayment(amount, utr, note, sender)
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Scan for a SeedhaPe order ID anywhere in the text.
     * Returns the canonical lowercase form so matching is case-insensitive.
     */
    private fun extractOrderId(text: String): String? =
        Regex("""sp_ord_[a-z0-9]+""", RegexOption.IGNORE_CASE)
            .find(text)?.value?.lowercase()

    private fun extractSenderName(title: String, body: String): String? {
        // Ordered from most-specific to most-generic to avoid greedy over-capture.
        val patterns = listOf(
            // "Rahul Kumar has sent/paid ₹500"
            Regex("""([\p{L}][\p{L}\p{N} ._-]{1,60}?)\s+has\s+(?:sent|paid)\b""", RegexOption.IGNORE_CASE),
            // "paid by Rahul Kumar"
            Regex("""paid\s+by[:\s]+([\p{L}][\p{L}\p{N} ._-]{1,60}?)(?:\s*(?:[|•·,]|via\b|upi\b|ref\b|txn\b|$))""", RegexOption.IGNORE_CASE),
            // "received ₹500 from Rahul Kumar"
            Regex("""received(?:\s+(?:₹|Rs\.?)[\d,]+(?:\.\d{1,2})?)?\s+from\s+([\p{L}][\p{L}\p{N} ._-]{1,60}?)(?:\s*(?:[|•·,]|via\b|upi\b|ref\b|txn\b|$))""", RegexOption.IGNORE_CASE),
            // "From Rahul Kumar" (Google Pay / generic)
            Regex("""(?:^|[|•·\s])From\s+([\p{L}][\p{L}\p{N} ._-]{1,60}?)(?:\s*(?:[|•·,]|via\b|upi\b|ref\b|txn\b|$))""", RegexOption.IGNORE_CASE),
            // "Sender: Rahul Kumar"
            Regex("""sender[:\s]+([\p{L}][\p{L}\p{N} ._-]{1,60})""", RegexOption.IGNORE_CASE),
        )

        // Check body first (more detailed), then title
        for (source in listOf(body, title)) {
            for (pattern in patterns) {
                val match = pattern.find(source)
                    ?.groupValues
                    ?.getOrNull(1)
                    ?.trim()
                    ?.trimEnd('.', ',', '|', '•', '·', '-', ':')
                    ?.trim()
                if (!match.isNullOrBlank() && match.length >= 2) return match
            }
        }
        return null
    }

    /**
     * Parse "1,234.56" or "1234" to paise (integer).
     */
    private fun parseAmount(str: String): Int? {
        val cleaned = str.replace(",", "")
        val rupees = cleaned.toDoubleOrNull() ?: return null
        return (rupees * 100).toInt()
    }
}
