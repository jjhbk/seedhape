package com.mobileapp.notification

import android.content.Context

private const val PREFS_NAME = "seedhape_bg_sync"
private const val KEY_API_URL = "api_url"
private const val KEY_DEVICE_ID = "device_id"
private const val KEY_MERCHANT_ID = "merchant_id"
private const val KEY_LAST_TX_COUNT = "last_tx_count"
private const val KEY_LAST_DISPUTE_COUNT = "last_dispute_count"

object BackgroundSyncPrefs {
    fun saveConfig(context: Context, apiUrl: String, deviceId: String, merchantId: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_API_URL, apiUrl.trimEnd('/'))
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_MERCHANT_ID, merchantId)
            .apply()
    }

    fun clearConfig(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply()
    }

    fun getApiUrl(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_API_URL, null)

    fun getDeviceId(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_DEVICE_ID, null)

    fun getMerchantId(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString(KEY_MERCHANT_ID, null)

    fun getLastTxCount(context: Context): Int =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getInt(KEY_LAST_TX_COUNT, -1)

    fun getLastDisputeCount(context: Context): Int =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getInt(KEY_LAST_DISPUTE_COUNT, -1)

    fun saveLastCounts(context: Context, txCount: Int, disputeCount: Int) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_LAST_TX_COUNT, txCount)
            .putInt(KEY_LAST_DISPUTE_COUNT, disputeCount)
            .apply()
    }
}
