import { useState, useRef, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://qkdorvgmqfruqpbpkmnm.supabase.co";
const SUPABASE_KEY = "qkdorvgmqfruqpbpkmnm";

const sbGet = async (key) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shared_data?key=eq.${encodeURIComponent(key)}&select=value`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const data = await res.json();
  return data?.[0]?.value ? JSON.parse(data[0].value) : null;
};

const sbSet = async (key, value) => {
  await fetch(`${SUPABASE_URL}/rest/v1/shared_data`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() })
  });
};

const SYSTEM_PROMPT = `당신은 전문 요리사이자 영양사입니다. 주어진 조건에 맞는 레시피 5개를 추천해주세요.

반드시 아래 형식을 정확히 지켜서 답하세요.

===RECIPE_START===
이름: (레시피 이름)
이모지: (음식 이모지 1개)
시간: (예: 20분)
난이도: 쉬움 또는 보통 또는 어려움
칼로리: (1인분 기준, 예: 약 450kcal)
카테고리: 밥 또는 국 또는 메인요리 또는 반찬 또는 간식 또는 디저트
사용재료: (쉼표로 구분)
추가재료: (없으면 없음)
영양: (주요 영양소 한 줄)
단계1: (조리 단계)
단계2: (조리 단계)
단계3: (조리 단계)
단계4: (있으면 추가, 없으면 생략)
단계5: (있으면 추가, 없으면 생략)
단계6: (있으면 추가, 없으면 생략)
단계7: (있으면 추가, 없으면 생략)
단계8: (있으면 추가, 없으면 생략)
단계9: (있으면 추가, 없으면 생략)
단계10: (있으면 추가, 없으면 생략)
팁: (요리 팁)
===RECIPE_END===

규칙:
- 건강 목표에 맞는 레시피를 추천 (다이어트면 저칼로리, 고단백이면 단백질 위주 등)
- 한식뿐 아니라 양식, 일식, 중식 등 다양하게 추천
- 지정된 카테고리에 맞는 레시피만 추천
- 단계가 적을 경우 억지로 늘리지 말고 필요한 만큼만 작성
- 단계에 "없음" 이라고 쓰지 마세요 — 해당 단계 자체를 생략하세요
- 위 형식 외 다른 텍스트 없이 답하세요`;

const AI_SEARCH_PROMPT = `당신은 전문 요리사이자 영양사입니다. 사용자의 검색어를 바탕으로 레시피 5개를 추천해주세요.

반드시 아래 형식을 정확히 지켜서 답하세요.

===RECIPE_START===
이름: (레시피 이름)
이모지: (음식 이모지 1개)
시간: (예: 20분)
난이도: 쉬움 또는 보통 또는 어려움
칼로리: (1인분 기준, 예: 약 450kcal)
카테고리: 밥 또는 국 또는 메인요리 또는 반찬 또는 간식 또는 디저트
사용재료: (쉼표로 구분)
추가재료: (없으면 없음)
영양: (주요 영양소 한 줄)
단계1: (조리 단계)
단계2: (조리 단계)
단계3: (조리 단계)
단계4: (있으면 추가, 없으면 생략)
단계5: (있으면 추가, 없으면 생략)
단계6: (있으면 추가, 없으면 생략)
단계7: (있으면 추가, 없으면 생략)
단계8: (있으면 추가, 없으면 생략)
단계9: (있으면 추가, 없으면 생략)
단계10: (있으면 추가, 없으면 생략)
팁: (요리 팁)
===RECIPE_END===

규칙:
- 검색어와 관련된 레시피를 최대한 다양하게 추천
- 한식뿐 아니라 양식, 일식, 중식 등 다양하게 추천
- 단계가 적을 경우 억지로 늘리지 말고 필요한 만큼만 작성
- 단계에 "없음" 이라고 쓰지 마세요 — 해당 단계 자체를 생략하세요
- 위 형식 외 다른 텍스트 없이 답하세요`;

const MEAL_PLAN_PROMPT = `당신은 전문 영양사입니다. 주어진 음식 재고와 건강 목표를 기반으로 식단을 짜주세요.

반드시 아래 형식을 정확히 지켜서 답하세요.

===DAY_START===
일차: (숫자)
아침: (음식 재고에서 선택, 없으면 빈칸)
아침간식: (음식 재고에서 선택, 없으면 빈칸)
점심: (음식 재고에서 선택, 없으면 빈칸)
점심간식: (음식 재고에서 선택, 없으면 빈칸)
저녁: (음식 재고에서 선택, 없으면 빈칸)
===DAY_END===

규칙:
- 반드시 제공된 음식 재고 목록에 있는 음식만 사용하세요
- 건강 목표에 맞게 식단을 구성하세요
- 같은 음식이 하루에 두 번 이상 나오지 않게 해주세요
- 재고가 부족하면 해당 칸은 비워두세요
- 위 형식 외 다른 텍스트 없이 답하세요`;

const FOOD_CATS = ["밥", "국", "메인요리", "반찬", "간식", "디저트"];
const CAT_EMOJI = { "밥": "🍚", "국": "🍲", "메인요리": "🍳", "반찬": "🥗", "간식": "🫐", "디저트": "☕" };
const CAT_COLOR = {
  "밥":    { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
  "국":    { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
  "메인요리":{ bg: "#fafafa", border: "#a1a1aa", text: "#18181b" },
  "반찬":  { bg: "#f0fdfa", border: "#5eead4", text: "#134e4a" },
  "간식":  { bg: "#fdf4ff", border: "#d8b4fe", text: "#581c87" },
  "디저트":{ bg: "#fff7ed", border: "#fdba74", text: "#9a3412" },
};

const HEALTH_GOALS = [
  { key: "일반", label: "일반식", emoji: "🍽", desc: "균형 잡힌 일반 식단" },
  { key: "다이어트", label: "다이어트", emoji: "🥗", desc: "저칼로리 · 포만감" },
  { key: "고단백", label: "고단백", emoji: "💪", desc: "단백질 위주 식단" },
  { key: "저탄수", label: "저탄수화물", emoji: "🥩", desc: "탄수화물 제한" },
  { key: "채식", label: "채식", emoji: "🌱", desc: "채소 · 식물성 위주" },
];

const DEFAULT_FRIDGE = ["달걀", "두부", "당근", "애호박", "브로콜리"];
const DEFAULT_PANTRY = ["쌀", "파스타", "감자", "양파", "올리브오일"];
const DEFAULT_FOCUS  = ["닭가슴살", "연어"];
const SK = { FRIDGE: "a_fridgeIngredients", PANTRY: "a_pantryIngredients", FOCUS: "a_focusIngredients", STOCK: "a_foodStock", PLANS: "a_mealPlans", SAVED: "a_savedRecipes", GOAL: "a_healthGoal", SERVINGS: "a_servings" };

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#71717a", pointerEvents: "none" }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", border: "1px solid #e4e4e7", borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 14, color: "#18181b", outline: "none", fontFamily: "inherit", background: "#fafafa" }} />
      {value && <button onClick={() => onChange("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#a1a1aa", fontSize: 16 }}>×</button>}
    </div>
  );
}

function FilterChips({ label, options, selected, onToggle, colorMap }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#71717a", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map(opt => {
          const active = selected.includes(opt);
          const c = colorMap?.[opt];
          return (
            <button key={opt} onClick={() => onToggle(opt)}
              style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid", borderColor: active ? (c?.text || "#18181b") : "#e4e4e7", background: active ? (c?.bg || "#f4f4f5") : "white", color: active ? (c?.text || "#18181b") : "#71717a", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RecipeApp() {
  const [tab, setTab] = useState("recipe");
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [healthGoal, setHealthGoal] = useState("일반");
  const [servings, setServings] = useState(2);
  const [category, setCategory] = useState("전체");
  const [fridgeItems, setFridgeItems] = useState(DEFAULT_FRIDGE);
  const [pantryItems, setPantryItems] = useState(DEFAULT_PANTRY);
  const [focusItems, setFocusItems] = useState(DEFAULT_FOCUS);
  const [activeSection, setActiveSection] = useState("fridge");
  const [editMode, setEditMode] = useState(false);
  const [newIngInput, setNewIngInput] = useState("");
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recipeView, setRecipeView] = useState("search");
  const [justSaved, setJustSaved] = useState({});
  const [addedToStock, setAddedToStock] = useState({});
  const [syncStatus, setSyncStatus] = useState("idle");
  const isComposing = useRef(false);

  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchError, setAiSearchError] = useState(null);
  const [aiSelectedRecipe, setAiSelectedRecipe] = useState(null);
  const [aiJustSaved, setAiJustSaved] = useState({});
  const [aiAddedToStock, setAiAddedToStock] = useState({});
  const aiIsComposing = useRef(false);

  const [savedSearch, setSavedSearch] = useState("");
  const [savedFilterCat, setSavedFilterCat] = useState([]);
  const [savedFilterDiff, setSavedFilterDiff] = useState([]);

  const [foodStock, setFoodStock] = useState({ 밥: [], 국: [], 메인요리: [], 반찬: [], 간식: [], 디저트: [] });
  const [stockCat, setStockCat] = useState("밥");
  const [stockInput, setStockInput] = useState("");
  const stockIsComposing = useRef(false);

  const [planDays, setPlanDays] = useState(3);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editCellVal, setEditCellVal] = useState("");

  useEffect(() => {
    (async () => {
      setSyncStatus("syncing");
      try {
        const load = async (k, def) => { try { const v = await sbGet(k); return v ?? def; } catch { return def; } };
        setFridgeItems(await load(SK.FRIDGE, DEFAULT_FRIDGE));
        setPantryItems(await load(SK.PANTRY, DEFAULT_PANTRY));
        setFocusItems(await load(SK.FOCUS, DEFAULT_FOCUS));
        setFoodStock(await load(SK.STOCK, { 밥: [], 국: [], 메인요리: [], 반찬: [], 간식: [], 디저트: [] }));
        setSavedPlans(await load(SK.PLANS, []));
        setSavedRecipes(await load(SK.SAVED, []));
        setHealthGoal(await load(SK.GOAL, "일반"));
        setServings(await load(SK.SERVINGS, 2));
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
    })();
  }, []);

  const save = useCallback(async (k, v) => {
    setSyncStatus("syncing");
    try { await sbSet(k, v); setSyncStatus("synced"); }
    catch { setSyncStatus("error"); }
  }, []);

  const SECTIONS = [
    { key: "fridge", label: "냉장고", emoji: "🧊", color: "#0ea5e9", light: "#f0f9ff", tag: "#bae6fd" },
    { key: "pantry", label: "팬트리",  emoji: "🗄",  color: "#10b981", light: "#f0fdf4", tag: "#6ee7b7" },
    { key: "focus",  label: "오늘 쓸 재료", emoji: "⭐", color: "#8b5cf6", light: "#faf5ff", tag: "#ddd6fe" },
  ];
  const activeInfo = SECTIONS.find(s => s.key === activeSection);
  const currentItems = activeSection === "fridge" ? fridgeItems : activeSection === "pantry" ? pantryItems : focusItems;
  const setCurrentItems = useCallback((list) => {
    if (activeSection === "fridge")      { setFridgeItems(list); save(SK.FRIDGE, list); }
    else if (activeSection === "pantry") { setPantryItems(list); save(SK.PANTRY, list); }
    else                                 { setFocusItems(list);  save(SK.FOCUS,  list); }
  }, [activeSection, save]);

  const commitAddIng = useCallback((val) => {
    const t = val.trim(); if (!t || currentItems.includes(t)) return;
    setCurrentItems([...currentItems, t]); setNewIngInput("");
  }, [currentItems, setCurrentItems]);

  const addFocusItem = (item) => {
    if (focusItems.includes(item)) return;
    const u = [...focusItems, item]; setFocusItems(u); save(SK.FOCUS, u);
  };

  const doSaveRecipe = (recipe, setJustSavedFn, idx) => {
    if (savedRecipes.some(s => s.name === recipe.name)) return;
    const updated = [{ ...recipe, savedAt: new Date().toLocaleDateString("ko-KR") }, ...savedRecipes];
    setSavedRecipes(updated); save(SK.SAVED, updated);
    setJustSavedFn(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => setJustSavedFn(prev => { const n = { ...prev }; delete n[idx]; return n; }), 2000);
  };

  const doAddToStock = (recipe, setAddedFn, idx) => {
    const cat = recipe.category || "메인요리";
    if (!FOOD_CATS.includes(cat) || foodStock[cat]?.includes(recipe.name)) return;
    const updated = { ...foodStock, [cat]: [...(foodStock[cat] || []), recipe.name] };
    setFoodStock(updated); save(SK.STOCK, updated);
    setAddedFn(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => setAddedFn(prev => { const n = { ...prev }; delete n[idx]; return n; }), 2000);
  };

  const deleteSavedRecipe = (name) => {
    const updated = savedRecipes.filter(r => r.name !== name);
    setSavedRecipes(updated); save(SK.SAVED, updated);
  };

  const commitAddStock = useCallback((val) => {
    const t = val.trim(); if (!t || foodStock[stockCat]?.includes(t)) return;
    const u = { ...foodStock, [stockCat]: [...(foodStock[stockCat] || []), t] };
    setFoodStock(u); save(SK.STOCK, u); setStockInput("");
  }, [foodStock, stockCat, save]);

  const removeStock = (cat, item) => {
    const u = { ...foodStock, [cat]: foodStock[cat].filter(i => i !== item) };
    setFoodStock(u); save(SK.STOCK, u);
  };

  const totalStock = Object.values(foodStock).flat().length;

  const parseRecipes = (text, fallback = []) => {
    return text.split("===RECIPE_START===").slice(1).map(block => {
      const get = k => { const m = block.match(new RegExp(k + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
      const steps = [];
      for (let i = 1; i <= 10; i++) { const s = get("단계" + i); if (s && s !== "없음") steps.push(s); }
      const rawUsed = get("사용재료"), rawExtra = get("추가재료"), cat = get("카테고리");
      return {
        name: get("이름"), emoji: get("이모지") || "🍽", time: get("시간"),
        difficulty: get("난이도"), calories: get("칼로리"),
        category: FOOD_CATS.includes(cat) ? cat : "메인요리",
        usedIngredients: rawUsed ? rawUsed.split(/,|，/).map(s => s.trim()).filter(Boolean) : fallback,
        additionalIngredients: (rawExtra && rawExtra !== "없음") ? rawExtra.split(/,|，/).map(s => s.trim()).filter(Boolean) : [],
        nutrition: get("영양"), steps, tip: get("팁")
      };
    }).filter(r => r.name);
  };

  const parsePlan = (text) => {
    return text.split("===DAY_START===").slice(1).map(block => {
      const get = k => { const m = block.match(new RegExp(k + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
      return { day: get("일차"), 아침: get("아침"), 아침간식: get("아침간식"), 점심: get("점심"), 점심간식: get("점심간식"), 저녁: get("저녁") };
    }).filter(d => d.day);
  };

  const callClaude = async (system, userPrompt) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages: [{ role: "user", content: userPrompt }] })
    });
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "";
  };

  const fetchRecipes = async () => {
    if (!fridgeItems.length && !pantryItems.length && !focusItems.length) return;
    setLoading(true); setError(null); setRecipes(null); setSelectedRecipe(null); setJustSaved({}); setAddedToStock({});
    try {
      const goalInfo = HEALTH_GOALS.find(g => g.key === healthGoal);
      const catText = category === "전체" ? "모든 종류" : category;
      const prompt = "조건:\n- 건강 목표: " + healthGoal + " (" + goalInfo?.desc + ")" +
        "\n- 인원수: " + servings + "인분" +
        "\n- 카테고리: " + catText +
        (fridgeItems.length ? "\n- 냉장고: " + fridgeItems.join(", ") : "") +
        (pantryItems.length ? "\n- 팬트리: " + pantryItems.join(", ") : "") +
        (focusItems.length  ? "\n- 특히 이 재료 위주로: " + focusItems.join(", ") : "") +
        "\n\n위 조건에 맞는 레시피를 추천해주세요.";
      const text = await callClaude(SYSTEM_PROMPT, prompt);
      const parsed = parseRecipes(text, [...fridgeItems, ...pantryItems, ...focusItems]);
      if (!parsed.length) throw new Error("레시피를 찾지 못했어요. 다시 시도해주세요.");
      setRecipes(parsed); setSelectedRecipe(0);
    } catch (err) { setError("오류: " + (err?.message || String(err))); }
    finally { setLoading(false); }
  };

  const fetchAiSearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setAiSearchLoading(true); setAiSearchError(null); setAiSearchResults(null); setAiSelectedRecipe(null); setAiJustSaved({}); setAiAddedToStock({});
    try {
      const prompt = `건강 목표: ${healthGoal}\n검색어: ${aiSearchQuery}\n\n위 검색어와 관련된 레시피 5개를 추천해주세요.`;
      const text = await callClaude(AI_SEARCH_PROMPT, prompt);
      const parsed = parseRecipes(text);
      if (!parsed.length) throw new Error("검색 결과를 찾지 못했어요. 다시 시도해주세요.");
      setAiSearchResults(parsed); setAiSelectedRecipe(0);
    } catch (err) { setAiSearchError("오류: " + (err?.message || String(err))); }
    finally { setAiSearchLoading(false); }
  };

  const fetchPlan = async () => {
    if (totalStock === 0) { setPlanError("음식 재고가 없어요!"); return; }
    setPlanLoading(true); setPlanError(null); setCurrentPlan(null); setViewingPlan(null);
    try {
      const goalInfo = HEALTH_GOALS.find(g => g.key === healthGoal);
      const stockLines = FOOD_CATS.map(c => foodStock[c]?.length ? `- ${c}: ${foodStock[c].join(", ")}` : null).filter(Boolean).join("\n");
      const prompt = `현재 음식 재고:\n${stockLines}\n\n건강 목표: ${healthGoal} (${goalInfo?.desc})\n요청 일수: ${planDays}일\n\n위 재고와 건강 목표를 반영해서 ${planDays}일치 식단을 짜주세요.`;
      const text = await callClaude(MEAL_PLAN_PROMPT, prompt);
      const parsed = parsePlan(text);
      if (!parsed.length) throw new Error("식단을 생성하지 못했어요.");
      setCurrentPlan(parsed);
    } catch (err) { setPlanError("오류: " + (err?.message || String(err))); }
    finally { setPlanLoading(false); }
  };

  const savePlan = () => {
    if (!currentPlan) return;
    const p = { id: Date.now(), date: new Date().toLocaleDateString("ko-KR"), days: planDays, goal: healthGoal, plan: currentPlan };
    const updated = [p, ...savedPlans]; setSavedPlans(updated); save(SK.PLANS, updated);
    alert("식단이 저장되었어요! 💾");
  };

  const deleteSavedPlan = (id) => {
    const updated = savedPlans.filter(p => p.id !== id); setSavedPlans(updated); save(SK.PLANS, updated);
    if (viewingPlan?.id === id) setViewingPlan(null);
  };

  const startEditCell = (di, slot, val) => { setEditingCell({ dayIdx: di, slot }); setEditCellVal(val); };
  const commitEditCell = () => {
    if (!editingCell || !currentPlan) return;
    setCurrentPlan(currentPlan.map((d, i) => i === editingCell.dayIdx ? { ...d, [editingCell.slot]: editCellVal } : d));
    setEditingCell(null);
  };

  const filteredSaved = savedRecipes.filter(r => {
    const q = savedSearch.toLowerCase();
    const matchText = !q || r.name.toLowerCase().includes(q) ||
      r.usedIngredients?.some(i => i.toLowerCase().includes(q)) ||
      r.additionalIngredients?.some(i => i.toLowerCase().includes(q));
    const matchCat = !savedFilterCat.length || savedFilterCat.includes(r.category);
    const matchDiff = !savedFilterDiff.length || savedFilterDiff.includes(r.difficulty);
    return matchText && matchCat && matchDiff;
  });

  const diffColor = d => d === "쉬움" ? "#16a34a" : d === "보통" ? "#d97706" : "#dc2626";

  const SyncBadge = () => (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: syncStatus === "synced" ? "#f0fdf4" : syncStatus === "syncing" ? "#fff7ed" : "#fff1f2", color: syncStatus === "synced" ? "#166534" : syncStatus === "syncing" ? "#c2410c" : "#be123c", fontWeight: 600, border: "1px solid", borderColor: syncStatus === "synced" ? "#bbf7d0" : syncStatus === "syncing" ? "#fed7aa" : "#fecdd3" }}>
      {syncStatus === "synced" ? "☁️ 동기화됨" : syncStatus === "syncing" ? "🔄 저장 중..." : "⚠️ 오류"}
    </span>
  );

  const RecipeCard = ({ r, idx, isSavedView = false, justSavedMap, addedToStockMap, onSave, onAddToStock }) => {
    const alreadySaved = isSavedView || savedRecipes.some(s => s.name === r.name);
    const alreadyInStock = foodStock[r.category]?.includes(r.name);
    const cc = CAT_COLOR[r.category] || CAT_COLOR["메인요리"];
    return (
      <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", border: "1px solid #f4f4f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 32 }}>{r.emoji}</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {!isSavedView && (
              <button onClick={() => onSave(r, idx)} style={{ background: justSavedMap?.[idx] ? "#f0fdf4" : alreadySaved ? "#fafafa" : "white", color: justSavedMap?.[idx] ? "#16a34a" : alreadySaved ? "#a1a1aa" : "#18181b", border: "1px solid", borderColor: justSavedMap?.[idx] ? "#86efac" : alreadySaved ? "#e4e4e7" : "#e4e4e7", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: alreadySaved ? "default" : "pointer", fontFamily: "inherit" }}>
                {justSavedMap?.[idx] ? "✓ 저장됨" : alreadySaved ? "저장됨" : "🔖 저장"}
              </button>
            )}
            <button onClick={() => onAddToStock(r, idx)} style={{ background: addedToStockMap?.[idx] ? "#f0fdf4" : alreadyInStock ? "#fafafa" : cc.bg, color: addedToStockMap?.[idx] ? "#16a34a" : alreadyInStock ? "#a1a1aa" : cc.text, border: "1px solid", borderColor: addedToStockMap?.[idx] ? "#86efac" : alreadyInStock ? "#e4e4e7" : cc.border, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: alreadyInStock ? "default" : "pointer", fontFamily: "inherit" }}>
              {addedToStockMap?.[idx] ? "✓ 재고 추가됨" : alreadyInStock ? "재고에 있음" : `${CAT_EMOJI[r.category] || "🍽"} 재고에 추가`}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#18181b", marginBottom: 12 }}>{r.name}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {[{ label: "⏱ " + r.time }, { label: "🔥 " + r.calories }, { label: r.difficulty, color: diffColor(r.difficulty) }, { label: CAT_EMOJI[r.category] + " " + r.category }].filter(x => x.label && !x.label.includes("undefined")).map(({ label, color }) => (
            <span key={label} style={{ background: "#f4f4f5", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: color || "#52525b", fontWeight: 500, border: "1px solid #e4e4e7" }}>{label}</span>
          ))}
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: "#166534", marginBottom: 18, display: "flex", gap: 8, border: "1px solid #bbf7d0" }}>
          <span>🌿</span> {r.nutrition}
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#18181b", marginBottom: 8 }}>재료</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r.usedIngredients.map(ing => <span key={ing} style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#18181b", fontWeight: 500 }}>✓ {ing}</span>)}
            {r.additionalIngredients?.map(ing => <span key={ing} style={{ background: "white", border: "1px dashed #d4d4d8", borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#71717a" }}>+ {ing}</span>)}
          </div>
          {r.additionalIngredients?.length > 0 && <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>✓ 보유 재료 &nbsp;|&nbsp; + 추가 필요</div>}
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#18181b", marginBottom: 10 }}>만드는 법</div>
          {r.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "9px 0", borderBottom: i < r.steps.length - 1 ? "1px solid #f4f4f5" : "none" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#18181b", color: "white", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: "#3f3f46", lineHeight: 1.6, paddingTop: 2 }}>{step}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#52525b", lineHeight: 1.6 }}>
          💡 <strong>Tip.</strong> {r.tip}
        </div>
        {isSavedView && r.savedAt && <div style={{ fontSize: 11, color: "#d4d4d8", marginTop: 10, textAlign: "right" }}>저장일: {r.savedAt}</div>}
      </div>
    );
  };

  const LoadingCard = ({ msg, sub }) => (
    <div style={{ background: "white", borderRadius: 16, padding: 32, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", textAlign: "center", border: "1px solid #f4f4f5" }}>
      <div style={{ fontSize: 40, marginBottom: 14, display: "inline-block", animation: "spin 1.5s linear infinite" }}>🍳</div>
      <div style={{ fontWeight: 700, color: "#18181b", fontSize: 15, marginBottom: 6 }}>{msg}</div>
      <div style={{ color: "#71717a", fontSize: 13, marginBottom: 20 }}>{sub}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 12, width: i % 2 === 0 ? "70%" : "100%", margin: "0 auto" }} />)}
      </div>
    </div>
  );

  const GoalBar = () => (
    <div style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginBottom: 14, border: "1px solid #f4f4f5" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>건강 목표</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {HEALTH_GOALS.map(g => (
          <button key={g.key} onClick={() => { setHealthGoal(g.key); save(SK.GOAL, g.key); }}
            style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid", borderColor: healthGoal === g.key ? "#18181b" : "#e4e4e7", background: healthGoal === g.key ? "#18181b" : "white", color: healthGoal === g.key ? "white" : "#52525b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
            <span>{g.emoji}</span> {g.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9fb", fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { 0% { transform: rotate(-12deg); } 50% { transform: rotate(12deg); } 100% { transform: rotate(-12deg); } }
        @keyframes popIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .fade-in { animation: fadeIn 0.3s ease; }
        .shimmer { background: linear-gradient(90deg,#f4f4f5 25%,#e4e4e7 50%,#f4f4f5 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
        .btn-main { background: #18181b; color: white; border: none; border-radius: 12px; padding: 14px 28px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn-main:hover:not(:disabled) { background: #3f3f46; transform: translateY(-1px); }
        .btn-main:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .recipe-tab { padding: 8px 14px; border-radius: 8px; border: 1px solid #e4e4e7; background: white; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; color: #71717a; font-family: inherit; }
        .recipe-tab.active { background: #18181b; border-color: #18181b; color: white; }
        .recipe-tab:hover:not(.active) { background: #f4f4f5; }
        .main-tab { flex: 1; padding: 12px 4px; border: none; border-bottom: 2px solid transparent; background: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; color: #a1a1aa; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .main-tab.active { color: #18181b; border-bottom-color: #18181b; }
        .main-tab:hover:not(.active) { color: #71717a; }
        .sub-toggle { padding: 7px 14px; border-radius: 8px; border: 1px solid #e4e4e7; background: white; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; color: #71717a; transition: all 0.15s; white-space: nowrap; }
        .sub-toggle.active { background: #18181b; border-color: #18181b; color: white; }
        .food-chip { display: inline-flex; align-items: center; border-radius: 20px; padding: 4px 10px 4px 12px; font-size: 13px; font-weight: 500; gap: 4px; animation: popIn 0.2s ease; }
        .plan-cell { border-radius: 8px; padding: 7px 10px; font-size: 12px; min-height: 34px; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; }
        .plan-cell:hover { opacity: 0.75; }
        .plan-cell.empty { background: #fafafa; border: 1px dashed #e4e4e7; color: #a1a1aa; font-style: italic; }
        .plan-cell.filled { background: #f4f4f5; border-color: #d4d4d8; color: #18181b; }
        .suggest-chip { padding: 4px 12px; border-radius: 6px; border: 1px dashed #d4d4d8; background: white; font-size: 13px; color: #71717a; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .suggest-chip:hover { background: #f4f4f5; border-style: solid; color: #18181b; }
      `}</style>

      <div style={{ background: "white", borderBottom: "1px solid #f4f4f5", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 28 }}>🍽</span>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#18181b", letterSpacing: "-0.02em" }}>오늘 뭐 먹지?</div>
          <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 1 }}>집 재료로 만드는 맞춤 레시피</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <SyncBadge />
          <span style={{ background: "#f4f4f5", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#52525b", fontWeight: 600 }}>
            {HEALTH_GOALS.find(g => g.key === healthGoal)?.emoji} {healthGoal}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #f4f4f5" }}>
        {[{ key: "recipe", label: "레시피", emoji: "👨‍🍳" }, { key: "stock", label: "음식 재고", emoji: "🗂" }, { key: "plan", label: "식단 짜기", emoji: "📅" }].map(({ key, label, emoji }) => (
          <button key={key} className={`main-tab ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
            <span style={{ fontSize: 17 }}>{emoji}</span>{label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>

        {tab === "recipe" && (<>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {[{ key: "search", label: "🥕 재료로 추천" }, { key: "aisearch", label: "🔍 AI 검색" }, { key: "saved", label: `🔖 저장됨${savedRecipes.length > 0 ? ` (${savedRecipes.length})` : ""}` }].map(({ key, label }) => (
              <button key={key} className={`sub-toggle ${recipeView === key ? "active" : ""}`} onClick={() => setRecipeView(key)}>{label}</button>
            ))}
          </div>

          {recipeView === "search" && (<>
            <GoalBar />
            <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginBottom: 14, border: "1px solid #f4f4f5" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {SECTIONS.map(({ key, label, emoji, color, light }) => (
                  <button key={key} onClick={() => { setActiveSection(key); setEditMode(false); setNewIngInput(""); }}
                    style={{ flex: 1, padding: "9px 4px", borderRadius: 10, border: "1px solid", borderColor: activeSection === key ? color : "#e4e4e7", background: activeSection === key ? light : "white", color: activeSection === key ? color : "#a1a1aa", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>{label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 10 }}>
                {activeSection === "fridge" && "냉장고 재료 — AI가 레시피에 활용해요"}
                {activeSection === "pantry" && "팬트리 재료 — AI가 레시피에 활용해요"}
                {activeSection === "focus"  && "오늘 쓸 재료 — 우선 활용"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 36 }}>
                {currentItems.map(i => (
                  <div key={i} style={{ display: "inline-flex", alignItems: "center", animation: "popIn 0.2s ease" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", background: activeInfo.light, border: "1px solid " + activeInfo.tag, borderRadius: editMode ? "20px 0 0 20px" : 20, borderRight: editMode ? "none" : undefined, padding: "4px 12px", fontSize: 13, color: activeInfo.color, fontWeight: 500 }}>{i}</span>
                    {editMode && <button onClick={() => setCurrentItems(currentItems.filter(x => x !== i))} style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderLeft: "none", borderRadius: "0 20px 20px 0", padding: "5px 9px", cursor: "pointer", color: "#71717a", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>×</button>}
                  </div>
                ))}
                {editMode && (
                  <div style={{ display: "inline-flex", alignItems: "center" }}>
                    <input value={newIngInput} onChange={e => setNewIngInput(e.target.value)}
                      onCompositionStart={() => { isComposing.current = true; }} onCompositionEnd={() => { isComposing.current = false; }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!isComposing.current) commitAddIng(newIngInput); } }}
                      placeholder="재료 추가..." style={{ border: "1px dashed #18181b", borderRight: "none", borderRadius: "20px 0 0 20px", padding: "4px 12px", fontSize: 13, color: "#18181b", outline: "none", fontFamily: "inherit", background: "#fafafa", width: 110 }} />
                    <button onClick={() => commitAddIng(newIngInput)} style={{ background: "#18181b", border: "1px solid #18181b", borderLeft: "none", borderRadius: "0 20px 20px 0", padding: "5px 12px", cursor: "pointer", color: "white", fontSize: 14, fontWeight: 700 }}>+</button>
                  </div>
                )}
              </div>
              {activeSection === "focus" && (() => {
                const sugg = [...fridgeItems, ...pantryItems].filter(i => !focusItems.includes(i));
                if (!sugg.length) return null;
                return (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f4f4f5" }}>
                    <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 8, fontWeight: 600 }}>냉장고 · 팬트리에서 고르기</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {sugg.map(i => <button key={i} className="suggest-chip" onClick={() => addFocusItem(i)}>+ {i}</button>)}
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "#d4d4d8" }}>{editMode ? "자동 저장됩니다" : `총 ${fridgeItems.length + pantryItems.length + focusItems.length}가지 재료`}</div>
                <button onClick={() => { setEditMode(!editMode); setNewIngInput(""); }} style={{ fontSize: 12, color: editMode ? "#18181b" : "#71717a", background: editMode ? "#f4f4f5" : "transparent", border: editMode ? "1px solid #e4e4e7" : "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  {editMode ? "✓ 완료" : "✏️ 편집"}
                </button>
              </div>
            </div>
            <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginBottom: 14, border: "1px solid #f4f4f5" }}>
              <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>인원수</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1,2,3,4].map(n => (
                      <button key={n} onClick={() => { setServings(n); save(SK.SERVINGS, n); }} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "1px solid", borderColor: servings === n ? "#18181b" : "#e4e4e7", background: servings === n ? "#18181b" : "white", color: servings === n ? "white" : "#71717a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{n}인</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>카테고리</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[{ label: "전체", emoji: "✨" }, ...FOOD_CATS.map(c => ({ label: c, emoji: CAT_EMOJI[c] }))].map(({ label, emoji }) => (
                    <button key={label} onClick={() => setCategory(label)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid", borderColor: category === label ? "#18181b" : "#e4e4e7", background: category === label ? "#18181b" : "white", color: category === label ? "white" : "#71717a", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-main" style={{ width: "100%", marginTop: 18 }} onClick={fetchRecipes} disabled={(!fridgeItems.length && !pantryItems.length && !focusItems.length) || loading}>
                {loading ? "레시피 찾는 중..." : "✨ 레시피 추천받기"}
              </button>
            </div>
            {loading && <LoadingCard msg="레시피 찾는 중..." sub="재료에 맞는 레시피를 분석하고 있어요" />}
            {error && <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: 14, color: "#be123c", fontSize: 14, textAlign: "center" }}>⚠️ {error}</div>}
            {recipes && selectedRecipe !== null && (
              <div className="fade-in">
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {recipes.map((r, i) => <button key={i} className={`recipe-tab ${selectedRecipe === i ? "active" : ""}`} onClick={() => setSelectedRecipe(i)}>{r.emoji} {r.name}</button>)}
                </div>
                <RecipeCard r={recipes[selectedRecipe]} idx={selectedRecipe} justSavedMap={justSaved} addedToStockMap={addedToStock}
                  onSave={(r, i) => doSaveRecipe(r, setJustSaved, i)} onAddToStock={(r, i) => doAddToStock(r, setAddedToStock, i)} />
                <button style={{ width: "100%", marginTop: 10, background: "white", border: "1px solid #e4e4e7", borderRadius: 12, padding: 13, fontSize: 14, color: "#71717a", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }} onClick={fetchRecipes}>🔄 다른 레시피 추천받기</button>
              </div>
            )}
          </>)}

          {recipeView === "aisearch" && (
            <div className="fade-in">
              <GoalBar />
              <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginBottom: 14, border: "1px solid #f4f4f5" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>레시피 검색</div>
                <div style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 12 }}>재료, 요리 이름, 카테고리 등 자유롭게 입력해보세요</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input value={aiSearchQuery} onChange={e => setAiSearchQuery(e.target.value)}
                    onCompositionStart={() => { aiIsComposing.current = true; }} onCompositionEnd={() => { aiIsComposing.current = false; }}
                    onKeyDown={e => { if (e.key === "Enter" && !aiIsComposing.current) fetchAiSearch(); }}
                    placeholder="예: 닭가슴살, 파스타, 저칼로리 점심..."
                    style={{ flex: 1, border: "1px solid #e4e4e7", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#18181b", outline: "none", fontFamily: "inherit", background: "#fafafa" }} />
                  {aiSearchQuery && <button onClick={() => setAiSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#a1a1aa", fontSize: 20 }}>×</button>}
                </div>
                <button className="btn-main" style={{ width: "100%" }} onClick={fetchAiSearch} disabled={!aiSearchQuery.trim() || aiSearchLoading}>
                  {aiSearchLoading ? "검색 중..." : "🔍 검색하기"}
                </button>
              </div>
              {aiSearchLoading && <LoadingCard msg="검색 중..." sub={`"${aiSearchQuery}" 관련 레시피를 찾고 있어요`} />}
              {aiSearchError && <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: 14, color: "#be123c", fontSize: 14, textAlign: "center" }}>⚠️ {aiSearchError}</div>}
              {aiSearchResults && aiSelectedRecipe !== null && (
                <div className="fade-in">
                  <div style={{ fontSize: 13, color: "#71717a", marginBottom: 10 }}>🔍 <strong>"{aiSearchQuery}"</strong> 검색 결과 {aiSearchResults.length}개</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    {aiSearchResults.map((r, i) => <button key={i} className={`recipe-tab ${aiSelectedRecipe === i ? "active" : ""}`} onClick={() => setAiSelectedRecipe(i)}>{r.emoji} {r.name}</button>)}
                  </div>
                  <RecipeCard r={aiSearchResults[aiSelectedRecipe]} idx={aiSelectedRecipe} justSavedMap={aiJustSaved} addedToStockMap={aiAddedToStock}
                    onSave={(r, i) => doSaveRecipe(r, setAiJustSaved, i)} onAddToStock={(r, i) => doAddToStock(r, setAiAddedToStock, i)} />
                  <button style={{ width: "100%", marginTop: 10, background: "white", border: "1px solid #e4e4e7", borderRadius: 12, padding: 13, fontSize: 14, color: "#71717a", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }} onClick={fetchAiSearch}>🔄 다시 검색하기</button>
                </div>
              )}
            </div>
          )}

          {recipeView === "saved" && (
            <div className="fade-in">
              {savedRecipes.length === 0
                ? <div style={{ background: "white", borderRadius: 16, padding: 40, textAlign: "center", boxShadow: "0 1px 12px rgba(0,0,0,0.07)", border: "1px solid #f4f4f5" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🔖</div>
                    <div style={{ color: "#71717a", fontSize: 14 }}>저장된 레시피가 없어요</div>
                    <div style={{ color: "#a1a1aa", fontSize: 12, marginTop: 6 }}>레시피 검색 후 저장 버튼을 눌러보세요</div>
                  </div>
                : (<>
                  <div style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginBottom: 14, border: "1px solid #f4f4f5" }}>
                    <SearchBar value={savedSearch} onChange={setSavedSearch} placeholder="레시피 이름, 재료로 검색..." />
                    <FilterChips label="카테고리" options={FOOD_CATS} selected={savedFilterCat}
                      onToggle={c => setSavedFilterCat(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                      colorMap={Object.fromEntries(FOOD_CATS.map(c => [c, CAT_COLOR[c]]))} />
                    <FilterChips label="난이도" options={["쉬움", "보통", "어려움"]} selected={savedFilterDiff}
                      onToggle={d => setSavedFilterDiff(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                      colorMap={{ "쉬움": { bg: "#f0fdf4", text: "#16a34a" }, "보통": { bg: "#fffbeb", text: "#d97706" }, "어려움": { bg: "#fff1f2", text: "#be123c" } }} />
                    <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 8 }}>
                      {filteredSaved.length === savedRecipes.length ? `총 ${savedRecipes.length}개` : `${filteredSaved.length} / ${savedRecipes.length}개`}
                    </div>
                  </div>
                  {filteredSaved.length === 0
                    ? <div style={{ background: "white", borderRadius: 12, padding: 28, textAlign: "center", color: "#a1a1aa", fontSize: 14 }}>검색 결과가 없어요</div>
                    : filteredSaved.map((r, i) => (
                      <div key={r.name} style={{ marginBottom: 14 }} className="fade-in">
                        <RecipeCard r={r} idx={i} isSavedView justSavedMap={{}} addedToStockMap={addedToStock}
                          onSave={() => {}} onAddToStock={(r, i) => doAddToStock(r, setAddedToStock, i)} />
                        <button onClick={() => deleteSavedRecipe(r.name)} style={{ width: "100%", marginTop: 8, background: "white", border: "1px solid #fecdd3", borderRadius: 10, padding: 9, fontSize: 13, color: "#be123c", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                          🗑 저장 삭제
                        </button>
                      </div>
                    ))
                  }
                </>)
              }
            </div>
          )}
        </>)}

        {tab === "stock" && (
          <div className="fade-in">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {FOOD_CATS.map(c => {
                const cc = CAT_COLOR[c];
                return (
                  <button key={c} onClick={() => setStockCat(c)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid", borderColor: stockCat === c ? cc.text : "#e4e4e7", background: stockCat === c ? cc.bg : "white", color: stockCat === c ? cc.text : "#71717a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {CAT_EMOJI[c]} {c} {foodStock[c]?.length > 0 && <span style={{ marginLeft: 2, background: stockCat === c ? cc.text : "#e4e4e7", color: stockCat === c ? "white" : "#71717a", borderRadius: 10, padding: "1px 6px", fontSize: 11 }}>{foodStock[c].length}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginBottom: 14, border: "1px solid #f4f4f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>{CAT_EMOJI[stockCat]}</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: CAT_COLOR[stockCat].text }}>{stockCat}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#a1a1aa" }}>{foodStock[stockCat]?.length || 0}개</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 40, marginBottom: 14 }}>
                {(foodStock[stockCat] || []).length === 0
                  ? <div style={{ color: "#d4d4d8", fontSize: 13, fontStyle: "italic" }}>아직 등록된 {stockCat}이 없어요</div>
                  : (foodStock[stockCat] || []).map(item => {
                    const cc = CAT_COLOR[stockCat];
                    return (
                      <div key={item} className="food-chip" style={{ background: cc.bg, border: "1px solid " + cc.border, color: cc.text }}>
                        <span>{item}</span>
                        <button onClick={() => removeStock(stockCat, item)} style={{ background: "none", border: "none", cursor: "pointer", color: cc.text, fontSize: 14, fontWeight: 700, lineHeight: 1, opacity: 0.5, padding: "0 2px" }}>×</button>
                      </div>
                    );
                  })
                }
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={stockInput} onChange={e => setStockInput(e.target.value)}
                  onCompositionStart={() => { stockIsComposing.current = true; }} onCompositionEnd={() => { stockIsComposing.current = false; }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!stockIsComposing.current) commitAddStock(stockInput); } }}
                  placeholder={`${stockCat} 이름 입력...`}
                  style={{ flex: 1, border: "1px solid " + CAT_COLOR[stockCat].border, borderRadius: 10, padding: "9px 14px", fontSize: 14, color: "#18181b", outline: "none", fontFamily: "inherit", background: CAT_COLOR[stockCat].bg }} />
                <button onClick={() => commitAddStock(stockInput)} style={{ background: CAT_COLOR[stockCat].text, color: "white", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>추가</button>
              </div>
            </div>
            <div style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", border: "1px solid #f4f4f5" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>전체 재고 현황</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {FOOD_CATS.map(c => {
                  const cc = CAT_COLOR[c];
                  return (
                    <div key={c} onClick={() => setStockCat(c)} style={{ background: cc.bg, border: "1px solid " + cc.border, borderRadius: 10, padding: "8px 12px", cursor: "pointer", minWidth: 60 }}>
                      <div style={{ fontSize: 11, color: cc.text, fontWeight: 600 }}>{CAT_EMOJI[c]} {c}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: cc.text, marginTop: 2 }}>{foodStock[c]?.length || 0}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#a1a1aa", textAlign: "right" }}>총 {totalStock}가지</div>
            </div>
            {totalStock > 0 && (
              <div style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginTop: 12, border: "1px solid #f4f4f5" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>전체 목록</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {FOOD_CATS.filter(c => foodStock[c]?.length > 0).map(c => {
                    const cc = CAT_COLOR[c];
                    return (
                      <div key={c}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: cc.text, marginBottom: 6 }}>{CAT_EMOJI[c]} {c} <span style={{ fontWeight: 400, color: "#a1a1aa" }}>({foodStock[c].length})</span></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {foodStock[c].map(item => (
                            <div key={item} className="food-chip" style={{ background: cc.bg, border: "1px solid " + cc.border, color: cc.text }}>
                              <span>{item}</span>
                              <button onClick={() => removeStock(c, item)} style={{ background: "none", border: "none", cursor: "pointer", color: cc.text, fontSize: 14, fontWeight: 700, lineHeight: 1, opacity: 0.5, padding: "0 2px" }}>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "plan" && (
          <div className="fade-in">
            <GoalBar />
            <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 12px rgba(0,0,0,0.07)", marginBottom: 14, border: "1px solid #f4f4f5" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>식단 기간</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                {[1,2,3,4,5,6,7].map(d => (
                  <button key={d} onClick={() => setPlanDays(d)} style={{ width: 42, height: 42, borderRadius: 10, border: "1px solid", borderColor: planDays === d ? "#18181b" : "#e4e4e7", background: planDays === d ? "#18181b" : "white", color: planDays === d ? "white" : "#71717a", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{d}일</button>
                ))}
              </div>
              {totalStock === 0
                ? <div style={{ background: "#fff7ed", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#c2410c", marginBottom: 14, border: "1px solid #fed7aa" }}>⚠️ 음식 재고가 없어요. <strong>음식 재고</strong> 탭에서 먼저 추가해주세요.</div>
                : <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#166534", marginBottom: 14, border: "1px solid #bbf7d0" }}>✅ 재고 {totalStock}가지 기반으로 {HEALTH_GOALS.find(g=>g.key===healthGoal)?.emoji} {healthGoal} 식단을 구성할게요</div>
              }
              <button className="btn-main" style={{ width: "100%" }} onClick={fetchPlan} disabled={totalStock === 0 || planLoading}>
                {planLoading ? "식단 구성 중..." : `✨ ${planDays}일 식단 추천받기`}
              </button>
            </div>
            {planLoading && (
              <div style={{ background: "white", borderRadius: 14, padding: 28, textAlign: "center", boxShadow: "0 1px 12px rgba(0,0,0,0.07)", border: "1px solid #f4f4f5" }}>
                <div style={{ fontSize: 40, marginBottom: 12, display: "inline-block", animation: "spin 1.5s linear infinite" }}>📅</div>
                <div style={{ fontWeight: 700, color: "#18181b", fontSize: 15, marginBottom: 6 }}>식단 구성 중...</div>
                <div style={{ color: "#71717a", fontSize: 13 }}>{planDays}일 · {healthGoal} 기준으로 짜고 있어요</div>
              </div>
            )}
            {planError && <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: 14, color: "#be123c", fontSize: 14, textAlign: "center", marginBottom: 14 }}>⚠️ {planError}</div>}
            {currentPlan && !viewingPlan && (
              <div className="fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#18181b" }}>추천 식단 <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 400 }}>— 각 칸 클릭해서 수정</span></div>
                  <button onClick={savePlan} style={{ background: "#18181b", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 저장</button>
                </div>
                <PlanTable plan={currentPlan} editingCell={editingCell} editCellVal={editCellVal} setEditCellVal={setEditCellVal} onCellClick={startEditCell} onCellCommit={commitEditCell} setEditingCell={setEditingCell} />
                <button style={{ width: "100%", marginTop: 10, background: "white", border: "1px solid #e4e4e7", borderRadius: 12, padding: 13, fontSize: 14, color: "#71717a", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }} onClick={fetchPlan}>🔄 다시 추천받기</button>
              </div>
            )}
            {savedPlans.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#18181b", marginBottom: 12 }}>저장된 식단</div>
                {savedPlans.map(p => (
                  <div key={p.id} style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", marginBottom: 10, border: "1px solid #f4f4f5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#18181b" }}>{p.days}일 식단 · {p.goal || "일반"}</div>
                        <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>{p.date} 저장</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setViewingPlan(viewingPlan?.id === p.id ? null : p)} style={{ background: viewingPlan?.id === p.id ? "#18181b" : "#f4f4f5", color: viewingPlan?.id === p.id ? "white" : "#52525b", border: "1px solid #e4e4e7", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {viewingPlan?.id === p.id ? "닫기" : "보기"}
                        </button>
                        <button onClick={() => deleteSavedPlan(p.id)} style={{ background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
                      </div>
                    </div>
                    {viewingPlan?.id === p.id && <div style={{ marginTop: 14 }}><PlanTable plan={p.plan} editingCell={null} editCellVal="" setEditCellVal={() => {}} onCellClick={() => {}} onCellCommit={() => {}} setEditingCell={() => {}} readOnly /></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#d4d4d8" }}>
          Powered by Claude AI · 오늘도 맛있는 한 끼 🌿
        </div>
      </div>
    </div>
  );
}

function PlanTable({ plan, editingCell, editCellVal, setEditCellVal, onCellClick, onCellCommit, setEditingCell, readOnly }) {
  const SLOTS = ["아침", "아침간식", "점심", "점심간식", "저녁"];
  const EMOJI = { "아침": "🌅", "아침간식": "🍎", "점심": "☀️", "점심간식": "🧃", "저녁": "🌙" };
  const isEditing = (di, slot) => editingCell?.dayIdx === di && editingCell?.slot === slot;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {plan.map((d, di) => (
        <div key={di} style={{ background: "white", borderRadius: 12, padding: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #f4f4f5" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#18181b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Day {d.day}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {SLOTS.map(slot => (
              <div key={slot} style={{ gridColumn: slot === "저녁" ? "1 / -1" : undefined }}>
                <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 3, fontWeight: 600 }}>{EMOJI[slot]} {slot}</div>
                {isEditing(di, slot) ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input autoFocus value={editCellVal} onChange={e => setEditCellVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") onCellCommit(); if (e.key === "Escape") setEditingCell(null); }}
                      style={{ flex: 1, border: "1px solid #18181b", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                    <button onClick={onCellCommit} style={{ background: "#18181b", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✓</button>
                  </div>
                ) : (
                  <div className={`plan-cell ${d[slot] ? "filled" : "empty"}`} onClick={() => !readOnly && onCellClick(di, slot, d[slot] || "")}>
                    {d[slot] || (readOnly ? "—" : "탭해서 수정")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
