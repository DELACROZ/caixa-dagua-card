/* Caixa d'Água Card — Marcelo Automações GO
 * Card do Home Assistant com a água subindo/descendo dentro da imagem da caixa,
 * igual ao portal de telemetria. Tipos: tanque metálico, reservatório (container) e caixa plástica.
 *
 * YAML:
 *   type: custom:caixa-dagua-card
 *   entity: sensor.nivel_caixa        # sensor em % (0–100)
 *   tipo: caixa | reservatorio | plastica | subterranea
 *   name: Caixa Superior              # opcional (padrão: nome do sensor)
 *   mostrar_status: true              # opcional
 *   switches:                         # opcional: botões liga/desliga embaixo da caixa
 *     - entity: switch.bomba_recalque
 *       name: Bomba                     # opcional (padrão: nome da entidade)
 *     - switch.registro                 # formato antigo (só a entidade) também vale
 *   acao_switch: mais_info             # clique no switch: mais_info (janela do HA, padrão) | alternar (direto)
 *
 * Com vários switches, deixe a altura do card em "automática" (padrão): o card cresce pra
 * baixo e a imagem fica sempre do mesmo tamanho. Com altura fixa, tudo encolhe pra caber.
 */
const VERSAO = "1.5.0";
const PASTA = new URL(".", import.meta.url).href;

// ---------------- geometria (medida nas imagens 896x1195, igual ao portal) ----------------
const FORMAS = {
  caixa: {
    recorte: "M372 190 L663 190 L663 215 L650 820 Q 452 882 372 849 Z",
    imagem: "caixa-dagua.jpg", x: 510, y: 590,
  },
  reservatorio: {
    recorte: "M86 342 L561 419 L556 871 L109 674 L109 648 L103 595 L101 567 L99 543 L98 497 L88 370 Z",
    imagem: "reservatorio.jpg", x: 330, y: 640, supOpacidade: 0.7,
  },
  plastica: {
    recorte: "M165 238 Q 365 232 566 236 L556 870 L490 872 L420 871 L365 867 L315 860 L265 847 L215 825 L190 810 L186 780 L170 500 Z",
    imagem: "caixa-plastica.jpg", x: 365, y: 590,
  },
  subterranea: {
    recorte: "M165 298 L553 326 L557 330 L557 879 L500 878 L450 878 L400 876 L350 870 L300 860 L260 847 L220 828 L193 803 L183 680 L175 500 Z",
    imagem: "caixa-subterranea.jpg", x: 365, y: 560,
  },
};

