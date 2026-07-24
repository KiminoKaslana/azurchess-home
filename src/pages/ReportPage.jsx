// src/pages/ReportPage.jsx
// 测试服活跃度回顾报告：读取 public/reports/ 下由 export_report_data.py 生成的
// 每月结构化 JSON，用 web-theme-2026-dark 配色（经 --acb-* 语义变量）重新渲染。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Segmented, Table, Input, Tag, Spin, Empty } from 'antd';
import {
  AreaChartOutlined, TrophyOutlined, FireOutlined, TeamOutlined, HeartOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './ReportPage.css';

const { Content } = Layout;

// 图表数据色：取自 theme.json 的 charts.*（RGB 三元组，便于叠加动态透明度）
const CHART = {
  blue: '87,163,248',    // charts.blue  #57A3F8
  green: '134,207,134',  // charts.green #86CF86
  yellow: '224,185,127', // charts.yellow #E0B97F
  orange: '205,134,26',  // charts.orange #CD861A
  purple: '173,128,215', // charts.purple #AD80D7
  red: '239,135,115',    // charts.red   #EF8773
};
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const clampPct = (v, mx) => (mx > 0 ? Math.max(0, Math.min(100, (v / mx) * 100)) : 0);
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const mdLabel = (iso) => { const d = parseISO(iso); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; };
const weekdayMon = (d) => (d.getDay() + 6) % 7;
const grad = (rgb) => `linear-gradient(90deg, rgba(${rgb},0.45), rgb(${rgb}))`;

// ── 通用卡片外壳 ──────────────────────────────────────────
const Card = ({ title, desc, children, className = '', span = 1 }) => (
  <section className={`rc-card rc-span-${span} ${className}`}>
    {title && <h2 className="rc-card__title">{title}</h2>}
    {desc && <p className="rc-card__desc">{desc}</p>}
    {children}
  </section>
);

// ── 通用条形榜 ────────────────────────────────────────────
const BarList = ({ rows, rgb }) => {
  const mx = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rc-bars">
      {rows.map((r, i) => (
        <div className="rc-bar" key={i} title={r.tip}>
          <span className="rc-bar__name">{r.name}</span>
          <span className="rc-bar__track">
            <span className="rc-bar__fill" style={{ width: `${clampPct(r.value, mx)}%`, background: grad(rgb) }} />
          </span>
          <span className="rc-bar__val">{r.label}</span>
        </div>
      ))}
    </div>
  );
};

// ── KPI 卡片组 ────────────────────────────────────────────
const KpiCards = ({ kpis, daySpan }) => {
  const items = [
    { label: '总对局', value: kpis.total_games, note: `覆盖 ${daySpan} 天` },
    { label: '参与玩家', value: kpis.total_players, note: `累计参与 ${kpis.total_joins} 人次` },
    { label: '玩家总时长', value: `${kpis.total_player_hours}h`, note: '社区投入强度' },
    { label: '对局墙钟时长', value: `${kpis.total_wall_hours}h`, note: '房间持续时间之和' },
    { label: '平均人数', value: kpis.avg_player_count, note: `中位数 ${Math.round(kpis.median_player_count)} 人` },
    { label: '正常结束率', value: `${(kpis.finished_rate * 100).toFixed(1)}%`, note: `多人局 ${(kpis.multi_finished_rate * 100).toFixed(1)}%` },
  ];
  return (
    <div className="rc-kpis">
      {items.map((it) => (
        <div className="rc-kpi" key={it.label}>
          <div className="rc-kpi__label">{it.label}</div>
          <div className="rc-kpi__value">{it.value}</div>
          <div className="rc-kpi__note">{it.note}</div>
        </div>
      ))}
    </div>
  );
};

