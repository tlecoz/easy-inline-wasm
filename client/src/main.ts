import { WASM } from "./WASM";

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

const memoryByteLength:number = 4000000;
const wasm = await WASM.get("test",source,memoryByteLength);

const arr = new Float32Array(wasm.buffer, 0, 4);

console.log("#0 :", arr);//0,0,0,0
wasm.incr_buffer(0, arr.length);
console.log("#1 :", arr);//1,1,1,1


