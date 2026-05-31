// ============================================================================
// lib/sql-translator.ts — helpers PURS du translator SQL → PostgREST
// ----------------------------------------------------------------------------
// Extraits de lib/db.ts pour être testables unitairement SANS réseau ni env
// (pas d'import postgres / supabase-js). db.ts les réimporte tels quels.
//
// ⚠️ Ces fonctions sont la mécanique fragile derrière les bugs récurrents
//    « filtre ignoré silencieusement » / colonne mal traduite. Toute évolution
//    DOIT être couverte par lib/__tests__/sql-translator.test.ts.
// ============================================================================

/** Construit une querystring PostgREST à partir d'un objet de filtres (col → valeur). */
export function buildFilterQs(filters: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v === null) parts.push(`${k}=is.null`);
    else parts.push(`${k}=eq.${encodeURIComponent(String(v))}`);
  }
  return parts.join("&");
}

/** Remplace les placeholders `?` par `$1, $2, …` en ignorant ceux dans les
 *  chaînes, commentaires, et les opérateurs jsonb `??`, `?|`, `?&`. */
export function convertPlaceholders(text: string): string {
  let out = "", i = 0, n = 0;
  while (i < text.length) {
    const ch = text[i], nx = text[i + 1];
    if (ch === "'") { out += ch; i++; while (i < text.length) { out += text[i]; if (text[i] === "'") { if (text[i + 1] === "'") { out += text[++i]; } else { i++; break; } } i++; } continue; }
    if (ch === '"') { out += ch; i++; while (i < text.length && text[i] !== '"') { out += text[i++]; } if (i < text.length) out += text[i++]; continue; }
    if (ch === "-" && nx === "-") { while (i < text.length && text[i] !== "\n") out += text[i++]; continue; }
    if (ch === "/" && nx === "*") { out += "/*"; i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) out += text[i++]; if (i < text.length) { out += "*/"; i += 2; } continue; }
    if (ch === "?" && (nx === "?" || nx === "|" || nx === "&")) { out += ch + nx; i += 2; continue; }
    if (ch === "?") { out += `$${++n}`; i++; continue; }
    out += ch; i++;
  }
  return out;
}

/** Découpe sur les virgules de profondeur 0 (ignore celles dans des parens). */
export function splitCommasNotInParens(s: string): string[] {
  const out: string[] = [];
  let cur = "", depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Parse une clause WHERE simple (AND chainés) en objet de filtres col → valeur.
 *  Ne gère PAS OR ni parens complexes. Une condition non reconnue est ignorée. */
export function parseWhere(whereRaw: string, params: any[], startIdx: number = 0): Record<string, any> {
  const filters: Record<string, any> = {};
  let pIdx = startIdx;
  // Support des AND chainés. Pas d'OR, pas de parens complexes, pas de NOW()
  // Enlève d'éventuels "AND <col> > NOW() - ..." que REST supporte différemment
  const cleaned = whereRaw.replace(/\s+AND\s+\w+\s*>\s*NOW\(\).*$/i, "");
  const conds = cleaned.split(/\s+AND\s+/i);
  for (const c of conds) {
    const cm = c.match(/^(\w+(?:\.\w+)?)\s*=\s*(\?|\d+|'[^']*'|[A-Z_]+)$/i);
    if (!cm) continue;
    const col = cm[1].split(".").pop()!;
    let val: any = cm[2];
    if (val === "?") val = params[pIdx++];
    else if (/^\d+$/.test(val)) val = Number(val);
    else if (val.startsWith("'")) val = val.slice(1, -1);
    else if (/^NULL$/i.test(val)) val = null;
    filters[col] = val;
  }
  return filters;
}
