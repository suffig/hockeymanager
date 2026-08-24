/* ==========================================================
   Eiszeit – Weltweite Bestenliste

   Zwei Ansichten in einer Seite: die Rangliste und eine einzelne
   Laufbahn. Der Wechsel dazwischen laeuft ueber die Adresszeile
   (?karriere=123), damit der Zurueck-Knopf des Browsers tut, was
   man von ihm erwartet - auf dem Telefon ist das der einzige
   Zurueck-Knopf, den es gibt.

   Die Rangliste laedt seitenweise und ohne Saisonwerte; die kommen
   erst beim Klick. Sonst zieht eine Liste mit fuenfzig Laufbahnen
   fuenfzig Saisontabellen mit.
   ========================================================== */
(() => {
  'use strict';

  const bereich = document.getElementById('bereich');
  const unterzeile = document.getElementById('unterzeile');
  const esc = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const JE_SEITE = 25;
  const S = { seite: 0, gesamt: 0, pos: '', zeilen: [], laden: false };

  const POS_NAMEN = { C:'Center', LW:'Linker Flügel', RW:'Rechter Flügel', D:'Verteidiger', G:'Torhüter' };

  /* ---------------------------------------------------------------
     Rangliste
     --------------------------------------------------------------- */

  function filterHtml(){
    const knopf = (k, n) => `<button type="button" class="bl-filter ${S.pos === k ? 'an' : ''}"
      data-pos="${k}">${n}</button>`;
    return `<div class="bl-filter-reihe">
      ${knopf('', 'Alle')}${knopf('C', 'C')}${knopf('LW', 'LW')}${knopf('RW', 'RW')}
      ${knopf('D', 'D')}${knopf('G', 'G')}
    </div>`;
  }

  function zeileHtml(z){
    const medaille = z.platz <= 3 ? ' bl-podest bl-p' + z.platz : '';
    const nat = PUCKERO.nation(z.nation) || { flag:'', n:z.nation };
    return `<button type="button" class="bl-zeile${medaille}" data-karriere="${z.id}">
      <span class="bl-platz">${z.platz}</span>
      <span class="bl-wer">
        <b>${esc(z.name)}</b>
        <span class="bl-klein">${nat.flag || ''} ${esc(z.pos)}
          · ${esc(z.benutzername || 'unbekannt')}</span>
      </span>
      <span class="bl-zahlen">
        <b>${z.legendenwert}</b>
        <span class="bl-klein">${esc(z.rang || '')}</span>
      </span>
      <span class="bl-pfeil">›</span>
    </button>`;
  }

  function listeHtml(){
    if (!S.zeilen.length) return `
      ${filterHtml()}
      <div class="card center pad-lg">
        <h3>Noch nichts eingetragen</h3>
        <p class="small mb0">Sobald die erste Laufbahn eines freigegebenen
          Profils zu Ende gespielt ist, steht sie hier.</p>
      </div>`;

    const seiten = Math.max(1, Math.ceil(S.gesamt / JE_SEITE));
    return `
      ${filterHtml()}
      <div class="bl-liste">${S.zeilen.map(zeileHtml).join('')}</div>
      ${seiten > 1 ? `<div class="bl-blaettern">
        <button class="btn btn-ghost btn-sm" id="bl-zurueck"
          ${S.seite === 0 ? 'disabled' : ''}>← Zurück</button>
        <span class="small">Seite ${S.seite + 1} von ${seiten}</span>
        <button class="btn btn-ghost btn-sm" id="bl-vor"
          ${S.seite + 1 >= seiten ? 'disabled' : ''}>Weiter →</button>
      </div>` : ''}`;
  }

  async function listeLaden(){
    if (S.laden) return;
    S.laden = true;
    bereich.innerHTML = '<div class="card center pad-lg"><p class="small mb0">Wird geladen …</p></div>';
    const erg = await KONTO.bestenliste({
      von: S.seite * JE_SEITE, wieviele: JE_SEITE, pos: S.pos || undefined
    });
    S.laden = false;
    if (erg.fehler){
      bereich.innerHTML = `<div class="card"><h3>Die Liste kam nicht an</h3>
        <p class="small mb0">${esc(erg.fehler)}</p></div>`;
      return;
    }
    S.zeilen = erg.zeilen;
    S.gesamt = erg.gesamt;
    unterzeile.textContent = S.gesamt
      ? S.gesamt + (S.gesamt === 1 ? ' Laufbahn' : ' Laufbahnen') +
        ', nach Legendenpunkten sortiert. Tipp auf eine Position für die ganze Geschichte.'
      : 'Nach Legendenpunkten sortiert.';
    bereich.innerHTML = listeHtml();
    binde();
  }

  function binde(){
    bereich.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => {
      S.pos = b.dataset.pos; S.seite = 0; listeLaden();
    });
    bereich.querySelectorAll('[data-karriere]').forEach(b => b.onclick = () => {
      zeige(b.dataset.karriere);
    });
    const z = document.getElementById('bl-zurueck');
    if (z) z.onclick = () => { S.seite = Math.max(0, S.seite - 1); listeLaden(); };
    const v = document.getElementById('bl-vor');
    if (v) v.onclick = () => { S.seite++; listeLaden(); };
  }

  /* ---------------------------------------------------------------
     Eine einzelne Laufbahn
     --------------------------------------------------------------- */

  function kennzahl(ik, wert, kurz){
    return `<div class="stk"><span class="stk-ik">${UI.ikone(ik, 15)}</span>
      <b>${wert}</b><span class="stk-n">${kurz}</span></div>`;
  }

  function kopfHtml(k){
    const nat = PUCKERO.nation(k.nation) || { flag:'', n:k.nation };
    const lg = k.beste_liga ? (PUCKERO.league(k.beste_liga) || {}).n : null;
    return `
      <div class="ka-kopf">
        <div class="ka-wer">
          <span class="eyebrow">${esc(k.benutzername || 'unbekannt')}</span>
          <h2 class="klubname">${esc(k.name)}
            ${k.nummer ? '<span class="ka-num">#' + k.nummer + '</span>' : ''}</h2>
          <p class="small mb0">${nat.flag || ''} ${esc(nat.n || k.nation)}
            · ${esc(POS_NAMEN[k.pos] || k.pos)}
            ${lg ? '· höchste Liga: ' + esc(lg) : ''}</p>
        </div>
        <div class="ka-wert">
          <b>${k.legendenwert}</b>
          <span>${esc(k.rang || '')}</span>
        </div>
      </div>`;
  }

  function summeHtml(k){
    const w = k.saisonwerte || [];
    const isG = !!k.ist_torhueter;
    const summe = f => w.reduce((a, s) => a + (s[f] || 0), 0);
    return `<div class="statgitter mt">
      ${kennzahl('kalender', summe('sp'), 'Spiele')}
      ${isG
        ? kennzahl('haken', summe('si'), 'Siege') + kennzahl('schild', summe('so'), 'Shutouts')
        : kennzahl('tor', summe('t'), 'Tore') + kennzahl('gruppe', summe('v'), 'Vorlagen')}
      ${kennzahl('stern', k.punkte != null ? k.punkte : summe('p'), isG ? 'Siege' : 'Punkte')}
      ${kennzahl('pokal', k.trophaeen || 0, 'Trophäen')}
      ${kennzahl('hoch', k.hoehepunkt || 0, 'Bestwert')}
    </div>`;
  }

  function anlageHtml(k){
    if (k.ausgeschoepft == null) return '';
    return `<div class="anlage mt">
      <div class="an-kopf"><span>${UI.ikone('auge', 13)} Anlage eingelöst</span>
        <b>${k.ausgeschoepft}%</b></div>
      <div class="an-leiste"><i style="width:${k.ausgeschoepft}%"></i></div>
      <div class="an-fuss">${k.potenzial
        ? 'Höchstmögliche Stärke war ' + k.potenzial : ''}</div>
    </div>`;
  }

  function saisonTabelle(k){
    const w = k.saisonwerte || [];
    if (!w.length) return `<p class="small">Für diese Laufbahn liegen keine
      Saisonwerte vor – sie wurde vor der Umstellung gespielt.</p>`;
    const isG = !!k.ist_torhueter;
    const kopf = isG
      ? '<tr><th>Saison</th><th>Klub</th><th>Lg</th><th>Sp</th><th>S</th><th>Fq%</th><th>SO</th><th>Ges</th></tr>'
      : '<tr><th>Saison</th><th>Klub</th><th>Lg</th><th>Sp</th><th>T</th><th>V</th><th>Pkt</th><th>+/-</th><th>Ges</th></tr>';
    const zeilen = w.map(s => {
      const gold = s.ti ? ' style="color:var(--gold)"' : '';
      return `<tr>
        <td${gold}>${s.j}/${String(s.j + 1).slice(2)}</td>
        <td class="ka-klub">${esc(s.k)}</td>
        <td>${esc(s.l)}</td>
        <td>${s.sp}</td>
        ${isG
          ? `<td>${s.si}</td><td>${s.fq ? (s.fq / 10).toFixed(1) : '–'}</td><td>${s.so}</td>`
          : `<td>${s.t}</td><td>${s.v}</td><td><b>${s.p}</b></td>
             <td class="${s.pm > 0 ? 'gut' : s.pm < 0 ? 'schlecht' : ''}">${s.pm > 0 ? '+' : ''}${s.pm}</td>`}
        <td>${s.o}</td>
      </tr>`;
    }).join('');
    return `<div class="tabelle-rahmen mt">
      <table class="stats ka-tabelle"><thead>${kopf}</thead><tbody>${zeilen}</tbody></table>
    </div>`;
  }

  function wegHtml(k){
    const teile = [];
    if (k.stationen) teile.push(`<span>${UI.ikone('transfer', 13)} ${k.stationen} Stationen</span>`);
    if (k.saisons)   teile.push(`<span>${UI.ikone('kalender', 13)} ${k.saisons} Saisons</span>`);
    if (k.jg_platz && k.jg_von)
      teile.push(`<span>${UI.ikone('gruppe', 13)} Jahrgang ${k.jg_platz}. von ${k.jg_von}</span>`);
    if (k.wahlen)
      teile.push(`<span>${UI.ikone('waage', 13)} ${k.gelungen}/${k.wahlen} Entscheidungen</span>`);
    if (k.nat_kapitaen)
      teile.push(`<span class="gold">${UI.ikone('krone', 13)} Kapitän der Nationalmannschaft</span>`);
    if (k.rolle)
      teile.push(`<span>${UI.ikone('schild', 13)} Zuletzt ${esc(k.rolle.replace(/^Als /, ''))}</span>`);
    if (k.umstellungen)
      teile.push(`<span>${UI.ikone('kreuz', 13)} ${k.umstellungen}× umgestellt</span>`);
    if (!teile.length) return '';
    return `<div class="ka-weg mt">${teile.join('')}</div>`;
  }

  function detailHtml(k){
    return `
      <button class="btn btn-ghost btn-sm" id="ka-zurueck">← Zur Bestenliste</button>
      <div class="karriere-ansicht anim mt">
        ${kopfHtml(k)}
        ${summeHtml(k)}
        ${wegHtml(k)}
        ${anlageHtml(k)}
        ${(k.wendepunkt && k.wendepunkt.wahl) ? `<div class="story mt">
          <b>Wendepunkt:</b> ${esc(k.wendepunkt.wahl)}
          <span class="small"> · ${k.wendepunkt.chance}% Chance, mit ${k.wendepunkt.alter} Jahren</span>
        </div>` : ''}
        <h3 class="mt-l">Saison für Saison</h3>
        ${saisonTabelle(k)}
      </div>`;
  }

  async function zeige(id){
    geschichte(id);
    bereich.innerHTML = '<div class="card center pad-lg"><p class="small mb0">Wird geladen …</p></div>';
    const k = await KONTO.karriereAnsicht(id);
    if (!k){
      bereich.innerHTML = `<div class="card"><h3>Diese Laufbahn ist nicht zu sehen</h3>
        <p class="small">Vielleicht wurde das Profil gesperrt oder die Laufbahn gelöscht.</p>
        <button class="btn btn-ghost btn-sm" id="ka-zurueck">← Zur Bestenliste</button></div>`;
    } else {
      unterzeile.textContent = 'Eine fremde Laufbahn, Saison für Saison.';
      bereich.innerHTML = detailHtml(k);
    }
    const z = document.getElementById('ka-zurueck');
    if (z) z.onclick = () => { history.back(); };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------------------------------------------------------
     Adresszeile: der Zurueck-Knopf des Browsers soll funktionieren
     --------------------------------------------------------------- */

  function geschichte(id){
    const u = new URL(location.href);
    if (id) u.searchParams.set('karriere', id); else u.searchParams.delete('karriere');
    if (u.href !== location.href) history.pushState({ karriere: id || null }, '', u);
  }

  function ausAdresse(){
    const id = new URL(location.href).searchParams.get('karriere');
    if (id) zeigeOhneVerlauf(id); else listeLaden();
  }

  async function zeigeOhneVerlauf(id){
    bereich.innerHTML = '<div class="card center pad-lg"><p class="small mb0">Wird geladen …</p></div>';
    const k = await KONTO.karriereAnsicht(id);
    bereich.innerHTML = k ? detailHtml(k)
      : `<div class="card"><h3>Diese Laufbahn ist nicht zu sehen</h3>
           <button class="btn btn-ghost btn-sm" id="ka-zurueck">← Zur Bestenliste</button></div>`;
    const z = document.getElementById('ka-zurueck');
    if (z) z.onclick = () => { geschichte(null); listeLaden(); };
  }

  window.addEventListener('popstate', () => {
    const id = new URL(location.href).searchParams.get('karriere');
    if (id) zeigeOhneVerlauf(id);
    else { unterzeile.textContent = 'Nach Legendenpunkten sortiert.'; listeLaden(); }
  });

  /* ---------------------------------------------------------------
     Start
     --------------------------------------------------------------- */

  function ohneKonto(){
    bereich.innerHTML = `
      <div class="card">
        <h3>Die Bestenliste braucht ein Konto</h3>
        <p class="small">Sie zeigt Laufbahnen von Spielern aus aller Welt – dafür
          müssen die Laufbahnen irgendwo liegen. Ohne Konto bleibt alles im
          Browser, und der kennt nur deine eigenen.</p>
        <div class="row">
          <a class="btn btn-primary btn-sm" href="konto.html">Zum Konto</a>
          <a class="btn btn-ghost btn-sm" href="pokalraum.html">Eigene Laufbahnen</a>
        </div>
      </div>`;
  }

  if (!KONTO.konfiguriert()){
    bereich.innerHTML = `
      <div class="card"><h3>Konten sind noch nicht eingerichtet</h3>
        <p class="small mb0">In <code>assets/konto-config.js</code> fehlen die
          Supabase-Werte. Die Schritte stehen in <code>db/README.md</code>.</p></div>`;
  } else {
    KONTO.beiAenderung(z => {
      if (!z.angemeldet){ ohneKonto(); return; }
      ausAdresse();
    });
    KONTO.starten();
  }
})();
