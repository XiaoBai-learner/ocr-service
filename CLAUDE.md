# ocr-service — 项目开发规范

## 项目概述

独立 OCR 微服务，为蓝象智联员工名片小程序（ws-be-app）提供名片图片识别能力。  
接收 Base64 编码的名片图片，通过 OpenAI 兼容的 LLM 视觉 API 提取结构化字段并返回。

**当前状态：已完成，稳定运行。**

## 技术栈

- 运行时：Node.js
- 框架：Express.js 4.19.2
- HTTP 客户端：Axios 1.9.0（调用 LLM API）
- 环境配置：dotenv 16.4.5
- 默认 LLM：DeepSeek（兼容任意 OpenAI 格式的视觉模型）

## 目录结构

```
ocr-service/
├── index.js          # Express 服务入口，端口 3001
├── parser.js         # LLM 视觉 API 调用与 JSON 解析
├── normalize.js      # 字段白名单过滤与数据清理
├── routes/
│   └── ocr.js        # POST /ocr/parse 路由
├── .env              # 敏感配置（不提交）
├── .env.example      # 环境变量模板
└── package.json
```

## API 说明

### GET /health
健康检查，返回 `{"status":"ok"}`。

### POST /ocr/parse
接收 Base64 图片，返回名片结构化数据。

**请求体**
```json
{
  "image": "<base64编码的图片>",
  "mime_type": "image/jpeg"
}
```

**成功响应**
```json
{
  "code": 0,
  "data": {
    "name": "张三",
    "title": "产品总监",
    "company": "深圳科技有限公司",
    "phone": "13800138000",
    "work_phone": "0755-88888888",
    "email": "zhangsan@company.com",
    "wechat": "zhangsan",
    "address": "深圳市南山区科技园"
  }
}
```

8 个字段始终存在，未识别的字段为空字符串 `""`，从不返回 `null`。

**错误码**
| code | 含义 |
|------|------|
| 400  | 缺少 image 字段 |
| 429  | 服务繁忙（单进程并发限制） |
| 500  | LLM 调用失败或 JSON 解析错误 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端口 |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` | OpenAI 兼容 API 地址（含 /v1） |
| `LLM_API_KEY` | — | LLM 服务密钥 |
| `LLM_MODEL` | `deepseek-chat` | 模型名称（需支持视觉/image_url） |

## 开发规范

- 返回格式统一：`{ code: 0, data: {} }` 成功，`{ code: 错误码, message: '描述' }` 失败
- 单进程同时只处理一个 OCR 请求（`ocrParsing` 标志），防止并发压垮 LLM API
- normalize.js 负责字段白名单强制和格式校验，输出永远是干净的 8 字段对象
- parser.js 负责处理 LLM 可能返回的 markdown 代码块包装（自动 strip）
- 错误直接抛出，不做 fallback，让问题暴露
- `.env` 不提交，敏感配置只走环境变量

## 启动方式

```bash
cp .env.example .env
# 填写 LLM_API_KEY 等配置
npm install
npm start
```

服务监听 `0.0.0.0:3001`。

## 与上游项目的关系

本服务是 `ws-be-app`（蓝象智联名片小程序后端）的独立子服务。  
小程序用户上传名片图片时，主后端调用 `POST http://localhost:3001/ocr/parse` 完成字段提取。
