# 後端串接說明

所有範例中的會員、毛孩與商品 ID 必須用 API 實際返回的值替換，不可沿用展示用 pet-mochi。

## 環境設定

- `DATABASE_URL`：PostgreSQL 16 連線。
- `APP_ORIGIN`：精確站點 origin，例如 `http://localhost:3000`。
- `SESSION_SECRET`：至少 32 字元密鑰，可用 `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` 在自己的環境建立。
- 正式環境另設定 `UPSTASH_REDIS_REST_URL` 與 `UPSTASH_REDIS_REST_TOKEN`；密鑰只能留在伺服器環境。

## 註冊

```json
{
  "action": "register",
  "email": "owner@example.com",
  "password": "請替換為自己的高強度密碼",
  "name": "毛孩家人"
}
```

POST `/api/auth`，密碼最短 12、最長 128 字元。成功後由 HTTP-only Cookie 保存登入。登入改為 `action: "login"`。

## 建立毛孩

POST `/api/pets`，須帶登入 Cookie：

```json
{
  "name": "麻糬",
  "type": "CAT",
  "breed": "英國短毛貓",
  "weightKg": 4.5,
  "ageMonths": 28,
  "isNeutered": true,
  "activityLevel": "MODERATE",
  "allergies": ["雞肉"],
  "goal": "MAINTAIN"
}
```

正式資料以生日儲存，月齡輸入會推估生日；正式會員編輯器接通後應改為讓使用者直接選擇生日。PATCH 須附該毛孩真實 `id` 與最新 `updatedAt`。

## 建立訂單草稿

POST `/api/orders`：

```json
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "variantId": "salmon-cat",
      "petId": "請填入該會員建立的毛孩 UUID",
      "quantity": 1,
      "intervalDays": 28
    }
  ],
  "shippingAddress": {
    "name": "收件人",
    "phone": "0912345678",
    "postalCode": "300",
    "address": "請填入完整收件地址"
  }
}
```

每筆新請求使用新的 UUID；同一筆失敗重送保留原 UUID 與相同內容。相同 key 不同內容回傳 409。單次購買使用 `intervalDays: null`。例示的 petId 不是有效 UUID，須替換為真實回傳值後才能通過驗證。

伺服器從資料庫重新取得商品價格、折扣、庫存與毛孩狀態，拒絕客戶端傳入價格。回傳 `paymentAvailable: false` 並建立 `PENDING_PAYMENT` 草稿，有效期限 30 分鐘；沒有扣庫存、不代表可付款或已成交。

## 正式支付需要補齊的交易邊界

1. 供應商 adapter 確認可用後，以 Redis 原子保留或 PostgreSQL 條件更新保留庫存，必須有唯一保留鍵與到期釋放。
2. 建立支付要求並保留供應商 reference；金額、幣別與訂單 ID 均採伺服器資料。
3. 驗證回呼簽章、時間與事件冪等性，於單一交易中轉為 PAID、確認扣庫存並寫入 outbox。
4. 金流成功後才可建立 ACTIVE 循環方案，保存 token，不保存信用卡卡號。
5. 排程消費 outbox，發送通知與物流要求；使用相同 dedupe key，避免重複副作用。

目前沒有偽造上述金流或物流 adapter。測試階段可保留示範前端，正式接入必須將 UI 資料來源與會員 API 串接。