// ── 亮点故事卡 ────────────────────────────────────────────
const StoryCards = ({ stories }) => {
  const cards = [];
  if (stories.top_player) {
    const t = stories.top_player;
    cards.push({ icon: <TrophyOutlined />, title: '活跃王', big: t.nickname, small: `${t.games} 局 · ${t.hours} 小时 · 活跃 ${t.days} 天` });
  }
  if (stories.hottest_day) {
    const h = stories.hottest_day;
    cards.push({ icon: <FireOutlined />, title: '最热闹的一天', big: `${mdLabel(h.date)} · ${h.count}局`, small: `同日 ${h.player_hours} 玩家小时，${h.players} 位玩家` });
  }
  if (stories.big) {
    const b = stories.big;
    cards.push({ icon: <TeamOutlined />, title: '大团战贡献', big: `${b.count} 局 8+ 人`, small: `占 ${(b.share * 100).toFixed(1)}% 场次，贡献 ${(b.ph_share * 100).toFixed(1)}% 时长` });
  }
  if (stories.best_pair) {
    const p = stories.best_pair;
    cards.push({ icon: <HeartOutlined />, title: '最佳搭档组合', big: `${p.a} × ${p.b}`, small: `${p.count} 局 · ${p.hours} 小时 · 最近 ${p.last}` });
  }
  return (
    <div className="rc-stories">
      {cards.map((c) => (
        <div className="rc-story" key={c.title}>
          <span className="rc-story__icon">{c.icon}</span>
          <div className="rc-story__title">{c.title}</div>
          <div className="rc-story__big">{c.big}</div>
          <div className="rc-story__small">{c.small}</div>
        </div>
      ))}
    </div>
  );
};

