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

const response = await fetch('http://localhost:3000/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rust: source })
});


const memoryPages = response.headers.get('X-WASM-Memory-Pages')  ;
console.log(memoryPages)
const memory = new WebAssembly.Memory({ initial: parseInt(memoryPages as string)  });


if (response.headers.get("content-type") !== "application/wasm") {
  const text = await response.text();
  console.error("Erreur serveur : ", text);
  throw new Error("Le serveur n'a pas retourné de WASM !");
}



const wasmBuffer = await response.arrayBuffer();
const { instance } = await WebAssembly.instantiate(wasmBuffer,{
  env:{memory}
});
const obj:any = instance.exports;

const arr = new Float32Array(memory.buffer, 0, 8);
arr.set([10, 20, 30, 40, 50, 60, 70, 80]);

console.log("Avant :", arr); // [10, 20, 30, ...]

// Appelle la fonction Rust avec le pointeur de départ (offset 0) et la longueur
obj.incr_buffer(0, arr.length);

console.log("Après :", arr);

