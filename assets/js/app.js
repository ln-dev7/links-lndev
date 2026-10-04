// links.lndev.me : langue, heure et ciel de Douala, fiches d'apps, quiz et widget échecs.
// Aperçu d'une autre heure : ajoute ?at=06:10 à l'URL. Forcer la langue : ?lang=fr ou ?lang=en.
;(function () {
  'use strict'

  var C = window.LN
  var root = document.documentElement
  var params = new URLSearchParams(location.search)

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel)
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel))
  }
  var store = {
    get: function (k) {
      try {
        return localStorage.getItem(k)
      } catch (e) {
        return null
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v)
      } catch (e) {}
    },
    remove: function (k) {
      try {
        localStorage.removeItem(k)
      } catch (e) {}
    },
  }

  /* ---------------------------------------------------------------- */
  /* Langue                                                           */
  /* ---------------------------------------------------------------- */

  var lang = root.lang === 'fr' ? 'fr' : 'en'

  // Typographie française : espace insécable avant : ; ! ? et à l'intérieur des guillemets.
  function typo(s) {
    if (lang !== 'fr') return s
    return s
      .replace(/ ([:;!?»])/g, '\u202f$1')
      .replace(/« /g, '«\u202f')
  }

  function t(key, vars) {
    var s = C.i18n[lang][key]
    if (s == null) s = key
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace('{' + k + '}', vars[k])
      })
    }
    return typo(s)
  }

  function applyLang() {
    root.lang = lang
    document.title = t('title')
    var desc = $('meta[name="description"]')
    if (desc) desc.setAttribute('content', t('description'))

    $$('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'))
    })
    $$('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')))
    })
    $$('[data-social]').forEach(function (el) {
      el.setAttribute('aria-label', t('followOn', { name: el.getAttribute('data-social') }))
    })
    $$('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang))
    })
    var portfolio = $('[data-portfolio]')
    if (portfolio) portfolio.href = 'https://www.lndev.me/' + lang

    tick()
    renderQuiz()
    renderChess()
    if (sheet.open && currentApp) fillSheet(currentApp)
  }

  $$('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.getAttribute('data-lang')
      if (next === lang) return
      lang = next
      store.set('ln-lang', lang)
      applyLang()
    })
  })

  /* ---------------------------------------------------------------- */
  /* Heure de Douala et ciel                                          */
  /* ---------------------------------------------------------------- */

  var hourFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: C.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  function doualaTime() {
    var parts = hourFmt.format(new Date()).split(':')
    var h = +parts[0]
    var m = +parts[1]
    var at = params.get('at')
    if (at && /^\d{1,2}:\d{2}$/.test(at)) {
      h = Math.min(23, +at.split(':')[0])
      m = Math.min(59, +at.split(':')[1])
    }
    return { h: h, m: m, minutes: h * 60 + m }
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n
  }

  // Couleurs du ciel (haut, milieu, horizon), lueur et part de nuit, minute par minute.
  // Douala est à 4° de l'équateur : le soleil se lève vers 6 h et se couche vers 18 h toute l'année.
  var SKY = [
    { at: 0, c: ['#060b1d', '#101a3b', '#1f2a5c'], glow: 'rgba(90,110,200,0.18)', night: 1 },
    { at: 315, c: ['#081029', '#16224d', '#2b346e'], glow: 'rgba(110,120,210,0.2)', night: 1 },
    { at: 355, c: ['#1b2a5c', '#4f437c', '#a8706f'], glow: 'rgba(240,150,120,0.42)', night: 0.45 },
    { at: 395, c: ['#284f94', '#5b6ea3', '#b98377'], glow: 'rgba(255,190,140,0.45)', night: 0 },
    { at: 450, c: ['#1f5aac', '#3a74bd', '#5b88c0'], glow: 'rgba(255,235,200,0.32)', night: 0 },
    { at: 720, c: ['#1a56ad', '#3576c4', '#5690cc'], glow: 'rgba(255,250,225,0.38)', night: 0 },
    { at: 960, c: ['#1d55a3', '#3d74b8', '#6487b6'], glow: 'rgba(255,225,175,0.38)', night: 0 },
    { at: 1035, c: ['#24508f', '#5f75a6', '#b27c62'], glow: 'rgba(255,190,120,0.48)', night: 0 },
    { at: 1090, c: ['#232c66', '#7a4a7c', '#d6735a'], glow: 'rgba(255,140,90,0.55)', night: 0.15 },
    { at: 1125, c: ['#141b45', '#36295f', '#7a3f62'], glow: 'rgba(200,100,120,0.35)', night: 0.6 },
    { at: 1170, c: ['#09112c', '#18214a', '#2a2e62'], glow: 'rgba(110,110,200,0.2)', night: 1 },
    { at: 1440, c: ['#060b1d', '#101a3b', '#1f2a5c'], glow: 'rgba(90,110,200,0.18)', night: 1 },
  ]

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  function mix(a, b, k) {
    var x = hexToRgb(a)
    var y = hexToRgb(b)
    return (
      'rgb(' +
      [0, 1, 2]
        .map(function (i) {
          return Math.round(x[i] + (y[i] - x[i]) * k)
        })
        .join(',') +
      ')'
    )
  }
  function mixRgba(a, b, k) {
    var pa = a.match(/[\d.]+/g).map(Number)
    var pb = b.match(/[\d.]+/g).map(Number)
    var out = pa.map(function (v, i) {
      return v + (pb[i] - v) * k
    })
    return 'rgba(' + Math.round(out[0]) + ',' + Math.round(out[1]) + ',' + Math.round(out[2]) + ',' + out[3].toFixed(3) + ')'
  }

  function paintSky(minutes) {
    var i = 0
    while (i < SKY.length - 2 && SKY[i + 1].at <= minutes) i++
    var a = SKY[i]
    var b = SKY[i + 1]
    var k = (minutes - a.at) / (b.at - a.at)
    var top = mix(a.c[0], b.c[0], k)
    var s = root.style
    s.setProperty('--sky-top', top)
    s.setProperty('--sky-mid', mix(a.c[1], b.c[1], k))
    s.setProperty('--sky-low', mix(a.c[2], b.c[2], k))
    s.setProperty('--glow', mixRgba(a.glow, b.glow, k))
    s.setProperty('--night', (a.night + (b.night - a.night) * k).toFixed(3))

    // La lueur du soleil suit un arc de 6 h à 18 h 30 ; la nuit, elle reste basse et froide.
    var p = Math.max(0, Math.min(1, (minutes - 360) / 750))
    var x = 6 + 88 * p
    var y = 40 - Math.sin(Math.PI * p) * 34
    s.setProperty('--sun-x', x.toFixed(2) + 'vw')
    s.setProperty('--sun-y', y.toFixed(2) + 'vh')

    var meta = $('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', top)
  }

  var lastMinute = -1
  function tick() {
    var now = doualaTime()
    var clock = pad(now.h) + ':' + pad(now.m)
    $('#clock').textContent = clock
    $('#clock-label').textContent = t('clockLabel', { time: clock })
    var date = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', {
      timeZone: C.timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date())
    $('#date').textContent = t('dateLine', { date: date })
    if (now.minutes !== lastMinute) {
      lastMinute = now.minutes
      paintSky(now.minutes)
    }
  }

  function scheduleTick() {
    var ms = 60000 - (Date.now() % 60000) + 50
    setTimeout(function () {
      tick()
      scheduleTick()
    }, ms)
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) tick()
  })

  /* ---------------------------------------------------------------- */
  /* Fiches d'apps                                                    */
  /* ---------------------------------------------------------------- */

  var sheet = $('#sheet')
  var currentApp = null

  function host(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch (e) {
      return ''
    }
  }

  function fillSheet(id) {
    var app = C.apps[id]
    $('#sheet-icon').src = app.icon
    $('#sheet-title').textContent = app.name
    $('#sheet-platforms').textContent = app.platforms[lang]
    $('#sheet-desc').textContent = typo(app.description[lang])
    var list = $('#sheet-links')
    list.textContent = ''
    app.links.forEach(function (link, i) {
      var li = document.createElement('li')
      var a = document.createElement('a')
      a.href = link.url
      a.target = '_blank'
      a.rel = 'noopener'
      if (i === 0) a.className = 'is-primary'
      var label = document.createElement('span')
      label.textContent = t('link_' + link.kind)
      var where = document.createElement('span')
      where.textContent = host(link.url)
      a.appendChild(label)
      a.appendChild(where)
      li.appendChild(a)
      list.appendChild(li)
    })
  }

  function openSheet(id) {
    if (!C.apps[id] || typeof sheet.showModal !== 'function') return false
    currentApp = id
    fillSheet(id)
    sheet.classList.remove('is-closing')
    sheet.showModal()
    return true
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  function closeSheet() {
    if (!sheet.open || sheet.classList.contains('is-closing')) return
    if (reduceMotion.matches) {
      sheet.close()
      return
    }
    sheet.classList.add('is-closing')
    setTimeout(function () {
      sheet.classList.remove('is-closing')
      sheet.close()
    }, 190)
  }

  $$('[data-app]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      if (openSheet(a.getAttribute('data-app'))) e.preventDefault()
    })
  })

  sheet.addEventListener('cancel', function (e) {
    e.preventDefault()
    closeSheet()
  })
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet || e.target.hasAttribute('data-close')) closeSheet()
  })
  sheet.addEventListener('close', function () {
    currentApp = null
    $('.sheet-panel').style.transform = ''
  })

  // Glisser la fiche vers le bas pour la fermer (mobile)
  ;(function () {
    var panel = $('.sheet-panel')
    var startY = null
    var dy = 0
    panel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch' || e.target.closest('a,button')) return
      startY = e.clientY
      dy = 0
    })
    panel.addEventListener('pointermove', function (e) {
      if (startY == null) return
      dy = Math.max(0, e.clientY - startY)
      panel.style.transform = 'translateY(' + dy + 'px)'
    })
    function end() {
      if (startY == null) return
      startY = null
      if (dy > 90) {
        sheet.close()
      } else {
        panel.style.transform = ''
      }
    }
    panel.addEventListener('pointerup', end)
    panel.addEventListener('pointercancel', end)
  })()

  /* ---------------------------------------------------------------- */
  /* Quiz et Anecdotes                                                */
  /* ---------------------------------------------------------------- */

  var quiz = { index: -1, picked: null }

  function nextQuestion() {
    var last = quiz.index
    if (last < 0) {
      var saved = +store.get('ln-quiz')
      if (!isNaN(saved)) last = saved
    }
    var n = C.quiz.length
    var i = Math.floor(Math.random() * n)
    if (n > 1 && i === last) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n
    quiz.index = i
    quiz.picked = null
    store.set('ln-quiz', String(i))
  }

  function renderQuiz(focusFirst) {
    if (quiz.index < 0) nextQuestion()
    var item = C.quiz[quiz.index]
    var q = item[lang]
    var body = $('#qea-body')
    body.textContent = ''

    var question = document.createElement('p')
    question.className = 'qea-q'
    question.id = 'qea-question'
    question.textContent = typo(q.q)
    body.appendChild(question)

    var list = document.createElement('ul')
    list.className = 'qea-options'
    list.setAttribute('aria-labelledby', 'qea-question')
    q.options.forEach(function (opt, i) {
      var li = document.createElement('li')
      var b = document.createElement('button')
      b.type = 'button'
      b.textContent = opt
      if (quiz.picked != null) {
        b.disabled = true
        if (i === item.answer) b.className = 'is-right'
        else if (i === quiz.picked) b.className = 'is-wrong'
        else b.className = 'is-dim'
      }
      b.addEventListener('click', function () {
        quiz.picked = i
        renderQuiz()
        var verdict = $('.qea-verdict')
        if (verdict) verdict.focus()
      })
      li.appendChild(b)
      list.appendChild(li)
    })
    body.appendChild(list)

    if (quiz.picked != null) {
      var result = document.createElement('div')
      result.className = 'qea-result'
      var verdict = document.createElement('p')
      verdict.className = 'qea-verdict'
      verdict.tabIndex = -1
      verdict.setAttribute('role', 'status')
      verdict.textContent = quiz.picked === item.answer ? t('qeaRight') : t('qeaWrong', { answer: q.options[item.answer] })
      var fact = document.createElement('p')
      fact.className = 'qea-fact'
      fact.textContent = typo(q.fact)
      var actions = document.createElement('div')
      actions.className = 'qea-actions'
      var next = document.createElement('button')
      next.type = 'button'
      next.className = 'qea-next'
      next.textContent = t('qeaNext')
      next.addEventListener('click', function () {
        nextQuestion()
        renderQuiz(true)
      })
      var watch = document.createElement('a')
      watch.className = 'qea-watch'
      watch.href = C.qea
      watch.target = '_blank'
      watch.rel = 'noopener'
      watch.textContent = t('qeaWatch')
      actions.appendChild(next)
      actions.appendChild(watch)
      result.appendChild(verdict)
      result.appendChild(fact)
      result.appendChild(actions)
      body.appendChild(result)
    }

    if (focusFirst) {
      var first = $('.qea-options button')
      if (first) first.focus()
    }
  }

  /* ---------------------------------------------------------------- */
  /* Chess.com : classement public, sinon une simple invitation       */
  /* ---------------------------------------------------------------- */

  var chessStats = null

  function renderChess() {
    var box = $('#chess-stats')
    if (!box) return
    box.textContent = ''
    if (!chessStats || !chessStats.length) {
      var invite = document.createElement('span')
      invite.className = 'chess-invite'
      invite.textContent = t('chessInvite')
      box.appendChild(invite)
      return
    }
    var nf = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US')
    chessStats.forEach(function (s) {
      var el = document.createElement('span')
      el.className = 'chess-stat'
      var v = document.createElement('strong')
      v.textContent = nf.format(s.rating)
      var l = document.createElement('span')
      l.textContent = t('chess_' + s.mode)
      el.appendChild(v)
      el.appendChild(l)
      box.appendChild(el)
    })
  }

  function loadChess() {
    var cached = null
    try {
      cached = JSON.parse(sessionStorage.getItem('ln-chess') || 'null')
    } catch (e) {}
    if (cached) {
      chessStats = cached
      renderChess()
      return
    }
    if (!window.fetch) return
    var ctrl = window.AbortController ? new AbortController() : null
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort()
    }, 6000)
    fetch('https://api.chess.com/pub/player/' + C.chess.username + '/stats', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        if (!r.ok) throw new Error(r.status)
        return r.json()
      })
      .then(function (d) {
        var out = []
        ;['rapid', 'blitz', 'bullet', 'daily'].forEach(function (mode) {
          var block = d['chess_' + mode]
          if (block && block.last && block.last.rating && out.length < 2) {
            out.push({ mode: mode, rating: block.last.rating })
          }
        })
        chessStats = out
        try {
          sessionStorage.setItem('ln-chess', JSON.stringify(out))
        } catch (e) {}
        renderChess()
      })
      .catch(function () {})
      .then(function () {
        clearTimeout(timer)
      })
  }

  /* ---------------------------------------------------------------- */
  /* Organiser l'écran comme sur un téléphone                         */
  /* Appui long : les icônes tremblent, on les fait glisser, OK pour  */
  /* terminer. La disposition reste sur l'appareil du visiteur.       */
  /* ---------------------------------------------------------------- */

  var LAYOUT_KEY = 'ln-layout'
  var LONG_PRESS = 500
  var groups = {
    home: { containers: $$('[data-group="home"]'), capacity: 4, fixed: false },
    dock: { containers: $$('[data-group="dock"]'), capacity: Infinity, fixed: true },
  }

  function groupItems(g) {
    return groups[g].containers.reduce(function (all, c) {
      return all.concat($$('[data-id]', c))
    }, [])
  }
  function idsOf(list) {
    return list.map(function (el) {
      return el.getAttribute('data-id')
    })
  }
  function groupOf(el) {
    return el.closest('[data-group="dock"]') ? 'dock' : 'home'
  }
  function itemFrom(node) {
    return node && node.closest ? node.closest('[data-group] [data-id]') : null
  }
  function nameOf(el) {
    var label = $('.label', el)
    return label ? label.textContent : el.getAttribute('data-social') || el.getAttribute('data-id')
  }

  // Range les éléments d'un groupe dans l'ordre donné, quatre par conteneur sur l'écran d'accueil.
  function place(g, order) {
    var byId = {}
    groupItems(g).forEach(function (el) {
      byId[el.getAttribute('data-id')] = el
    })
    var list = order.filter(function (id, i) {
      return byId[id] && order.indexOf(id) === i
    })
    Object.keys(byId).forEach(function (id) {
      if (list.indexOf(id) < 0) list.push(id)
    })
    var cs = groups[g].containers
    var cap = groups[g].capacity
    list.forEach(function (id, i) {
      cs[Math.min(cs.length - 1, Math.floor(i / cap))].appendChild(byId[id])
    })
  }

  var defaults = { home: idsOf(groupItems('home')), dock: idsOf(groupItems('dock')) }

  function currentLayout() {
    return { home: idsOf(groupItems('home')), dock: idsOf(groupItems('dock')) }
  }
  function isDefault() {
    var c = currentLayout()
    return c.home.join() === defaults.home.join() && c.dock.join() === defaults.dock.join()
  }
  function saveLayout() {
    if (isDefault()) store.remove(LAYOUT_KEY)
    else store.set(LAYOUT_KEY, JSON.stringify(currentLayout()))
    $('[data-reset]').hidden = isDefault()
  }

  ;(function restoreLayout() {
    var saved = null
    try {
      saved = JSON.parse(store.get(LAYOUT_KEY) || 'null')
    } catch (e) {}
    if (!saved) return
    if (Array.isArray(saved.home)) place('home', saved.home)
    if (Array.isArray(saved.dock)) place('dock', saved.dock)
  })()

  // Animation FLIP : chaque icône glisse de son ancienne place vers la nouvelle.
  function flip(g, mutate) {
    var els = groupItems(g)
    var before = els.map(function (el) {
      return el.getBoundingClientRect()
    })
    mutate()
    if (reduceMotion.matches) return
    els.forEach(function (el, i) {
      var a = before[i]
      var b = el.getBoundingClientRect()
      var dx = a.left - b.left
      var dy = a.top - b.top
      if (!dx && !dy) return
      el.style.transition = 'none'
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'
      el.getBoundingClientRect()
      el.style.transition = 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)'
      el.style.transform = ''
    })
  }

  var editing = false
  var announcer = $('#announcer')
  function announce(text) {
    announcer.textContent = ''
    setTimeout(function () {
      announcer.textContent = text
    }, 30)
  }

  function setEditing(on) {
    if (editing === on) return
    editing = on
    root.classList.toggle('editing', on)
    $('.edit-bar').hidden = !on
    $('.lang').hidden = on
    $('[data-reset]').hidden = isDefault()
    announce(t(on ? 'editOn' : 'editOff'))
    if (on && navigator.vibrate) {
      try {
        navigator.vibrate(12)
      } catch (e) {}
    }
  }

  $('[data-done]').addEventListener('click', function () {
    setEditing(false)
  })
  $('[data-reset]').addEventListener('click', function () {
    flip('home', function () {
      place('home', defaults.home)
    })
    flip('dock', function () {
      place('dock', defaults.dock)
    })
    saveLayout()
  })

  // Emplacements figés au début du glissement : la grille ne bouge pas, seules les icônes changent de case.
  var press = null
  var drag = null
  var lastTouch = 0

  function slotsOf(g) {
    var fixed = groups[g].fixed
    return groupItems(g).map(function (el) {
      var r = el.getBoundingClientRect()
      var top = fixed ? r.top : r.top + window.scrollY
      return { left: r.left, top: top, right: r.right, bottom: top + r.height, cx: r.left + r.width / 2, cy: top + r.height / 2 }
    })
  }

  function cancelPress() {
    if (press) clearTimeout(press.timer)
    press = null
  }

  function startPress(x, y, target, kind) {
    cancelPress()
    var el = itemFrom(target)
    if (!el) return
    press = { el: el, x: x, y: y, kind: kind, armed: editing }
    if (!editing) {
      press.timer = setTimeout(function () {
        if (!press) return
        press.armed = true
        press.longPressed = true
        setEditing(true)
      }, LONG_PRESS)
    }
  }

  function beginDrag(el, x, y) {
    var r = el.getBoundingClientRect()
    var ghost = el.cloneNode(true)
    ghost.removeAttribute('data-id')
    ghost.removeAttribute('href')
    ghost.removeAttribute('id')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.classList.add('drag-ghost')
    if (groupOf(el) === 'dock') ghost.classList.add('is-dock')
    ghost.style.left = r.left + 'px'
    ghost.style.top = r.top + 'px'
    ghost.style.width = r.width + 'px'
    ghost.style.height = r.height + 'px'
    document.body.appendChild(ghost)
    el.classList.add('is-placeholder')
    root.classList.add('dragging')
    var g = groupOf(el)
    drag = { el: el, group: g, ghost: ghost, startX: x, startY: y, x: x, y: y, slots: slotsOf(g) }
    requestAnimationFrame(autoScroll)
  }

  function hitTest() {
    var g = drag.group
    var px = drag.x
    var py = groups[g].fixed ? drag.y : drag.y + window.scrollY
    var best = -1
    var bestD = Infinity
    drag.slots.forEach(function (s, i) {
      var inside = px >= s.left - 6 && px <= s.right + 6 && py >= s.top - 6 && py <= s.bottom + 6
      var d = Math.hypot(px - s.cx, py - s.cy)
      if (inside && d < bestD) {
        bestD = d
        best = i
      }
    })
    if (best < 0) return
    var list = groupItems(g)
    var from = list.indexOf(drag.el)
    if (best === from) return
    flip(g, function () {
      var order = idsOf(list)
      order.splice(from, 1)
      order.splice(best, 0, drag.el.getAttribute('data-id'))
      place(g, order)
    })
  }

  function moveDrag(x, y) {
    drag.x = x
    drag.y = y
    drag.ghost.style.transform = 'translate3d(' + (x - drag.startX) + 'px,' + (y - drag.startY) + 'px,0) scale(1.12)'
    hitTest()
  }

  // Près des bords, la page défile pour atteindre les autres rangées.
  function autoScroll() {
    if (!drag) return
    if (drag.group === 'home') {
      var v = 0
      var bottomEdge = window.innerHeight - 150
      if (drag.y < 90) v = -(90 - drag.y) / 5
      else if (drag.y > bottomEdge) v = (drag.y - bottomEdge) / 5
      if (v) {
        window.scrollBy(0, v)
        hitTest()
      }
    }
    requestAnimationFrame(autoScroll)
  }

  function endDrag() {
    var d = drag
    drag = null
    root.classList.remove('dragging')
    var r = d.el.getBoundingClientRect()
    var g0 = d.ghost.getBoundingClientRect()
    var baseLeft = parseFloat(d.ghost.style.left)
    var baseTop = parseFloat(d.ghost.style.top)
    // L'icône rejoint sa case puis réapparaît à sa place.
    d.ghost.classList.add('is-dropping')
    d.ghost.style.transform = 'translate3d(' + (r.left - baseLeft) + 'px,' + (r.top - baseTop) + 'px,0)'
    setTimeout(
      function () {
        d.ghost.remove()
        d.el.classList.remove('is-placeholder')
      },
      reduceMotion.matches || !g0.width ? 0 : 230
    )
    saveLayout()
    var list = groupItems(d.group)
    announce(t('editMoved', { name: nameOf(d.el), pos: list.indexOf(d.el) + 1, total: list.length }))
  }

  function movePointer(x, y, e) {
    if (drag) {
      if (e && e.cancelable) e.preventDefault()
      moveDrag(x, y)
      return
    }
    if (!press) return
    var dist = Math.hypot(x - press.x, y - press.y)
    if (!press.armed) {
      if (dist > 10) cancelPress()
      return
    }
    if (e && e.cancelable) e.preventDefault()
    if (dist > 6) {
      var el = press.el
      cancelPress()
      beginDrag(el, x, y)
      moveDrag(x, y)
    }
  }

  function endPointer() {
    cancelPress()
    if (drag) endDrag()
  }

  document.addEventListener(
    'touchstart',
    function (e) {
      lastTouch = Date.now()
      if (e.touches.length > 1) return endPointer()
      var p = e.touches[0]
      startPress(p.clientX, p.clientY, e.target, 'touch')
    },
    { passive: true }
  )
  document.addEventListener(
    'touchmove',
    function (e) {
      var p = e.touches[0]
      movePointer(p.clientX, p.clientY, e)
    },
    { passive: false }
  )
  document.addEventListener('touchend', endPointer)
  document.addEventListener('touchcancel', endPointer)

  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || Date.now() - lastTouch < 800) return
    startPress(e.clientX, e.clientY, e.target, 'mouse')
    if (editing && itemFrom(e.target)) e.preventDefault()
  })
  document.addEventListener('mousemove', function (e) {
    if (press || drag) movePointer(e.clientX, e.clientY, e)
  })
  document.addEventListener('mouseup', endPointer)
  window.addEventListener('blur', endPointer)

  // Pas de menu contextuel ni d'aperçu de lien pendant un appui long sur une icône.
  document.addEventListener('contextmenu', function (e) {
    if ((press && press.kind === 'touch') || editing || drag) {
      if (itemFrom(e.target)) e.preventDefault()
    }
  })
  document.addEventListener('dragstart', function (e) {
    if (itemFrom(e.target)) e.preventDefault()
  })

  // En mode organisation, toucher une icône ne l'ouvre pas ; toucher le fond termine.
  document.addEventListener(
    'click',
    function (e) {
      if (!editing) return
      if (e.target.closest('.edit-bar')) return
      e.preventDefault()
      e.stopPropagation()
      if (!itemFrom(e.target) && !e.target.closest('.widget')) setEditing(false)
    },
    true
  )

  // Clavier : en mode organisation, les flèches déplacent l'icône sélectionnée, Échap termine.
  document.addEventListener('keydown', function (e) {
    if (!editing) return
    if (e.key === 'Escape') {
      setEditing(false)
      return
    }
    var el = itemFrom(document.activeElement)
    var step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]
    if (!el || !step) return
    e.preventDefault()
    var g = groupOf(el)
    var list = groupItems(g)
    var from = list.indexOf(el)
    var to = Math.max(0, Math.min(list.length - 1, from + step))
    if (to === from) return
    flip(g, function () {
      var order = idsOf(list)
      order.splice(from, 1)
      order.splice(to, 0, el.getAttribute('data-id'))
      place(g, order)
    })
    el.focus()
    saveLayout()
    announce(t('editMoved', { name: nameOf(el), pos: to + 1, total: list.length }))
  })

  /* ---------------------------------------------------------------- */
  /* Démarrage                                                        */
  /* ---------------------------------------------------------------- */

  // Décalage du « déverrouillage » : chaque icône et widget apparaît à son tour.
  $$('.home .icon, .home .widget').forEach(function (el, i) {
    el.style.setProperty('--i', i)
  })

  applyLang()
  scheduleTick()
  loadChess()

  // Une fois l'écran « déverrouillé », on retire l'animation d'entrée pour qu'elle ne rejoue pas.
  setTimeout(function () {
    root.classList.add('unlocked')
  }, 1400)
})()
