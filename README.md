# PURESPOT 次世代寵物電商核心實作

這份專案交付五大指定模組與完整可操作的展示購物流程，使用真實 Next.js App Router、React 19、TypeScript 嚴格模式、Tailwind CSS v4、Shadcn 風格的 Radix 元件、Framer Motion、Zustand Persist 與 TradingView Lightweight Charts 5。

**目前定位：可執行的五大核心前端、可編輯的商品／品牌內容，以及商務示範流程。這不是已串接金流、物流與通知的正式營運商城。** 公開商品列表與商品詳情會讀取 Prisma 商品資料；會員、家庭、購物車與示範結帳仍包含瀏覽器本機狀態。

## 立即啟動

需求：Node.js 22 以上與 npm。

```bash
npm ci
cp .env.example .env
npm run dev
```

Windows PowerShell 複製設定檔請使用：

```powershell
Copy-Item .env.example .env
```

開啟 `http://localhost:3000`。展示模式不需要 PostgreSQL。沒有設定 `NEXT_PUBLIC_DEMO_MODE` 時仍以展示模式運作；設定為 `false` 會停用示範結帳，**不會自動啟用正式金流或將本機資料轉成雲端會員資料**。

### 後台管理登入

後台入口為 `http://localhost:3000/admin-login`。所有 `/admin` 頁面及 `/api/admin/*` 管理資料都需要獨立管理員工作階段；一般會員登入無法存取後台。

請在未提交版本控制的 `.env` 設定：

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=<scrypt salt:hash>
ADMIN_SESSION_SECRET=<至少 32 字元的隨機字串>
```

管理員工作階段採 HTTP-only、SameSite Strict Cookie，8 小時後失效。正式環境使用 Upstash Redis 限流；未設定時由既有 PostgreSQL 保存跨執行個體的限流計數。

後台將功能分為工作台、網站／商品與交易／顧客三組。`/admin/content` 可按首頁、特色、社群、商城與全站訊息編輯文案及形象圖；`/admin/media` 可管理 JPG、PNG、WebP 圖片；`/admin/products` 可編輯商品基本資料、相簿、營養／過敏原、價格、庫存與上架狀態。公開商城支援物種、關鍵字、庫存與價格排序。商品資料需有可用的 PostgreSQL 連線才可持久化。

**部署注意：** 本機未設定 Blob 時，網站文案儲存在 `data/site-content.json`、上傳圖片儲存在 `public/uploads/`；Vercel 正式站使用 Blob 保存文案與圖片，商品資料由 PostgreSQL 讀取。商城預設有 6 個分類、每類 5 款展示商品；執行 `npm run db:seed` 只會補上缺少的展示商品，不覆蓋後台已修改的商品。批次報告仍為示範資料，請勿將展示樣本當作真實檢驗證明。

正式建置檢查：

```bash
npm run typecheck
npm test
npm run build
npm start
```

## 指定檔案

| 模組     | 路徑                                                     | 實作行為                                                                               |
| -------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 毛孩狀態 | `src/store/usePetContextStore.ts`                        | 單一 activePetId、犬貓、體重、月齡、活動量、結紮、過敏原；Persist 驗證與延後 hydration |
| 導覽列   | `src/components/layout/Navbar.tsx`                       | 毛孩下拉切換、動態購物袋件數、促銷條、手機導覽                                         |
| 配糧公式 | `src/lib/nutritionCalculator.ts`                         | RER / DER、每日克數、30 日消耗包數、日均消耗成本、9 折、週期與安全包數                 |
| 配糧視窗 | `src/components/calculator/NutritionCalculatorModal.tsx` | 體重滑桿即時回寫毛孩資料；可選 2 / 4 / 6 / 8 週並直接加入循環購物袋                    |
| 檢驗走勢 | `src/components/analytics/NutritionalTrendChart.tsx`     | 粗蛋白、水份、灰分切換；每項獨立基準；批次表；ResizeObserver 與完整清理                |
| 社群抽屜 | `src/components/community/UgcFeedModal.tsx`              | 照片／影片 discriminated union，影片字幕與播放控制、卸載暫停；側邊商品原地加車         |

## 操作驗收路徑

1. 首頁點右上「正在為麻糬」，切換芒果。適配排序、營養提案、過敏提示立即更新，重新整理仍保留。
2. 以麻糬開啟「調整我的配糧計畫」。調整體重、活動量或結紮狀態，確認克數、包數、日均花費連動。
3. 選配送週期，點「依此週期設定自動循環補貨」。購物袋會保留毛孩、數量與週期，計入折扣及運費。
4. 勾選示範說明，建立示範訂單。進入循環補貨頁面，可順延 7 天、暫停或恢復；所有動作不會真實扣款、出貨或發送訊息。
5. 開啟商品詳情，切換粗蛋白／水份／灰分，檢查基準線和可讀取批次表。
6. 從毛孩日常點選卡片，抽屜內加入同款，網址保持不變。Esc 關閉後焦點返回原卡片。
7. 編輯毛孩過敏原後，重新檢查購物袋；不再適配的商品會阻止結帳。

## 配糧計算的定義

- `RER = 70 × 體重公斤^0.75`。
- `DER = RER × 生命階段／活動係數`；活動、結紮與生命階段採明確分支，不重複相乘。
- 幼犬未滿 4 個月採 3；4–11 個月採 2；幼貓採 2.5。此處修正規劃書以單一 2.8 代表所有幼犬的簡化。
- 已結紮一般成犬採 1.6、成貓採 1.2。其餘少動、活潑與減重係數集中於純函數，可依專業審查調整。
- 成長期自動減重輸入直接拒絕；本介面不提供疾病、孕哺或工作犬專門處方。
- 計算保留浮點精度，只有顯示與整數新臺幣售價取整數。
- 月消耗包數是 `每日克數 × 30 / 每包克數`，可為小數；**不等於每月實際扣款包數**。
- 日均花費是吃掉的食物成本，不含運費。每期購買總額則由整數包數、9 折單價及購物袋運費另算。
- 單包覆蓋天數足夠時，從 14 / 28 / 42 / 56 天中選擇不晚於耗盡前 3 天的最大週期；不足 14 天時，增加每期包數。
- 每期包數 = `ceil((週期天數 + 3) / 單包可吃天數)`。這是保守安全策略，整數包裝與週期限制可能累積餘量，因此介面提供順延。尚未以智慧秤即時追蹤剩餘庫存。
- 全循環購物袋滿 NT$699 免運；單次或混合購物袋滿 NT$999 免運；未達門檻運費 NT$80。後者為本次明確採用的展示商業設定。

參考：

- [Merck Veterinary Manual：RER 計算](https://www.merckvetmanual.com/multimedia/clinical-calculator/calories-calculator)
- [Merck Veterinary Manual：犬貓維持能量係數](https://www.merckvetmanual.com/multimedia/table/daily-maintenance-energy-requirements-for-dogs-and-cats)
- [TradingView：第 5 版圖表 API](https://tradingview.github.io/lightweight-charts/docs)

上述公式是健康毛孩的起始估算，實際仍需依體重、體態與專業評估調整。示範配方與係數不構成醫療適用保證。

## PostgreSQL 與 Prisma

規劃書只列出部分資料模型，本實作補齊了 Category、ProductVariant、Order、OrderItem、AutoshipItem、Review、Session、WeightRecord 與 OutboxEvent，並保留多毛孩訂單關聯與付款 token 欄位。金額用整數新臺幣保存，循環折扣用 Decimal 運算。

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
```

