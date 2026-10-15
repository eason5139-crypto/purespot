# 驗證紀錄

日期：2026-10-02。

## 已完成

| 檢查 | 結果 |
| --- | --- |
| TypeScript strict + noUncheckedIndexedAccess | 通過，零型別錯誤 |
| Prisma schema validate / client generate | 通過 |
| Next.js 15.5.27 正式建置 | 通過，頁面與 API 路由成功產生 |
| Vitest | 22 項通過 |
| Playwright Chromium | 7 項通過，桌機 1440 px、手機 390 px |
| 正式依賴 npm audit --omit=dev | 此次掃描 0 項已知漏洞，不代表無任何安全風險 |
| 原始碼檢查 | 無 any 斷言、舊 addBaselineSeries API 或未匯入的 motionless 標籤 |

## 實際互動檢查

- 毛孩切換、過敏原警示、推薦排序、重新整理保留資料。
- 體重滑桿即時更新，克數與費用連動。
- 配糧轉循環購物袋、折扣、免運計算與示範訂單。
- 補貨順延 7 天、暫停／恢復與重新整理保留。
- 社群抽屜不跳頁加車；Esc 關閉返回原卡片焦點。
- 過敏品／物種／年齡不適配的攔截。
- TradingView 指標切換、批次表、路由離開重掛載，未觀察到 pageerror。
- 手機導覽、試算互動，documentElement 無水平溢位。
- 損壞 LocalStorage 恢復預設值而不崩潰。
- 已修正手機重新進入首頁時數字停留在 opacity: 0 的問題。

圖表的生命週期清理採 `ResizeObserver.disconnect()`、`cancelAnimationFrame()`、`chart.remove()`，再清空 ref；路由反覆進出驗證無執行期錯誤。未做長時間 heap profiling，因此不把這項結果宣稱為形式化的零記憶體洩漏證明。

## 圖片

- `screenshots/desktop.png`：桌機完整首頁。
- `screenshots/mobile.png`：手機完整首頁。
- `screenshots/mobile-cover.png`：手機首屏。
- `screenshots/calculator.png`：試算彈窗。
- `screenshots/product.png`：商品詳情與 TradingView。

## 尚未驗證

- 本環境未啟動 PostgreSQL，migration 部署、帳戶註冊、伺服器資料持久化與併發交易尚未進行真實資料庫端到端測試。
- 未配置金流、LINE／Email／SMS、物流、向量模型或智慧設備，所以沒有真實扣款、通知與出貨的驗證。
- 正式前端雲端同步與營運後台不在目前已接通範圍。請參照 README 的交付界線。

瀏覽器最初的標準下載受執行環境限制，因此此處以同版 Chromium 的本機可執行檔執行 Playwright；專案也支援一般 `npx playwright install chromium`，不把環境專用二進位檔打包進專案。
