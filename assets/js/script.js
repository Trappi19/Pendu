( async ()=>{

    let listToucheContainer = document.querySelector('.lettres')
    let listToucheUtilisee = document.querySelector('.lettres-utilisees')
    let zoneVie = document.querySelector('.vie')

    jemeurs = new Audio('assets/sounds/jemeurs.mp3')

    let listTouche = []

    async function getRandomWord(){
            
        let motPendu = false
        let error = false


        try{
            let res = await fetch('https://trouve-mot.fr/api/random')
            if(res.status != 200){
                error = res.status
            }
            res = await res.json()
            motPendu = res[0]?.name ?? false
            
    
        }catch(e){
            error = e
        }

        if(error && !motPendu){
            console.error(error)
            return
        }

        return motPendu
    }

    async function startGame(){

        let fin = false
        let vie = 10
        zoneVie.textContent = vie

        let motPendu = await getRandomWord()
        if(!motPendu) return

        motPendu = motPendu.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        console.log(motPendu)

        let tirets = []
        let tailleMot = motPendu.length

        for (let i = 0; i < tailleMot; i++){
            tirets.push('_')
        }

        let zoneMot = document.querySelector('.mot')
        zoneMot.textContent = tirets.join(' ')

        function stopGame(message){
            fin = true
            // petit délai pour que le navigateur affiche la dernière lettre avant l'alert
            setTimeout(() => {
                alert(message)
                location.reload()
            }, 100)
        }

        addEventListener('keydown', (e)=>{
            if(fin) return

            let touche = e.key.toLowerCase()
            if(!/^[a-z]$/.test(touche)) return
            if(listTouche.includes(touche) || tirets.includes(touche)) return

            if(motPendu.includes(touche)){
                console.log('correct')
                for (let i = 0; i < tailleMot; i++){
                    if(motPendu[i] == touche){
                        tirets[i] = touche
                    }
                }
                zoneMot.textContent = tirets.join(' ')

                if(!tirets.includes('_')){
                    stopGame('Bravo, vous avez gagné ! Le mot était : ' + motPendu)
                }
            }
            else{
                console.log('incorrect')
                listTouche.push(touche)
                listToucheUtilisee.textContent = listTouche.join(' ')
                vie--
                zoneVie.textContent = vie
                jemeurs.play()
                if(vie <= 0){
                    stopGame('Vous avez perdu ! Le mot était : ' + motPendu)
                }
            }
        })
    }

    
    startGame()





})()