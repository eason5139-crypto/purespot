# 客服改版

買家端提供「新諮詢／進行中／詢問歷史」，會員中心與客服浮窗共用元件與相同資料。後台以「案件處理／歷史紀錄／統計圖表／分類與回覆設定」分區。

## 結案與紀錄

- 完成後清空當前諮詢輸入並返回新諮詢，顯示完成通知與最後回覆入口。對話仍保留在歷史。
- 已完成對話唯讀，另開問題以 parentId 關聯原案。已完成紀錄不因買家補充而自動重開。
- 評價為一次 1–5 分及選填文字，不發點數。評價與結案的時間分別保存。
- 訪客以 HttpOnly、SameSite cookie 的隨機識別保存瀏覽器認領權；會員可主動認領未歸戶的本機對話。認領後只由該會員查看，不再由登出狀態的原 cookie 存取。
- 原有 localStorage 訪客識別僅用於一次搬移未歸戶的舊訪客案件；不以傳入 token 取得其他會員或訂單資料。
- 買家回應採白名單欄位，不回傳內部備註、處理軌跡、訪客識別或未知私有欄位。沒有個人紀錄時回傳空列表。

## 公司操作

九個固定分類可改名稱、說明、常見問法、快速回覆；分類 ID 保持不變，避免改名稱後找不到歷史。標籤可維護，案件內可手動調整分類與標籤。

內部備註獨立保存作者與時間；回覆、結案與分類調整寫入處理軌跡。關聯訂單在建立時核對會員歸屬，公司端可查看明細摘要。

批次每次最多 20 筆，先列出選中的案件，再確認分類或結案。修改採 Serializable transaction，失敗不顯示為成功；操作 requestId 防止同一請求重試而重複回覆。單筆處理有版本核對，衝突保留輸入內容。

## 實際資料圖表

分類圖與狀態圖的分母為選定期間建立的諮詢；每日詢問依建立日、每日結案依 resolvedAt，均以臺灣日期計算。首次回覆依真正的管理員訊息時間，結案耗時依 createdAt／resolvedAt，分別顯示樣本數。舊紀錄沒有 resolvedAt 時不把 updatedAt 當完成時間。評分依評價提交日期統計。

分類占比、狀態圖可點回案件篩選，趨勢圖有每日數字表。客服開啟時背景更新，頁面隱藏或正在送出時不發起新輪詢；遊戲、訂單頁不會在背景載入完整客服資料。

## GitHub 參考的實際落點

- [Motion Primitives](https://github.com/ibelick/motion-primitives/blob/main/components/core/animated-background.tsx)：參考 layoutId 與 spring，獨立實作前後台分頁移動底板與結案通知進場。
- [AutoAnimate](https://github.com/formkit/auto-animate/blob/master/src/index.ts)：實際用於案件列表新增、分類與結案後的列表位移，沿用套件的減少動態效果支援。
- [Formbricks](https://github.com/formbricks/formbricks/blob/main/packages/surveys/src/lib/logic.ts)：研究條件式顯示的行為，獨立實作先選分類、再顯示相關問法與訂單欄位；沒有複製其程式碼或嵌入整個服務。
- [Spree Order](https://github.com/spree/spree/blob/main/spree/core/app/models/spree/order.rb)：研究訂單狀態、內部註記與事件的分離方式；本案以既有 Next.js／Prisma 實作訂單關聯、公司備註及處理軌跡。
- 原有遊戲的音效、彩紙與 Rive 接入安排保留。客服使用輕量的轉場與完成提示。

## 驗證

單元檢查涵蓋九類設定、白名單序列化、臺灣日期、不同統計分母、舊紀錄缺少結案時間及回覆／評價樣本。端到端流程使用無個資帳戶，實際檢查結案同步、歷史與關聯提問、一次性評價、訪客認領與權限、分類篩選、圖表回查及批次操作。