// ── 每日热度曲线（SVG：柱=玩家小时，线=对局数）────────────
const DailyTrend = ({ daily }) => {
  const W = 1000, H = 280, padL = 40, padR = 16, padT = 20, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = daily.length || 1;
  const step = plotW / n;
  const barW = step * 0.56;
  const maxH = Math.max(1, ...daily.map((d) => d.player_hours));
  const maxC = Math.max(1, ...daily.map((d) => d.count));

  const pts = daily.map((d, i) => {
    const cx = padL + step / 2 + step * i;
    const cy = padT + plotH - plotH * (d.count / maxC);
    return { cx, cy, d };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`).join(' ');
  const labelEvery = Math.max(1, Math.floor((n - 1) / 6));

  return (
    <div className="rc-svgwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="rc-trend" role="img" aria-label="每日对局数与玩家时长趋势">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padT + (plotH * i) / 4;
          return <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} className="rc-gridline" />;
        })}
        {daily.map((d, i) => {
          const ratio = d.player_hours / maxH;
          const bh = Math.max(1, plotH * ratio);
          const x = padL + step / 2 + step * i - barW / 2;
          const op = d.count === 0 ? 0.06 : 0.14 + 0.72 * ratio;
          return (
            <rect key={i} x={x.toFixed(1)} y={(padT + plotH - bh).toFixed(1)} width={barW.toFixed(1)} height={bh.toFixed(1)} rx="3"
              fill={`rgba(${CHART.blue},${op.toFixed(3)})`}>
              <title>{`${d.date}｜${d.count} 局｜${d.player_hours} 玩家小时｜${d.players} 位玩家`}</title>
            </rect>
          );
        })}
        <path d={line} className="rc-trendline" />
        {pts.map((p, i) => (p.d.count > 0 ? <circle key={i} cx={p.cx.toFixed(1)} cy={p.cy.toFixed(1)} r="3" className="rc-trenddot"><title>{`${p.d.count} 局`}</title></circle> : null))}
        {daily.map((d, i) => ((i % labelEvery === 0 || i === n - 1)
          ? <text key={i} x={(padL + step / 2 + step * i).toFixed(1)} y={H - 16} textAnchor="middle" className="rc-axis">{mdLabel(d.date)}</text>
          : null))}
      </svg>
      <div className="rc-legend">
        <span><i style={{ background: `rgb(${CHART.blue})` }} />玩家小时（峰值 {maxH.toFixed(1)}h）</span>
        <span><i className="rc-legend__line" />对局数（峰值 {maxC}局）</span>
      </div>
    </div>
  );
};

// ── 活跃日历（热力方格）──────────────────────────────────
const ActivityCalendar = ({ daily }) => {
  const maxH = Math.max(1, ...daily.map((d) => d.player_hours));
  const first = parseISO(daily[0].date);
  const padStart = weekdayMon(first);
  const cells = [...Array(padStart).fill(null), ...daily];
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <>
      <div className="rc-cal">
        {WEEKDAYS.map((w) => <div className="rc-cal__head" key={w}>{w}</div>)}
        {cells.map((c, i) => {
          if (!c) return <div className="rc-cal__cell rc-cal__cell--out" key={i} />;
          const ratio = c.player_hours / maxH;
          const bg = c.count === 0 ? 'rgba(255,255,255,0.03)' : `rgba(${CHART.blue},${(0.08 + 0.62 * ratio).toFixed(3)})`;
          const dd = parseISO(c.date).getDate();
          return (
            <div className="rc-cal__cell" key={i} style={{ background: bg }} title={`${c.date}｜${c.count} 局｜${c.player_hours} 玩家小时｜${c.players} 位玩家`}>
              <span className="rc-cal__day">{dd}</span>
              {c.count > 0 && <span className="rc-cal__n">{c.count}</span>}
            </div>
          );
        })}
      </div>
      <div className="rc-cal__legend"><span>少</span><i style={{ background: `rgba(${CHART.blue},0.12)` }} /><i style={{ background: `rgba(${CHART.blue},0.45)` }} /><i style={{ background: `rgba(${CHART.blue},0.85)` }} /><span>多</span></div>
    </>
  );
};

// ── 周节奏 ────────────────────────────────────────────────
const WeeklyBars = ({ weekly }) => {
  const maxC = Math.max(1, ...weekly.map((w) => w.count));
  const maxH = Math.max(1, ...weekly.map((w) => w.player_hours));
  return (
    <div className="rc-weeks">
      {weekly.map((w) => (
        <div className="rc-week" key={w.start} title={`${mdLabel(w.start)}周｜${w.count}局｜${w.player_hours}玩家小时｜${w.players}人｜新${w.new_players}人`}>
          <div className="rc-week__bars">
            <span className="rc-week__bar rc-week__bar--c" style={{ height: `${clampPct(w.count, maxC)}%` }} />
            <span className="rc-week__bar rc-week__bar--h" style={{ height: `${clampPct(w.player_hours, maxH)}%` }} />
          </div>
          <div className="rc-week__label">{mdLabel(w.start)}周</div>
          <div className="rc-week__meta"><b>{w.count}</b>局 · <b>{w.player_hours}</b>h</div>
          <div className="rc-week__sub">{w.players}人 · 新{w.new_players}人</div>
        </div>
      ))}
    </div>
  );
};

// ── 关键观察 ──────────────────────────────────────────────
const KeyObservations = ({ keyObs, total }) => {
  const lines = [
    ['单人局占比', `${keyObs.single} 局 / ${(keyObs.single_rate * 100).toFixed(1)}%`],
    ['多人局中位时长', `${keyObs.median_multi} 分钟`],
    ['8+ 人局平均时长', `${keyObs.avg_big} 分钟`],
    ['Top 10 玩家贡献', `${(keyObs.top10_join_share * 100).toFixed(1)}% 人次 / ${(keyObs.top10_hour_share * 100).toFixed(1)}% 时长`],
    ['最后 7 天新出现玩家', `${keyObs.new_recent} 位`],
  ];
  return (
    <>
      <div className="rc-callout">
        本期共 <b>{total}</b> 局。活跃并非平均铺开，而是由几个周末 / 集中日拉高；短局多，但真正的共同回忆主要来自 8 人以上的大局。
      </div>
      <div className="rc-metrics">
        {lines.map(([k, v]) => <div className="rc-metric" key={k}><span>{k}</span><b>{v}</b></div>)}
      </div>
    </>
  );
};

// ── 周 × 小时热力图 ───────────────────────────────────────
const HourHeatmap = ({ matrix }) => {
  let maxC = 1, maxH = 1, peakC = { v: 0, d: 0, h: 0 }, peakH = { v: 0, d: 0, h: 0 };
  matrix.forEach((row, d) => row.forEach((c, h) => {
    maxC = Math.max(maxC, c.count); maxH = Math.max(maxH, c.player_hours);
    if (c.count > peakC.v) peakC = { v: c.count, d, h };
    if (c.player_hours > peakH.v) peakH = { v: c.player_hours, d, h };
  }));
  return (
    <>
      <p className="rc-card__desc">
        格子数字为对局数；颜色综合对局数与玩家小时。玩家小时最高时段
        <b> {WEEKDAYS[peakH.d]} {String(peakH.h).padStart(2, '0')}:00</b>（{peakH.v.toFixed(1)}h）；
        开局最多时段 <b>{WEEKDAYS[peakC.d]} {String(peakC.h).padStart(2, '0')}:00</b>（{peakC.v}局）。
      </p>
      <div className="rc-hmwrap">
        <div className="rc-hm">
          <div className="rc-hm__corner" />
          {Array.from({ length: 24 }, (_, h) => <div className="rc-hm__hh" key={h}>{h}</div>)}
          {matrix.map((row, d) => (
            <React.Fragment key={d}>
              <div className="rc-hm__wd">{WEEKDAYS[d]}</div>
              {row.map((c, h) => {
                const ratio = 0.5 * (c.count / maxC) + 0.5 * (c.player_hours / maxH);
                const bg = c.count === 0 ? 'rgba(255,255,255,0.03)' : `rgba(${CHART.purple},${(0.16 + 0.72 * ratio).toFixed(3)})`;
                return <div className="rc-hm__cell" key={h} style={{ background: bg }} title={`${WEEKDAYS[d]} ${String(h).padStart(2, '0')}:00｜${c.count} 局｜${c.player_hours} 玩家小时`}>{c.count || ''}</div>;
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

// ── 结束质量环形 ──────────────────────────────────────────
const Donut = ({ pct, label }) => (
  <div className="rc-donut" style={{ '--pct': `${pct}%` }}>
    <span>{Math.round(pct)}%</span><small>{label}</small>
  </div>
);

// ── 完整玩家表 ────────────────────────────────────────────
const PlayerTable = ({ players }) => {
  const [q, setQ] = useState('');
  const data = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return players
      .map((p, i) => ({ ...p, key: i, rank: i + 1 }))
      .filter((p) => !kw || (p.nickname || '').toLowerCase().includes(kw));
  }, [players, q]);

  const rankTag = (r) => {
    const color = r === 1 ? 'gold' : r === 2 ? 'blue' : r === 3 ? 'volcano' : undefined;
    return color ? <Tag color={color} style={{ margin: 0, minWidth: 30, textAlign: 'center' }}>{r}</Tag> : <span>{r}</span>;
  };

  const columns = [
    { title: '排名', dataIndex: 'rank', width: 72, align: 'center', render: rankTag },
    { title: '玩家', dataIndex: 'nickname', render: (v) => <span className="rc-strong">{v}</span> },
    { title: '参与局数', dataIndex: 'games', width: 100, align: 'right', sorter: (a, b) => a.games - b.games },
    { title: '游玩小时', dataIndex: 'player_hours', width: 100, align: 'right', sorter: (a, b) => a.player_hours - b.player_hours, render: (v) => v.toFixed(1) },
    { title: '活跃天数', dataIndex: 'days', width: 100, align: 'right', sorter: (a, b) => a.days - b.days },
    { title: '最长连登', dataIndex: 'consecutive_days', width: 100, align: 'right', sorter: (a, b) => a.consecutive_days - b.consecutive_days },
    { title: '正常率', dataIndex: 'finished_rate', width: 90, align: 'right', render: (v) => `${Math.round(v * 100)}%` },
    { title: '最近出现', dataIndex: 'last_seen', width: 150, sorter: (a, b) => (a.last_seen || '').localeCompare(b.last_seen || '') },
  ];
  return (
    <>
      <div className="rc-tabletools">
        <Input allowClear prefix={<SearchOutlined />} placeholder="输入玩家名，快速找到自己…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <span className="rc-card__desc" style={{ margin: 0 }}>{data.length} 位玩家</span>
      </div>
      <Table className="rc-anttable" size="small" columns={columns} dataSource={data} pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }} />
    </>
  );
};

// ── 简易数据表 ────────────────────────────────────────────
const MiniTable = ({ head, rows }) => (
  <div className="rc-minitablewrap">
    <table className="rc-minitable">
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

// ── 主页面 ────────────────────────────────────────────────
const ReportPage = () => {
  const [months, setMonths] = useState([]);
  const [monthKey, setMonthKey] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const base = `${process.env.PUBLIC_URL || ''}/reports`;

  useEffect(() => {
    fetch(`${base}/manifest.json`)
      .then((r) => { if (!r.ok) throw new Error('manifest'); return r.json(); })
      .then((m) => {
        const list = m.months || [];
        setMonths(list);
        if (list.length) setMonthKey(list[list.length - 1].key);
        else { setLoading(false); setError('暂无报告数据'); }
      })
      .catch(() => { setLoading(false); setError('加载报告清单失败'); });
  }, [base]);

  const loadMonth = useCallback((key) => {
    setLoading(true);
    fetch(`${base}/${key}.json`)
      .then((r) => { if (!r.ok) throw new Error('month'); return r.json(); })
      .then((d) => { setData(d); setError(null); })
      .catch(() => setError('加载月度报告失败'))
      .finally(() => setLoading(false));
  }, [base]);

  useEffect(() => { if (monthKey) loadMonth(monthKey); }, [monthKey, loadMonth]);

  const segOptions = months.map((m) => ({
    value: m.key,
    label: (
      <div className="rc-seg">
        <span className="rc-seg__label">{m.label}</span>
        <span className="rc-seg__sub">{m.total_games} 局</span>
      </div>
    ),
  }));

  const roomCountRows = useMemo(() => (data ? data.rooms.slice(0, 12).map((r) => ({
    name: r.name, value: r.count, label: `${r.count}局`, tip: `${r.name}｜${r.count}局｜${r.player_hours}玩家小时｜中位${r.median_minutes}分钟`,
  })) : []), [data]);
  const roomHourRows = useMemo(() => (data ? [...data.rooms].sort((a, b) => b.player_hours - a.player_hours).slice(0, 12).map((r) => ({
    name: r.name, value: r.player_hours, label: `${r.player_hours.toFixed(1)}h`, tip: `${r.name}｜${r.player_hours}玩家小时｜${r.count}局｜均${r.avg_size}人`,
  })) : []), [data]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Content className="acb-report">
        <div className="rc-wrap">
          <header className="rc-hero">
            <div className="rc-hero__eyebrow"><AreaChartOutlined /> Beta Server Activity Review</div>
            <h1 className="rc-hero__title">测试服活跃度回顾</h1>
            <p className="rc-hero__sub">
              谁最常出现、哪天最热闹、什么时段最容易开局、哪些大局撑起了共同记忆。
              {data && <> 当前：<b>{data.period.start} – {data.period.end}</b>（{data.period.day_span} 天）。</>}
            </p>
            {segOptions.length > 0 && monthKey && (
              <Segmented className="rc-monthseg" value={monthKey} onChange={setMonthKey} options={segOptions} />
            )}
          </header>

          {loading ? (
            <div className="rc-center"><Spin size="large" /></div>
          ) : error ? (
            <div className="rc-center"><Empty description={error} /></div>
          ) : data ? (
            <>
              <KpiCards kpis={data.kpis} daySpan={data.period.day_span} />
              <StoryCards stories={data.stories} />

              <div className="rc-grid rc-grid--2">
                <Card title="每日热度曲线" desc="柱表示当天玩家小时，亮线表示当天对局数。">
                  <DailyTrend daily={data.daily} />
                </Card>
                <Card title="活跃日历" desc="数字是当天对局数；颜色越亮玩家小时越高。">
                  <ActivityCalendar daily={data.daily} />
                </Card>
              </div>

              <div className="rc-grid rc-grid--2">
                <Card title="每周节奏" desc="黄色柱为对局数，青色柱为玩家小时，“新”为当周首次出现玩家。">
                  <WeeklyBars weekly={data.weekly} />
                </Card>
                <Card title="关键观察">
                  <KeyObservations keyObs={data.key_obs} total={data.kpis.total_games} />
                </Card>
              </div>

              <Card title="一周 × 小时热力图">
                <HourHeatmap matrix={data.hour_dow} />
              </Card>

              <div className="rc-grid rc-grid--2">
                <Card title="玩家榜：参与局数" desc="最稳定出没的人在这里。">
                  <BarList rgb={CHART.blue} rows={data.players.slice(0, 12).map((p) => ({ name: p.nickname, value: p.games, label: `${p.games}局`, tip: `${p.nickname}｜${p.games}局｜${p.player_hours.toFixed(1)}小时｜活跃${p.days}天` }))} />
                </Card>
                <Card title="玩家榜：游玩时长" desc="按玩家小时排序，反映“陪伴了多久”。">
                  <BarList rgb={CHART.purple} rows={[...data.players].sort((a, b) => b.player_hours - a.player_hours).slice(0, 12).map((p) => ({ name: p.nickname, value: p.player_hours, label: `${p.player_hours.toFixed(1)}h`, tip: `${p.nickname}｜${p.player_hours}小时｜${p.games}局｜活跃${p.days}天` }))} />
                </Card>
              </div>

              <Card title="完整玩家排行" desc="可搜索玩家名，也可点击表头按局数、小时、天数或最近出现排序。">
                <PlayerTable players={data.players} />
              </Card>

              <div className="rc-grid rc-grid--2">
                <Card title="对局名称：开局次数" desc="按日志原始对局名称统计，数字房名保留原样。">
                  <BarList rgb={CHART.green} rows={roomCountRows} />
                </Card>
                <Card title="对局名称：玩家时长" desc="更能体现哪些模式 / 房间留下了最多共同时间。">
                  <BarList rgb={CHART.orange} rows={roomHourRows} />
                </Card>
              </div>

              <div className="rc-grid rc-grid--3">
                <Card title="持续时间分布">
                  <BarList rgb={CHART.blue} rows={data.duration_buckets.map((b) => ({ name: b.label, value: b.count, label: `${b.count}局`, tip: `${b.label}｜${b.count}局` }))} />
                </Card>
                <Card title="人数规模分布">
                  <BarList rgb={CHART.purple} rows={data.size_buckets.map((b) => ({ name: `${b.size}人`, value: b.count, label: `${b.count}局`, tip: `${b.size}人局｜${b.count}局｜${b.player_hours.toFixed(1)}玩家小时` }))} />
                </Card>
                <Card title="结束质量">
                  <div className="rc-donuts">
                    <Donut pct={data.finish.overall_pct} label="整体正常" />
                    <Donut pct={data.finish.multi_pct} label="多人局正常" />
                  </div>
                  <div className="rc-metrics" style={{ marginTop: 14 }}>
                    <div className="rc-metric"><span>正常结束</span><b>{data.finish.finished} 局</b></div>
                    <div className="rc-metric"><span>未正常结束</span><b>{data.finish.unfinished} 局</b></div>
                    <div className="rc-metric"><span>8+ 人局正常率</span><b>{data.finish.big_rate}%</b></div>
                  </div>
                </Card>
              </div>

              <div className="rc-grid rc-grid--2">
                <Card title="常见搭档榜" desc="统计同一局一起出现的玩家组合，适合回顾“老搭子”。">
                  <MiniTable head={['#', '常见搭档', '同场局数', '同场小时', '最近同场']}
                    rows={data.pairs.map((p, i) => [i + 1, `${p.a} × ${p.b}`, p.count, p.hours.toFixed(1), p.last])} />
                </Card>
                <Card title="星期分布" desc="周末与周五往往最活跃，平日多以小局为主。">
                  <MiniTable head={['星期', '局数', '玩家数', '玩家小时', '均人']}
                    rows={data.weekday_dist.map((w) => [w.label, w.count, w.players, w.player_hours.toFixed(1), w.avg_size])} />
                </Card>
              </div>

              <Card title="最长对局 Top 10" desc="这些是本期最容易被记住的长局。">
                <MiniTable head={['开始时间', '对局', '人数', '持续', '结束', '玩家']}
                  rows={data.longest_games.map((g) => [
                    g.start, g.name, `${g.player_count}人`, g.duration_label,
                    g.finished ? <Tag className="rc-tag--ok" key="t">正常</Tag> : <Tag className="rc-tag--no" key="t">未正常</Tag>,
                    g.players.length > 8 ? `${g.players.slice(0, 8).join('、')} 等${g.players.length}人` : g.players.join('、'),
                  ])} />
              </Card>

              <Card title="对局名称明细 Top 15" desc="同时展示局数、玩家小时、平均人数、中位时长与正常率。">
                <MiniTable head={['#', '对局名称', '局数', '玩家小时', '均人', '中位时长', '正常率']}
                  rows={data.rooms.slice(0, 15).map((r, i) => [
                    i + 1, r.name, r.count, r.player_hours.toFixed(1), r.avg_size,
                    r.median_minutes < 60 ? `${r.median_minutes.toFixed(1)}m` : `${(r.median_minutes / 60).toFixed(1)}h`,
                    `${Math.round(r.finished_rate * 100)}%`,
                  ])} />
              </Card>

              <div className="rc-note">
                <b>口径说明：</b>报告按测试服对局日志记录生成。“玩家小时” = <code>对局持续时间 × 玩家数量</code>，用于衡量社区投入，不代表精确在线时长；“对局名称”保留日志原始写法。
                数据范围：{data.period.start_full} 至 {data.period.end_full}；原始日志行数合计 {data.period.total_log_lines.toLocaleString()}。
                <span className="rc-note__gen">生成时间：{data.generated_at}</span>
              </div>
            </>
          ) : (
            <div className="rc-center"><Empty description="暂无数据" /></div>
          )}
        </div>
      </Content>
      <Footer />
    </Layout>
  );
};

export default ReportPage;
