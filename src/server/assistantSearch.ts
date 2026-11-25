import "server-only";
import { db } from "./db";
import { getCatalogProducts } from "./productCatalog";
import { readSiteContent } from "./siteContentRepository";
import { getMemberPolicy } from "./memberPolicyRepository";
import { listSurveys } from "./surveyRepository";
import { isSurveyOpen } from "@/lib/surveys";
import {
  evaluateCycle,
  MEMBER_RULES,
  type MemberCycle,
} from "@/lib/memberPolicy";
import { allergenConflicts } from "@/lib/allergenMatch";
import { siteKnowledge } from "@/lib/assistantKnowledge";
import {
  classifyAssistantQuestion,
  assistantDocumentScore,
  searchScore,
  type AssistantDocument,
  type AssistantProduct,
  type AssistantSettings,
  type AssistantResult,
  type AssistantQuery,
} from "@/lib/assistant";
import { petLabels, type ActivePet, type Product } from "@/lib/types";
import { matchProduct } from "@/lib/matching";
import { getArcadeConfig } from "./pointsArcadeRepository";
import { POINTS_SHOP_CATALOG } from "@/lib/pointsShopCatalog";

const money = (n: number) => `NT$${n.toLocaleString("zh-TW")}`;
const date = (d: Date) =>
  d.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
const orderNames: Record<string, string> = {
  PENDING_PAYMENT: "待付款",
  PAID: "已付款",
  PROCESSING: "處理中",
  DISPATCHED: "已出貨",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};