// tanque metálico
const X_ESQ = 372, X_DIR = 648, FUNDO_ESQ = 849, FUNDO_DIR = 820, CURVA_X = 452, CURVA_FUNDO = 882, TOPO = 215;
const ANEIS_X = [372, 380, 400, 440, 480, 520, 560, 600, 630, 648];
const ANEIS = [
  [281, 281, 280, 280, 280, 280, 282, 286, 288, 291],
  [378, 378, 376, 374, 374, 374, 377, 382, 387, 390],
  [474, 474, 473, 471, 471, 473, 477, 483, 492, 498],
  [589, 589, 587, 584, 583, 586, 591, 601, 610, 617],
  [693, 693, 691, 688, 688, 692, 698, 709, 721, 730],
];
const MEIO = 4, ANEL_VAZIO = 639, ANEL_CHEIO = 205;
function bordaDeTras(f) {
  const m = ANEL_VAZIO + (ANEL_CHEIO - ANEL_VAZIO) * f;
  const meios = ANEIS.map((a) => a[MEIO]);
  if (m <= meios[0]) return ANEIS[0].map((y) => y - meios[0] + m);
  const ult = ANEIS.length - 1;
  if (m >= meios[ult]) return ANEIS[ult].map((y) => y - meios[ult] + m);
  let i = 0;
  while (m > meios[i + 1]) i++;
  const t = (m - meios[i]) / (meios[i + 1] - meios[i]);
  return ANEIS[i].map((y, k) => y + (ANEIS[i + 1][k] - y) * t);
}
function desenharCaixa(p, n, fase) {
  const f = n / 100;
  const yEsq = FUNDO_ESQ - f * (FUNDO_ESQ - TOPO), yDir = FUNDO_DIR - f * (FUNDO_DIR - TOPO);
  const xMeio = (X_ESQ + X_DIR) / 2, yMeio = (yEsq + yDir) / 2;
  const onda = n > 0.5 ? Math.sin(fase) * 4 : 0;
  const curva = (CURVA_FUNDO - (FUNDO_ESQ + FUNDO_DIR) / 2) * (1 - f);
  const xC = CURVA_X + f * (xMeio - CURVA_X), yLinha = yMeio + curva + onda;
  p.face.setAttribute("d", `M${X_ESQ} ${yEsq} Q ${xC} ${yLinha} ${X_DIR} ${yDir} L680 ${yDir} L680 ${FUNDO_DIR} L${X_DIR} ${FUNDO_DIR} Q ${CURVA_X} ${CURVA_FUNDO} ${X_ESQ} ${FUNDO_ESQ} Z`);
  const bt = bordaDeTras(f);
  const tras = bt.map((y, k) => `L${ANEIS_X[k]} ${Math.min(y, k === 0 ? yEsq : k === ANEIS_X.length - 1 ? yDir : y)}`).join(" ");
  p.sup.setAttribute("d", `M${X_ESQ} ${yEsq} ${tras} L680 ${bt.at(-1)} L680 ${yDir} L${X_DIR} ${yDir} Q ${xC} ${yLinha} ${X_ESQ} ${yEsq} Z`);
  p.brilho.setAttribute("d", `M${X_ESQ + 20} ${yEsq - 3} Q ${xC} ${yLinha - 3} ${X_DIR - 20} ${yDir - 3}`);
}

// reservatório (container)
const R_POSTE_ESQ = [[86, 342], [88, 370], [98, 497], [99, 543], [101, 567], [103, 595], [109, 648], [109, 674]];
const xPosteEsq = (y) => {
  for (let i = 1; i < R_POSTE_ESQ.length; i++) {
    const [x0, y0] = R_POSTE_ESQ[i - 1], [x1, y1] = R_POSTE_ESQ[i];
    if (y <= y1) return x0 + (x1 - x0) * Math.max(0, (y - y0) / (y1 - y0));
  }
  return R_POSTE_ESQ[R_POSTE_ESQ.length - 1][0];
};
const R_FE = { fundo: 674, topo: 344 };
const R_TE = { x0: 292, fundo: 628, x1: 292, topo: 316 };
const R_RW = { x0: 553, fundo: 706, x1: 553, topo: 353 };
const R_FD = { x0: 554, fundo: 868, x1: 554, topo: 421 };
function desenharReservatorio(p, n, fase) {
  const f = n / 100;
  const pt = (q) => [q.x0 + (q.x1 - q.x0) * f, q.fundo + (q.topo - q.fundo) * f];
  const onda = n > 0.5 ? Math.sin(fase) * 3 : 0;
  const fe = R_FE.fundo + (R_FE.topo - R_FE.fundo) * f, xfe = xPosteEsq(fe);
  const [xte, te] = pt(R_TE), [xrw, rw] = pt(R_RW), [xfd, fd] = pt(R_FD);
  const meio = `Q ${(xfe + xfd) / 2} ${(fe + fd) / 2 + onda}`;
  const vazio = n < 0.5;
  p.face.setAttribute("d", vazio ? "" : `M${xfe} ${fe} ${meio} ${xfd} ${fd} L556 871 L109 674 L0 674 L0 ${fe} Z`);
  p.sup.setAttribute("d", vazio ? "" : `M${xfe} ${fe} L${xte} ${te} L${xrw} ${rw} L${xfd} ${fd} ${meio} ${xfe} ${fe} Z`);
  p.brilho.setAttribute("d", vazio ? "" : `M${xfe + 18} ${fe + 2} ${meio} ${xfd - 18} ${fd - 5}`);
}

