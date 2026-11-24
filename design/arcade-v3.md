# 毛孩遊戲室改版

## 實際使用的參考與套件

- [Motion Primitives Animated Background](https://github.com/ibelick/motion-primitives/blob/main/components/core/animated-background.tsx)：以獨立 `layoutId`、spring transition 製作遊戲分頁移動底板；轉盤使用 MotionValue 與可中止的動畫控制，接到結果才減速對準中獎格。
- [UI Layouts](https://github.com/ui-layouts/uilayouts)：參考互動元件的組合方式，遊戲採獨立全寬畫面、動態點數、可操作的獎品舞台與固定結果區；圖示、遊戲機與票卡圖形均為本專案自行繪製。
- [use-sound](https://github.com/joshwcomeau/use-sound)：依官方 audio sprite 用法，以單一音檔播放按鍵、轉盤刻度、攪球、落球、開殼、得獎、刮卡與錯誤提示；玩家開啟後才播放，音量與選擇保留，離開分頁停止音效。
- [canvas-confetti](https://github.com/catdad/canvas-confetti)：使用專用 canvas、worker、resize、原創爪印 Path2D；支援減少動態效果，換回合清除，離開畫面釋放。
- [AutoAnimate](https://github.com/formkit/auto-animate)：實際用在個人獎勵紀錄新增時的位移與插入動畫。
- [Rive React](https://github.com/rive-app/rive-react)：保留既有 `design/rive/purespot-paw/scene.rml` 與接入位置。依使用者已選定的處理方式，這次先由網站動畫實作；未取得 `.riv` 匯出檔前不宣稱已播放 Rive 動畫。
- [Spree](https://github.com/spree/spree) 與 [Formbricks](https://github.com/formbricks/formbricks)：會員票券、問卷與獎勵管理的既有參考；遊戲沿用共用點數、票券與會員權限資料。遊戲本身不需要載入這兩套完整服務。

## 美術與互動

原創貓犬角色：`public/images/arcade/companions-v1.webp`，720 px、透明背景，約 106 KB。原始生成檔留在使用者本機的 generated_images 資料夾。

遊戲機、轉盤、獎品圖示、票卡、金屬刮層均由 SVG、CSS 或 Canvas 畫出。轉盤用 HTML 合成層旋轉，避免每格 SVG 重繪；扭蛋機只在攪球時運行碰撞計算，球面紋理事先繪好重複使用。刮卡畫連續線段，用小型邏輯遮罩計算進度，不在移動事件內掃描全部像素；螢幕尺寸變更會重播刮痕，不會清空刮卡進度。

原創聲音：`public/audio/arcade-sprite-v2.wav`，單聲道 22.05 kHz，約 150 KB。沒有額外加入套件。

轉盤原本的預設獎項改用品牌遊戲配色；後台另選的自訂顏色會轉成同色系淡色漸層，維持文字清楚，也保留原有調色功能。

## 速度與資料一致性

舊流程：每次抽獎先完整整理會員、訂單、任務 → 抽獎 → 再跑 4.2 秒轉盤 → 再取得完整會員資料。

新流程：按下即開始轉動／攪球／開卡，`POST /api/account/arcade` 只處理該回合。收到結果直接套用點數與當日次數，轉盤快速模式約 1.05 秒減速，扭蛋約 1.05 秒落球開殼；刮卡由玩家揭曉。`GET /api/account/arcade` 讀輕量狀態；新會員沒有點數紀錄時補發既有入會 100 點，唯一來源鍵避免重領。完整點數整理保留在「更新點數」，不放在每次遊戲前後。

每回合有 UUID。獎項、扣點、加點／發券與回合收據在同一個 Serializable transaction 完成。相同回合重試讀原收據；變更遊戲的重試拒絕；平行扣點、每日上限與券碼唯一性由伺服器核對。獎池版本改變時不扣點，要求更新畫面。網路中斷保留回合 ID，可重整後確認原結果。

遊戲入口暫緩載入未開啟的完整客服資料，客服移至遊戲頁下方，避免浮動按鈕擋住手機操作。其他頁的客服入口保留。

## 驗證

`tests/arcade.test.ts` 驗證全部 4–10 格轉盤的停點、稀疏／連續刮痕、遮罩覆蓋與權重邊界。

`tests/e2e/arcade-v3.spec.ts` 使用非個資會員，實際確認按鍵立即回應、轉盤停點、彩球移動、落球開殼、刮卡與 resize、鍵盤與減少動態效果、斷線後重試、平行回合重試、每日上限、點數不足、獎池版本，以及入會禮不重複發送。一般會員與商城資料不清除。

本機首次操作回應實測 118–133 ms，遊戲期間完整會員重新讀取 0 次。56 項單元檢查及 7 項端到端流程通過，包含商城換購、票券、結帳、會員與問卷的回歸測試。正式環境請求時間另記於本次工作資料夾，避免混用本機與正式環境的數值。
