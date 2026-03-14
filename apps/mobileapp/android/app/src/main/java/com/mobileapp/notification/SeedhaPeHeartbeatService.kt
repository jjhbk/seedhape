package com.mobileapp.notification

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import com.mobileapp.MainActivity

class SeedhaPeHeartbeatService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private val heartbeatTask = object : Runnable {
        override fun run() {
            BackgroundSyncNetwork.sendHeartbeat(this@SeedhaPeHeartbeatService)
            updateAlertsAndNotification()
            handler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Monitoring UPI notifications and keeping merchant online"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        handler.removeCallbacks(heartbeatTask)
        handler.post(heartbeatTask)
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(heartbeatTask)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(contentText: String): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("seedhape is active")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            "seedhape background sync",
            NotificationManager.IMPORTANCE_LOW
        )
        manager.createNotificationChannel(channel)

        val alertsChannel = NotificationChannel(
            ALERTS_CHANNEL_ID,
            "seedhape activity alerts",
            NotificationManager.IMPORTANCE_DEFAULT
        )
        manager.createNotificationChannel(alertsChannel)
    }

    private fun updateAlertsAndNotification() {
        val snapshot = BackgroundSyncNetwork.fetchAlertSnapshot(this) ?: return
        val previousTx = BackgroundSyncPrefs.getLastTxCount(this)
        val previousDisputes = BackgroundSyncPrefs.getLastDisputeCount(this)

        val hasPrev = previousTx >= 0 && previousDisputes >= 0
        val newTx = if (hasPrev) (snapshot.totalTransactions - previousTx).coerceAtLeast(0) else 0
        val newDisputes = if (hasPrev) (snapshot.totalDisputedOrders - previousDisputes).coerceAtLeast(0) else 0

        val text =
            if (newTx > 0 || newDisputes > 0) {
                "New activity: +$newTx transactions, +$newDisputes disputes"
            } else {
                "Live: ${snapshot.totalTransactions} transactions, ${snapshot.totalDisputedOrders} disputes"
            }

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildNotification(text))

        if (newTx > 0 || newDisputes > 0) {
            manager.notify(ALERT_NOTIFICATION_ID, buildAlertNotification(newTx, newDisputes))
        }

        BackgroundSyncPrefs.saveLastCounts(
            context = this,
            txCount = snapshot.totalTransactions,
            disputeCount = snapshot.totalDisputedOrders
        )
    }

    private fun buildAlertNotification(newTx: Int, newDisputes: Int): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            1,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, ALERTS_CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("seedhape updates")
            .setContentText("+$newTx transactions, +$newDisputes disputes")
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "seedhape_heartbeat_channel"
        private const val ALERTS_CHANNEL_ID = "seedhape_alerts_channel"
        private const val NOTIFICATION_ID = 3811
        private const val ALERT_NOTIFICATION_ID = 3812
        private const val HEARTBEAT_INTERVAL_MS = 50_000L

        fun start(context: Context) {
            val intent = Intent(context, SeedhaPeHeartbeatService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, SeedhaPeHeartbeatService::class.java))
        }
    }
}
