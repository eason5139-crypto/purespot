"use client";
import {
  categoryLabel,
  supportStatistics,
  type SupportSettings,
} from "@/lib/supportDesk";
import type { SupportCategory, SupportThread } from "@/lib/supportTypes";
const palette = [
  "#497d9c",
  "#a77758",
  "#7aa896",
  "#ceb376",
  "#8c9cbb",
  "#687f99",
  "#b19cc0",
  "#7db9c4",
  "#b8b7aa",
];
const duration = (minutes: number | null) =>
  minutes === null
    ? "—"
    : minutes < 1
      ? minutes < 1 / 60
        ? "不足 1 秒"
        : `${Math.round(minutes * 60)} 秒`
      : minutes < 60
        ? `${Math.round(minutes)} 分`
        : minutes < 1440
          ? `${(minutes / 60).toFixed(1)} 小時`
          : `${(minutes / 1440).toFixed(1)} 天`;
export function SupportCharts({
  tickets,
  settings,
  from,
  to,
  onPick,
}: {
  tickets: SupportThread[];
  settings: SupportSettings;
  from: string;
  to: string;
  onPick: (category?: SupportCategory, status?: string) => void;
}) {
  const s = supportStatistics(tickets, from, to);
  let offset = 0;
  const max = Math.max(
    4,
    Math.ceil(
      Math.max(0, ...s.days.flatMap((d) => [d.incoming, d.closed])) / 4,
    ) * 4,
  );
  return (
    <div className="support-analytics">
      <div className="support-metric-grid">
        {[
          ["本期新諮詢", `${s.total} 件`],
          ["本期完成", `${s.closed} 件`],
          ["平均首次回覆", duration(s.firstResponseMinutes)],
          ["平均結案", duration(s.resolutionMinutes)],
          [
            "服務評價",
            s.rating === null ? "尚無評價" : `${s.rating.toFixed(1)}／5`,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="support-chart-grid">
        <section className="support-chart">
          <h3>大家最常問什麼？</h3>
          <p>依本期建立的諮詢分類，點選即可看案件。</p>
          <div className="support-donut-layout">
            <svg
              viewBox="0 0 220 220"
              role="img"
              aria-label={`問題分類占比，共 ${s.total} 件`}
            >
              <circle
                cx="110"
                cy="110"
                r="77"
                fill="none"
                stroke="#edf0ed"
                strokeWidth="30"
              />
              {s.categories.map((c, i) => {
                const fraction = s.total ? c.count / s.total : 0,
                  start = offset;
                offset += fraction;
                return c.count ? (
                  <circle
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${categoryLabel(c.id, settings)} ${c.count} 件`}
                    cx="110"
                    cy="110"
                    r="77"
                    fill="none"
                    stroke={palette[i]}
                    strokeWidth="30"
                    strokeDasharray={`${fraction * 483.805} 483.805`}
                    strokeDashoffset={-start * 483.805}
                    transform="rotate(-90 110 110)"
                    onClick={() => onPick(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onPick(c.id);
                    }}
                  >
                    <title>
                      {categoryLabel(c.id, settings)}：{c.count} 件（
                      {(fraction * 100).toFixed(1)}%）
                    </title>
                  </circle>
                ) : null;
              })}
              <text
                x="110"
                y="108"
                textAnchor="middle"
                fontSize="32"
                fontWeight="700"
                fill="#244b65"
              >
                {s.total}
              </text>
              <text
                x="110"
                y="132"
                textAnchor="middle"
                fontSize="12"
                fill="#8295a0"
              >
                件諮詢
              </text>
            </svg>
            <div className="support-chart-legend">
              {s.categories.map((c, i) => (
                <button type="button" key={c.id} onClick={() => onPick(c.id)}>
                  <i style={{ background: palette[i] }} />
                  <span>{categoryLabel(c.id, settings)}</span>
                  <b>{c.count}</b>
                  <small>
                    {s.total ? ((c.count / s.total) * 100).toFixed(1) : "0.0"}%
                  </small>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="support-chart">
          <h3>詢問進來後，處理到哪裡？</h3>
          <p>本期建立案件的目前狀態。</p>
          <div className="support-state-bars">
            {s.statuses.map((c, i) => (
              <button
                type="button"
                key={c.status}
                onClick={() => onPick(undefined, c.status)}
              >
                <span>{["待回覆", "處理中", "已完成"][i]}</span>
                <div>
                  <i
                    style={{
                      width: `${s.total ? (c.count / s.total) * 100 : 0}%`,
                      background: ["#d1b57e", "#6c9db8", "#88ad9b"][i],
                    }}
                  />
                </div>
                <strong>{c.count} 件</strong>
              </button>
            ))}
          </div>
          <div className="support-chart-explanation">
            <p>回覆耗時：依 {s.responseSamples} 筆有回覆時間的案件計算。</p>
            <p>結案耗時：依 {s.resolutionSamples} 筆有完整時間的案件計算。</p>
            {s.missingResolution > 0 && (
              <p>{s.missingResolution} 筆舊紀錄未留下結案時間，未納入耗時。</p>
            )}
            <p>評價：本期收到 {s.ratingCount} 筆。</p>
          </div>
        </section>
      </div>
      <section className="support-chart">
        <h3>每天進來多少、完成多少？</h3>
        <p>詢問依建立日，結案依完成日；單位：件。日期以臺灣時間計算。</p>
        <div className="support-trend-key">
          <span>
            <i style={{ background: "#5786a4" }} />
            新諮詢
          </span>
          <span>
            <i style={{ background: "#a4bda8" }} />
            完成
          </span>
        </div>
        <svg
          className="support-trend"
          viewBox="0 0 900 240"
          role="img"
          aria-label="每日詢問與完成件數長條圖"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1="35"
                x2="890"
                y1={202 - i * 44}
                y2={202 - i * 44}
                stroke="#e4eae7"
              />
              <text
                x="27"
                y={206 - i * 44}
                textAnchor="end"
                fontSize="11"
                fill="#87969d"
              >
                {Math.ceil((max * i) / 4)}
              </text>
            </g>
          ))}
          {s.days.map((d, i) => {
            const w = 850 / Math.max(1, s.days.length),
              x = 38 + i * w;
            return (
              <g key={d.day}>
                <rect
                  x={x}
                  y={202 - (d.incoming / max) * 176}
                  width={Math.max(0.5, w * 0.36)}
                  height={(d.incoming / max) * 176}
                  rx="2"
                  fill="#5786a4"
                >
                  <title>
                    {d.day} 新諮詢 {d.incoming} 件
                  </title>
                </rect>
                <rect
                  x={x + w * 0.4}
                  y={202 - (d.closed / max) * 176}
                  width={Math.max(0.5, w * 0.36)}
                  height={(d.closed / max) * 176}
                  rx="2"
                  fill="#a4bda8"
                >
                  <title>
                    {d.day} 完成 {d.closed} 件
                  </title>
                </rect>
                {i % Math.max(1, Math.ceil(s.days.length / 7)) === 0 && (
                  <text x={x} y="226" fontSize="10" fill="#87969d">
                    {d.day.slice(5)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <details>
          <summary>查看每日數字</summary>
          <div className="support-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>新諮詢</th>
                  <th>完成</th>
                </tr>
              </thead>
              <tbody>
                {s.days.map((d) => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    <td>{d.incoming}</td>
                    <td>{d.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}