// caixas desenhadas por colunas x (plástica e subterrânea): curvas medidas na imagem;
// a água interpola entre elas — em 0% segue o fundo, em 100% o topo da abertura
function porColunas(X, FRENTE_FUNDO, FRENTE_TOPO, TRAS_FUNDO, TRAS_TOPO, baseFace) {
  const ult = X.length - 1;
  return (p, n, fase) => {
    const f = n / 100;
    const onda = n > 0.5 ? Math.sin(fase) * 3 : 0;
    const frente = FRENTE_FUNDO.map((y, i) => y + (FRENTE_TOPO[i] - y) * f + onda * Math.sin((i / ult) * Math.PI));
    const tras = TRAS_FUNDO.map((y, i) => y + (TRAS_TOPO[i] - y) * f);
    const linha = frente.map((y, i) => `${i ? "L" : "M"}${X[i]} ${y}`).join(" ");
    const vazio = n < 0.5;
    p.face.setAttribute("d", vazio ? "" : `${linha} L${X[ult]} ${baseFace} L${X[0]} ${baseFace} Z`);
    const volta = tras.map((y, i) => `L${X[i]} ${y}`).reverse().join(" ");
    p.sup.setAttribute("d", vazio ? "" : `${linha} ${volta} Z`);
    p.brilho.setAttribute("d", vazio ? "" : frente.slice(2, ult).map((y, i) => `${i ? "L" : "M"}${X[i + 2]} ${y - 3}`).join(" "));
  };
}
const desenharPlastica = porColunas(
  [150, 190, 215, 265, 315, 365, 420, 490, 556, 580],
  [810, 810, 825, 847, 860, 867, 871, 872, 870, 870],   // aro de baixo da abertura
  [238, 237, 237, 236, 235, 235, 235, 235, 236, 236],   // aro de cima da abertura
  [760, 754, 735, 712, 702, 695, 691, 692, 697, 698],   // chão encontrando a parede do fundo
  [234, 233, 230, 227, 226, 225, 224, 224, 225, 225], 900);
// caixa subterrânea (caixa-subterranea.jpg): corte com a tampa de concreto em cima
const desenharSubterranea = porColunas(
  [165, 190, 220, 260, 300, 350, 400, 450, 500, 557],
  [795, 805, 828, 847, 860, 870, 876, 878, 878, 879],   // aro de baixo do corte (frente)
  [298, 300, 303, 306, 309, 313, 316, 319, 322, 326],   // borda de cima do corte, sob a tampa
  [745, 740, 728, 716, 704, 694, 688, 684, 684, 690],   // piso encontrando a parede do fundo
  [294, 296, 299, 302, 305, 309, 312, 315, 318, 322], 900);
const DESENHAR = { caixa: desenharCaixa, reservatorio: desenharReservatorio, plastica: desenharPlastica, subterranea: desenharSubterranea };

