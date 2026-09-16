# device-server

设备端数据同步与指令调度后台，基于 **Express + Socket.io**，数据库层兼容 **MongoDB**，未配置时自动降级为内存存储 (`MemoryDB`)。

## 启动

```sh
cd src/device-server
npm install
npm start
```

默认监听端口 `3000`（可用 `PORT` 环境变量覆盖）。

## 数据库

- 设置 `MONGO_URI` 时连接 MongoDB（数据库名 `device_mgmt`）。
- 未设置 `MONGO_URI` 时使用内存存储 `MemoryDB`，进程重启后数据清空。

## Socket.io 事件

设备连接时需在握手 query 中携带 `id`（设备 ID）：

```js
io('http://localhost:3000', { query: { id: 'device-001' } });
```

| 方向 | 事件 | 说明 |
| --- | --- | --- |
| 设备 → 服务端 | `device_data` | 上报数据（定位、状态等），服务端持久化并回 `device_data_ack` |
| 服务端 → 设备 | `command` | 下发控制指令 |

## REST API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查与在线设备数 |
| GET | `/devices` | 查询在线设备列表及已知设备 |
| POST | `/devices/:id/command` | 向指定在线设备下发指令（JSON body 即指令内容） |
