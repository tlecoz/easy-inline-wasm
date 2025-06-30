const source = `
#[no_mangle]
pub extern "C" fn sum(a: i32, b: i32) -> i32 { a + b }

#[no_mangle]
pub extern "C" fn incr_buffer(ptr: *mut f32, len: usize) {
    let slice = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    for v in slice.iter_mut() {
        *v += 1.0;
    }
}
`;

/*
const response = await fetch('http://localhost:3000/compile?name=matrix_transformer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rust: source })
});
*/

const instance = await getWasmObject("matrix_transformer",source);

/*
const memoryPages = response.headers.get('X-WASM-Memory-Pages')  ;
console.log(memoryPages)
const memory = new WebAssembly.Memory({ initial: parseInt(memoryPages as string)  });






const wasmBuffer = await response.arrayBuffer();
const { instance } = await WebAssembly.instantiate(wasmBuffer,{
  env:{memory}
});
*/

const obj:any = instance.exports;

const arr = new Float32Array(instance.buffer, 0, 8);
arr.set([10, 20, 30, 40, 50, 60, 70, 80]);

console.log("Avant :", arr); // [10, 20, 30, ...]

// Appelle la fonction Rust avec le pointeur de départ (offset 0) et la longueur
obj.incr_buffer(0, arr.length);

console.log("Après :", arr);



async function getWasmObject(name:string,rustCode:string, mode = "auto") {
  // mode: "auto", "dev", "prod"
  if (mode === "prod") {
    // prod: charge le fichier local
    const [buffer,meta] = await Promise.all([
      fetch(`/wasms/${name}.wasm`).then( r=> r.arrayBuffer()),
      fetch(`/wasms/${name}.wasm.json`).then(r=> r.json()),
    ]);
    if (!buffer) throw new Error("WASM not found: " + name);

    const memory = new WebAssembly.Memory({ initial: parseInt(meta.pages)  });
    const { instance } = await WebAssembly.instantiate(buffer,{
      env:{memory}
    });

    return {
      exports:instance.exports,
      buffer:memory.buffer
    }
  }
  if (mode === "dev") {
    
    const resp = await fetch(`http://localhost:3000/compile?name=`+name, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rust: rustCode })
    });

    if (resp.headers.get("content-type") !== "application/wasm") {
      const text = await resp.text();
      console.error("Erreur serveur : ", text);
      throw new Error("Le serveur n'a pas retourné de WASM !");
    }

    const memoryPages = resp.headers.get('X-WASM-Memory-Pages');
    const memory = new WebAssembly.Memory({ initial: parseInt(memoryPages as string)  });

    const wasmBuffer = await resp.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(wasmBuffer,{
      env:{memory}
    });

    return {
      exports:instance.exports,
      buffer:memory.buffer,
    }
  }


  // "auto" : dev si localhost, prod sinon
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return getWasmObject(name,rustCode, "dev");
  } else {
    return getWasmObject(name,rustCode, "prod");
  }
}