const ESTILO = `
  :host { display: block; height: 100%; }
  /* altura automática: imagem no tamanho natural (não estica pra igualar o vizinho da fileira);
     altura fixa: a imagem só encolhe se não couber, sem vazar pro card de baixo */
  ha-card { padding: 14px 14px 12px; text-align: center; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
  h4 { margin: 2px 0 10px; font-size: 17px; font-weight: 700; color: var(--primary-text-color); }
  svg { width: 100%; height: auto; flex: 0 1 auto; min-height: 0; display: block; border-radius: 14px; cursor: pointer; }
  h4, .rodape, .switches { flex: none; }
  .sem-sinal .agua { filter: grayscale(1) opacity(0.55); }
  .pct { font: 800 150px system-ui, sans-serif; fill: #fff; stroke: rgba(4, 20, 40, 0.75); stroke-width: 10px; paint-order: stroke; }
  .rodape { margin-top: 8px; font-size: 12px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px 10px; color: var(--secondary-text-color); }
  .selo { padding: 2px 10px; border-radius: 999px; font-weight: 600; font-size: 12px; }
  .online { background: rgba(34,217,126,.15); color: #22d97e; border: 1px solid rgba(34,217,126,.5); }
  .offline { background: rgba(255,77,77,.15); color: #ff4d4d; border: 1px solid rgba(255,77,77,.5); }
  /* switches opcionais: mesmo botão do portal (verde = ligado, vermelho = desligado) */
  .switches { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 18px; margin-top: 10px; }
  .sw-box { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .sw-nome { font-size: 13px; font-weight: 600; color: var(--primary-text-color); }
  .sw-estado { font-size: 12px; font-weight: 600; }
  .sw-estado.on { color: #22d97e; } .sw-estado.off { color: #ff4d4d; } .sw-estado.ind { color: #7a8088; }
  .sw { --cor: #ff4d4d; --brilho: rgba(255,77,77,.55); position: relative; width: 104px; height: 40px; padding: 0;
        border-radius: 999px; border: 1px solid color-mix(in srgb, var(--cor) 55%, transparent);
        background: radial-gradient(120% 140% at 50% 0%, #1c1f22, #0c0d0f); cursor: pointer; overflow: hidden;
        box-shadow: inset 0 0 14px rgba(0,0,0,.7), 0 0 10px color-mix(in srgb, var(--cor) 25%, transparent); }
  .sw.on { --cor: #22d97e; --brilho: rgba(34,217,126,.55); }
  .sw.indisponivel { --cor: #7a8088; --brilho: rgba(160,165,172,.35); cursor: not-allowed; opacity: .55; }
  .sw .bola { position: absolute; top: 6px; left: 7px; width: 26px; height: 26px; border-radius: 50%;
        background: radial-gradient(circle at 40% 35%, #fff 0%, var(--cor) 55%); box-shadow: 0 0 14px var(--brilho), 0 0 26px var(--brilho);
        transition: transform .35s cubic-bezier(.3,1.4,.5,1); }
  .sw.on .bola { transform: translateX(64px); }
  .sw .rot { position: absolute; top: 11px; font: 700 13px system-ui, sans-serif; letter-spacing: .08em; color: #9aa3ad; }
  .sw .r-off { left: 14px; } .sw .r-on { right: 16px; }
  .sw.on .r-on, .sw:not(.on) .r-off { opacity: 0; }
`;

let contador = 0;

