package com.example.enterprise

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Persists only user-approved binding metadata. Never store long-lived credentials
 * unless the server can revoke and rotate them.
 */
class BindingStore(context: Context) {
    private val preferences = EncryptedSharedPreferences.create(
        context,
        PREFERENCES_FILE,
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun saveBinding(deviceId: String, endpoint: String) {
        require(deviceId.isNotBlank()) { "deviceId must not be blank" }
        require(endpoint.startsWith("wss://")) { "Only secure WebSocket endpoints are allowed" }

        preferences.edit()
            .putString(KEY_DEVICE_ID, deviceId)
            .putString(KEY_ENDPOINT, endpoint)
            .apply()
    }

    fun getBinding(): Binding? {
        val deviceId = preferences.getString(KEY_DEVICE_ID, null) ?: return null
        val endpoint = preferences.getString(KEY_ENDPOINT, null) ?: return null
        return Binding(deviceId, endpoint)
    }

    fun clearBinding() {
        preferences.edit().clear().apply()
    }

    data class Binding(val deviceId: String, val endpoint: String)

    private companion object {
        const val PREFERENCES_FILE = "encrypted_binding"
        const val KEY_DEVICE_ID = "device_id"
        const val KEY_ENDPOINT = "websocket_endpoint"
    }
}
