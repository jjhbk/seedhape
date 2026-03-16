package com.mobileapp.notification

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native bridge module for notification listener access.
 * Manages the NotificationListenerService lifecycle and forwards events to JS.
 */
class NotificationListenerModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NotificationListener"

    companion object {
        var instance: NotificationListenerModule? = null
        private const val SMS_PERMISSION_REQUEST_CODE = 1001
    }

    init {
        instance = this
    }

    @ReactMethod
    fun isNotificationAccessGranted(promise: Promise) {
        val enabledListeners = Settings.Secure.getString(
            reactContext.contentResolver,
            "enabled_notification_listeners"
        )
        val componentName = ComponentName(reactContext, SeedhaPeNotificationService::class.java)
        promise.resolve(enabledListeners?.contains(componentName.flattenToString()) == true)
    }

    @ReactMethod
    fun requestNotificationAccess() {
        val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
    }

    /**
     * Called by SeedhaPeNotificationService when a UPI notification is parsed.
     */
    fun emitNotification(data: com.facebook.react.bridge.WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("UPINotification", data)
    }

    @ReactMethod
    fun isSmsPermissionGranted(promise: Promise) {
        val granted = ContextCompat.checkSelfPermission(
            reactContext, Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestSmsPermission() {
        val activity = reactContext.currentActivity ?: return
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS),
            SMS_PERMISSION_REQUEST_CODE,
        )
    }

    @ReactMethod
    fun addListener(eventName: String) {} // Required for RN native event emitter

    @ReactMethod
    fun removeListeners(count: Int) {} // Required for RN native event emitter
}
