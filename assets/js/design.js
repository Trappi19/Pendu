/*
 * design.js : tout l'habillage (sons, sang, animations, stickman).
 * Ne dépend de script.js que par le DOM :
 *   .vie  → nombre de vies (écrit par script.js)  => on en déduit les erreurs
 *   .mot  → mot avec des "_"                        => plus de "_" = victoire
 * script.js n'est PAS modifié. design.js doit être chargé AVANT lui (voir index.html).
 */
(() => {
    const SOL = 285                         // y du sol (viewBox du SVG) où atterrissent les petits morceaux
    const SOL_PIECE = 294                   // y du sol pour les gros morceaux (bord extérieur du contour posé dessus)
    const racine = document.documentElement
    const svg = document.querySelector('#pendu')
    const parties = document.querySelectorAll('#pendu .partie')   // dans l'ordre d'apparition
    const zoneVie = document.querySelector('.vie')
    const zoneMot = document.querySelector('.mot')
    const NS = 'http://www.w3.org/2000/svg'
    const rand = gsap.utils.random

    /* ===================== SONS (Howler) ===================== */
    // (script.js joue déjà jemeurs.mp3 à chaque mauvaise lettre : pas de doublon ici)
    const son = (fichier, opts = {}) => new Howl({
        src: [`assets/sounds/${fichier}`],
        onloaderror: () => console.warn(`[design] son manquant : assets/sounds/${fichier}`),
        ...opts,
    })
    const sons = {
        bonne:    son('bonne.mp3',    { volume: .5 }),
        chaine:   son('chaine.mp3',   { volume: .5 }),
        tranche:  son('tranche.mp3',  { volume: .7 }),
        splat:    son('splat.mp3',    { volume: .6 }),
        victoire: son('victoire.mp3', { volume: .8 }),
        defaite:  son('defaite.mp3',  { volume: .9 }),
        ambiance: son('ambiance.mp3', { volume: .25, loop: true }),
    }

    // les navigateurs bloquent le son avant une interaction : on lance l'ambiance à la 1re touche
    addEventListener('keydown', () => sons.ambiance.play(), { once: true })

    const btnSon = document.querySelector('#btn-son')
    let muet = false
    btnSon.addEventListener('click', () => {
        muet = !muet
        Howler.mute(muet)                               // coupe tous les sons Howler
        if (window.jemeurs) window.jemeurs.muted = muet // et celui de script.js (variable globale)
        btnSon.textContent = muet ? '🔇' : '🔊'
    })

    /* ===================== BRAISES (tsParticles) ===================== */
    function braises(nombre, couleurs) {
        tsParticles.load({
            id: 'particules',
            options: {
                fullScreen: { enable: false },
                particles: {
                    number: { value: nombre },
                    color: { value: couleurs },
                    opacity: { value: { min: .2, max: .9 }, animation: { enable: true, speed: 1 } },
                    size: { value: { min: 1, max: 3.5 } },
                    move: {
                        enable: true, direction: 'top', random: true,
                        speed: { min: .3, max: 1.4 },
                        outModes: { default: 'out' },
                    },
                },
            },
        })
    }
    braises(45, ['#ff5a1f', '#b3121a', '#ffb347'])

    /* ===================== LAMPE TORCHE ===================== */
    addEventListener('mousemove', (e) => {
        racine.style.setProperty('--mx', e.clientX + 'px')
        racine.style.setProperty('--my', e.clientY + 'px')
    })

    /* ===================== OUTILS ===================== */
    // longueur de chaque trait du stickman, pour l'effet "le trait se dessine" (voir .membre dans le CSS)
    document.querySelectorAll('#pendu .membre').forEach((el) => {
        const l = el.getTotalLength()
        el.style.setProperty('--l', l)              // trait de longueur l…
        el.style.setProperty('--l2', l * 2)         // …puis un vide de 2l qui le cache
        el.style.setProperty('--lo', l * 1.02)      // décalage de départ : trait entièrement hors du tracé
    })

    // coordonnées SVG → coordonnées écran (le canvas de sang est en plein écran)
    function ecran(x, y) {
        const p = svg.createSVGPoint()
        p.x = x; p.y = y
        const q = p.matrixTransform(svg.getScreenCTM())
        return { x: q.x, y: q.y }
    }
    // centre d'un élément à l'écran (suit l'élément même après animation GSAP)
    function centre(el) {
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }

    /* ===================== PLAIES ===================== */
    // Chaque .emplacement-plaie (placé et orienté dans le HTML) reçoit une entaille irrégulière avec ses lèvres,
    // un reflet humide, et 3 filets de sang qui coulent (+ une goutte qui tombe). Les filets sont remis à la
    // verticale (rotate inverse) pour toujours couler vers le bas, quelle que soit l'orientation de la plaie.
    const filet = (x, longueur, delai) => {
        const l = longueur
        return `<path class="dg" style="animation-delay:${delai}s" transform="translate(${x} 2)"
                    d="M-2.4 0 L2.4 0 Q1.7 ${l * .55} 1.1 ${l * .78} Q1.4 ${l} 0 ${l} Q-1.4 ${l} -1.1 ${l * .78} Q-1.7 ${l * .55} -2.4 0 Z"/>
                <circle class="chute" style="animation-delay:${delai + 1}s" cx="${x}" cy="${l + 4}" r="1.8"/>`
    }
    document.querySelectorAll('.emplacement-plaie').forEach((emp) => {
        const angle = parseFloat(emp.dataset.angle) || 0
        const echelle = rand(.9, 1.15)
        const miroir = Math.random() < .5 ? -1 : 1               // chaque plaie est un peu différente
        emp.innerHTML = `
            <g class="plaie">
                <g transform="scale(${echelle * miroir} ${echelle})">
                    <path class="levres" d="M-16 0 Q-7 -5.5 -1 -3.8 Q7 -6.5 16 0 Q7 5.5 0 4 Q-7 6.5 -16 0 Z"/>
                    <path class="entaille" d="M-13 0 Q-4 -2.8 1 -1.8 Q7 -3.2 13 0 Q5 2.8 0 1.8 Q-6 3.2 -13 0 Z"/>
                    <path class="fente" d="M-10 .2 Q0 -1.2 10 .2"/>
                </g>
                <g transform="rotate(${-angle})">
                    ${filet(-5, rand(12, 20), rand(0, 2))}
                    ${filet(3, rand(8, 14), rand(0, 2))}
                    ${filet(9, rand(6, 10), rand(0, 2))}
                </g>
            </g>`
    })

    // secousse de la scène (le décor fixe ne bouge pas). force : 0 → 1
    function secouerEcran(force = .3, duree = .4) {
        const amp = 4 + 14 * force
        gsap.to('#scene', {
            x: `random(-${amp},${amp})`, y: `random(-${amp * .6},${amp * .6})`,
            duration: .05, repeat: Math.round(duree / .05), repeatRefresh: true, overwrite: true,
            onComplete: () => gsap.set('#scene', { x: 0, y: 0 }),
        })
    }

    /* ===================== SANG : éclaboussures sur canvas ===================== */
    // Adapté du fiddle "Canvas Blood Splatter" (https://jsfiddle.net/decx/Ca9Y7/) :
    //  - chaque goutte est un gros disque qui RÉTRÉCIT en volant, avec de la gravité ;
    //  - à chaque image elle a une petite chance de "se coller" (PRISE) : son disque est alors tamponné sur un
    //    calque persistant (`calque`), ce qui donne ces taches rondes de tailles variées, entassées les unes sur les autres ;
    //  - les gouttes en vol sont redessinées à chaque image par-dessus le calque (canvas effacé puis calque recollé).
    // Ajouts pour le projet : direction / vitesse / ouverture du jet, sang du jeu (voir teinte), et chute sur le
    // rebord du sol où la goutte s'écrase en flaque aplatie.
    const toile = document.querySelector('#sang-fond')
    const ctx = toile.getContext('2d')
    const calque = document.createElement('canvas')      // les taches déjà collées (le "shadow" du fiddle)
    const cctx = calque.getContext('2d')
    function ajusterToile() {
        const ancien = document.createElement('canvas')  // on garde les taches quand la fenêtre change de taille
        ancien.width = calque.width; ancien.height = calque.height
        ancien.getContext('2d').drawImage(calque, 0, 0)
        toile.width = calque.width = innerWidth
        toile.height = calque.height = innerHeight
        cctx.drawImage(ancien, 0, 0)
        ctx.drawImage(calque, 0, 0)
    }
    ajusterToile()
    addEventListener('resize', ajusterToile)

    const GRAVITE = .2          // fiddle : options.gravity
    const PRISE = .04           // fiddle : options.consistency (chance par image de se coller au mur)
    const RETRECIT = .25        // fiddle : size -= .05 avec rayon = size * 5
    let gouttes = []
    let boucleActive = false

    // une teinte de sang : rouge de 110 à 235, parfois un peu foncé/brun (comme "shade" dans le fiddle)
    const teinte = () => `rgb(${Math.round(rand(110, 235))},${Math.round(rand(0, 14))},${Math.round(rand(0, 14))})`
    const disque = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill() }

    // taille = rayon de départ (×1.7 à l'écran) ; ouverture = largeur du cône du jet (6.28 = tout autour)
    function jaillir(x, y, { nb = 20, vitesse = 7, angle = -Math.PI / 2, ouverture = 1.4, taille = [2, 6] } = {}) {
        const solMur = ecran(0, 297).y
        const couleur = teinte()                         // une teinte par jet, comme une teinte par clic dans le fiddle
        for (let i = 0; i < nb; i++) {
            const a = angle + (Math.random() - .5) * ouverture
            const v = vitesse * (.3 + Math.random() * .9)
            gouttes.push({
                x, y,
                vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                r: rand(taille[0], taille[1]) * 1.7,
                couleur: Math.random() < .25 ? teinte() : couleur,
                // 80 % des gouttes finissent sur le rebord du sol, les autres plus bas dans la pièce
                sol: Math.random() < .8 ? solMur - rand(0, 6) : rand(solMur, innerHeight),
            })
        }
        if (!boucleActive) { boucleActive = true; requestAnimationFrame(animerGouttes) }
    }

    function animerGouttes() {
        ctx.clearRect(0, 0, toile.width, toile.height)
        ctx.drawImage(calque, 0, 0)                      // les taches déjà collées
        for (let i = gouttes.length - 1; i >= 0; i--) {
            const g = gouttes[i]
            ctx.fillStyle = g.couleur
            disque(ctx, g.x, g.y, g.r)                   // la goutte en vol

            const x = g.x, y = g.y, r = g.r
            g.vy += GRAVITE
            g.x += g.vx; g.y += g.vy
            g.r -= RETRECIT

            const ecrasee = g.y >= g.sol
            if (ecrasee || g.r < 1.5 || Math.random() < PRISE) {       // elle se colle : on tamponne le calque
                cctx.fillStyle = g.couleur
                if (ecrasee) {
                    cctx.beginPath()
                    cctx.ellipse(g.x, g.sol, Math.max(r, 2) * 1.8, Math.max(r, 2) * .55, 0, 0, Math.PI * 2)
                    cctx.fill()
                } else {
                    disque(cctx, x, y, Math.max(r, 1.5))
                }
                gouttes.splice(i, 1)
            } else if (g.x < -80 || g.x > innerWidth + 80 || g.y > innerHeight + 80) {
                gouttes.splice(i, 1)
            }
        }
        if (gouttes.length) {
            requestAnimationFrame(animerGouttes)
        } else {                                         // dernier affichage : les dernières taches comprises
            ctx.clearRect(0, 0, toile.width, toile.height)
            ctx.drawImage(calque, 0, 0)
            boucleActive = false
        }
    }

    // une source qui pisse pendant `duree` ms (moignon)
    function fontaine([x, y], duree, nb = 5) {
        const fin = performance.now() + duree
        const id = setInterval(() => {
            if (performance.now() > fin) return clearInterval(id)
            const p = ecran(x, y)
            jaillir(p.x, p.y, { nb, vitesse: 7.5, angle: -Math.PI / 2, ouverture: 1.1, taille: [1.5, 4.5] })
        }, 90)
    }

    // un morceau qui vole laisse une traînée de gouttes pendant `duree` secondes
    function trainee(el, duree) {
        const fin = gsap.ticker.time + duree
        const f = () => {
            if (gsap.ticker.time > fin) return gsap.ticker.remove(f)
            const c = centre(el)
            jaillir(c.x, c.y, { nb: 1, vitesse: 1.4, angle: Math.PI / 2, ouverture: 2.6, taille: [1.5, 3.5] })
        }
        gsap.ticker.add(f)
    }

    /* ===================== PLAFOND QUI SAIGNE ===================== */
    const plafond = document.querySelector('#plafond')
    function degouliner(n) {
        for (let i = 0; i < n && plafond.children.length < 45; i++) {
            const d = document.createElement('div')
            d.className = 'degout'
            d.style.left = rand(1, 98) + '%'
            d.style.width = rand(6, 20) + 'px'
            plafond.appendChild(d)
            gsap.to(d, { height: rand(40, innerHeight * .55), duration: rand(7, 16), ease: 'power1.out' })
        }
    }

    /* ===================== SANG SUR L'ÉCRAN (défaite) ===================== */
    // Même principe que les éclaboussures du mur (amas de disques de tailles variées, façon fiddle),
    // mais dessiné sur un canvas DEVANT le jeu, avec des coulures qui descendent depuis chaque amas.
    const toileEcran = document.querySelector('#ecran-sang')
    const ectx = toileEcran.getContext('2d')
    function ajusterToileEcran() { toileEcran.width = innerWidth; toileEcran.height = innerHeight }
    ajusterToileEcran()
    addEventListener('resize', ajusterToileEcran)

    function eclatsEcran(n) {
        for (let i = 0; i < n; i++) {
            const cx = rand(.06, .94) * innerWidth
            const cy = rand(.05, .6) * innerHeight
            const R = rand(25, 60)                              // rayon de l'amas
            const couleur = teinte()

            for (let k = 0; k < 34; k++) {                      // l'amas : gros disques au centre, petits vers le bord
                const dist = Math.random() * Math.random() * R * 1.6
                const ang = Math.random() * Math.PI * 2
                ectx.fillStyle = Math.random() < .3 ? teinte() : couleur
                disque(ectx, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, rand(3, R * .4) * (1 - dist / (R * 2)))
            }
            for (let k = 0; k < 10; k++) {                      // gouttelettes projetées plus loin
                const dist = rand(R * 1.4, R * 3)
                const ang = Math.random() * Math.PI * 2
                ectx.fillStyle = couleur
                disque(ectx, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, rand(1.5, 5))
            }

            // coulures : une ou deux traînées qui s'allongent vers le bas depuis l'amas
            for (let k = 0; k < 2; k++) {
                const largeur = rand(5, 11)
                const x = cx + rand(-R * .5, R * .5)
                const progres = { y: cy }
                let dernier = cy
                ectx.fillStyle = couleur
                gsap.to(progres, {
                    y: cy + rand(80, 240), duration: rand(5, 11), delay: rand(.3, 1.5), ease: 'power1.in',
                    onUpdate: () => {
                        ectx.fillRect(x - largeur / 2, dernier, largeur, progres.y - dernier + 1)
                        disque(ectx, x, progres.y, largeur / 2)                 // bout arrondi de la coulure
                        dernier = progres.y
                    },
                })
            }
        }
    }

    /* ===================== MORCEAUX (viscères, os) dans le SVG ===================== */
    const CHAIRS = ['#7a0c14', '#c0394d', '#e08a97']
    function morceau(x, y, os = false) {
        const m = document.createElementNS(NS, os ? 'rect' : 'circle')
        if (os) {
            m.setAttribute('x', x - 8); m.setAttribute('y', y - 3); m.setAttribute('width', 16)
            m.setAttribute('height', 6); m.setAttribute('rx', 3)
            m.setAttribute('fill', '#e8e0d0')
        } else {
            m.setAttribute('cx', x); m.setAttribute('cy', y); m.setAttribute('r', rand(3.5, 9))
            m.setAttribute('fill', rand(CHAIRS))
        }
        m.setAttribute('stroke', '#050405'); m.setAttribute('stroke-width', 2.5)
        document.querySelector('#sang').appendChild(m)
        gsap.set(m, { transformOrigin: '50% 50%' })
        gsap.timeline()
            .to(m, { x: rand(-130, 130), y: -rand(40, 110), rotation: rand(-360, 360), duration: .45, ease: 'power2.out' })
            .to(m, { y: SOL - y + rand(-3, 3), duration: .9, ease: 'bounce.out' })
        trainee(m, 1.2)
    }
    const eclaterEnMorceaux = (x, y, nb, nbOs = 0) => {
        for (let i = 0; i < nb; i++) morceau(x, y)
        for (let i = 0; i < nbOs; i++) morceau(x, y, true)
    }

    /* ===================== FIN DE PARTIE : alert() ===================== */
    // script.js termine avec alert() puis location.reload() : l'alert gèlerait la page et le reload
    // couperait toutes les animations. On remplace donc alert() par une version qui garde le
    // message (il contient le mot) puis lève une erreur pour que le reload() qui suit ne s'exécute pas.
    // Le bouton "Rejouer" fait le rechargement à la place.
    let messageFin = ''
    window.alert = (message) => {
        messageFin = String(message)
        throw new Error('[design] alert() remplacé par l\'écran de fin : rechargement automatique annulé (normal)')
    }
    const motDepuisAlert = () => messageFin.split(':').pop().trim()

    function afficherMessage(delai, construireHtml) {
        setTimeout(() => {
            document.querySelector('#message-texte').innerHTML = construireHtml()
            const zone = document.querySelector('#message')
            zone.hidden = false
            gsap.from(zone, { opacity: 0, duration: 1 })
        }, delai)
    }
    document.querySelector('#btn-rejouer').addEventListener('click', () => location.reload())

    /* ===================== ÉVÉNEMENTS DU JEU (déduits du DOM) ===================== */
    let vieMax = null           // nombre de vies au départ (10 aujourd'hui), lu automatiquement
    let partieFinie = false
    let visiblesAvant = 0

    // --- une erreur = .vie a baissé ---
    new MutationObserver(() => {
        const vie = parseInt(zoneVie.textContent, 10)
        if (Number.isNaN(vie) || partieFinie) return
        if (vieMax === null) { vieMax = vie; return }       // première valeur = vies de départ

        const erreurs = vieMax - vie
        if (erreurs > 0) surErreur(erreurs)
        if (vie <= 0) surDefaite()
    }).observe(zoneVie, { childList: true, characterData: true, subtree: true })

    function surErreur(erreurs) {
        sons.chaine.play()

        // 10 vies mais 6 parties : le stickman se dessine proportionnellement aux erreurs
        const visibles = Math.round(erreurs * parties.length / vieMax)
        parties.forEach((p, i) => p.classList.toggle('visible', i < visibles))
        const nouvelle = visibles > visiblesAvant
        visiblesAvant = visibles

        svg.dataset.stade = Math.max(1, Math.ceil(erreurs / vieMax * 3))     // visage : calme → paniqué → hurle
        racine.style.setProperty('--danger', erreurs / vieMax)               // vignette, cœur, plafond
        secouerEcran(erreurs / vieMax)
        degouliner(1 + (erreurs % 2))

        // jet de sang à la blessure (nouvelle partie = gros jet, sinon une blessure au hasard)
        if (visibles > 0) {
            const cible = nouvelle ? parties[visibles - 1] : parties[Math.floor(Math.random() * visibles)]
            setTimeout(() => {
                if (partieFinie) return
                const c = centre(cible.querySelector('.entaille'))
                sons.splat.play()
                jaillir(c.x, c.y, { nb: nouvelle ? 22 : 8, vitesse: 6, angle: -Math.PI / 2, ouverture: 2.2 })
            }, 700)
        }
    }

    // le personnage saigne en continu, de plus en plus quand le danger monte
    setInterval(() => {
        if (partieFinie) return
        const danger = parseFloat(racine.style.getPropertyValue('--danger')) || 0
        if (!danger) return
        document.querySelectorAll('#pendu .partie.visible .entaille').forEach((p) => {
            if (Math.random() < danger * .35) {
                const c = centre(p)
                jaillir(c.x, c.y, { nb: 1, vitesse: .5, angle: Math.PI / 2, ouverture: .4, taille: [1.5, 3] })
            }
        })
    }, 1000)

    // --- une bonne lettre / la victoire = .mot a changé ---
    let tiretsAvant = null
    new MutationObserver(() => {
        const texte = zoneMot.textContent
        const tirets = (texte.match(/_/g) || []).length
        const precedent = tiretsAvant
        tiretsAvant = tirets

        if (precedent === null || partieFinie) return        // 1er affichage du mot : rien à jouer
        if (tirets < precedent) sons.bonne.play()
        if (tirets === 0) surVictoire(texte.replace(/\s/g, ''))
    }).observe(zoneMot, { childList: true, characterData: true, subtree: true })

    /* ===================== CARNAGE ===================== */
    // dx = déplacement horizontal, rot = rotation, joint = point de coupe (là où part le sang),
    // dir = direction du jet, t = moment (s)
    const coupes = {
        'b-bras-g':  { dx: -90, rot: -220, joint: [136, 108], dir: -2.4, t: 0   },
        'b-bras-d':  { dx:  90, rot:  260, joint: [164, 108], dir: -.7,  t: .5  },
        'b-jambe-g': { dx: -60, rot: -150, joint: [145, 168], dir: -2.2, t: 1   },
        'b-jambe-d': { dx:  60, rot:  180, joint: [155, 168], dir: -.9,  t: 1.5 },
        'b-tete':    { dx:  45, rot:  540, joint: [150,  92], dir: -1.57, t: 2.2 },
        'b-tronc':   { dx:   0, rot:    8, joint: [150, 135], dir: -1.57, t: 3   },   // s'effondre en dernier
    }

    // gros éclats de sang dans toutes les directions (jet circulaire, comme un clic dans le fiddle)
    function explosionDeSang(p, nb) {
        jaillir(p.x, p.y, { nb, vitesse: 10, angle: -Math.PI / 2, ouverture: Math.PI * 2, taille: [2, 8] })
        jaillir(p.x, p.y, { nb: Math.round(nb / 2), vitesse: 5, angle: -Math.PI / 2, ouverture: Math.PI * 2, taille: [3, 9] })
    }

    function demembrer() {
        const tl = gsap.timeline()

        Object.entries(coupes).forEach(([id, c]) => {
            const el = document.getElementById(id)
            const chaine = el.querySelector('.chaine')

            // le morceau tourne autour de son milieu ; on calcule son point le plus bas APRÈS rotation
            // pour qu'il se pose pile sur le sol
            let milieu, bas
            const trait = el.querySelector('path.contour')
            if (trait) {                                            // bras, jambe, tronc : un segment
                const L = trait.getTotalLength()
                const a = trait.getPointAtLength(0), b = trait.getPointAtLength(L)
                milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
                const angle = Math.atan2(b.y - a.y, b.x - a.x) + c.rot * Math.PI / 180
                bas = milieu.y + (L / 2) * Math.abs(Math.sin(angle))
            } else {                                                // tête : un cercle
                const boite = el.querySelector('.contour').getBBox()
                milieu = { x: boite.x + boite.width / 2, y: boite.y + boite.height / 2 }
                bas = boite.y + boite.height
            }
            // on retire la demi-épaisseur du contour (le tronc est bien plus épais que les membres)
            const demi = parseFloat(getComputedStyle(el.querySelector('.contour')).strokeWidth) / 2
            const chute = SOL_PIECE - demi - bas                    // distance jusqu'au sol
            gsap.set(el, { svgOrigin: `${milieu.x} ${milieu.y}` })

            tl.call(() => {
                sons.tranche.play()
                sons.splat.play()
                const p = ecran(...c.joint)
                jaillir(p.x, p.y, { nb: 60, vitesse: 9, angle: c.dir, ouverture: 1.3, taille: [2, 8] })
                fontaine(c.joint, 2200)                             // le moignon pisse le sang
                trainee(el, 1.3)                                    // le membre sème du sang en volant
                secouerEcran(.9, .35)
                if (chaine) gsap.to(chaine, { opacity: 0, duration: .2 })   // la chaîne cède

                if (id === 'b-tete') {
                    eclatsEcran(5); eclaterEnMorceaux(150, 94, 12, 3)
                    explosionDeSang(p, 90)                              // la tête part : gros éclats dans toutes les directions
                }
                if (id === 'b-tronc') {
                    eclatsEcran(4); eclaterEnMorceaux(150, 135, 16, 6)
                    explosionDeSang(ecran(150, 150), 130)               // le corps s'écrase : dernière explosion
                }
            }, null, c.t)
              .to(el, { x: c.dx, y: -30, rotation: c.rot, duration: .35, ease: 'power2.out' }, c.t)
              .to(el, { y: chute, duration: .9, ease: 'bounce.out' }, c.t + .35)
        })

        // la flaque s'étale pendant tout le démembrement
        tl.to('#flaque', { attr: { rx: 130 }, duration: 4, ease: 'power1.out' }, 1)
    }

    function surDefaite() {
        partieFinie = true
        document.body.classList.add('defaite')
        sons.ambiance.fade(.25, 0, 1500)
        svg.dataset.stade = 3

        // 1,2 s pour laisser la dernière partie se dessiner avant le carnage
        gsap.delayedCall(1.2, () => {
            sons.defaite.play()
            gsap.fromTo('.flash', { opacity: .8 }, { opacity: 0, duration: .7 })
            secouerEcran(1, 1.2)
            degouliner(16)
            explosionDeSang(ecran(150, 135), 110)                       // l'instant de la mort : explosion au centre du corps
            demembrer()
        })
        afficherMessage(7000, () =>
            `Écartelé…<br><small>Le mot était « ${motDepuisAlert()} »</small>`)
    }

    function surVictoire(mot) {
        partieFinie = true
        document.body.classList.add('victoire')
        sons.ambiance.fade(.25, .1, 1500)
        sons.victoire.play()
        sons.chaine.play()

        gsap.to('#pendu .chaine, #pendu .menotte', { opacity: 0, duration: 1 })               // chaînes qui tombent
        gsap.to('#bonhomme', { y: -15, duration: .25, yoyo: true, repeat: 7, ease: 'power1.out' }) // saut de joie

        braises(120, ['#c9a84c', '#ffd98a'])                                                  // braises dorées
        afficherMessage(2500, () => `Il est libéré !<br><small>Le mot était « ${mot} »</small>`)
    }
})()
