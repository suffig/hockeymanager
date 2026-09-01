/* ==========================================================
   RINKRISE – Weltweite Bestenliste

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
  const S = { seite: 0, gesamt: 0, pos: '', sortiert: 'legendenwert',
              zeilen: [], laden: false, ich: null };

  const POS_NAMEN = { C:'Center', LW:'Linker Flügel', RW:'Rechter Flügel', D:'Verteidiger', G:'Torhüter' };

  /* Wonach sortiert werden kann - und welche Zahl dann gross in der
     Zeile steht. Die Weltplatzziffer bleibt daneben stehen, damit man
     beim Blaettern nach Toren nicht vergisst, wo man insgesamt steht. */
  const SORTEN = [
    { k:'legendenwert', n:'Punkte',   kurz:'Legendenpunkte',
      dativ:'Legendenpunkten' },
    { k:'punkte',       n:'Scorer',   kurz:'Scorerpunkte, bei Torhütern Siege',
      dativ:'Scorerpunkten' },
    { k:'trophaeen',    n:'Trophäen', kurz:'gewonnene Trophäen',
      dativ:'Trophäen' },
    { k:'hoehepunkt',   n:'Bestwert', kurz:'höchster erreichter Gesamtwert',
      dativ:'dem höchsten Gesamtwert' },
    { k:'saisons',      n:'Saisons',  kurz:'gespielte Saisons',
      dativ:'der Zahl der Saisons' }
  ];
  const sorte = () => SORTEN.find(x => x.k === S.sortiert) || SORTEN[0];

  /* ---------------------------------------------------------------
     Rangliste
     --------------------------------------------------------------- */

  function filterHtml(){
    const knopf = (k, n) => `<button type="button" class="bl-filter ${S.pos === k ? 'an' : ''}"
      data-pos="${k}">${n}</button>`;
    const sortKnopf = x => `<button type="button" class="bl-filter ${S.sortiert === x.k ? 'an' : ''}"
      data-sortiert="${x.k}" title="${esc(x.kurz)}">${x.n}</button>`;
    return `<div class="bl-steuer">
      <div class="bl-filter-reihe">
        ${knopf('', 'Alle')}${knopf('C', 'C')}${knopf('LW', 'LW')}${knopf('RW', 'RW')}
        ${knopf('D', 'D')}${knopf('G', 'G')}
      </div>
      <div class="bl-filter-reihe bl-sortierung">
        <span class="bl-sortlabel">Sortieren nach</span>
        ${SORTEN.map(sortKnopf).join('')}
      </div>
    </div>`;
  }

  /* Die vordersten drei bekommen ein eigenes Bild - aber nur dort, wo
     die Reihenfolge auch die weltweite ist: auf der ersten Seite, ohne
     Filter, nach Legendenpunkten. Sonst waere das Podest gelogen. */
  function podestHtml(){
    if (S.seite !== 0 || S.pos || S.sortiert !== 'legendenwert') return '';
    const drei = S.zeilen.slice(0, 3);
    if (drei.length < 3) return '';
    const stufe = (z, platz) => {
      const nat = PUCKERO.nation(z.nation) || { flag:'' };
      return `<button type="button" class="pod pod-${platz} ${istIch(z) ? 'pod-ich' : ''}"
        data-karriere="${z.id}">
        <span class="pod-platz">${platz}</span>
        <span class="pod-name">${esc(z.name)}</span>
        <span class="pod-klein">${nat.flag || ''} ${esc(z.pos)}</span>
        <span class="pod-wert">${z.legendenwert}</span>
        <span class="pod-rang">${esc(z.rang || '')}</span>
      </button>`;
    };
    return `<div class="podest">
      ${stufe(drei[1], 2)}${stufe(drei[0], 1)}${stufe(drei[2], 3)}
    </div>`;
  }

  const istIch = z => !!(S.ich && z.benutzername === S.ich);

  function zeileHtml(z, i){
    const nachPunkten = S.sortiert === 'legendenwert';
    const medaille = (nachPunkten && z.platz <= 3) ? ' bl-podest bl-p' + z.platz : '';
    const nat = PUCKERO.nation(z.nation) || { flag:'', n:z.nation };
    const gross = z[S.sortiert] != null ? z[S.sortiert] : z.legendenwert;
    /* Beim Sortieren nach etwas anderem zaehlt die Zeile durch - die
       Weltplatzziffer wandert daneben, sonst stuenden zwei Zahlen
       ohne Bezug nebeneinander. */
    const ziffer = nachPunkten ? z.platz : (S.seite * JE_SEITE + i + 1);
    return `<button type="button" class="bl-zeile${medaille}${istIch(z) ? ' bl-ich' : ''}"
      data-karriere="${z.id}">
      <span class="bl-platz">${ziffer}</span>
      <span class="bl-wer">
        <b>${esc(z.name)}${istIch(z) ? '<span class="bl-du">du</span>' : ''}</b>
        <span class="bl-klein">${nat.flag || ''} ${esc(z.pos)}
          · ${esc(z.benutzername || 'unbekannt')}${z.gast
            ? '<span class="bl-gast" title="Ohne Konto eingetragen">Gast</span>' : ''}</span>
      </span>
      <span class="bl-zahlen">
        <b>${gross}</b>
        <span class="bl-klein">${nachPunkten ? esc(z.rang || '')
          : 'Platz ' + z.platz + ' weltweit'}</span>
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
    const podest = podestHtml();
    const rest = podest ? S.zeilen.slice(3) : S.zeilen;
    const versatz = podest ? 3 : 0;
    return `
      ${filterHtml()}
      ${podest}
      <div class="bl-liste">${rest.map((z, i) => zeileHtml(z, i + versatz)).join('')}</div>
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
      von: S.seite * JE_SEITE, wieviele: JE_SEITE,
      pos: S.pos || undefined, sortiert: S.sortiert
    });
    S.laden = false;
    if (erg.fehler){
      /* Ein fehlendes Leserecht ist der eine Fehler, der hier
         wahrscheinlich ist und der sich genau benennen laesst -
         "permission denied for view bestenliste" sagt einem Besucher
         nichts, und dem Betreiber sagt es nicht, was zu tun ist. */
      const keinRecht = /permission denied/i.test(erg.fehler);
      bereich.innerHTML = (S.gast ? einladung() : '') + `
        <div class="card">
          <h3>${keinRecht ? 'Die Liste ist noch nicht freigegeben'
                          : 'Die Liste kam nicht an'}</h3>
          <p class="small${keinRecht ? '' : ' mb0'}">${keinRecht
            ? 'Für Gäste fehlt noch das Leserecht auf die Rangliste.'
            : esc(erg.fehler)}</p>
          ${keinRecht ? `<p class="small mb0">Wer die Seite betreibt, führt dafür
            <code>db/05_gaeste.sql</code> in Supabase aus.</p>` : ''}
        </div>`;
      return;
    }
    S.zeilen = erg.zeilen;
    S.gesamt = erg.gesamt;
    unterzeile.textContent = S.gesamt
      ? S.gesamt + (S.gesamt === 1 ? ' Laufbahn' : ' Laufbahnen') +
        ', nach ' + sorte().dativ + ' sortiert. Tipp auf eine Position für die ganze Geschichte.'
      : 'Noch nichts eingetragen.';
    bereich.innerHTML = (S.gast ? einladung() : '') + rekordeHtml() + listeHtml();
    binde();
    rekordeLaden();
  }

  function binde(){
    bereich.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => {
      S.pos = b.dataset.pos; S.seite = 0; listeLaden();
    });
    bereich.querySelectorAll('[data-sortiert]').forEach(b => b.onclick = () => {
      S.sortiert = b.dataset.sortiert; S.seite = 0; listeLaden();
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
        ${UI.laufbahnBogen(k.saisonwerte)}
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

  /* ---------------------------------------------------------------
     Gaeste sehen die Liste auch

     Sie verlangte bisher ein Konto - fuer eine Bestenliste die
     falsche Reihenfolge: sie ist das, was jemanden ueberhaupt dazu
     bringt, eines anzulegen. Wer sie hinter der Anmeldung versteckt,
     zeigt sie genau denen, die sie am wenigsten brauchen.

     Statt der Sperre steht jetzt eine Einladung ueber der Liste, und
     zwar nur einmal. Das Leserecht dafuer kommt aus db/05_gaeste.sql
     und gilt allein den beiden Ansichten.
     --------------------------------------------------------------- */
  /* ------------------------------------------------------------------
     Was ueberhaupt moeglich ist

     Die Rangliste sagt, wer vorne steht. Sie sagt nicht, wo die
     Grenzen liegen - und genau das will man wissen, waehrend man
     selbst spielt: wie viele Punkte hat der beste Scorer je gemacht,
     wie lange die laengste Laufbahn gedauert.
     ------------------------------------------------------------------ */
  function rekordeHtml(){
    return `<div class="rekorde" id="rekorde">
      <div class="rk-kopf">${UI.ikone('pokal', 14)} Bestmarken aller Spieler</div>
      <div class="rk-gitter" id="rk-gitter">
        <div class="rk-laden">Wird geladen …</div>
      </div>
    </div>`;
  }

  async function rekordeLaden(){
    const ziel = document.getElementById('rk-gitter');
    if (!ziel) return;
    const erg = await KONTO.rekorde();
    if (!erg.liste.length){
      const kasten = document.getElementById('rekorde');
      if (kasten) kasten.remove();
      return;
    }
    ziel.innerHTML = erg.liste.map(r => `
      <div class="rk-marke">
        <span class="rk-ik">${UI.ikone(r.ik, 15)}</span>
        <b class="rk-wert">${r.wert}</b>
        <span class="rk-was">${esc(r.n)}</span>
        <span class="rk-wer">${esc(r.halter.name || '')}
          <i>${esc(r.halter.benutzername || 'unbekannt')}</i></span>
      </div>`).join('');
  }

  function einladung(){
    return `<div class="einladung">
      ${UI.ikone('krone', 18)}
      <div class="ei-text">
        <b>Du stehst noch nicht hier</b>
        <span>Mit einem Konto landen deine Laufbahnen in dieser Liste.</span>
      </div>
      <a class="btn btn-primary btn-sm" href="konto.html">Konto</a>
    </div>`;
  }

  if (!KONTO.konfiguriert()){
    bereich.innerHTML = `
      <div class="card"><h3>Konten sind noch nicht eingerichtet</h3>
        <p class="small mb0">In <code>assets/konto-config.js</code> fehlen die
          Supabase-Werte. Die Schritte stehen in <code>db/README.md</code>.</p></div>`;
  } else {
    KONTO.beiAenderung(z => {
      /* Ohne Anmeldung faellt nur die eigene Hervorhebung weg - die
         Liste selbst laedt genauso. */
      S.ich = z.angemeldet ? ((z.profil || {}).benutzername || null) : null;
      S.gast = !z.angemeldet;
      ausAdresse();
    });
    KONTO.starten();
  }
})();
