export class WASM {

    private static rustByName:{[key:string]:string} = {};
    private static wasmByName:{[key:string]:{
        buffer:ArrayBuffer,
        [key:string]:any
    }} = {}; 

    public static async get(name:string,rust:string,memoryByteLength:number=0, mode = "auto"):Promise<{
  buffer:ArrayBuffer,
  [key:string]:any,
}> {
        

            if (mode === "prod") {
                
                const [buffer,meta] = await Promise.all([
                    fetch(`/wasms/${name}.wasm`).then( r=> r.arrayBuffer()),
                    fetch(`/wasms/${name}.wasm.json`).then(r=> r.json()),
                ]);
                if (!buffer) throw new Error("WASM not found: " + name);

                const nbPage = Math.max(Math.ceil(memoryByteLength / 65536) , parseInt(meta.pages));
                const memory = new WebAssembly.Memory({ initial: nbPage  });
                const { instance } = await WebAssembly.instantiate(buffer,{
                    env:{memory}
                });

                return {
                    ...instance.exports,
                    buffer:memory.buffer
                }
            }

            if (mode === "dev") {
                
                if(rust != WASM.rustByName[name]){
                    WASM.rustByName[name] = rust;
                    


                    const resp = await fetch(`http://localhost:3000/compile?name=`+name, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rust })
                    });

                    if (resp.headers.get("content-type") !== "application/wasm") {
                    const text = await resp.text();
                    console.error("Erreur serveur : ", text);
                    throw new Error("Le serveur n'a pas retourné de WASM !");
                    }

                    const memoryPages = resp.headers.get('X-WASM-Memory-Pages');
                    const nbPage = Math.max(Math.ceil(memoryByteLength / 65536) , parseInt(memoryPages as string));
                    const memory = new WebAssembly.Memory({ initial: nbPage  });
                    
                    const wasmBuffer = await resp.arrayBuffer();
                    const { instance } = await WebAssembly.instantiate(wasmBuffer,{
                    env:{memory}
                    });


                    WASM.wasmByName[name] = {
                        ...instance.exports,
                        buffer:memory.buffer,
                    }
                }

                return WASM.wasmByName[name];
            }


            // "auto" : dev si localhost, prod sinon
            if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
                return WASM.get(name,rust,memoryByteLength, "dev");
            } else {
                return WASM.get(name,rust,memoryByteLength, "prod");
            }

        
    }

}