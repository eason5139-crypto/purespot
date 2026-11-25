# 小P：站內搜尋與會員助理

2026-11-25。入口在導覽列上緣，首頁走動、其他前台固定，後台不顯示。點選後打開貓咪旁的非模態搜尋框，搜尋結果先顯示，再由既有 Gemini 連線整理簡短說明。開啟、滑鼠靠近、鍵盤聚焦或減少動態設定均會停止走動。

AI 沿用原有主模型設定，額度或服務暫時不可用時，在相同等待預算內改用已實際驗證的 `gemini-3.5-flash-lite`。收到 429 後遵守服務提供的重試時間，不持續重試同一個模型。不更動原本選物羅盤的模型或申辦付費方案。若兩個模型都不可用，保留即時站內結果。模型來源：[Google 官方模型文件](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite)、[官方額度規則](https://aistudio.google.com/docs/rate-limits)。

## 範圍與資料

- 公開資料：即時上架商品、成分、過敏原、已提供的營養值、批次核實狀態、功能索引、網站文案、會員規則、活動、開放問卷、公開社群貼文、遊戲與簽到規則。
- 個人資料：伺服器從登入工作階段決定本人身分。點數、等級、毛孩、近期訂單、票券、定期配送、收藏、照顧紀錄、通知與家庭清單；不讀取其他會員或公司設定。個人回答在站內組合，不傳給模型。
- 不提供公司成本、憑證、密碼，也不執行下單、付款或領取獎勵。商品卡的加車是買家點擊，沿用既有物種、年齡、過敏與庫存檢查。
- Gemini 只取得已篩選的公開證據，輸出 ID 必須存在於證據，額外數字與網址不接受。連線失敗或超時保留原來的站內結果。Gemini 上游至少需要 10 秒 deadline，前台等待仍由本地 abort budget 控制，停用自動重試。
- 會員對話以本人帳戶保存在資料庫，可讀取／刪除；訪客只在本機保存。提問統計只存遮蔽後的問題，不存個人回答。後台可設定保存天數。

## 後台

`/admin/assistant`：開關、首頁走動、問候、熱門問題、語氣、回答長度、結果數、等待上限、公開搜尋及個人資料權限、加車與比較開關、紀錄保存天數、補充知識與對應前台入口。可先看問候和問題的預覽，儲存後生效。

統計有 7／30／90 天、每日提問、問題分類、熱門問題、無結果問題、會員／訪客、AI 或站內回覆、關鍵字與分類篩選，CSV 匯出。無結果問題可帶入補充知識編輯。資料使用既有 OutboxEvent JSON 持久層，不需要更改既有商品、會員或訂單結構。

## 視覺與動畫

使用既有 Motion 控制停走、方向與移動速度；AutoAnimate 用於搜尋結果及後台知識列的增減。貓咪是原創手繪透明素材；四格眨眼與六格走路用 sprite 動畫呈現。不需 Rive 帳號或外部動畫服務，保留將來替換 .riv 的空間。遊戲用的音效與彩紙不放進安靜的搜尋介面。

最終素材：`public/images/assistant/xiaop-walk.webp`、`public/images/assistant/xiaop-idle.webp`。使用內建圖片生成功能；原始 PNG 在 Codex generated_images 中保留，網站以 Sharp 無損 WebP 封裝，沒有重新繪製或改變像素。

### 走路素材提示詞

Create a production sprite sheet for a premium warm pet lifestyle website mascot called Xiao P. A fine hand-painted Siamese cat, natural adult cat proportions (not chibi), creamy ivory short fur, seal brown face mask ears paws and long tail, clear gentle blue eyes. Delicate watercolor and gouache with colored pencil fur detail, clean refined silhouette, warm understated realistic animal movement, NOT robotic, NO accessories, NO collar, NO text. EXACT layout: one horizontal strip containing SIX sequential frames of the SAME cat WALKING TOWARD THE RIGHT, full body side profile. Six perfectly equal-width cells, cat centered at exactly the same position and scale in every cell, feet touch identical horizontal baseline, fully visible tail and ears with generous transparent margin. Each frame is one sixth of a smooth realistic feline walk cycle: alternate fore and hind legs correctly, subtle shoulder movement, gently curving tail. Cat body length about 65 percent of each cell width, total cat including tail at most 85 percent cell width; bottom 12 percent margin. Transparent background with actual alpha, no ground, no scene, no shadows, no border, no labels, no cell dividers. Wide landscape sprite sheet aspect ratio 6:1 or wider; precise evenly spaced game animation sprites.

### 坐姿素材提示詞

Use the cat in the reference sprite sheet as the character identity and painting style. Generate a NEW horizontal sprite sheet with FOUR equally spaced frames. SAME elegant natural adult Siamese cat with creamy ivory fur, seal brown ears mask paws and tail, soft blue eyes, fine hand-painted watercolor and gouache fur. Now cat is SITTING, three-quarter view facing slightly right toward the viewer, tail curled around paws. Four frames for a subtle natural idle loop: (1) attentive relaxed blue eyes open, (2) gentle half blink, (3) eyes gently closed blink, (4) blue eyes open with very slight head tilt. No other body movement. Every cell identical scale and position and baseline, generous transparent margins so no character cropped. Cat including tail within 75 percent of each equal-width cell, sitting cat full body visible. Art centered vertically filling 80 percent of canvas height. Strip aspect ratio about 4:1. True transparent background, no texture behind cat, no shadows, no labels, no grid, no text. No glow, no particles, no clothing, no symbols, no cartoon exaggeration. Precise animation-ready equal width frame registration.

## 驗收

單元測試：排除雞肉時包括雞油與英文別名、物種／年齡／已知過敏限制、預算、缺貨與未上架、缺少營養值、不回傳成本、輸入範圍、隱私遮蔽與臺灣日期統計。

瀏覽器：訪客搜尋、並排比較入口、手動加車、本機歷史、會員登入後本人資料、跨裝置讀取、跨帳號禁止讀寫、歷史刪除、後台設定預覽與保存、圖表篩選、手機尺寸與減少動畫。沒有新增交易或改動既有訂單。
