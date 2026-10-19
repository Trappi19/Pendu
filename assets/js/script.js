( async ()=>{

    let listToucheContainer = document.querySelector('.lettres')

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
        let motPendu = await getRandomWord()
        if(!motPendu) return

        motPendu = motPendu.toLowerCase()
        console.log(motPendu)

        let tirets = []
        let tailleMot = motPendu.length

        for (let i = 0; i < tailleMot; i++){
            tirets.push('_')
        }

        let zoneMot = document.querySelector('.mot')
        zoneMot.textContent = tirets.join(' ')

        addEventListener('keydown', (e)=>{
            let touche = e.key.toLowerCase()
            listTouche.push(touche)

            if(motPendu.includes(touche)){
                console.log('correct')
                for (let i = 0; i < tailleMot; i++){
                    if(motPendu[i] == touche){
                        tirets[i] = touche
                    }
                }
                zoneMot.textContent = tirets.join(' ')
            }
            else{
                console.log('incorrect')
            }
        })
    }

    
    startGame()





})()