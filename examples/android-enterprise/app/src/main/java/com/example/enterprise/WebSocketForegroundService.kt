package com.example.enterprise

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

/**
 * An explicitly started, user-visible service for receiving non-sensitive device events.
 * It does not interpret WebSocket content as executable commands.
 */
class WebSocketForegroundService : Service() {
    private val bindingStore by lazy { BindingStore(applicationContext) }
    private val client by lazy {
        OkHttpClient.Builder()
            .pingInterval(30, TimeUnit.SECONDS)
            .build()
    }

    private var webSocket: WebSocket? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf(startId)
            return START_NOT_STICKY
        }

        createNotificationChannel()
        startForeground(NOTIFICATION_ID, foregroundNotification("正在连接安全事件通道"))

        val binding = bindingStore.getBinding()
        if (binding == null) {
            stopSelf(startId)
            return START_NOT_STICKY
        }

        connect(binding)
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        webSocket?.close(NORMAL_CLOSURE, "Service stopped by user or system")
        client.dispatcher.executorService.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun connect(binding: BindingStore.Binding) {
        val request = Request.Builder()
            .url(binding.endpoint)
            // Authenticate with short-lived, revocable credentials supplied by your sign-in flow.
            .header("X-Device-Id", binding.deviceId)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                updateNotification("已连接到安全事件通道")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                // Parse only an allow-listed, authenticated event schema here.
                // Do not execute arbitrary content received from the network.
                updateNotification("已收到企业事件")
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                updateNotification("连接中断；请从应用界面重试")
                stopSelf()
            }
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "企业事件连接",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "显示企业事件服务正在运行"
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun foregroundNotification(content: String): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("企业事件服务正在运行")
            .setContentText(content)
            .setOngoing(true)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "停止",
                PendingIntent.getService(
                    this,
                    0,
                    Intent(this, WebSocketForegroundService::class.java).setAction(ACTION_STOP),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                ),
            )
            .build()

    private fun updateNotification(content: String) {
        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID, foregroundNotification(content))
    }

    private companion object {
        const val ACTION_STOP = "com.example.enterprise.action.STOP_WEBSOCKET_SERVICE"
        const val CHANNEL_ID = "enterprise_websocket"
        const val NOTIFICATION_ID = 1001
        const val NORMAL_CLOSURE = 1000
    }
}
