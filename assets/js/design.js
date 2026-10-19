/*
 * design.js : tout l'habillage (sons, animations, stickman, sang).
 * Ne dépend de script.js que par le DOM :
 *   .vie  → nombre de vies (écrit par script.js)  => on en déduit les erreurs
 *   .mot  → mot avec des "_"                        => plus de "_" = victoire
 * script.js n'est PAS modifié. design.js doit être chargé AVANT lui (voir index.html).
 */
(() => {
    const SOL = 292                         // y du sol dans le viewBox du SVG
    const racine = document.documentElement
    const parties = document.querySelectorAll('#pendu .partie')   // dans l'ordre d'apparition
    const zoneVie = document.querySelector('.vie')
    const zoneMot = document.querySelector('.mot')

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

    // bouton mute
    const btnSon = document.querySelector('#btn-son')
    let muet = false
    btnSon.addEventListener('click', () => {
        muet = !muet
        Howler.mute(muet)                               // coupe tous les sons Howler
        if (window.jemeurs) window.jemeurs.muted = muet // et celui de script.js (variable globale)
        btnSon.textContent = muet ? '🔇' : '🔊'
    })

    /* ===================== BRAISES (tsParticles) ===================== */
    function braises(nombre, couleur) {
        tsParticles.load({
            id: 'particules',
            options: {
                fullScreen: { enable: false },
                particles: {
                    number: { value: nombre },
                    color: { value: couleur },
                    opacity: { value: { min: .2, max: .8 }, animation: { enable: true, speed: 1 } },
                    size: { value: { min: 1, max: 3 } },
                    move: {
                        enable: true, direction: 'top', random: true,
                        speed: { min: .3, max: 1.2 },
                        outModes: { default: 'out' },
                    },
                },
            },
        })
    }
    braises(35, '#b3121a')                  // ambiance normale : braises rouges

    /* ===================== LAMPE TORCHE ===================== */
    addEventListener('mousemove', (e) => {
        racine.style.setProperty('--mx', e.clientX + 'px')
        racine.style.setProperty('--my', e.clientY + 'px')
    })

    /* ===================== FIN DE PARTIE ===================== */
    // script.js termine avec alert() puis location.reload() : l'alert gèlerait la page et le reload
    // couperait toutes les animations. On remplace donc alert() par une version qui garde le
    // message (il contient le mot) puis lève une erreur pour que le reload() qui suit ne s'exécute pas.
    // Le bouton "Rejouer" fait le rechargement à la place.
    let messageFin = ''
    window.alert = (message) => {
        messageFin = String(message)
        throw new Error('[design] alert() remplacé par l\'écran de fin : rechargement automatique annulé (normal)')
    }

    function afficherMessage(delai, construireHtml) {
        setTimeout(() => {
            document.querySelector('#message-texte').innerHTML = construireHtml()
            const zone = document.querySelector('#message')
            zone.hidden = false
            gsap.from(zone, { opacity: 0, duration: 1 })
        }, delai)
    }
    document.querySelector('#btn-rejouer').addEventListener('click', () => location.reload())

    function secouerEcran() {
        document.body.classList.add('secousse')
        setTimeout(() => document.body.classList.remove('secousse'), 500)
    }

    // le mot, tel que script.js l'a annoncé dans son alert ("... Le mot était : xxx")
    const motDepuisAlert = () => messageFin.split(':').pop().trim()

    /* ===================== ÉVÉNEMENTS DU JEU (déduits du DOM) ===================== */
    let vieMax = null       // nombre de vies au départ (10 aujourd'hui), lu automatiquement
    let partieFinie = false

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

        racine.style.setProperty('--danger', erreurs / vieMax)  // vignette qui se resserre
        secouerEcran()
    }

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

    /* ----- éclaboussures : simples cercles rouges (aucun réalisme) ----- */
    const NS = 'http://www.w3.org/2000/svg'
    function eclabousser(x, y, nombre = 14) {
        const zone = document.querySelector('#sang')
        for (let i = 0; i < nombre; i++) {
            const goutte = document.createElementNS(NS, 'circle')
            goutte.setAttribute('cx', x)
            goutte.setAttribute('cy', y)
            goutte.setAttribute('r', gsap.utils.random(2, 7))
            zone.appendChild(goutte)

            const angle = Math.random() * Math.PI * 2
            const distance = gsap.utils.random(15, 70)
            gsap.fromTo(goutte,
                { x: 0, y: 0, scale: 0, transformOrigin: '50% 50%' },
                {
                    x: Math.cos(angle) * distance, y: Math.sin(angle) * distance,
                    scale: 1, duration: .4, ease: 'power3.out',
                    onComplete: () => gsap.to(goutte, {          // la goutte coule un peu
                        y: '+=' + gsap.utils.random(10, 40), duration: 2, ease: 'power1.in',
                    }),
                })
        }
    }

    /* ----- démembrement ----- */
    // dx = déplacement horizontal, rot = rotation, joint = point de coupe (là où part le sang), t = moment (s)
    const coupes = {
        'b-bras-g':  { dx: -90, rot: -220, joint: [150, 105], t: 0   },
        'b-bras-d':  { dx:  90, rot:  260, joint: [150, 105], t: .5  },
        'b-jambe-g': { dx: -60, rot: -150, joint: [150, 170], t: 1   },
        'b-jambe-d': { dx:  60, rot:  180, joint: [150, 170], t: 1.5 },
        'b-tete':    { dx:  45, rot:  540, joint: [150,  82], t: 2.2 },
        'b-tronc':   { dx:   0, rot:    8, joint: [150, 130], t: 3   },   // s'effondre en dernier
    }

    function demembrer() {
        const tl = gsap.timeline()

        Object.entries(coupes).forEach(([id, c]) => {
            const el = document.getElementById(id)
            const boite = el.querySelector('path, circle').getBBox()
            const chute = SOL - (boite.y + boite.height)            // distance jusqu'au sol
            const chaine = el.querySelector('.chaine')
            gsap.set(el, { transformOrigin: '50% 50%' })

            tl.call(() => {
                sons.tranche.play()
                sons.splat.play()
                eclabousser(...c.joint)
                if (chaine) gsap.to(chaine, { opacity: 0, duration: .2 })   // la chaîne cède
            }, null, c.t)
              .to(el, { x: c.dx, y: -30, rotation: c.rot, duration: .35, ease: 'power2.out' }, c.t)
              .to(el, { y: chute, duration: .9, ease: 'bounce.out' }, c.t + .35)
        })

        // la flaque s'étale pendant tout le démembrement
        tl.to('#flaque', { attr: { rx: 95 }, duration: 3, ease: 'power1.out' }, 1)
    }

    function surDefaite() {
        partieFinie = true
        document.body.classList.add('defaite')
        sons.ambiance.fade(.25, 0, 1500)

        // 1,2 s pour laisser la dernière partie se dessiner avant le carnage
        gsap.delayedCall(1.2, () => {
            sons.defaite.play()
            gsap.fromTo('.flash', { opacity: .7 }, { opacity: 0, duration: .6 })
            secouerEcran()
            demembrer()
        })
        afficherMessage(5700, () =>
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

        braises(120, '#c9a84c')                                                               // braises dorées
        gsap.to('.lune', { scale: 1.4, duration: 3, ease: 'power2.out' })
        afficherMessage(2500, () => `Il est libéré !<br><small>Le mot était « ${mot} »</small>`)
    }
})()
