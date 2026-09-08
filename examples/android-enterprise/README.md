# Android 企业设备管理示例

本示例包含两个彼此独立、可复制到 Android 应用模块的模板：

- `WebSocketForegroundService`：用户启动的前台服务。它在显示常驻通知时通过 OkHttp 连接 WebSocket，并将用户明确提供的绑定信息保存到加密偏好设置中。
- `EnterpriseDeviceAdminReceiver`：企业设备管理器的基础生命周期模板，只处理管理员启用与禁用回调。

## 使用边界

服务不会执行来自 WebSocket 的远程命令，也不应在没有用户清晰同意的情况下启动。将 `wss://example.invalid/device-events` 改为由组织控制的 WSS 地址，并在连接前完成用户或企业身份认证。

`DeviceAdminReceiver` 的 `onEnabled` 和 `onDisabled` 只能反映用户对设备管理员的操作；它不能阻止用户卸载应用。若组织确实需要限制企业自有设备上的卸载，应使用 Android Enterprise 的 fully managed / device-owner 部署流程及组织政策，并取得设备所有者与员工的适当授权。

## 集成

1. 将 `app/src/main` 下的文件复制到应用模块相应位置，并将 `com.example.enterprise` 改为实际包名。
2. 在模块依赖中加入 OkHttp、AndroidX Security Crypto 和 AndroidX Core KTX（版本由宿主项目的版本目录或依赖管理统一控制）：

   ```kotlin
   implementation("com.squareup.okhttp3:okhttp:<version>")
   implementation("androidx.security:security-crypto:<version>")
   implementation("androidx.core:core-ktx:<version>")
   ```

3. 从用户可见的界面启动服务（Android 8+）：

   ```kotlin
   ContextCompat.startForegroundService(
       context,
       Intent(context, WebSocketForegroundService::class.java),
   )
   ```

4. 仅在企业注册流程中，通过 `DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN` 请求激活 `EnterpriseDeviceAdminReceiver`。不要将此请求伪装为普通应用功能。

该示例假定应用的 `minSdk` 至少为 23，因为 `EncryptedSharedPreferences` 要求 Android 6.0 或更高版本。
