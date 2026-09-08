package com.example.enterprise

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

/**
 * Basic enterprise device-admin lifecycle callbacks.
 *
 * This receiver does not attempt to prevent uninstalling or deactivate itself.
 * Apply policies only after the organization has enrolled an authorized device.
 */
class EnterpriseDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        Toast.makeText(context, R.string.device_admin_enabled, Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Toast.makeText(context, R.string.device_admin_disabled, Toast.LENGTH_SHORT).show()
    }
}
