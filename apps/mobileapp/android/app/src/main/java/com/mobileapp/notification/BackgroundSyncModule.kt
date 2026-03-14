package com.mobileapp.notification

import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import androidx.core.app.NotificationManagerCompat

class BackgroundSyncModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "BackgroundSync"

    @ReactMethod
    fun configureAndStart(apiUrl: String, deviceId: String, merchantId: String, promise: Promise) {
        try {
            BackgroundSyncPrefs.saveConfig(reactContext, apiUrl, deviceId, merchantId)
            SeedhaPeHeartbeatService.start(reactContext)
            BackgroundSyncNetwork.sendHeartbeat(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BG_SYNC_START_FAILED", e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            SeedhaPeHeartbeatService.stop(reactContext)
            BackgroundSyncPrefs.clearConfig(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BG_SYNC_STOP_FAILED", e)
        }
    }

    @ReactMethod
    fun isConfigured(promise: Promise) {
        promise.resolve(
            BackgroundSyncPrefs.getApiUrl(reactContext) != null &&
                BackgroundSyncPrefs.getDeviceId(reactContext) != null &&
                BackgroundSyncPrefs.getMerchantId(reactContext) != null
        )
    }

    @ReactMethod
    fun startIfConfigured(promise: Promise) {
        try {
            val configured =
                BackgroundSyncPrefs.getApiUrl(reactContext) != null &&
                    BackgroundSyncPrefs.getDeviceId(reactContext) != null &&
                    BackgroundSyncPrefs.getMerchantId(reactContext) != null

            if (configured) {
                SeedhaPeHeartbeatService.start(reactContext)
                BackgroundSyncNetwork.sendHeartbeat(reactContext)
            }
            promise.resolve(configured)
        } catch (e: Exception) {
            promise.reject("BG_SYNC_START_IF_CONFIGURED_FAILED", e)
        }
    }

    @ReactMethod
    fun isForegroundNotificationEnabled(promise: Promise) {
        promise.resolve(NotificationManagerCompat.from(reactContext).areNotificationsEnabled())
    }

    @ReactMethod
    fun openAppNotificationSettings() {
        val intent = Intent().apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
            } else {
                action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                data = android.net.Uri.parse("package:${reactContext.packageName}")
            }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
    }
}
