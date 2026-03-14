package com.mobileapp.notification

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object BackgroundSyncNetwork {
    data class AlertSnapshot(
        val totalTransactions: Int,
        val totalDisputedOrders: Int
    )

    fun sendHeartbeat(context: Context) {
        val apiUrl = BackgroundSyncPrefs.getApiUrl(context) ?: return
        val deviceId = BackgroundSyncPrefs.getDeviceId(context) ?: return
        val merchantId = BackgroundSyncPrefs.getMerchantId(context) ?: return

        val payload = JSONObject().apply {
            put("deviceId", deviceId)
        }

        postJson(
            url = "$apiUrl/internal/heartbeat",
            payload = payload,
            headers = mapOf(
                "X-Device-Id" to deviceId,
                "X-Merchant-Id" to merchantId
            )
        )
    }

    fun fetchAlertSnapshot(context: Context): AlertSnapshot? {
        val apiUrl = BackgroundSyncPrefs.getApiUrl(context) ?: return null
        val deviceId = BackgroundSyncPrefs.getDeviceId(context) ?: return null
        val merchantId = BackgroundSyncPrefs.getMerchantId(context) ?: return null

        return try {
            val conn = (URL("$apiUrl/internal/device/alerts").openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 10_000
                readTimeout = 10_000
                setRequestProperty("X-Device-Id", deviceId)
                setRequestProperty("X-Merchant-Id", merchantId)
            }

            if (conn.responseCode !in 200..299) {
                conn.disconnect()
                return null
            }

            val body = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
            conn.disconnect()
            val json = JSONObject(body)
            AlertSnapshot(
                totalTransactions = json.optInt("totalTransactions", 0),
                totalDisputedOrders = json.optInt("totalDisputedOrders", 0)
            )
        } catch (_: Exception) {
            null
        }
    }

    fun sendNotification(context: Context, packageName: String, title: String, body: String, parsed: ParsedPayment, upiApp: String) {
        val apiUrl = BackgroundSyncPrefs.getApiUrl(context) ?: return
        val deviceId = BackgroundSyncPrefs.getDeviceId(context) ?: return
        val merchantId = BackgroundSyncPrefs.getMerchantId(context) ?: return

        val item = JSONObject().apply {
            put("packageName", packageName)
            put("title", title)
            put("body", body)
            put("amount", parsed.amountPaise)
            parsed.utr?.let { put("utr", it) }
            parsed.transactionNote?.let { put("transactionNote", it) }
            parsed.senderName?.let { put("senderName", it) }
            put("upiApp", upiApp)
            put("receivedAt", java.time.Instant.now().toString())
            put("rawTitle", title)
            put("rawBody", body)
        }

        val payload = JSONObject().apply {
            put("notifications", JSONArray().put(item))
        }

        postJson(
            url = "$apiUrl/internal/notifications",
            payload = payload,
            headers = mapOf(
                "X-Device-Id" to deviceId,
                "X-Merchant-Id" to merchantId
            )
        )
    }

    private fun postJson(url: String, payload: JSONObject, headers: Map<String, String>) {
        Thread {
            try {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 10_000
                    readTimeout = 10_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    headers.forEach { (k, v) -> setRequestProperty(k, v) }
                }
                OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
                conn.responseCode
                conn.disconnect()
            } catch (_: Exception) {
                // Keep background sync best-effort; failures are retried on next heartbeat/notification.
            }
        }.start()
    }
}