class CaixaDaguaCard extends HTMLElement {
  static getConfigForm() {
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { domain: ["sensor", "input_number", "number"] } } },
        { name: "tipo", selector: { select: { mode: "dropdown", options: [
          { value: "caixa", label: "Tanque metálico" },
          { value: "reservatorio", label: "Reservatório (container)" },
          { value: "plastica", label: "Caixa plástica" },
          { value: "subterranea", label: "Caixa subterrânea" },
        ] } } },
        { name: "name", selector: { text: {} } },
        { name: "mostrar_status", selector: { boolean: {} } },
        { name: "switches", selector: { object: { multiple: true, fields: {
          entity: { label: "Switch", required: true, selector: { entity: { domain: ["switch", "input_boolean", "light", "fan"] } } },
          name: { label: "Nome no card (opcional)", selector: { text: {} } },
        } } } },
        { name: "acao_switch", selector: { select: { mode: "dropdown", options: [
          { value: "mais_info", label: "Abrir o switch do Home Assistant (mais informações)" },
          { value: "alternar", label: "Ligar/desligar direto, sem confirmar" },
        ] } } },
      ],
      computeLabel: (s) => ({
        entity: "Sensor de nível (%)", tipo: "Tipo de caixa", name: "Nome (opcional)", mostrar_status: "Mostrar status online/offline", switches: "Switches liga/desliga (opcional)", acao_switch: "Ao clicar no switch",
      })[s.name],
    };
  }

  static getStubConfig(hass) {
    const nivel = Object.keys(hass.states).find((e) => e.startsWith("sensor.") && hass.states[e].attributes.unit_of_measurement === "%");
    return { entity: nivel || "", tipo: "caixa", mostrar_status: true };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("Escolha o sensor de nível (entity).");
    this._config = { tipo: "caixa", mostrar_status: true, ...config };
    if (!FORMAS[this._config.tipo]) this._config.tipo = "caixa";
    this._montado = false;
    this._montar();
  }

  getCardSize() { return 6; }
  getGridOptions() { return { columns: 6, min_columns: 3, rows: "auto", min_rows: 4 }; }

  set hass(hass) {
    this._hass = hass;
    if (!this._montado) this._montar();
    this._atualizar();
  }

  _montar() {
    if (!this._config) return;
    const c = this._config, forma = FORMAS[c.tipo], id = `cx${++contador}`;
    this._fase = Math.random() * 6;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${ESTILO}</style>
      <ha-card>
        <h4 class="nome"></h4>
        <svg viewBox="0 0 896 1195" role="button" tabindex="0" aria-label="Histórico do nível">
          <defs>
            <clipPath id="int-${id}"><path d="${forma.recorte}"/></clipPath>
            <linearGradient id="face-${id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#3fa9f5" stop-opacity="0.62"/><stop offset="1" stop-color="#0b4f9c" stop-opacity="0.82"/>
            </linearGradient>
            <linearGradient id="sup-${id}" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#8fd3ff" stop-opacity="0.55"/><stop offset="0.5" stop-color="#c9ecff" stop-opacity="0.7"/><stop offset="1" stop-color="#8fd3ff" stop-opacity="0.55"/>
            </linearGradient>
          </defs>
          <image href="${PASTA}${forma.imagem}?v=${VERSAO}" width="896" height="1195"/>
          <g class="agua" clip-path="url(#int-${id})">
            <path class="face" fill="url(#face-${id})"/>
            <path class="sup" fill="url(#sup-${id})" ${forma.supOpacidade ? `opacity="${forma.supOpacidade}"` : ""}/>
            <path class="brilho" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round"/>
          </g>
          <text class="pct" x="${forma.x}" y="${forma.y}" text-anchor="middle">—</text>
        </svg>
        <div class="rodape" ${c.mostrar_status ? "" : "hidden"}><span class="ultima"></span><span class="selo"></span></div>
        ${this._switches().length ? `<div class="switches">${this._switches().map((e, i) => `<div class="sw-box">
          <span class="sw-nome"></span>
          <button class="sw" type="button" data-i="${i}"><span class="rot r-off">OFF</span><span class="rot r-on">ON</span><span class="bola"></span></button>
          <span class="sw-estado"></span></div>`).join("")}</div>` : ""}
      </ha-card>`;
    const $ = (s) => this.shadowRoot.querySelector(s);
    this._el = { card: $("ha-card"), nome: $(".nome"), svg: $("svg"), pct: $(".pct"), ultima: $(".ultima"), selo: $(".selo"),
      face: $(".face"), sup: $(".sup"), brilho: $(".brilho") };
    const abrir = () => this._maisInfo(c.entity);
    this._el.svg.addEventListener("click", abrir);
    this._el.svg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
    this._el.sws = [...this.shadowRoot.querySelectorAll(".sw-box")].map((box) => ({
      nome: box.querySelector(".sw-nome"), botao: box.querySelector(".sw"), estado: box.querySelector(".sw-estado") }));
    this._el.sws.forEach((s, i) => s.botao.addEventListener("click", () => this._alternar(this._switches()[i])));
    this._atual = this._alvo = 0;
    this._iniciado = false;
    this._montado = true;
    if (this._hass) this._atualizar();
  }

  _atualizar() {
    if (!this._hass || !this._montado) return;
    const c = this._config, st = this._hass.states[c.entity];
    const nivel = st ? Number.parseFloat(st.state) : NaN;
    const semSinal = !st || ["unavailable", "unknown"].includes(st.state) || Number.isNaN(nivel);
    this._alvo = semSinal ? this._alvo : Math.max(0, Math.min(100, nivel));
    if (!this._iniciado && !semSinal) { this._atual = this._alvo; this._iniciado = true; }  // abre já no nível; anima só as mudanças
    this._el.nome.textContent = c.name || st?.attributes.friendly_name || c.entity;
    this._el.pct.textContent = semSinal ? "—" : `${Math.round(nivel)}%`;
    this._el.card.classList.toggle("sem-sinal", semSinal);
    if (c.mostrar_status) {
      this._el.selo.className = `selo ${semSinal ? "offline" : "online"}`;
      this._el.selo.textContent = semSinal ? "🔴 Offline" : "🟢 Online";
      this._el.ultima.textContent = st ? `atualizado ${this._tempo(st.last_updated)}` : "sensor não encontrado";
    }
    this._switches().forEach(({ entity: ent, name }, i) => {
      const el = this._el.sws[i], s = this._hass.states[ent];
      if (!el) return;
      const on = s?.state === "on", ind = !s || ["unavailable", "unknown"].includes(s.state);
      el.botao.classList.toggle("on", on && !ind);
      el.botao.classList.toggle("indisponivel", ind);
      el.botao.disabled = ind;
      el.botao.setAttribute("aria-pressed", String(on));
      el.botao.setAttribute("aria-label", s?.attributes.friendly_name || ent);
      el.nome.textContent = name || s?.attributes.friendly_name || ent;
      el.estado.className = `sw-estado ${ind ? "ind" : on ? "on" : "off"}`;
      el.estado.textContent = ind ? "Indisponível" : on ? "Ligado" : "Desligado";
    });
  }

  // [{entity, name}]: aceita "switch.x" (formato antigo) ou {entity, name} (editor visual)
  _switches() {
    const s = this._config?.switches;
    return (Array.isArray(s) ? s : s ? [s] : [])
      .map((x) => (typeof x === "string" ? { entity: x } : x || {}))
      .filter((x) => x.entity);
  }

  // padrão: abre a janela do próprio HA (switch grande + histórico); "alternar" liga/desliga no clique
  _alternar({ entity: ent }) {
    const s = this._hass?.states[ent];
    if (!s || ["unavailable", "unknown"].includes(s.state)) return;
    if (this._config.acao_switch === "alternar") this._hass.callService("homeassistant", "toggle", { entity_id: ent });
    else this._maisInfo(ent);
  }

  _tempo(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "agora";
    if (s < 3600) return `há ${Math.floor(s / 60)} min`;
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    return `há ${Math.floor(s / 86400)} d`;
  }

  _maisInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }

  connectedCallback() {
    const passo = () => {
      if (!this.isConnected) return;
      this._fase += 0.05;
      this._atual += (this._alvo - this._atual) * 0.06;
      if (this._el) DESENHAR[this._config.tipo](this._el, this._atual, this._fase);
      this._raf = requestAnimationFrame(passo);
    };
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(passo);
  }

  disconnectedCallback() { cancelAnimationFrame(this._raf); }
}

// carregado duas vezes (ex.: manual + HACS) não pode quebrar o painel: registra só a primeira cópia
if (!customElements.get("caixa-dagua-card")) {
customElements.define("caixa-dagua-card", CaixaDaguaCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "caixa-dagua-card",
  name: "Caixa d'Água",
  description: "Nível da caixa d'água com a água animada (Marcelo Automações GO).",
  preview: true,
  documentationURL: "https://github.com/DELACROZ/caixa-dagua-card",
});
}
console.info(`%c CAIXA-DAGUA-CARD %c v${VERSAO} `, "background:#0b4f9c;color:#fff;font-weight:700", "background:#22d97e;color:#000");