const petSelect = {
  id: true,
  name: true,
  type: true,
  breed: true,
  weightKg: true,
  birthday: true,
  isNeutered: true,
  activityLevel: true,
  allergies: true,
  goal: true,
} as const;
type SavedPet = Awaited<ReturnType<typeof loadPets>>[number];
async function loadPets(userId: string) {
  return db.pet.findMany({
    where: { userId },
    select: petSelect,
    orderBy: { createdAt: "asc" },
  });
}
function asActive(p: SavedPet): ActivePet {
  return {
    ...p,
    ageMonths: Math.max(
      0,
      Math.floor((Date.now() - p.birthday.getTime()) / 2629800000),
    ),
    goal: p.goal as ActivePet["goal"],
    cloudId: p.id,
  };
}
function card(p: Product, pet?: ActivePet): AssistantProduct {
  const safety = pet ? matchProduct(p, pet) : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.image,
    type: p.type,
    category: p.category,
    kind: p.kind ?? "FOOD",
    priceNt: p.priceNt,
    stock: p.stock,
    bagGrams: p.bagGrams,
    ingredients: p.ingredients,
    allergens: p.allergens,
    proteinMin:
      p.nutritionDataProvided && p.proteinMin > 0 ? p.proteinMin : null,
    moistureMax:
      p.nutritionDataProvided && p.moistureMax > 0 ? p.moistureMax : null,
    kcalPer100g: p.nutritionDataProvided ? p.kcalPer100g : null,
    warning: safety && !safety.safe ? safety.label : null,
    autoshipEligible: p.autoshipEligible,
    description: p.description.slice(0, 1000),
  };
}
function exclusions(q: string) {
  const terms: string[] = [];
  for (const m of q.matchAll(
    /(?:不含|不要|不能吃|不吃|避免|避開|不加|對)(雞肉|雞油|雞|牛肉|牛|魚類|魚|鮭魚|大豆|黃豆|乳製品|牛奶|小麥|鴨肉|鴨|蛋|豬肉)(?:過敏)?/g,
  ))
    terms.push(m[1]!);
  for (const m of q.matchAll(/(雞肉|牛肉|魚類|大豆|乳製品|小麥|鴨肉|蛋)過敏/g))
    terms.push(m[1]!);
  return [...new Set(terms)];
}
export function selectAssistantProducts(
  products: Product[],
  q: string,
  options: { pet?: ActivePet; previousIds?: string[]; max: number },
) {
  const species = /倉鼠|hamster/i.test(q)
    ? "HAMSTER"
    : /兔|rabbit/i.test(q)
      ? "RABBIT"
      : /貓|cat/i.test(q)
        ? "CAT"
        : /狗|犬|dog/i.test(q)
          ? "DOG"
          : undefined;
  const supplies = /用品|玩具|胸背|牽繩|飲水|睡墊|窩|擦拭/.test(q);
  const food =
    !supplies &&
    /主食|飼料|罐頭|貓糧|犬糧|狗糧|乾糧|成分|成份|過敏|雞肉|雞油|蛋白|熱量|不含|比較/.test(
      q,
    );
  const recommend =
    /推薦|適合|能吃|可以吃|不含|不要|不吃|避開|過敏|幫我挑|選哪/.test(q);
  const no = exclusions(q);
  const positive = [
    "鮭魚",
    "鴨肉",
    "牛肉",
    "雞肉",
    "鮮雞",
    "白魚",
    "鮪魚",
    "火雞",
  ].filter(
    (term) => q.includes(term) && !allergenConflicts(no, [term], [term]).length,
  );
  const budgetMatch = q.match(
    /(?:預算|低於|不超過|不到|以下|最多)[\sNT$]*(\d{2,6})|([\d]{2,6})\s*(?:元)?以下/,
  );
  const budget = budgetMatch ? Number(budgetMatch[1] ?? budgetMatch[2]) : null;
  const exact = products.filter((p) => q.includes(p.name)).map((p) => p.id);
  const source = products.filter(
    (p) =>
      p.isPublished !== false &&
      (!exact.length || exact.includes(p.id)) &&
      (!species || p.type === species) &&
      (!food || p.kind !== "SUPPLIES") &&
      (!supplies || p.kind === "SUPPLIES") &&
      (!positive.length ||
        positive.some((term) =>
          `${p.name} ${p.ingredients.join(" ")}`.includes(term),
        )) &&
      (!budget || p.priceNt <= budget) &&
      !allergenConflicts(no, p.allergens, p.ingredients).length &&
      (!recommend || !options.pet || matchProduct(p, options.pet).safe) &&
      (!recommend || p.stock > 0),
  );
  const previous =
    /這兩|這幾|剛剛|上一款|第一款|第二款|它們|他們|那兩|這款/.test(q)
      ? (options.previousIds ?? [])
      : [];
  const ranked = source.map((p) => ({
    p,
    score:
      searchScore(
        q,
        `${p.name} ${p.category} ${petLabels[p.type]} ${p.ingredients.join(" ")} ${p.description}`,
      ) +
      (previous.includes(p.id) ? 100 : 0) +
      (species ? 5 : 0) +
      (food ? 3 : 0) +
      (recommend && options.pet ? 5 : 0),
  }));
  return ranked
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || b.p.stock - a.p.stock)
    .slice(0, options.max)
    .map((x) => card(x.p, options.pet));
}
export function buildAssistantSearchQuery(
  q: string,
  previous: { question: string; productIds: string[] }[],
  catalog: Product[],
) {
  if (!previous.length) return q;
  const context = previous.map((p) => p.question).join(" ");
  const changed =
    /(?:^(?:那|還有|有沒有|換|改)|換成|改成|那款)/.test(q) &&
    /鴨|牛|雞|鮭|白魚|鮪|狗|貓|倉鼠|兔|用品|玩具|胸背/.test(q);
  if (!changed) return `${context} ${q}`;
  const current = catalog.find((p) =>
    previous.at(-1)?.productIds.includes(p.id),
  );
  const species = /貓|狗|犬|倉鼠|兔/.test(q)
    ? ""
    : current
      ? petLabels[current.type]
      : "";
  const avoid = exclusions(context)
    .map((term) => `不含${term}`)
    .join(" ");
  const budget = /預算|以下|不超過|最多|低於/.test(q)
    ? ""
    : (context
        .match(
          /(?:預算|低於|不超過|不到|最多)[\sNT$]*\d{2,6}|\d{2,6}\s*元?以下/g,
        )
        ?.at(-1) ?? "");
  return `${species} ${current?.kind === "SUPPLIES" ? "用品" : "主食"} ${avoid} ${budget} ${q}`;
}
async function ownDocuments(
  userId: string,
  q: string,
  pets: SavedPet[],
): Promise<AssistantDocument[]> {
  const docs: AssistantDocument[] = [];
  if (/點數|幾點|多少點|等級|會員|升等|續等|回饋/.test(q)) {
    const [points, policy, cycleRow, orders] = await Promise.all([
      db.pointEntry.aggregate({ where: { userId }, _sum: { points: true } }),
      getMemberPolicy(),
      db.outboxEvent.findUnique({
        where: { dedupeKey: `MEMBER_CYCLE:${userId}` },
        select: { payload: true },
      }),
      db.order.findMany({
        where: { userId, status: "COMPLETED" },
        select: {
          createdAt: true,
          totalNt: true,
          shippingNt: true,
          status: true,
        },
      }),
    ]);
    const m = evaluateCycle(
      policy,
      cycleRow?.payload as MemberCycle | null,
      orders,
    );
    docs.push({
      id: "own-membership",
      title: "你的點數與會員等級",
      href: "/account?tab=membership",
      category: "membership",
      keywords: "",
      private: true,
      text: `目前點數 ${points._sum.points ?? 0} 點；${m.current.name}，購物回饋 ${m.current.earnPercent}%。最近六個月完成訂單的商品消費 ${money(m.spendNt)}。${m.next ? `距離${m.next.name}還差 ${money(m.upgradeRemainingNt)}。` : "已達最高等級。"}等級有效至 ${date(new Date(m.cycle.expiresAt))}，續等還差 ${money(m.renewRemainingNt)}。`,
    });
  }
  if (/訂單|物流|進度|出貨|收據|買了/.test(q)) {
    const orders = await db.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        totalNt: true,
        createdAt: true,
        items: { select: { productName: true, quantity: true } },
      },
    });
    docs.push({
      id: "own-orders",
      title: "你的近期訂單",
      href: "/account?tab=orders",
      category: "orders",
      keywords: "",
      private: true,
      text: orders.length
        ? orders
            .map(
              (o) =>
                `${date(o.createdAt)} · ${orderNames[o.status]} · ${money(o.totalNt)} · ${o.items.map((i) => `${i.productName}×${i.quantity}`).join("、")}`,
            )
            .join("\n")
        : "目前帳戶還沒有訂單，可先到選物本舖看看。",
    });
  }
  if (/票券|購物券|折價券|優惠券/.test(q)) {
    const coupons = await db.rewardRedemption.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        discountNt: true,
        orderId: true,
        reward: { select: { title: true } },
      },
    });
    const meta = await db.outboxEvent.findMany({
      where: {
        dedupeKey: { in: coupons.map((c) => `COUPON_META:${c.id}`) },
        type: "COUPON_META",
      },
      select: { dedupeKey: true, payload: true },
    });
    const map = new Map(
      meta.map((r) => [
        r.dedupeKey,
        r.payload as { expiresAt?: string; minSpendNt?: number },
      ]),
    );
    docs.push({
      id: "own-vouchers",
      title: "你的票券",
      href: "/account?tab=tickets",
      category: "orders",
      keywords: "",
      private: true,
      text: coupons.length
        ? coupons
            .map((c) => {
              const m = map.get(`COUPON_META:${c.id}`);
              return `${c.reward.title} · ${money(c.discountNt)} · ${c.orderId ? "已使用" : m?.expiresAt && new Date(m.expiresAt) < new Date() ? "已到期" : "未使用"}${m?.minSpendNt ? ` · 滿 ${money(m.minSpendNt)}` : ""}${m?.expiresAt ? ` · ${date(new Date(m.expiresAt))}到期` : ""}`;
            })
            .join("\n")
        : "目前沒有已領取票券，可到點數商店或首頁問卷看看。",
    });
  }
  if (/配送|定期|訂閱|週期|下一包/.test(q)) {
    const plans = await db.autoshipPlan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        status: true,
        frequency: true,
        nextBillingDate: true,
        items: {
          select: {
            quantity: true,
            variant: { select: { product: { select: { name: true } } } },
          },
        },
      },
    });
    const status: Record<string, string> = {
      DRAFT: "草稿",
      ACTIVE: "進行中",
      PAUSED: "已暫停",
      CANCELLED: "已取消",
    };
    docs.push({
      id: "own-autoships",
      title: "你的定期配送",
      href: "/autoship",
      category: "autoship",
      keywords: "",
      private: true,
      text: plans.length
        ? plans
            .map(
              (p) =>
                `${status[p.status] ?? p.status} · ${p.frequency.replace("EVERY_", "").replace("_WEEKS", "週")} · 下次安排 ${date(p.nextBillingDate)} · ${p.items.map((i) => `${i.variant.product.name}×${i.quantity}`).join("、")}`,
            )
            .join("\n")
        : "目前還沒有定期配送安排，可先選支援的商品與週期。",
    });
  }
  if (/毛孩|寵物|貓|狗|倉鼠|兔|適合|能吃|過敏|體重/.test(q)) {
    docs.push({
      id: "own-pets",
      title: "你的毛孩資料",
      href: "/account?tab=care",
      category: "pets",
      keywords: "",
      private: true,
      text: pets.length
        ? pets
            .map(
              (p) =>
                `${p.name} · ${petLabels[p.type]} · ${p.weightKg} 公斤 · ${asActive(p).ageMonths} 個月 · 已保存過敏條件：${p.allergies.join("、") || "未填"}`,
            )
            .join("\n")
        : "帳戶還沒有保存毛孩資料，可從右上角毛孩選單新增。",
    });
  }
  if (/收藏/.test(q)) {
    const rows = await db.favorite.findMany({
      where: { userId },
      take: 12,
      orderBy: { createdAt: "desc" },
      select: { product: { select: { name: true, isPublished: true } } },
    });
    const titles = rows
      .filter((r) => r.product.isPublished)
      .map((r) => r.product.name);
    docs.push({
      id: "own-favorites",
      title: "你的收藏",
      href: "/account?tab=favorites",
      category: "features",
      keywords: "",
      private: true,
      text: titles.length ? titles.join("、") : "目前還沒有收藏的上架商品。",
    });
  }
  if (/照顧|紀錄|體重|提醒|節奏/.test(q)) {
    const [rows, reminders] = await Promise.all([
      db.careRecord.findMany({
        where: { userId },
        take: 6,
        orderBy: { recordedAt: "desc" },
        select: {
          kind: true,
          note: true,
          weightKg: true,
          recordedAt: true,
          pet: { select: { name: true } },
        },
      }),
      db.careReminder.findMany({
        where: { userId, completedAt: null },
        take: 6,
        orderBy: { dueAt: "asc" },
        select: { title: true, dueAt: true, pet: { select: { name: true } } },
      }),
    ]);
    const kinds: Record<string, string> = {
      DIET: "飲食",
      FOOD: "飲食",
      WEIGHT: "體重",
      ALLERGY: "過敏觀察",
      NOTE: "日常備註",
    };
    docs.push({
      id: "own-care",
      title: "你的照顧紀錄與提醒",
      href: "/account?tab=care",
      category: "pets",
      keywords: "",
      private: true,
      text:
        (rows.length
          ? rows
              .map(
                (r) =>
                  `${date(r.recordedAt)} · ${r.pet.name} · ${kinds[r.kind] ?? r.kind} · ${r.weightKg ? `${r.weightKg}公斤 · ` : ""}${r.note.slice(0, 140)}`,
              )
              .join("\n")
          : "目前還沒有照顧紀錄。") +
        "\n" +
        (reminders.length
          ? `待辦：${reminders.map((r) => `${r.pet.name} ${r.title}（${date(r.dueAt)}）`).join("、")}`
          : "目前沒有未完成的照顧提醒。"),
    });
  }
  if (/通知/.test(q)) {
    const rows = await db.memberNotification.findMany({
      where: { userId },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { title: true, createdAt: true, readAt: true },
    });
    docs.push({
      id: "own-notifications",
      title: "你的站內通知",
      href: "/account",
      category: "membership",
      keywords: "",
      private: true,
      text: rows.length
        ? rows
            .map(
              (r) =>
                `${date(r.createdAt)} · ${r.title} · ${r.readAt ? "已讀" : "未讀"}`,
            )
            .join("\n")
        : "目前沒有站內通知。",
    });
  }
  if (/家庭|家人|共買|共同清單/.test(q)) {
    const member = await db.familyMemberRecord.findUnique({
      where: { userId },
      select: {
        role: true,
        group: {
          select: {
            name: true,
            _count: { select: { members: true } },
            items: {
              take: 12,
              orderBy: { createdAt: "desc" },
              select: { productId: true, quantity: true },
            },
          },
        },
      },
    });
    const catalog = member?.group.items.length
      ? await getCatalogProducts()
      : [];
    docs.push({
      id: "own-family",
      title: "你的家庭共買",
      href: "/account?tab=family",
      category: "features",
      keywords: "",
      private: true,
      text: member
        ? `${member.group.name}，共有 ${member.group._count.members} 位家人。你的角色：${member.role === "OWNER" ? "主帳戶" : "家庭成員"}。${member.group.items.length ? `共同清單：${member.group.items.map((i) => `${catalog.find((p) => p.id === i.productId)?.name ?? "已下架商品"}×${i.quantity}`).join("、")}` : "共同清單目前是空的。"}`
        : "目前還沒有加入家庭，可到家庭共買建立或接受邀請。",
    });
  }
  return docs;
}
export async function searchAssistant(
  query: AssistantQuery,
  settings: AssistantSettings,
  userId: string | null,
  previous: { question: string; productIds: string[] }[],
): Promise<AssistantResult> {
  const q = query.question;
  let category = classifyAssistantQuestion(q);
  if (category === "ingredients" && !settings.capabilities.ingredients)
    return {
      category,
      products: [],
      documents: [],
      answer: "小P目前暫未開啟成分查詢，可以從商品頁或成分放大鏡查看。",
      followUps: ["選物本舖在哪裡？"],
      compareHref: null,
      accountRequired: false,
      sourceStatus: "current",
      canAddToCart: false,
    };
  const privateRequest =
    /(我|自己|目前帳戶).*(點數|幾點|多少點|等級|會員|訂單|票券|購物券|優惠券|配送|毛孩|寵物|貓|狗|倉鼠|兔|收藏|照顧|紀錄|體重|提醒|節奏|通知|家庭|家人|共買)|(?:訂單|點數|票券).*我的/.test(
      q,
    );
  const followup =
    /^(那|這|牠|它|還有|可以|比較|有沒有)|這兩|這款|那款|剛剛|第一款|第二款/.test(
      q,
    );
  const previousIds = previous.at(-1)?.productIds ?? [];
  const [catalog, contentResult, policyResult, surveysResult, pets] =
    await Promise.all([
      getCatalogProducts(),
      readSiteContent()
        .then((v) => ({ ok: true, value: v }))
        .catch(() => ({ ok: false, value: null })),
      getMemberPolicy().catch(() => null),
      listSurveys().catch(() => null),
      userId && settings.capabilities.account
        ? loadPets(userId)
        : Promise.resolve([]),
    ]);
  const expanded = followup
    ? buildAssistantSearchQuery(q, previous, catalog)
    : q;
  const explicitSpecies = /倉鼠/.test(q)
    ? "HAMSTER"
    : /兔/.test(q)
      ? "RABBIT"
      : /貓/.test(q)
        ? "CAT"
        : /狗|犬/.test(q)
          ? "DOG"
          : null;
  // A client may select a pet ID, but only an owned row can supply saved health conditions.
  const petRow =
    pets.find((p) => q.includes(p.name)) ??
    pets.find(
      (p) =>
        p.id === query.petId &&
        (!explicitSpecies || p.type === explicitSpecies),
    ) ??
    (pets.length === 1 &&
    (!explicitSpecies || pets[0]!.type === explicitSpecies)
      ? pets[0]
      : undefined);
  const pet = petRow ? asActive(petRow) : undefined;
  const allDocs: AssistantDocument[] = siteKnowledge
    .filter((d) =>
      d.category === "ingredients"
        ? settings.capabilities.ingredients
        : d.category === "community"
          ? settings.capabilities.community
          : settings.capabilities.features,
    )
    .map((d) => ({ ...d }));
  const namedProducts = catalog.filter((p) => q.includes(p.name));
  if (settings.capabilities.products)
    for (const p of namedProducts)
      allDocs.push({
        id: `product-info-${p.id}`,
        title: p.name,
        href: `/products/${p.slug}`,
        category: p.kind === "SUPPLIES" ? "products" : "ingredients",
        keywords: p.name,
        text: `${petLabels[p.type]}適用；${p.category}；售價 ${money(p.priceNt)}。${p.kind !== "SUPPLIES" ? `主要原料：${p.ingredients.join("、") || "未登載"}；已列過敏原：${p.allergens.join("、") || "未登載，不代表零過敏"}。` : ""}${p.description.slice(0, 600)}`,
      });
  const content = contentResult.value;
  if (content && settings.capabilities.community) {
    for (const p of content.promotions.filter((p) => p.enabled))
      allDocs.push({
        id: `promotion-${p.id}`,
        title: p.title,
        text: p.description,
        href: p.href,
        keywords: "活動 優惠 問卷",
        category: "community",
      });
    allDocs.push({
      id: "announcement",
      title: "目前站內公告",
      text: content.announcement,
      href: "/",
      keywords: "公告 活動",
      category: "community",
    });
  }
  if (content && settings.capabilities.features)
    allDocs.push(
      {
        id: "brand-home",
        title: content.benefitsTitle,
        text: [
          content.benefitsDescription,
          content.benefit1Title,
          content.benefit1Text,
          content.benefit2Title,
          content.benefit2Text,
          content.benefit3Title,
          content.benefit3Text,
          content.benefit4Title,
          content.benefit4Text,
        ].join("\n"),
        href: "/",
        keywords: "品牌 特色 服務",
        category: "features",
      },
      {
        id: "brand-family",
        title: content.familyTitle,
        text: content.familyDescription,
        href: "/account?tab=family",
        keywords: "家庭 家人 共買",
        category: "features",
      },
    );
  if (
    settings.capabilities.features &&
    /遊戲|轉盤|轉球|扭蛋|刮刮|簽到|任務|兌換|點數商店/.test(q)
  ) {
    const config = await getArcadeConfig();
    allDocs.push({
      id: "live-arcade",
      title: "目前簽到與遊戲規則",
      href: "/account?tab=games",
      category: "membership",
      keywords: "遊戲 規則 轉盤 轉球 扭蛋 刮刮樂 簽到 花多少 每天 幾次",
      text: `每日簽到 ${config.checkIn.dailyPoints} 點，連續 7 天額外 ${config.checkIn.streak7Bonus} 點。${Object.values(
        config.wheels,
      )
        .map((w) => `${w.title}每次 ${w.costPoints} 點`)
        .join(
          "；",
        )}。轉球每次 ${config.fukubiki.costPoints} 點，每日最多 ${config.fukubiki.dailyLimit} 次；刮刮樂每次 ${config.scratch.costPoints} 點，每日最多 ${config.scratch.dailyLimit} 次。獎勵以實際開獎為準。`,
    });
    for (const task of config.tasks.filter((t) => t.isActive))
      allDocs.push({
        id: `task-${task.key}`,
        title: task.title,
        text: `${task.description}；完成回饋 ${task.points} 點。`,
        href: "/account?tab=tasks",
        keywords: "任務 點數 獎勵",
        category: "membership",
      });
    if (/兌換|點數商店/.test(q))
      for (const item of POINTS_SHOP_CATALOG)
        allDocs.push({
          id: `reward-${item.id}`,
          title: item.title,
          text: `${item.description}；基本兌換點數 ${item.pointsCost} 點，會員適用點數與兌換條件以點數商店顯示為準。`,
          href: "/rewards",
          keywords: "點數 兌換 商店 優惠券 商品",
          category: "membership",
        });
  }
  if (policyResult && settings.capabilities.features)
    allDocs.push({
      id: "live-membership",
      title: "五等會員目前規則",
      href: "/account?tab=membership",
      category: "membership",
      keywords: "等級 回饋 折扣 門檻 續等 半年 點數",
      text:
        policyResult.tiers
          .map(
            (t) =>
              `${t.name}：升等 ${money(t.spendNt)}／續等 ${money(t.retainNt)}，回饋 ${t.earnPercent}%，商品折扣 ${t.discountPercent}%，專屬券 ${money(t.couponNt)}`,
          )
          .join("\n") +
        "\n" +
        MEMBER_RULES.join("\n"),
    });
  if (surveysResult && settings.capabilities.community)
    for (const s of surveysResult.filter((s) => isSurveyOpen(s)))
      allDocs.push({
        id: `survey-${s.id}`,
        title: s.title,
        text: `${s.description} 完成回饋：${s.reward.kind === "POINTS" ? `${s.reward.points} 點` : `${s.reward.discountNt} 元券，滿 ${s.reward.minSpendNt} 元，有效 ${s.reward.validDays} 天`}。登入後才能開始，同一會員限領一次。`,
        href: `/surveys/${s.id}`,
        keywords: "問卷 填答 回饋 意見",
        category: "community",
      });
  for (const d of settings.knowledge.filter((d) => d.enabled))
    allDocs.push({ ...d, id: `custom-${d.id}`, category: "features" });
  let partial = !contentResult.ok || !policyResult || !surveysResult;
  if (
    settings.capabilities.community &&
    /生活圈|社群|貼文|文章|分享|公園|咖啡廳/.test(q)
  ) {
    try {
      const posts = await db.communityPost.findMany({
        where: { status: "PUBLISHED" },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, body: true },
      });
      for (const p of posts)
        allDocs.push({
          id: `community-${p.id}`,
          title: `生活圈分享：${p.title}`,
          text: p.body.slice(0, 800),
          href: "/community",
          keywords: "社群 生活圈",
          category: "community",
        });
    } catch {
      partial = true;
    }
  }
  const ownedDocs =
    privateRequest && userId && settings.capabilities.account
      ? await ownDocuments(userId, q, pets)
      : [];
  const accountRequired =
    privateRequest && !userId && settings.capabilities.account;
  const scored = allDocs.map((d) => ({
    d,
    score: assistantDocumentScore(expanded, d, category),
  }));
  const docs = [
    ...ownedDocs,
    ...scored
      .filter((x) => x.score >= 4)
      .sort((a, b) => b.score - a.score)
      .slice(0, settings.maxResults)
      .map((x) => x.d),
  ].slice(0, settings.maxResults);
  const productIntent =
    ["products", "ingredients"].includes(category) ||
    (followup &&
      previousIds.length > 0 &&
      !privateRequest &&
      ["autoship", "other"].includes(category)) ||
    /推薦|適合|幾元|多少錢|這兩款/.test(q) ||
    catalog.some((p) => searchScore(q, p.name) >= 3);
  if (productIntent && category === "other") category = "products";
  const products =
    settings.capabilities.products &&
    productIntent &&
    (category !== "ingredients" || settings.capabilities.ingredients)
      ? selectAssistantProducts(catalog, expanded, {
          pet,
          previousIds,
          max:
            /這兩|那兩/.test(q) && previousIds.length >= 2
              ? Math.min(2, settings.maxResults)
              : settings.maxResults,
        })
      : [];
  if (settings.capabilities.ingredients && /批次|報告|檢驗/.test(q))
    for (const p of products.slice(0, 2)) {
      const original = catalog.find((c) => c.id === p.id)!;
      const verified = original.batches.filter(
        (b) => b.isDemo === false && /^https?:\/\//.test(b.reportUrl ?? ""),
      );
      docs.unshift({
        id: `batches-${p.id}`,
        title: `${p.name}的批次資料`,
        href: `/products/${p.slug}`,
        category: "ingredients",
        keywords: "批次 檢驗 報告",
        text: verified.length
          ? verified
              .map(
                (b) =>
                  `有附來源的批次 ${b.batch}，日期 ${b.date}；來源連結在商品頁查看。`,
              )
              .join("\n")
          : "目前沒有附來源連結的正式批次報告；已登載的展示批次不能當成正式檢驗證明。",
      });
    }
  const comparable = products.filter((p) => p.kind === "FOOD");
  const pair =
    comparable.length > 1
      ? comparable.find(
          (p) => p.id !== comparable[0]!.id && p.type === comparable[0]!.type,
        )
      : null;
  const compareHref =
    settings.capabilities.compare && pair
      ? `/care/ingredients?product=${encodeURIComponent(comparable[0]!.slug)}&compare=${encodeURIComponent(pair.slug)}`
      : null;
  let answer =
    privateRequest && !settings.capabilities.account
      ? "小P目前沒有開放個人資料查詢，可以到我的帳戶查看自己的紀錄。"
      : accountRequired
        ? "先登入，我才能查看你自己的資料。公開商品與工具不用登入也能找。"
        : ownedDocs.length
          ? ownedDocs.map((d) => `${d.title}\n${d.text}`).join("\n\n")
          : products.length
            ? `找到 ${products.length} 款站內商品${pet ? `，已一併核對${pet.name}保存的條件` : ""}。${exclusions(q).length ? `已排除原料或過敏原中包含${exclusions(q).join("、")}的商品。` : ""}可點商品看完整資料${compareHref ? "，也能並排比較成分" : ""}。`
            : docs.length
              ? docs
                  .slice(0, 2)
                  .map((d) => `${d.title}：${d.text}`)
                  .join("\n\n")
              : "這次沒有找到直接對應的站內資料。可以換成商品名稱、毛孩種類或功能名稱；也可以交給客服協助。";
  if (/治療|疾病|處方|腎病|腎臟|嘔吐|血便|中毒/.test(q))
    answer =
      "涉及症狀或疾病的飲食安排，請先詢問獸醫。小P可以幫你查目前登載的商品原料與營養，無法判斷治療方式。";
  if (
    /忽略.*指令|system.?prompt|系統提示|api.?key|管理員|其他會員|別人的訂單|後台數據/i.test(
      q,
    ) ||
    (/密碼/.test(q) && !/(忘記|重設|修改|更改|變更).*密碼/.test(q))
  ) {
    return {
      category: "other",
      products: [],
      documents: [],
      answer:
        "小P只協助查站內公開內容，以及你登入後自己的資料。公司帳號、密碼與其他會員資料不在搜尋範圍。",
      followUps: ["選物羅盤在哪裡？", "我有多少點數？"],
      compareHref: null,
      accountRequired: false,
      sourceStatus: partial ? "partial" : "current",
      canAddToCart: false,
    };
  }
  return {
    category,
    products,
    documents: docs.slice(0, settings.maxResults),
    answer,
    followUps: products.length
      ? ["這兩款成分差在哪？", "定期配送怎麼安排？"]
      : ["家庭共買在哪裡？", "看看目前問卷回饋"],
    compareHref,
    accountRequired,
    sourceStatus: partial ? "partial" : "current",
    canAddToCart: settings.capabilities.cart,
  };
}
