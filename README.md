

# easy-inline-wasm

This repository contains a minimal workflow that lets you use **Rust-compiled WebAssembly** inside a TypeScript project **almost like WGSL** — by writing Rust code as a string, compiling it on demand via a local Node.js server, and loading it dynamically on the client.

The goal is to keep WASM usage **simple, stable and static-function-like**, without exposing JS classes, descriptors or complex bindings.

---

## 🚀 How it works

- You write Rust code as a string inside a TypeScript file.
- The client requests a WASM module using `WASM.get()`.
- A small **Node.js server** receives the request and:
  - checks if a WASM binary already exists  
  - **or** instantly recompiles the Rust source (`wasm32-unknown-unknown`)
- The server writes the compiled `.wasm` file into the client’s `public/` folder.
- This file change triggers a **Vite page reload**.
- The client then loads and uses the module’s exported functions.

This gives a workflow where Rust feels like a collection of static functions with raw pointers and numbers — no accidental JS allocations or hidden complexity.

---

## 🧪 Example usage
```js
const source = `
#[no_mangle]
pub extern "C" fn incr_buffer(ptr: *mut f32, len: usize) {
    let slice = unsafe { std::slice::from_raw_parts_mut(ptr, len) };
    for v in slice.iter_mut() { *v += 1.0; }
}
`;

const wasm = await WASM.get("test", source);
const arr = new Float32Array(wasm.buffer, 0, 4);

console.log(arr);            // 0, 0, 0, 0
wasm.incr_buffer(0, 4);
console.log(arr);            // 1, 1, 1, 1
```

## 📁 Project structure

```php
/
├── server.js        # Node.js on-demand compiler
├── wasm/            # Temporary Rust source & build files
└── client/
    ├── public/      # Compiled .wasm files appear here
    ├── src/
    └── ...

```



## 📦 Installation

Clone the repo and install root dependencies:

```bash
npm install
```

Install client dependencies:
```bash
cd client
npm install
```

## 🖥️ Run the Node.js compiler server
From the root folder:
```bash
npm run start
```
This starts the on-demand Rust → WASM compilation server.

## 🌐 Run the client (Vite)
In another terminal:
```bash
cd client
npm run dev
```
This starts the client app and automatically reloads whenever a .wasm file is (re)generated.

## 📝 Notes

- Compilation is practically instant for small Rust snippets.
- Ideal for experiments or prototyping low-level logic.
- The WASM API is intentionally minimal: no objects, no classes, only numeric parameters and raw memory.

## 📜 License
MIT — feel free to explore, fork, and adapt.