- `.env.example` 提供本機 PostgreSQL 連線；正式憑證不可提交。
- `prisma/migrations/202610020001_init/migration.sql` 是可部署的初始 migration，包含庫存、金額、數量與週期的 CHECK 約束。
- 重跑 seed 不會重設庫存或售價。
- `prisma/vector-extension.sql` 提供可選 pgvector 擴充初始化；目前推薦為可解釋規則比對，尚未串接 embedding 模型。
- 初始化不建立預設管理員或內建密碼。

## 後端 API

| 方法與路徑             | 行為與防護                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `POST /api/auth`       | 註冊／登入，scrypt 密碼雜湊、HTTP-only Cookie、JWT 與伺服器 session                          |
| `GET /api/auth`        | 讀取目前登入者，私有且不可快取                                                               |
| `DELETE /api/auth`     | 刪除伺服器 session 並登出                                                                    |
| `GET /api/pets`        | 僅讀取本人的毛孩                                                                             |
| `POST /api/pets`       | 建立毛孩與首筆體重紀錄                                                                       |
| `PATCH /api/pets`      | 驗證所有權與 updatedAt，避免覆蓋別人剛寫入的版本                                             |
| `POST /api/orders`     | 從資料庫重新算價、驗證毛孩／物種／月齡／過敏原、聚合庫存、冪等鍵與內容雜湊；只建立待付款草稿 |
| `GET /api/orders`      | 本人最近 50 筆訂單                                                                           |
| `GET /api/autoships`   | 本人的補貨計畫                                                                               |
| `PATCH /api/autoships` | 所有權與 revision 比對；順延、暫停、恢復；未授權付款方式不可恢復                             |
| `GET /api/health`      | 服務存活資訊，不暴露設定或憑證                                                               |

所有寫入須帶同源 `Origin` 與 JSON Content-Type。讀取資料前驗證登入，寫入同時使用 Zod schema；請求串流限制 32 KiB。正式環境的登入與訂單 API 使用 Upstash Redis 限流；未設定 Upstash 時，改用資料庫保存跨執行個體的限流計數。

API 範例與串接界線見 `docs/API.md`。前端購物袋價格不可當作正式收款依據；草稿不保留庫存，尚未接收付款。

## 尚未接通的營運能力

以下不是用假成功畫面代替的服務：

- 真實金流授權、支付回呼驗章、庫存預留／釋放、退款、循環扣款與電子發票。
- 物流建單、超商門市地圖與追蹤事件。
- LINE／Email／SMS 供應商通知、扣款前三天排程；現有畫面僅顯示預計提醒日。
- 上傳、審核與來源授權完整的真實社群內容；現有示範素材都是照片，影片渲染與字幕支援已完成。
- 正式會員介面、信箱驗證、忘記密碼與角色權限管理；現有 API 是後端基礎。
- 後端 API 與展示前端的雲端同步、後台 ABC 營運分析、智慧項圈／體重計串接與向量搜尋。

不應直接將目前展示版宣稱為完整可營運商城。啟用上述服務前，需實際配置供應商、完成回呼與交易測試，再將客戶端 LocalStorage 轉為會員資料快取。

## 驗證

```bash
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --omit=dev
```

執行結果與畫面見 `docs/VERIFICATION.md`、`docs/screenshots/`。第三方依賴版本已由 package-lock.json 固定；PostCSS 與 deepmerge-ts 以 overrides 使用已修補版本，再重新驗證 Prisma 與建置。

## 品牌與影像

導覽標誌直接使用提供的 `image.png`。三張產品／寵物圖片為本次生成的概念資產，提示詞與用途見 `docs/ASSETS.md`。產品圖為概念示意，不宣稱是實品包裝。所有價錢、庫存、配方與檢驗為展示樣本，未宣稱 SGS 認證或真實買家評價。

圖表採 TradingView Lightweight Charts™，保留 attributionLogo、站外歸屬連結與授權文字。`THIRD_PARTY_NOTICES.md` 記錄第三方授權說明。
