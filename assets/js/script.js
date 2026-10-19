( async ()=>{

    let mot = false

    async function getRandomWord(){
            

        let error = false


        try{
            let res = await fetch('https://trouve-mot.fr/api/random')
            if(res.status != 200){
                error = res.status
            }
            res = await res.json()
            mot = res[0]?.name ?? false
    
        }catch(e){
            error = e
        }

        if(error && !mot){
            console.error(error)
            return
        }

        return mot
    }

    console.log(await getRandomWord())

})()